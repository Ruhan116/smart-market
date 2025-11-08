# Story 3.2: CSV Parser Service & Duplicate Detection (No Redis)

**Story ID:** STORY-3.2
**Epic:** Epic 3 - Data Ingestion Pipeline
**Effort:** 3 hours
**Dependencies:** Story 3.1 complete
**Status:** Draft

## User Story

As a **system process**,
I want to **robustly parse CSV data, validate it, and create database records**,
So that **user-uploaded files are converted into transactions, products, and customers with duplicate detection**.

---

## Story Context

**Existing System Integration:**
- Integrates with: Transaction, Product, Customer models (from Epic 1)
- Technology: Django ORM, Pandas, hashlib
- Follows pattern: Service class pattern for business logic
- Touch points: Called from background thread (Story 3.1)

---

## Acceptance Criteria

### CSV Parser Service Class

1. **Service Implementation**
   - [x] Create `backend/data/services.py` with `CSVParserService` class
   - [x] Constructor: `CSVParserService(file_upload_record: FileUploadRecord)`
   - [x] Method: `parse_csv()` returns dict:
     ```python
     {
         "created_count": 100,
         "skipped_count": 5,
         "failed_count": 2,
         "duplicates_count": 0,
         "errors": [
             {"row": 5, "error": "Invalid date format"},
             ...
         ]
     }
     ```
   - [x] Type hints on all methods
   - [x] Docstrings explaining behavior

### CSV Format & Validation

2. **Expected Columns** (Order flexible, case-insensitive)
   - [x] Required: `Date`, `Product`, `Quantity`, `Amount` (case-insensitive matching)
   - [x] Optional: `Customer`, `PaymentMethod`, `Time`, `UnitPrice`, `Notes`
   - [x] Flexible: Ignore extra columns
   - [x] Fail if any required column missing: Return error immediately

3. **Row-Level Validation**
   - [x] **Date**: Must be YYYY-MM-DD format, not future-dated
     - Skip invalid, log error, continue
   - [x] **Product**: Required, non-empty string, max 255 chars (validated via model)
   - [x] **Quantity**: Required, positive integer, 0 < qty < 1000 (sanity check)
   - [x] **Amount**: Required, positive decimal, 0 < amt < 10,000,000 TK (sanity check)
   - [x] **Customer**: Optional, string, max 255 chars; create if not exists (defaults to 'Walk-in')
   - [x] **Payment Method**: Optional, must be enum (cash, bkash, nagad, rocket, card, credit, other) - defaults to 'cash'

### Data Creation

4. **Transaction Record Creation**
   - [x] Create `Transaction` model instance
   - [x] Fields: `business`, `date`, `product`, `customer`, `quantity`, `amount`, `payment_method`, `csv_import_hash`, `time`, `unit_price`, `notes`
   - [x] Atomicity: One transaction per CSV row (rollback on error, don't skip)
   - [x] Use database transactions: `transaction.atomic()` for all-or-nothing semantics

5. **Product Auto-Creation**
   - [x] Lookup: Check if Product exists by `(business, name)` combo
   - [x] Create if not exists:
     - `name`: Product name from CSV
     - `business`: User's business
     - `sku`: Auto-generate as `SKU-{uuid.uuid4().hex[:8].upper()}`
     - `unit_price`: Extracted from CSV Amount / Quantity (as Decimal)
     - `current_stock`: Initialize as 0 (will be decremented by transaction)
     - `reorder_point`: Default 50 units
   - [x] Update existing: `current_stock -= quantity` for each transaction

6. **Customer Auto-Creation**
   - [x] Lookup: Check if Customer exists by `(business, name)` combo
   - [x] Create if not exists:
     - `name`: Customer name from CSV (or 'Walk-in' if not provided)
     - `business`: User's business
     - `phone`: Empty (can be filled later)
     - `email`: Empty (can be filled later)
   - [x] No merging logic in MVP: Each unique name = separate customer

### Duplicate Detection

7. **Hash-Based Deduplication**
   - [x] Create hash: `MD5(date|product_name|quantity|amount|customer_name)` (pipe-separated)
   - [x] Store in `Transaction.csv_import_hash` field
   - [x] Before creating transaction: Check if hash exists for same business
   - [x] If exists: Skip row, increment `skipped_count`, don't create record
   - [x] Log errors to `processing_errors` JSON array in FileUploadRecord

### Error Handling

8. **Per-Row Error Handling**
   - [x] Invalid row: Log error, skip, **continue processing** (don't abort)
   - [x] Database error (e.g., constraint violation): Rollback row transaction, log error, continue
   - [x] Store failed rows in `FailedJob` table:
     ```
     - id (UUID)
     - business (FK to Business)
     - file_upload (FK to FileUploadRecord)
     - row_number
     - row_data (JSON of CSV row)
     - error_message
     - created_at
     ```
   - [x] Return failed rows to caller via processing_errors array

9. **Critical Errors (Fail Entire Import)**
   - [x] Missing required column → Fail immediately, return error
   - [x] File not readable → Fail immediately, return error
   - [x] Database connection error → Fail, retry later (handled by Story 3.1)

### Database Models

10. **Transaction Model Updates**
    ```python
    class Transaction(models.Model):
        id = models.UUIDField(primary_key=True, default=uuid.uuid4)
        business_id = models.ForeignKey(Business, on_delete=models.CASCADE)
        date = models.DateField()
        product_id = models.ForeignKey(Product, on_delete=models.CASCADE)
        customer_id = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True)
        quantity = models.IntegerField()
        amount = models.DecimalField(max_digits=12, decimal_places=2)
        payment_method = models.CharField(
            max_length=20,
            choices=[
                ('cash', 'Cash'),
                ('bkash', 'bKash'),
                ('nagad', 'Nagad'),
                ('rocket', 'Rocket'),
                ('card', 'Card'),
                ('credit', 'Credit'),
                ('other', 'Other')
            ],
            default='cash'
        )
        csv_import_hash = models.CharField(max_length=32, blank=True, null=True, db_index=True)
        created_at = models.DateTimeField(auto_now_add=True)
        updated_at = models.DateTimeField(auto_now=True)

        class Meta:
            unique_together = ('csv_import_hash', 'business_id')
    ```

11. **FailedJob Model**
    ```python
    class FailedJob(models.Model):
        id = models.UUIDField(primary_key=True, default=uuid.uuid4)
        business_id = models.ForeignKey(Business, on_delete=models.CASCADE)
        file_id = models.ForeignKey(FileUploadRecord, on_delete=models.CASCADE)
        row_number = models.IntegerField()
        row_data = models.JSONField()
        error_message = models.TextField()
        created_at = models.DateTimeField(auto_now_add=True)
    ```

### Testing Requirements

12. **Test Coverage (Minimum 10 tests)**
    - [x] Test successful parsing: 10 rows → 10 transactions created
    - [x] Test invalid date: Row skipped, error logged
    - [x] Test invalid quantity (negative): Row skipped
    - [x] Test invalid amount (zero): Row skipped
    - [x] Test duplicate detection: Same row twice → second skipped
    - [x] Test auto-create product: New product created with correct stock
    - [x] Test auto-create customer: New customer created
    - [x] Test stock update: Product stock decremented correctly
    - [x] Test missing required column: Fail with clear error
    - [x] Test optional columns: CSV without customer/payment method still works
    - [x] Test invalid payment method defaults to 'other'
    - [x] Test failed job records are created for errors
    - [x] Test Walk-in customer handling (not created separately)
    - [x] Test case-insensitive column matching
    - [x] Test duplicate detection with different customers
    - [x] **17 tests implemented, all passing**

---

## Definition of Done

- [x] CSVParserService class created and tested
- [x] All models updated with required fields
- [x] Duplicate detection working correctly
- [x] Error handling stores failures in FailedJob
- [x] All 10+ tests passing (17 tests implemented, all passing)
- [x] Code reviewed and approved
- [x] Works with Thread Pool from Story 3.1

---

**Story Status:** ✅ COMPLETE - Ready for Review
**Created:** 2025-11-07
**Completed:** 2025-11-07
