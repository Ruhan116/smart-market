import math
import os
import random
import sys
import uuid
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone as dt_timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

import django
from django.utils import timezone

# Ensure Django settings are loaded
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")
django.setup()

from accounts.models import Business  # noqa: E402
from data.models import Customer, Product  # noqa: E402

OUTPUT_PATH = Path(__file__).resolve().parent.parent / "sql" / "synthetic_transactions.sql"

# Configuration defaults
TOTAL_DAYS = int(os.getenv("SYNTHETIC_DAYS", "120"))
MAX_TRANSACTIONS_PER_DAY = int(os.getenv("SYNTHETIC_MAX_PER_DAY", "6"))
RANDOM_SEED = os.getenv("SYNTHETIC_RANDOM_SEED")
ALLOW_FUTURE = os.getenv("SYNTHETIC_ALLOW_FUTURE", "false").lower() == "true"

if RANDOM_SEED is not None:
    random.seed(int(RANDOM_SEED))

PAYMENT_METHODS = ["cash", "bkash", "nagad", "rocket", "card"]
REFERENCE_TYPE_SALE = "synthetic_sale"
REFERENCE_TYPE_RESTOCK = "synthetic_restock"
NOTES_SALE = "Synthetic transaction generated for analytics"
NOTES_RESTOCK = "Synthetic restock to support synthetic sales"


@dataclass
class ProductContext:
    product: Product
    stock: int
    last_timestamp: datetime


@dataclass
class SQLStatement:
    statement: str


def sql_literal(value) -> str:
    """Convert Python value to SQL literal string."""
    if value is None:
        return "NULL"
    if isinstance(value, uuid.UUID):
        return f"'{value}'"
    if isinstance(value, str):
        return "'" + value.replace("'", "''") + "'"
    if isinstance(value, (datetime, date)):
        if isinstance(value, datetime):
            if timezone.is_naive(value):
                value = timezone.make_aware(value, timezone.get_default_timezone())
            value = value.astimezone(dt_timezone.utc)
            return "'" + value.strftime("%Y-%m-%d %H:%M:%S%z") + "'"
        return f"'{value.isoformat()}'"
    if isinstance(value, time):
        return f"'{value.strftime('%H:%M:%S')}'"
    if isinstance(value, Decimal):
        return format(value, 'f')
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    return str(value)


def poisson_sample(lam: float) -> int:
    """Sample from a Poisson distribution using Knuth's algorithm."""
    if lam <= 0:
        return 0
    L = math.exp(-lam)
    k = 0
    p = 1.0
    while p > L:
        k += 1
        p *= random.random()
    return max(0, k - 1)


def random_time_within_day() -> time:
    hour = random.randint(9, 21)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return time(hour, minute, second)


def ensure_decimal_price(product: Product) -> Decimal:
    price = product.unit_price
    if not price or price <= 0:
        price = Decimal(random.uniform(50, 750)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return price


def generate_for_product(context: ProductContext, customers, statements):
    product = context.product
    stock = context.stock
    last_ts = context.last_timestamp

    base_rate = max(1, product.reorder_point or 10) / 3
    start_date = timezone.now().date() - timedelta(days=TOTAL_DAYS)
    end_date = timezone.now().date() + (timedelta(days=7) if ALLOW_FUTURE else timedelta(days=0))

    current_date = start_date
    while current_date <= end_date:
        if current_date > timezone.now().date() and not ALLOW_FUTURE:
            break

        lam = min(MAX_TRANSACTIONS_PER_DAY, base_rate) / 1.5
        count = min(MAX_TRANSACTIONS_PER_DAY, poisson_sample(lam))

        for _ in range(count):
            quantity = max(1, int(random.gauss(mu=3, sigma=1.5)))
            quantity = min(quantity, 25)

            sale_time = random_time_within_day()
            sale_dt = datetime.combine(current_date, sale_time)
            sale_dt = timezone.make_aware(sale_dt, timezone.get_default_timezone())

            # Restock if needed
            if stock < quantity:
                restock_amount = max(quantity * 2, product.reorder_point or quantity * 2)
                restock_id = uuid.uuid4()
                reference_id = uuid.uuid4()
                restock_before = stock
                stock += restock_amount
                restock_dt = sale_dt - timedelta(minutes=random.randint(5, 30))

                statements.append(SQLStatement(
                    statement=(
                        "INSERT INTO data_stockmovement (movement_id, business_id, product_id, movement_type, quantity_changed, "
                        "stock_before, stock_after, reference_type, reference_id, notes, created_by_id, created_at) VALUES "
                        f"({sql_literal(restock_id)}, {sql_literal(product.business_id)}, {sql_literal(product.product_id)}, "
                        f"'restock', {restock_amount}, {restock_before}, {stock}, {sql_literal(REFERENCE_TYPE_RESTOCK)}, "
                        f"{sql_literal(reference_id)}, {sql_literal(NOTES_RESTOCK)}, NULL, {sql_literal(restock_dt)})"
                    )
                ))
                last_ts = max(last_ts, restock_dt)

            # Record sale stock movement
            stock_before_sale = stock
            stock -= quantity
            sale_reference_id = uuid.uuid4()
            movement_id = uuid.uuid4()
            statements.append(SQLStatement(
                statement=(
                    "INSERT INTO data_stockmovement (movement_id, business_id, product_id, movement_type, quantity_changed, "
                    "stock_before, stock_after, reference_type, reference_id, notes, created_by_id, created_at) VALUES "
                    f"({sql_literal(movement_id)}, {sql_literal(product.business_id)}, {sql_literal(product.product_id)}, 'sale', {-quantity}, "
                    f"{stock_before_sale}, {stock}, {sql_literal(REFERENCE_TYPE_SALE)}, {sql_literal(sale_reference_id)}, {sql_literal(NOTES_SALE)}, NULL, {sql_literal(sale_dt)})"
                )
            ))

            unit_price = ensure_decimal_price(product)
            amount = (unit_price * quantity).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            transaction_id = uuid.uuid4()
            customer = random.choice(customers) if customers else None
            customer_literal = sql_literal(customer.customer_id) if customer else "NULL"

            statements.append(SQLStatement(
                statement=(
                    "INSERT INTO data_transaction (transaction_id, business_id, product_id, customer_id, date, time, quantity, unit_price, amount, "
                    "payment_method, notes, csv_import_hash, file_upload_id, created_at) VALUES "
                    f"({sql_literal(transaction_id)}, {sql_literal(product.business_id)}, {sql_literal(product.product_id)}, {customer_literal}, "
                    f"{sql_literal(current_date)}, {sql_literal(sale_time)}, {quantity}, {sql_literal(unit_price)}, {sql_literal(amount)}, "
                    f"{sql_literal(random.choice(PAYMENT_METHODS))}, {sql_literal(NOTES_SALE)}, NULL, NULL, {sql_literal(sale_dt)})"
                )
            ))

            last_ts = max(last_ts, sale_dt)

        current_date += timedelta(days=1)

    context.stock = stock
    context.last_timestamp = last_ts

    statements.append(SQLStatement(
        statement=(
            "UPDATE data_product SET current_stock = {stock}, updated_at = {updated_at} WHERE product_id = {product_id}"
            .format(
                stock=context.stock,
                updated_at=sql_literal(context.last_timestamp),
                product_id=sql_literal(product.product_id),
            )
        )
    ))


def build_statements():
    statements = [SQLStatement("BEGIN;")]
    total_inserted = 0

    for business in Business.objects.all():
        products = list(Product.objects.filter(business=business))
        if not products:
            continue

        customers = list(Customer.objects.filter(business=business))

        for product in products:
            context = ProductContext(
                product=product,
                stock=product.current_stock,
                last_timestamp=timezone.now(),
            )
            before_count = len(statements)
            generate_for_product(context, customers, statements)
            total_inserted += len(statements) - before_count

    statements.append(SQLStatement("COMMIT;"))
    return statements, total_inserted


def main():
    statements, total_inserted = build_statements()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_PATH.open("w", encoding="utf-8") as sql_file:
        for stmt in statements:
            sql_file.write(stmt.statement)
            if not stmt.statement.endswith(";"):
                sql_file.write(";")
            sql_file.write("\n")

    print(f"Wrote {len(statements) - 2} SQL statements to {OUTPUT_PATH}")
    print(f"Approximate inserts/updates: {total_inserted}")


if __name__ == "__main__":
    main()
