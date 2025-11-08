# Quick Reference: Convenience Store CSV Schema

## What Store Owner Provides

### Minimum CSV (Bare Essential)
```csv
Date,Product,Quantity,Amount
2025-11-01,Lay's Chips,5,150
2025-11-01,Cold Drink,8,400
2025-11-02,Lay's Chips,3,90
```

**Pros:** Easy for store owner, minimal data entry
**Cons:** No customer tracking, no payment method tracking, can't do RFM

---

### Recommended CSV (Full Features)
```csv
Date,Time,Product,Quantity,UnitPrice,Amount,Customer,PaymentMethod,Notes
2025-11-01,09:30,Lay's Chips,5,30,150,Fatema,Cash,
2025-11-01,10:15,Cold Drink,8,50,400,Walk-in,Cash,
2025-11-01,14:20,Soap Bar,3,30,90,Ali,bKash,Reg customer
2025-11-02,08:00,Lay's Chips,3,30,90,Zara,Nagad,
```

**Pros:** Rich data for RFM, payment tracking, customer history
**Cons:** More work for store owner (but automate via POS in Phase 2)

---

## Column Definitions

| Column | Required? | Type | Range | Example | Validation |
|--------|-----------|------|-------|---------|-----------|
| **Date** | ✅ | YYYY-MM-DD | Past dates only | 2025-11-01 | `2025-11-01` (not "Nov 1" or "01-11-2025") |
| **Time** | ❌ | HH:MM | 00:00-23:59 | 09:30 | Optional; Phase 2 for hourly patterns |
| **Product** | ✅ | String | 1-255 chars | Lay's Chips (40g) | Must be consistent; auto-create if new |
| **Quantity** | ✅ | Integer | 1-1000 | 5 | Must be > 0; sanity limit at 1000 |
| **UnitPrice** | ❌ | Decimal | 0-10000 TK | 30.00 | Optional; calculated from Amount/Quantity if missing |
| **Amount** | ✅ | Decimal | 0-100000 TK | 150.00 | Total = Quantity × UnitPrice |
| **Customer** | ❌ | String | 1-100 chars | Fatema | Default "Walk-in" if empty |
| **PaymentMethod** | ❌ | Enum | cash/bkash/nagad/rocket/card/credit/other | Cash | Default "cash" if empty |
| **Notes** | ❌ | String | 0-500 chars | Reg customer | For admin notes, debugging |

---

## Parsing Algorithm (Pseudo-Code)

```
FOR EACH ROW IN CSV:
  1. Extract & validate Date → YYYY-MM-DD format, no future dates
  2. Extract & validate Product → required, not empty
  3. Extract & validate Quantity → integer, > 0, < 1000
  4. Extract & validate Amount → decimal, > 0, < 100000
  5. Extract & default missing fields:
     - Customer → "Walk-in" if empty
     - PaymentMethod → "cash" if empty
  6. AUTO-CREATE if new:
     - Product (lookup by name, create if not exists)
     - Customer (lookup by name, create if not exists)
  7. DUPLICATE DETECTION:
     - Calculate MD5 hash of (date + product + qty + amt + customer)
     - If hash exists in database, skip row
  8. CREATE TRANSACTION:
     - Save to database with all validated fields
     - Update Product.current_stock -= quantity
  9. LOG:
     - Success: "✅ Parsed: Product x5 for ৳150"
     - Error: "❌ Row 5: Invalid date format"
```

---

## Data Flow: CSV → Database → Prophet → Forecast

```
Step 1: UPLOAD CSV
┌─────────────────────────────────────────┐
│ POST /data/upload-csv                   │
│                                         │
│ File: sales.csv                         │
│ Size: 2.5 KB                            │
│ Rows: 100                               │
└─────────────────────────────────────────┘
          ↓
       [202 ACCEPTED]
       "Processing file..."
       ↓

Step 2: PARSE ASYNCHRONOUSLY (Celery Worker)
┌─────────────────────────────────────────┐
│ Load CSV                                │
│ For each of 100 rows:                   │
│  ├─ Validate (date, qty, amount, etc)  │
│  ├─ Auto-create Product/Customer       │
│  ├─ Detect duplicates                  │
│  ├─ Create Transaction                 │
│  └─ Update stock                       │
│                                         │
│ Result:                                 │
│  95 created ✅                          │
│  5 skipped (duplicates) ⚠️              │
└─────────────────────────────────────────┘
          ↓

Step 3: TRIGGER DOWNSTREAM JOBS
┌──────────────────────────────────────────────────┐
│ transaction.parsed                               │
│  ├─→ rfm.recalculate (update customer scores)   │
│  └─→ forecast.requested (train Prophet)         │
└──────────────────────────────────────────────────┘
          ↓

Step 4: FORECAST (Prophet Model)
┌──────────────────────────────────────────────────┐
│ For each Product:                                │
│  1. Query: Last 120 days of sales               │
│     SELECT date, SUM(qty) FROM transactions     │
│  2. Validate: Minimum 30 days required          │
│  3. Train: Prophet(trend + seasonality)         │
│  4. Forecast: Next 7 days with confidence       │
│     Result:                                      │
│     Day 1: 4.2 units (95% CI: 2.1 - 6.3)       │
│     Day 2: 5.1 units (95% CI: 3.0 - 7.2)       │
│     ...                                          │
│  5. Store: In Forecast table                    │
└──────────────────────────────────────────────────┘
          ↓

Step 5: GENERATE RECOMMENDATIONS
┌──────────────────────────────────────────────────┐
│ Compare:                                         │
│  Current Stock: 12 units                        │
│  7-Day Forecast: 30.8 units (avg 4.4/day)      │
│                                                  │
│ Analysis:                                       │
│  Status quo: Stock covers 2.7 days              │
│  Stockout date: Nov 4                           │
│                                                  │
│ Action:                                         │
│  ALERT: "Reorder 50 Lay's Chips by Nov 3"      │
│  Priority: HIGH (0.88/1.0)                      │
└──────────────────────────────────────────────────┘
          ↓

Step 6: DISPLAY ON DASHBOARD
┌──────────────────────────────────────────────────┐
│ 🔴 URGENT REORDER                               │
│                                                  │
│ Lay's Chips                                      │
│ Current Stock: 12 units                         │
│ 7-Day Forecast: 30 units                        │
│ Days Until Stockout: 1.3                        │
│                                                  │
│ Recommended: Order 50 units by Nov 3            │
│                                                  │
│ [View Details] [Execute] [Dismiss]              │
└──────────────────────────────────────────────────┘
```

---

## Example Walk-Through

### Store Owner's Manual Log
```
Sheba's Convenience Store - Sales Log (November 2025)

Nov 1
- Morning: Inventory count (Chips: 20, Drinks: 20)
- 09:30 - Sold 5 Chips to Fatema (₹150)
- 10:15 - Sold 8 Drinks to unknown customer (₹400)

Nov 2
- 08:00 - Sold 3 Chips to Zara via bKash (₹90)
```

### Converted to CSV
```csv
Date,Product,Quantity,Amount,Customer,PaymentMethod
2025-11-01,Lay's Chips,5,150,Fatema,Cash
2025-11-01,Cold Drink,8,400,Walk-in,Cash
2025-11-02,Lay's Chips,3,90,Zara,bKash
```

### Database After Parsing
```
TRANSACTION Table:
id | date       | product_id | customer_id | qty | amount
1  | 2025-11-01 | 123        | 45          | 5   | 150
2  | 2025-11-01 | 124        | NULL        | 8   | 400
3  | 2025-11-02 | 123        | 46          | 3   | 90

PRODUCT Table:
id | name         | current_stock | unit_price
123| Lay's Chips  | 12            | 30
124| Cold Drink   | 12            | 50

CUSTOMER Table:
id | name   | total_purchases | last_purchase
45 | Fatema | 150             | 2025-11-01
46 | Zara   | 90              | 2025-11-02
```

### Prophet Forecast
```
For Lay's Chips (product_id=123):

Historical (last 120 days): [2, 1, 0, 2, 5, 3, 0, ..., 5, 3]
Minimum 30 days? ✅ Yes (assume at least 30 days of data)

Trained Prophet Model:
- Trend: Slightly increasing
- Weekly seasonality: Higher on weekends
- Yearly seasonality: Peaks near holidays

Forecast (next 7 days):
Date       | yhat | confidence_lower | confidence_upper
2025-11-04 | 4.2  | 2.1             | 6.3
2025-11-05 | 5.1  | 3.0             | 7.2
2025-11-06 | 2.8  | 0.7             | 5.0
2025-11-07 | 1.9  | 0.0             | 4.1
2025-11-08 | 3.5  | 1.4             | 5.7
2025-11-09 | 6.2  | 4.0             | 8.4
2025-11-10 | 7.1  | 4.8             | 9.3

Total 7-day forecast: 30.8 units
```

### Recommendation Generated
```
REORDER ALERT
Product: Lay's Chips
Current Stock: 12 units
7-Day Forecast: 30.8 units
Days Until Stockout: 2.7 days

Recommended Action:
├─ Quantity: 50 units
├─ Reorder By: 2025-11-04
├─ Supplier: TBD
└─ Cost: ~₹1,500 (50 × ₹30)

Priority: HIGH (0.88/1.0)
Urgency: REORDER ASAP
```

### Dashboard Display
```
╔════════════════════════════════════════════════════╗
║  SMART MARKET DASHBOARD                           ║
╠════════════════════════════════════════════════════╣
║                                                    ║
║ 🔴 CRITICAL: Lay's Chips                          ║
║    Stock: 12 units                                ║
║    Forecast: 30.8 units (7 days)                  ║
║    Stockout: Nov 4 (1.3 days)                     ║
║    [Reorder 50] [Details] [Dismiss]               ║
║                                                    ║
║ 🟡 WARNING: Cold Drink                            ║
║    Stock: 12 units                                ║
║    Forecast: 25.2 units (7 days)                  ║
║    Stockout: Nov 5 (2.1 days)                     ║
║    [Reorder 30] [Details] [Dismiss]               ║
║                                                    ║
║ 🟢 GOOD: Soap Bar                                 ║
║    Stock: 18 units                                ║
║    Forecast: 8.5 units (7 days)                   ║
║    Status: OK (2.1 weeks of stock)                ║
║                                                    ║
║ 📊 CUSTOMERS                                      ║
║    Fatema: High value (₹1,200), Low churn risk   ║
║    Zara: Medium value (₹400), Monitor             ║
║    Others: Walk-in (tracking disabled)            ║
║                                                    ║
╚════════════════════════════════════════════════════╝
```

---

## Key Rules for Convenience Store

1. **Date Must Be Past** ← Don't allow future-dated sales
2. **Quantity > 0** ← Can't sell negative or zero items
3. **Auto-Create Products** ← New products created on first sale
4. **Auto-Create Customers** ← New customers added to database
5. **Track Stock** ← Decrease stock with each transaction
6. **Duplicate Prevention** ← Hash-based check prevents re-processing
7. **Walk-in Handling** ← Anonymous customers grouped as "Walk-in"
8. **Flexible Payment** ← Support bKash, Nagad, Rocket (Bangladesh payments)
9. **RFM for Known Customers Only** ← Walk-ins excluded from churn analysis
10. **Forecast if 30+ Days Data** ← Too little data = "Need more data" message

---

## Implementation Checklist

- [ ] CSV Parser accepts all columns (date, product, qty, amount, customer, payment)
- [ ] Validates date format (YYYY-MM-DD) and not future
- [ ] Validates quantity (integer, 1-1000)
- [ ] Validates amount (decimal, 0-100000)
- [ ] Auto-creates products on first mention
- [ ] Auto-creates customers on first mention
- [ ] Detects duplicates via MD5 hash
- [ ] Updates product.current_stock correctly
- [ ] Skips invalid rows with error logging
- [ ] Triggers downstream forecast.requested task
- [ ] Triggers downstream rfm.recalculate task
- [ ] Returns 202 ACCEPTED immediately
- [ ] Processes 100 rows within 5 seconds
- [ ] Processes 1000 rows within 30 seconds
- [ ] Error messages are user-friendly
- [ ] Admin can view failed rows and retry
