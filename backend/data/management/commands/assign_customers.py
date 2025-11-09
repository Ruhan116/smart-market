from django.core.management.base import BaseCommand
from data.models import Transaction, Customer
from datetime import timedelta
import random


class Command(BaseCommand):
    help = 'Assign Bengali customer names to transactions with realistic patterns'

    def handle(self, *args, **options):
        # 20 Bengali customer names (in English)
        bengali_names = [
            "Rahim Ahmed",
            "Fatima Begum",
            "Karim Hosen",
            "Ayesha Khatun",
            "Hasan Miya",
            "Jahida Akhtar",
            "Ali Master",
            "Rumana Bibi",
            "Nazmul Haque",
            "Salma Khan",
            "Ibrahim Sheikh",
            "Mohsina Sultana",
            "Bashir Ahmed",
            "Nazma Akhtar",
            "Abdullah Khan",
            "Hajera Begum",
            "Shafiqul Islam",
            "Sabina Rahman",
            "Maruf Hosen",
            "Noor Jahan",
        ]

        # Get all transactions ordered by date
        all_transactions = list(Transaction.objects.all().order_by('date'))
        total_transactions = len(all_transactions)

        self.stdout.write(f"Total transactions to update: {total_transactions}")

        # Define customer patterns:
        # - 2 names occur less frequently (5-8% of transactions)
        # - 4 names occur only in earlier dates (declining over time)
        # - Others distributed normally

        rare_customers = [bengali_names[0], bengali_names[1]]  # Very rare (5-8%)
        declining_customers = [bengali_names[2], bengali_names[3], bengali_names[4], bengali_names[5]]  # Decline over time
        regular_customers = bengali_names[6:]  # Regular distribution

        self.stdout.write(self.style.SUCCESS("\nCustomer patterns:"))
        self.stdout.write(f"  Rare customers (5-8%): {rare_customers}")
        self.stdout.write(f"  Declining customers (early dates only): {declining_customers}")
        self.stdout.write(f"  Regular customers: {regular_customers}")

        # Get date range
        min_date = min([t.date for t in all_transactions])
        max_date = max([t.date for t in all_transactions])
        date_range = (max_date - min_date).days

        self.stdout.write(f"\nDate range: {min_date} to {max_date} ({date_range} days)")

        # Assign customers with patterns
        updates = []

        for idx, transaction in enumerate(all_transactions):
            # Calculate progress through time (0 to 1)
            days_from_start = (transaction.date - min_date).days
            time_progress = days_from_start / date_range if date_range > 0 else 0

            customer_name = None

            # 1. Assign rare customers randomly (5% chance)
            if random.random() < 0.05:
                customer_name = random.choice(rare_customers)

            # 2. Assign declining customers with decreasing probability over time
            elif random.random() < (1 - time_progress) * 0.25:  # 25% early, 0% at end
                customer_name = random.choice(declining_customers)

            # 3. Assign from regular customers (rest)
            else:
                customer_name = random.choice(regular_customers)

            # Get or create customer
            customer, created = Customer.objects.get_or_create(
                business=transaction.business,
                name=customer_name,
                defaults={'total_purchases': 0}
            )

            transaction.customer = customer
            updates.append(transaction)

            if (idx + 1) % 500 == 0:
                self.stdout.write(f"Processed {idx + 1}/{total_transactions} transactions...")

        # Bulk update all transactions
        Transaction.objects.bulk_update(updates, ['customer'], batch_size=100)

        self.stdout.write(self.style.SUCCESS(f"\n✅ Updated {len(updates)} transactions"))

        # Print distribution stats
        self.stdout.write(self.style.SUCCESS("\n=== Customer Distribution Stats ===\n"))
        for name in bengali_names:
            count = Transaction.objects.filter(customer__name=name).count()
            if count > 0:
                percentage = (count / total_transactions) * 100
                self.stdout.write(f"{name}: {count} transactions ({percentage:.1f}%)")

        # Show declining pattern specifically
        self.stdout.write(self.style.SUCCESS("\n=== Declining Customers Pattern ===\n"))
        for customer_name in declining_customers:
            early_count = Transaction.objects.filter(
                customer__name=customer_name,
                date__lte=min_date + timedelta(days=date_range//3)
            ).count()
            mid_count = Transaction.objects.filter(
                customer__name=customer_name,
                date__gt=min_date + timedelta(days=date_range//3),
                date__lte=min_date + timedelta(days=2*date_range//3)
            ).count()
            late_count = Transaction.objects.filter(
                customer__name=customer_name,
                date__gt=min_date + timedelta(days=2*date_range//3)
            ).count()

            self.stdout.write(f"{customer_name}:")
            self.stdout.write(f"  Early period: {early_count} transactions")
            self.stdout.write(f"  Mid period: {mid_count} transactions")
            self.stdout.write(f"  Late period: {late_count} transactions")
