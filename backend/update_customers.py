import os
import django
from django.db import connection
from datetime import timedelta
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from data.models import Transaction, Customer

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

print("Step 1: Getting all transactions...")
all_transactions = list(Transaction.objects.all().order_by('date').values('transaction_id', 'date', 'business_id'))
total_transactions = len(all_transactions)

print(f"Total transactions: {total_transactions}")

# Define customer patterns
rare_customers = [bengali_names[0], bengali_names[1]]
declining_customers = [bengali_names[2], bengali_names[3], bengali_names[4], bengali_names[5]]
regular_customers = bengali_names[6:]

print(f"\nCustomer patterns:")
print(f"  Rare customers (5-8%): {rare_customers}")
print(f"  Declining customers: {declining_customers}")
print(f"  Regular customers: {regular_customers}")

# Get date range
min_date = min([t['date'] for t in all_transactions])
max_date = max([t['date'] for t in all_transactions])
date_range = (max_date - min_date).days

print(f"\nDate range: {min_date} to {max_date} ({date_range} days)")

# Step 1: Pre-assign customer names to each transaction
print("\nStep 2: Pre-assigning customer names...")
transaction_customer_names = {}
for idx, trans in enumerate(all_transactions):
    days_from_start = (trans['date'] - min_date).days
    time_progress = days_from_start / date_range if date_range > 0 else 0

    if random.random() < 0.05:
        customer_name = random.choice(rare_customers)
    elif random.random() < (1 - time_progress) * 0.25:
        customer_name = random.choice(declining_customers)
    else:
        customer_name = random.choice(regular_customers)

    transaction_customer_names[trans['transaction_id']] = (trans['business_id'], customer_name)

    if (idx + 1) % 2000 == 0:
        print(f"  Pre-assigned {idx + 1}/{total_transactions}...")

# Step 2: Create or get all unique customers
print("\nStep 3: Creating customer records...")
unique_customers = {}
for trans_id, (business_id, customer_name) in transaction_customer_names.items():
    key = (business_id, customer_name)
    if key not in unique_customers:
        customer, created = Customer.objects.get_or_create(
            business_id=business_id,
            name=customer_name
        )
        unique_customers[key] = customer.customer_id

# Step 3: Bulk update transactions
print(f"\nStep 4: Performing bulk update of {total_transactions} transactions...")
update_count = 0
with connection.cursor() as cursor:
    for trans_id, (business_id, customer_name) in transaction_customer_names.items():
        key = (business_id, customer_name)
        customer_id = unique_customers[key]
        cursor.execute(
            "UPDATE data_transaction SET customer_id = %s WHERE transaction_id = %s",
            [customer_id, trans_id]
        )
        update_count += 1

        if update_count % 2000 == 0:
            print(f"  Updated {update_count}/{total_transactions}...")

print(f"✅ Updated {update_count} transactions")

# Print statistics
print("\n=== Customer Distribution Stats ===\n")
for name in bengali_names:
    count = Transaction.objects.filter(customer__name=name).count()
    if count > 0:
        percentage = (count / total_transactions) * 100
        print(f"{name}: {count} transactions ({percentage:.1f}%)")

# Show declining pattern
print("\n=== Declining Customers Pattern ===\n")
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

    print(f"{customer_name}:")
    print(f"  Early period: {early_count} transactions")
    print(f"  Mid period: {mid_count} transactions")
    print(f"  Late period: {late_count} transactions")

print("\n✅ All done!")
