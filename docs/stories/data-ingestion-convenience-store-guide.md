# Data Ingestion Guide: Convenience Store Context

**Purpose:** Define how a convenience store owner records sales, how that data is parsed, and how it flows to forecasting models.

**Example Store:** Sheba's Convenience Store, Dhaka, Bangladesh

---

## Part 1: CSV Schema for Convenience Store

### Real-World Convenience Store Sales

A convenience store owner typically has:
- Morning inventory count
- Daily sales transactions (customer walk-ins, repeat customers)
- Product variety (snacks, drinks, toiletries, household items)
- Multiple payment methods (cash, bKash, Nagad)
- Minimal bookkeeping (often handwritten, then digitized)

### Minimal CSV Format (What Store Owner Can Provide)

**Most realistic input - Store owner exports from mobile banking or handwritten log:**

```csv
Date,Product,Quantity,Amount
2025-11-01,Chips,5,150
2025-11-01,Cold Drink,8,400
2025-11-01,Soap,3,90
2025-11-02,Chips,3,90
2025-11-02,Cold Drink,12,600
```

**Problems with minimal format:**
- ❌ No customer tracking
- ❌ No payment method (assume cash)
- ❌ Duplicate products hard to identify
- ❌ Can't do RFM analysis

---

### Recommended CSV Format (For Full Features)

**What we recommend store owner provide:**

```csv
Date,Time,Product,Quantity,UnitPrice,Amount,Customer,PaymentMethod,Notes
2025-11-01,09:30,Lay's Chips (40g),5,30,150,Fatema,Cash,
2025-11-01,10:15,Cold Drink (500ml),8,50,400,Walk-in,Cash,
2025-11-01,10:45,Soap Bar,3,30,90,Ali,bKash,Reg customer
2025-11-01,14:20,Lay's Chips (40g),2,30,60,Zara,Nagad,
2025-11-01,18:00,Instant Noodles,10,25,250,Store Sale,Cash,Staff bought for resale
2025-11-02,08:00,Chips,3,30,90,,,Invalid product name
```

**Column Details:**

| Column | Type | Required? | Validation | Example | Notes |
|--------|------|-----------|-----------|---------|-------|
| **Date** | YYYY-MM-DD | ✅ YES | Past date only | 2025-11-01 | No future dates |
| **Time** | HH:MM | ❌ NO | 24-hour format | 09:30 | For intra-day patterns (Phase 2) |
| **Product** | String | ✅ YES | Exact match or fuzzy match | Lay's Chips (40g) | Must be consistent naming |
| **Quantity** | Integer | ✅ YES | >0, <1000 | 5 | Units sold (pieces, bottles, etc) |
| **UnitPrice** | Decimal | ❌ NO | >0, <10000 TK | 30 | Price per unit (for tracking margin) |
| **Amount** | Decimal | ✅ YES | >0, <100000 TK | 150 | Total = Quantity × UnitPrice |
| **Customer** | String | ❌ NO | Max 100 chars | Fatema | "Walk-in" for anonymous |
| **PaymentMethod** | Enum | ❌ NO | cash/bkash/nagad/rocket/card/credit/other | Cash | Default to "cash" if empty |
| **Notes** | String | ❌ NO | Max 500 chars | Reg customer | For manual notes, debugging |

---

## Part 2: Data Parsing Logic

### 2.1 CSV Parsing Pipeline

```
Raw CSV File
    ↓
[1] Load & Validate Format
    ├─ Required columns: Date, Product, Quantity, Amount
    ├─ File size: <10MB
    ├─ Encoding: UTF-8
    └─ Rows: 1-100,000
    ↓
[2] Parse Each Row
    ├─ Validate data types
    ├─ Check value ranges
    ├─ Handle missing optional fields
    └─ Skip invalid rows (log error)
    ↓
[3] Auto-Create/Lookup
    ├─ Product: Lookup or create
    ├─ Customer: Lookup or create
    └─ PaymentMethod: Map enum
    ↓
[4] Duplicate Detection
    ├─ Hash: MD5(date + product + quantity + amount + customer)
    ├─ Check: If exists, skip
    └─ Store hash in Transaction record
    ↓
[5] Update Stock & Create Records
    ├─ Create Transaction
    ├─ Update Product.current_stock
    ├─ Update Customer metrics
    └─ Enqueue downstream jobs
    ↓
Database: Transaction, Product, Customer models populated
```

### 2.2 Row-by-Row Parsing Logic

**Pseudo-code for `CSVParserService.parse_row()`:**

```python
def parse_row(row, business_id, user_id):
    """
    Parse single CSV row into Transaction object.

    Args:
        row: dict from CSV (columns as keys)
        business_id: Which business owns this transaction
        user_id: Who uploaded this

    Returns:
        Transaction object or None if skipped

    Raises:
        ValidationError if required field invalid
    """

    # 1. EXTRACT & VALIDATE REQUIRED FIELDS
    try:
        date_str = row.get('Date', '').strip()
        product_name = row.get('Product', '').strip()
        quantity_str = row.get('Quantity', '')
        amount_str = row.get('Amount', '')
    except Exception as e:
        log_error(f"Failed to extract fields: {e}")
        return None

    # 2. VALIDATE DATE
    try:
        transaction_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        if transaction_date > datetime.today().date():
            log_error(f"Future date not allowed: {transaction_date}")
            return None
    except ValueError as e:
        log_error(f"Invalid date format '{date_str}': {e}")
        return None

    # 3. VALIDATE PRODUCT (Required)
    if not product_name or len(product_name) == 0:
        log_error("Product name is required")
        return None
    if len(product_name) > 255:
        log_error(f"Product name too long: {len(product_name)} chars")
        return None

    # 4. VALIDATE QUANTITY (Required, >0)
    try:
        quantity = int(quantity_str)
        if quantity <= 0:
            log_error(f"Quantity must be > 0: {quantity}")
            return None
        if quantity > 1000:
            log_error(f"Quantity sanity check failed (>1000): {quantity}")
            return None
    except ValueError:
        log_error(f"Quantity must be integer: '{quantity_str}'")
        return None

    # 5. VALIDATE AMOUNT (Required, >0)
    try:
        amount = Decimal(amount_str)
        if amount <= 0:
            log_error(f"Amount must be > 0: {amount}")
            return None
        if amount > Decimal('100000'):  # 100K TK max
            log_error(f"Amount sanity check failed (>100K): {amount}")
            return None
    except (ValueError, InvalidOperation):
        log_error(f"Amount must be decimal: '{amount_str}'")
        return None

    # 6. EXTRACT OPTIONAL FIELDS
    customer_name = row.get('Customer', '').strip() or 'Walk-in'
    payment_method = row.get('PaymentMethod', '').strip().lower() or 'cash'
    unit_price = Decimal(row.get('UnitPrice', 0)) if row.get('UnitPrice') else None
    notes = row.get('Notes', '').strip()[:500]

    # 7. VALIDATE PAYMENT METHOD
    valid_methods = ['cash', 'bkash', 'nagad', 'rocket', 'card', 'credit', 'other']
    if payment_method not in valid_methods:
        log_warning(f"Unknown payment method '{payment_method}', defaulting to 'other'")
        payment_method = 'other'

    # 8. AUTO-CREATE/LOOKUP PRODUCT
    try:
        product, created = Product.objects.get_or_create(
            business_id=business_id,
            name=product_name,
            defaults={
                'sku': generate_sku(product_name),
                'unit_price': unit_price or amount / quantity,
                'current_stock': 0,  # Will update below
            }
        )
        if created:
            log_info(f"Auto-created product: {product_name}")
    except Exception as e:
        log_error(f"Failed to create product: {e}")
        return None

    # 9. AUTO-CREATE/LOOKUP CUSTOMER
    if customer_name != 'Walk-in':
        try:
            customer, created = Customer.objects.get_or_create(
                business_id=business_id,
                name=customer_name,
                defaults={
                    'phone': None,
                    'email': None,
                }
            )
            if created:
                log_info(f"Auto-created customer: {customer_name}")
        except Exception as e:
            log_error(f"Failed to create customer: {e}")
            customer = None
    else:
        customer = None

    # 10. DUPLICATE DETECTION
    import hashlib
    row_hash = hashlib.md5(
        f"{transaction_date}{product_name}{quantity}{amount}{customer_name}".encode()
    ).hexdigest()

    if Transaction.objects.filter(
        business_id=business_id,
        csv_import_hash=row_hash
    ).exists():
        log_warning(f"Duplicate detected: {product_name} x{quantity} on {transaction_date}")
        return None  # Skip duplicate

    # 11. CREATE TRANSACTION RECORD
    try:
        transaction = Transaction(
            business_id=business_id,
            date=transaction_date,
            product=product,
            customer=customer,
            quantity=quantity,
            unit_price=unit_price or (amount / quantity),
            amount=amount,
            payment_method=payment_method,
            notes=notes,
            csv_import_hash=row_hash,
            data_source='csv_upload',
            is_verified=True,
        )
        transaction.save()
    except Exception as e:
        log_error(f"Failed to save transaction: {e}")
        return None

    # 12. UPDATE PRODUCT STOCK
    try:
        product.current_stock -= quantity
        product.last_stock_update = datetime.now()
        product.save(update_fields=['current_stock', 'last_stock_update'])
    except Exception as e:
        log_error(f"Failed to update stock: {e}")
        # Don't fail transaction creation

    # 13. UPDATE CUSTOMER METRICS (will be recalculated by RFM task)
    # Just mark as needing recalculation
    if customer:
        # Trigger rfm.recalculate task later
        pass

    log_info(f"✅ Parsed row: {product_name} x{quantity} for ৳{amount}")
    return transaction
```

### 2.3 Validation Rules Summary

**For Convenience Store:**

| Field | Validation | Example Valid | Example Invalid |
|-------|-----------|---------------|-----------------|
| **Date** | YYYY-MM-DD, past only | 2025-11-01 | 2025-12-25, Nov 1, 2025-11 |
| **Product** | String, not empty, <255 chars | Lay's Chips | (empty), "Very long product name..." |
| **Quantity** | Integer, 1-1000 | 5 | 0, -5, 1001, 5.5 |
| **Amount** | Decimal, 0-100000 TK | 150.00 | -10, 200000, "one-fifty" |
| **Customer** | String or "Walk-in" | Fatema, Walk-in | (keep empty → Walk-in) |
| **PaymentMethod** | Enum (case-insensitive) | cash, bKash, Nagad | "mobile", (empty → cash) |

---

## Part 3: How Data Flows to the Model (Prophet)

### 3.1 Complete Data Flow Diagram

```
Convenience Store Owner's CSV
    ↓
[Upload to SmartMarket via /data/upload-csv]
    ↓
{202 ACCEPTED} - Returns immediately
    ↓
[Celery Worker: Parse CSV asynchronously]
    ├─ For each row:
    │  ├─ Validate fields
    │  ├─ Auto-create Product/Customer
    │  ├─ Detect duplicates
    │  ├─ Create Transaction record
    │  └─ Update Product stock
    │
    ├─ Log results: 95 created, 5 skipped (duplicates)
    │
    └─ On completion:
       ├─ Trigger: transaction.parsed event
       └─ Enqueue: forecast.requested, rfm.recalculate tasks
    ↓
[Database: Transaction table populated]
    │
    ├─ Format: (id, business_id, date, product_id, customer_id, quantity, amount, payment_method)
    ├─ Indexed: (business_id, date), (business_id, product_id)
    └─ Example:
       id | business_id | date       | product_id | quantity | amount | payment_method
       1  | 42          | 2025-11-01 | 123        | 5        | 150.00 | cash
       2  | 42          | 2025-11-01 | 124        | 8        | 400.00 | cash
       3  | 42          | 2025-11-02 | 123        | 3        | 90.00  | cash
    ↓
[Prophet Model: Forecast Demand]
    │
    ├─ For each Product in the store:
    │  ├─ Query: All transactions for this product (business_id + product_id)
    │  │         SELECT date, SUM(quantity) as daily_sales FROM transactions
    │  │         WHERE business_id=42 AND product_id=123
    │  │         GROUP BY date
    │  │         ORDER BY date
    │  │
    │  ├─ Validate: Minimum 30 days of data
    │  │            If <30: "Need more data" message
    │  │            If ≥30: Proceed with training
    │  │
    │  ├─ Transform: Convert to Prophet format
    │  │   {
    │  │     'ds': '2025-11-01', 'y': 5,      # day 1: 5 units
    │  │     'ds': '2025-11-02', 'y': 3,      # day 2: 3 units
    │  │     'ds': '2025-11-03', 'y': 0,      # day 3: no sales
    │  │     ...
    │  │   }
    │  │
    │  ├─ Train: Prophet model with:
    │  │   - Yearly seasonality (peaks around holidays)
    │  │   - Weekly seasonality (weekends vs weekdays)
    │  │   - Additive model (sales = trend + seasonality)
    │  │   - Holidays (Eid, Puja, New Year)
    │  │
    │  └─ Forecast: Next 7/14 days with 95% confidence intervals
    │     {
    │       'date': '2025-11-04', 'yhat': 4.2, 'yhat_lower': 2.1, 'yhat_upper': 6.3,
    │       'date': '2025-11-05', 'yhat': 5.1, 'yhat_lower': 3.0, 'yhat_upper': 7.2,
    │       ...
    │     }
    │
    └─ Store results in Forecast table
       id | business_id | product_id | date       | forecast_days | yhat | yhat_lower | yhat_upper | mape
       1  | 42          | 123        | 2025-11-03 | 7             | JSON | JSON       | JSON       | 15.3%
    ↓
[Recommendation Engine: Generate Actions]
    │
    ├─ Check: Current stock vs Forecast demand
    │  Example: Current stock = 5, Next 7 days forecast = 28 units
    │           → Stockout in 2 days!
    │           → Recommendation: "Reorder Lay's Chips by Nov 5"
    │
    ├─ Store in Recommendation table
    │  id | business_id | type    | title                    | urgency | priority_score
    │  1  | 42          | reorder | Reorder Lay's Chips      | high    | 0.88
    │
    └─ Display on Dashboard
       ✅ "Stock ending soon!"
          Current: 5 units
          Predicted demand (7d): 28 units
          → Click to execute (reorder from supplier)
```

### 3.2 SQL Query: Extract Time Series for Prophet

**What Prophet actually receives:**

```sql
-- Get all transactions for product (Lay's Chips) in Store 42
SELECT
    DATE(t.date) as day,
    SUM(t.quantity) as daily_sales
FROM transactions t
WHERE t.business_id = 42
  AND t.product_id = 123
  AND t.date >= DATE_SUB(NOW(), INTERVAL 120 DAY)  -- Last 120 days
GROUP BY DATE(t.date)
ORDER BY day ASC;

-- Result:
-- day         | daily_sales
-- 2025-07-16  | 0
-- 2025-07-17  | 0
-- 2025-07-18  | 0
-- 2025-07-19  | 2
-- 2025-07-20  | 5
-- 2025-07-21  | 3
-- 2025-07-22  | 0
-- ...
-- 2025-11-01  | 5
-- 2025-11-02  | 3
-- 2025-11-03  | 0
```

**Converted to Prophet format:**

```python
prophet_df = pd.DataFrame({
    'ds': pd.date_range(start='2025-07-16', periods=109, freq='D'),
    'y': [0, 0, 0, 2, 5, 3, 0, ..., 5, 3, 0]
})

# Feed to Prophet
model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
model.fit(prophet_df)

# Get forecast for next 7 days
future = model.make_future_dataframe(periods=7)
forecast = model.predict(future)

# Result:
#          ds      yhat  yhat_lower  yhat_upper
# ...
# 2025-11-04   4.2      2.1         6.3
# 2025-11-05   5.1      3.0         7.2
# 2025-11-06   2.8      0.7         5.0
# 2025-11-07   1.9      0.0         4.1
# 2025-11-08   3.5      1.4         5.7
# 2025-11-09   6.2      4.0         8.4
# 2025-11-10   7.1      4.8         9.3
```

### 3.3 Example: From CSV to Forecast (Convenience Store)

**Step 1: CSV Uploaded by Store Owner**

```csv
Date,Product,Quantity,Amount,Customer,PaymentMethod
2025-11-01,Lay's Chips,5,150,Fatema,Cash
2025-11-01,Cold Drink,8,400,Walk-in,Cash
2025-11-02,Lay's Chips,3,90,Zara,bKash
2025-11-03,Lay's Chips,0,0,,,
2025-11-03,Cold Drink,12,600,Ali,Nagad
```

**Step 2: Parsed & Stored in Transaction Table**

```
Database tables after parsing:

PRODUCT table:
id | business_id | name         | unit_price | current_stock
123| 42          | Lay's Chips  | 30         | 12           (was 20, sold 8)
124| 42          | Cold Drink   | 50         | 0            (was 20, sold 20)

TRANSACTION table:
id | date       | product_id | quantity | amount
1  | 2025-11-01 | 123        | 5        | 150
2  | 2025-11-01 | 124        | 8        | 400
3  | 2025-11-02 | 123        | 3        | 90
4  | 2025-11-03 | 124        | 12       | 600
```

**Step 3: Extract Time Series**

```
For Lay's Chips (product_id=123):
date       | daily_sales
2025-10-05 | 2
2025-10-06 | 1
...
2025-11-01 | 5     ← from CSV
2025-11-02 | 3     ← from CSV
2025-11-03 | 0     ← no sales
2025-11-04 | 0     (future - not in CSV yet)
```

**Step 4: Prophet Forecast**

```
Forecast for Lay's Chips (next 7 days):

date       | yhat (forecast) | yhat_lower | yhat_upper | confidence
2025-11-04 | 4.2            | 2.1        | 6.3        | 95%
2025-11-05 | 5.1            | 3.0        | 7.2        | 95%
2025-11-06 | 2.8            | 0.7        | 5.0        | 95%
2025-11-07 | 1.9            | 0.0        | 4.1        | 95%
2025-11-08 | 3.5            | 1.4        | 5.7        | 95%
2025-11-09 | 6.2            | 4.0        | 8.4        | 95%
2025-11-10 | 7.1            | 4.8        | 9.3        | 95%

Total 7-day forecast: 30.8 units
```

**Step 5: Recommendation Generated**

```
Current stock: 12 units
7-day forecast: 30.8 units (average 4.4/day)

Analysis:
- Current stock only covers 2.7 days
- Will run out by Nov 4 at 9 AM
- Days until stockout: 1 day

ALERT: REORDER IMMEDIATELY!
Recommendation: "Reorder 50 Lay's Chips by Nov 3"
Priority: HIGH (0.88/1.0)
```

**Step 6: Dashboard Display**

```
🔴 REORDER NEEDED
  Product: Lay's Chips
  Current Stock: 12 units
  7-Day Demand: 30 units
  Days Until Stockout: 1.3 days

  Recommended Action: Order 50 units by Nov 3

  [View Details] [Execute Order] [Dismiss]
```

---

## Part 4: Data Quality Considerations for Convenience Stores

### 4.1 Common Issues & Solutions

| Issue | Root Cause | Solution | Example |
|-------|-----------|----------|---------|
| **Inconsistent product names** | Store owner types differently each time | Fuzzy matching on create | "Chips" vs "Lay's Chips" vs "CHIPS" |
| **Missing time-of-day** | Owner records only date | Default to 00:00 + seasonal patterns (Phase 2) | "2025-11-01" → time = "00:00" |
| **Walk-in customers all grouped** | No customer tracking system | RFM only counts identified customers; walk-ins excluded from retention | 80% of sales are walk-ins |
| **Zero sales days not recorded** | CSV only includes days with sales | Query database + fill gaps with 0 | Nov 3: no CSV row → assume 0 sales |
| **Negative stock after uploads** | Stock was never recorded accurately | Allow negative in MVP, warn in Phase 2 | Sold 100 but only recorded 50 |
| **Old data uploaded suddenly** | Store owner found old ledger | Duplicate detection prevents re-processing | Old July ledger uploaded in November |

### 4.2 Data Validation Checklist (for Store Owner)

**Before uploading CSV:**
- ✅ Date format: YYYY-MM-DD (e.g., 2025-11-01)
- ✅ Product name: Consistent (e.g., always "Lay's Chips", not "Chips")
- ✅ Quantity: Positive integer (e.g., 5, not -5)
- ✅ Amount: Positive number (e.g., 150, not -150)
- ✅ No future dates
- ✅ No empty required columns
- ✅ Payment method: cash, bKash, Nagad, Rocket, Card, Credit, or Other

**Good CSV Example:**
```csv
Date,Product,Quantity,Amount
2025-10-01,Lay's Chips,2,60
2025-10-01,Cold Drink,5,250
2025-10-02,Lay's Chips,3,90
```

**Bad CSV Example (will fail):**
```csv
Date,Product,Quantity,Amount
Oct 1,Chips,2,60              ← Date not YYYY-MM-DD
2025-10-01,Lay's Chips,-5,150  ← Negative quantity
2025-10-01,Soap,,90           ← Missing quantity
2025-12-25,Tea,3,75           ← Future date (if run today is before Dec 25)
```

---

## Part 5: Integration with RFM & Churn Detection

### 5.1 Customer RFM After CSV Upload

**After parsing transactions, RFM is recalculated:**

```python
# Transaction data from CSV
Transactions:
  date: 2025-11-01, customer: Fatema, amount: 150
  date: 2025-11-02, customer: Fatema, amount: 90
  date: 2025-10-15, customer: Fatema, amount: 200
  date: 2025-09-01, customer: Fatema, amount: 300

# RFM Calculation
Recency: Days since last purchase = 1 day (purchased 2025-11-02)
Frequency: Total purchases = 4
Monetary: Total spent = 740 TK

RFM Scores (1-5 scale):
  Recency score: 5 (purchased recently)
  Frequency score: 3 (moderate, not frequent)
  Monetary score: 2 (low total spend for this period)

RFM Segment: "Potential" (not champion, not at-risk)
Churn risk: Low (purchased recently, low risk of churn)
```

### 5.2 Triggering Downstream Tasks

```
CSV Upload → Parse → transaction.parsed event
                         ↓
                    ┌─────┴─────┐
                    ↓           ↓
            forecast.requested  rfm.recalculate
                ↓               ↓
            Prophet trains    RFM scores updated
            Forecasts stored  Churn risk scores stored
                ↓               ↓
            recommendation.generated (after both complete)
                ↓
            Recommendations generated
            Displayed on dashboard
```

---

## Part 6: Practical Django Implementation

### 6.1 CSV Parser Service Skeleton

```python
# apps/transactions/services.py

class CSVParserService:
    """
    Parse CSV uploads for convenience stores.

    Expected columns (required):
    - Date (YYYY-MM-DD)
    - Product (string)
    - Quantity (integer)
    - Amount (decimal)

    Expected columns (optional):
    - Customer (string, default 'Walk-in')
    - PaymentMethod (enum, default 'cash')
    - Notes (string)
    """

    def __init__(self, business_id, user_id):
        self.business_id = business_id
        self.user_id = user_id
        self.created_count = 0
        self.skipped_count = 0
        self.errors = []

    def parse(self, file_path):
        """
        Parse CSV file and create transactions.

        Returns:
            {
                'created_count': 95,
                'skipped_count': 5,
                'errors': [
                    {'row': 2, 'field': 'Quantity', 'error': 'Must be > 0'},
                    ...
                ]
            }
        """

        df = pd.read_csv(file_path)

        # Validate required columns
        required = ['Date', 'Product', 'Quantity', 'Amount']
        missing = [col for col in required if col not in df.columns]
        if missing:
            raise ValidationError(f"Missing required columns: {missing}")

        # Parse each row
        for idx, row in df.iterrows():
            try:
                transaction = self.parse_row(row)
                if transaction:
                    transaction.save()
                    self.created_count += 1
            except ValidationError as e:
                self.errors.append({'row': idx + 2, 'error': str(e)})
                self.skipped_count += 1
            except Exception as e:
                self.errors.append({'row': idx + 2, 'error': f'Database error: {str(e)}'})
                self.skipped_count += 1

        return {
            'created_count': self.created_count,
            'skipped_count': self.skipped_count,
            'errors': self.errors
        }

    def parse_row(self, row):
        """
        Parse single row. Raises ValidationError if invalid.

        Returns:
            Transaction object (not yet saved)
        """
        # [Implementation from Part 2.2 above]
        pass
```

### 6.2 Celery Task for Async Processing

```python
# apps/transactions/tasks.py

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def transaction_uploaded(self, file_id, business_id, user_id):
    """
    Async task: Parse CSV file and create transactions.

    Enqueued by: POST /data/upload-csv endpoint
    Triggers downstream: transaction.parsed, forecast.requested, rfm.recalculate
    """

    try:
        # Load file from storage
        file_record = FileUploadRecord.objects.get(id=file_id)
        file_path = file_record.file_path

        # Parse
        parser = CSVParserService(business_id, user_id)
        result = parser.parse(file_path)

        # Store result
        file_record.status = 'completed'
        file_record.created_count = result['created_count']
        file_record.skipped_count = result['skipped_count']
        file_record.errors = result['errors']
        file_record.save()

        # Trigger downstream tasks
        publish_event('transaction.parsed', {
            'business_id': business_id,
            'file_id': file_id,
            'transaction_count': result['created_count']
        })

        return {
            'status': 'success',
            'created': result['created_count'],
            'skipped': result['skipped_count']
        }

    except Exception as exc:
        # Retry with backoff
        raise self.retry(exc=exc)
```

---

## Summary: Convenience Store Data Flow

```
Store Owner's Daily Log (Paper or Mobile Spreadsheet)
    ↓ [Digitized to CSV]
    ↓
Date,Product,Quantity,Amount,Customer,PaymentMethod
2025-11-01,Lay's Chips,5,150,Fatema,Cash
2025-11-02,Lay's Chips,3,90,Zara,bKash
    ↓ [Upload via /data/upload-csv]
    ↓
SmartMarket Backend (202 ACCEPTED)
    ↓ [Celery Worker]
    ├─ Validates: Date format, Quantity > 0, Amount > 0
    ├─ Auto-creates: Products, Customers
    ├─ Detects: Duplicates (MD5 hash)
    ├─ Updates: Product.current_stock
    └─ Creates: Transaction records
    ↓
Database (Transaction, Product, Customer tables)
    ↓ [Trigger downstream jobs]
    ├─ transaction.parsed
    │  ├─→ rfm.recalculate (recalculates RFM scores)
    │  └─→ forecast.requested (trains Prophet models)
    │
    ├─ forecast.requested
    │  ├─ Query: SELECT DATE(date), SUM(quantity) FROM transactions
    │  ├─ Filter: product_id = 123 AND business_id = 42
    │  ├─ Validate: Minimum 30 days data
    │  ├─ Train: Prophet(yearly + weekly seasonality)
    │  └─ Forecast: Next 7/14/30 days with confidence intervals
    │
    └─ recommendation.generated
       ├─ Check: Current stock vs Forecast demand
       ├─ Generate: Reorder alerts, Churn retention, Cash flow warnings
       └─ Display: On dashboard with actions
    ↓
Customer Dashboard
    ├─ 🔴 "Reorder Lay's Chips by Nov 4"
    ├─ 🟡 "Cash flow low on Nov 15"
    └─ 🟢 "Fatema: Valuable customer, zero churn risk"
```

---

## Next Steps for Development

1. **Implement CSV Parser** (Story 3.2)
   - Use validation rules from Part 2.2
   - Handle missing columns gracefully
   - Skip invalid rows with error logging

2. **Upload Endpoint** (Story 3.1)
   - Accept CSV file, return 202 ACCEPTED
   - Enqueue Celery task

3. **Test with Real Data**
   - Create sample convenience store CSV
   - Upload and verify database is populated
   - Check downstream tasks are enqueued

4. **Integrate with Prophet** (Epic 4)
   - Use SQL query from Part 3.2
   - Feed to Prophet for forecasting

5. **Display on Dashboard** (Epic 7)
   - Show transactions
   - Show forecasts
   - Show recommendations
