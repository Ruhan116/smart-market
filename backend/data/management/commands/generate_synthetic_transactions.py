import math
import random
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, time
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction
from django.utils import timezone

from accounts.models import Business
from data.models import (
    Product,
    Transaction,
    StockMovement,
    Customer,
)
from data.views import _update_stock_alerts_for_product


class Command(BaseCommand):
    help = "Generate synthetic transaction and stock movement history for forecasting demos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=120,
            help="Number of days in the past to generate synthetic transactions for (default: 120)",
        )
        parser.add_argument(
            "--max-per-day",
            type=int,
            default=6,
            help="Maximum number of transactions per product per day (default: 6)",
        )
        parser.add_argument(
            "--seed",
            type=int,
            help="Random seed for reproducibility",
        )
        parser.add_argument(
            "--allow-future",
            action="store_true",
            help="Also create transactions dated in the future (disabled by default)",
        )

    def handle(self, *args, **options):
        days = options["days"]
        max_per_day = max(1, options["max_per_day"])
        seed = options.get("seed")
        allow_future = options["allow_future"]

        if seed is not None:
            random.seed(seed)

        start_date = timezone.now().date() - timedelta(days=days)
        end_date = timezone.now().date() + (timedelta(days=7) if allow_future else timedelta(days=0))

        businesses = Business.objects.all()
        if not businesses.exists():
            self.stdout.write(self.style.WARNING("No businesses found – nothing to generate."))
            return

        payment_methods = ["cash", "bkash", "nagad", "rocket", "card"]
        total_created = 0
        synthetic_ref_transaction = "synthetic_transaction"
        synthetic_ref_restock = "synthetic_restock"

        for business in businesses:
            products = list(Product.objects.filter(business=business))
            if not products:
                self.stdout.write(self.style.WARNING(f"Skipping business {business} – no products."))
                continue

            customers = list(Customer.objects.filter(business=business))

            # cache existing counts per (product_id, date) to avoid over-saturating
            existing_counts = defaultdict(int)
            for txn in Transaction.objects.filter(business=business, date__gte=start_date, date__lte=end_date):
                existing_counts[(txn.product_id, txn.date)] += 1

            with db_transaction.atomic():
                for product in products:
                    product_refresh = Product.objects.select_for_update().get(pk=product.pk)
                    base_rate = max(1, product_refresh.reorder_point // 10)

                    current_date = start_date
                    while current_date <= end_date:
                        # Lower probability for future days unless allow_future explicitly requested
                        if current_date > timezone.now().date() and not allow_future:
                            break

                        # Determine number of transactions for this day using a Poisson-like distribution
                        lam = min(max_per_day, base_rate) / 2
                        count = min(max_per_day, self._poisson_sample(lam))

                        # Avoid saturating with too many synthetic entries if we already have data for that day
                        remaining_capacity = max(0, max_per_day - existing_counts[(product_refresh.product_id, current_date)])
                        count = min(count, remaining_capacity)

                        for _ in range(count):
                            quantity = max(1, int(random.gauss(mu=3, sigma=1.5)))
                            quantity = min(quantity, 20)  # hard cap to avoid huge spikes

                            sale_time = self._random_time()
                            sale_timestamp = timezone.make_aware(datetime.combine(current_date, sale_time))

                            # Ensure sufficient stock – if not, restock first
                            product_refresh.refresh_from_db()
                            if product_refresh.current_stock < quantity:
                                restock_amount = max(quantity * 2, product_refresh.reorder_point or quantity * 2)
                                restock_before = product_refresh.current_stock
                                product_refresh.current_stock += restock_amount
                                product_refresh.save(update_fields=["current_stock", "updated_at"])

                                restock_movement = StockMovement.objects.create(
                                    business=business,
                                    product=product_refresh,
                                    movement_type="restock",
                                    quantity_changed=restock_amount,
                                    stock_before=restock_before,
                                    stock_after=product_refresh.current_stock,
                                    reference_type=synthetic_ref_restock,
                                    reference_id=str(uuid.uuid4()),
                                    notes="Synthetic restock for generated sales",
                                )
                                StockMovement.objects.filter(pk=restock_movement.pk).update(created_at=sale_timestamp)
                                _update_stock_alerts_for_product(product_refresh, business, None)

                            # Create sale transaction
                            product_refresh.refresh_from_db()
                            stock_before = product_refresh.current_stock
                            product_refresh.current_stock = max(0, product_refresh.current_stock - quantity)
                            product_refresh.save(update_fields=["current_stock", "updated_at"])

                            stock_movement = StockMovement.objects.create(
                                business=business,
                                product=product_refresh,
                                movement_type="sale",
                                quantity_changed=-quantity,
                                stock_before=stock_before,
                                stock_after=product_refresh.current_stock,
                                reference_type=synthetic_ref_transaction,
                                reference_id=str(uuid.uuid4()),
                                notes="Synthetic sale for forecasting demo",
                            )
                            StockMovement.objects.filter(pk=stock_movement.pk).update(created_at=sale_timestamp)

                            customer = random.choice(customers) if customers else None

                            unit_price = product_refresh.unit_price
                            if not unit_price or unit_price <= 0:
                                unit_price = Decimal(random.uniform(50, 750)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                            amount = (unit_price * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                            txn = Transaction.objects.create(
                                business=business,
                                product=product_refresh,
                                customer=customer,
                                quantity=quantity,
                                unit_price=unit_price,
                                amount=amount,
                                payment_method=random.choice(payment_methods),
                                date=current_date,
                                time=sale_time,
                                notes="Synthetic transaction generated for analytics",
                            )
                            Transaction.objects.filter(pk=txn.pk).update(created_at=sale_timestamp)

                            _update_stock_alerts_for_product(product_refresh, business, None)
                            existing_counts[(product_refresh.product_id, current_date)] += 1
                            total_created += 1

                        current_date += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(f"Generated {total_created} synthetic transactions."))

    @staticmethod
    def _poisson_sample(lam):
        # Simple Poisson sampler using the Knuth algorithm
        L = math.exp(-lam)
        k = 0
        p = 1.0
        while p > L:
            k += 1
            p *= random.random()
        return max(0, k - 1)

    @staticmethod
    def _random_time():
        hour = random.randint(9, 21)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        return time(hour, minute, second)
