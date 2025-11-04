# Epic 3: Data Ingestion Pipeline - Brownfield Development

**Epic ID:** EPIC-3
**Status:** Ready for Development
**Priority:** Critical (Blocks Epics 4-6)
**Estimated Duration:** 10 hours
**Team:** Backend Lead + 1 Developer
**Depends On:** Epic 1 (Infrastructure), Epic 2 (Authentication)

---

## Epic Goal

**Implement asynchronous data ingestion pipeline that accepts CSV sales ledgers and receipt images, parses them, creates Transaction/Product/Customer records, detects duplicates, and triggers downstream forecasting/churn scoring jobs.**

This epic delivers a robust CSV parser with duplicate detection, error handling, and async Celery task processing that can ingest 1000+ rows in <30 seconds while maintaining data quality.

---

## Existing System Context

**Tech Stack (from Epics 1-2):**
- Django 4.2 + DRF
- PostgreSQL 14 for Transaction/Product/Customer models
- Redis + Celery 5.3 for async task queue
- Pandas for data manipulation

**Pre-Existing Models (from Epic 1):**
- `Transaction` (business_id, date, product_id, customer_id, quantity, amount, payment_method)
- `Product` (business_id, name, sku, unit_price, current_stock, reorder_point)
- `Customer` (business_id, name, phone, email)

**Integration Points (Downstream):**
- **Epic 4 (Forecasting):** Triggered after CSV parsed to generate forecasts
- **Epic 5 (Churn):** Triggered to recalculate RFM scores for affected customers
- **Epic 6 (Recommendations):** Indirectly triggered via forecasts

---

## Enhancement Details

### What's Being Built

1. **CSV Upload Endpoint**
   - Accept: File upload (multipart form data), optional data_source_name
   - Validate: CSV format, max 10MB file size
   - Return: 202 ACCEPTED (async processing)
   - Enqueue: Celery task for async parsing

2. **CSV Parser Service**
   - Parse: CSV with expected columns (Date, Product, Quantity, Amount, [Customer], [Payment Method])
   - Validate: Date format (YYYY-MM-DD), quantity > 0, amount > 0
   - Auto-create: Product if not exists, Customer if not exists
   - Handle errors: Skip invalid rows, log errors, create in database for admin review

3. **Duplicate Detection**
   - Hash: MD5 hash of CSV row (or entire file)
   - Check: If duplicate detected, skip or notify user
   - Store: csv_import_hash on Transaction record

4. **Product Stock Management**
   - Update: current_stock -= quantity on each transaction
   - Reorder Point: User-configurable (default = 2 weeks of average demand)
   - Auto-create: Product with unit_price from transaction

5. **Receipt OCR (Mocked for MVP)**
   - Accept: JPG/PNG image upload (max 5MB)
   - Mock: Return sample extracted data
   - Store: Receipt image + extracted data
   - Phase 2: Integrate with Tesseract or Google Vision

6. **Transaction List Endpoint**
   - Return: Paginated list of user's transactions
   - Filter: By product, date range, payment method
   - Sort: By date, amount
   - Summary: Total revenue, average transaction, count

### How It Integrates

```
Frontend: User uploads CSV
    ↓
POST /data/upload-csv
    ↓
Backend: Validate file, return 202 ACCEPTED
    ↓
Enqueue: transaction.uploaded Celery task
    ↓
Celery Worker: Parse CSV asynchronously
    ├→ Create Transaction records
    ├→ Auto-create Product/Customer
    ├→ Update Product stock
    └→ Enqueue: transaction.parsed, forecast.requested jobs
    ↓
Frontend: Poll for status or listen to websocket (Phase 2)
    ↓
User sees: Transactions, Products, Customers updated in dashboard
```

### Success Criteria

- ✅ Upload 100-row CSV → processed within 5 seconds
- ✅ Upload 1000-row CSV → processed within 30 seconds
- ✅ All rows parsed; invalid rows skipped with error logged
- ✅ Products auto-created with correct stock levels
- ✅ Customers auto-created; duplicate customers merged
- ✅ Duplicate CSV detection prevents re-processing
- ✅ Transaction list filterable and sortable
- ✅ Receipt upload mocked but functional

---

## Stories

### Story 3.1: CSV Upload Endpoint & Validation (2 hours)

**Objective:** Implement CSV upload endpoint with file validation and async task enqueuing.

**Acceptance Criteria:**

- [ ] CSV Upload endpoint
  - [ ] `POST /data/upload-csv` accepts multipart form-data
  - [ ] Required: file (CSV file)
  - [ ] Optional: data_source_name (string, for grouping uploads)
  - [ ] Returns [202 ACCEPTED] immediately
  - [ ] Requires JWT authentication

- [ ] File validation
  - [ ] Check file extension: .csv
  - [ ] Check file size: max 10MB
  - [ ] Check MIME type: text/csv
  - [ ] Return [400 Bad Request] if validation fails
  - [ ] Errors: { "error_code": "INVALID_FILE_FORMAT", "message": "..." }

- [ ] File storage
  - [ ] Save uploaded file temporarily (to process later)
  - [ ] Generate unique file_id (UUID) for tracking
  - [ ] Store: file_path, original_filename, user_id, business_id, uploaded_at

- [ ] Celery task enqueuing
  - [ ] Create FileUploadRecord in database
  - [ ] Enqueue: transaction.uploaded(file_id, business_id) Celery task
  - [ ] Return task_id to frontend for polling
  - [ ] Return [202 ACCEPTED] with message, file_id, rows_detected (estimate based on file size)

- [ ] Response format
  - [ ] [202 ACCEPTED]: { "status": "pending", "data": { "message": "Processing file...", "file_id": "uuid", "file_name": "sales.csv", "rows_detected": 150, "estimated_processing_time": 5 } }

- [ ] Rate limiting
  - [ ] Max 10 uploads per business per minute
  - [ ] Return [429 Too Many Requests] if exceeded

- [ ] Tests
  - [ ] Test successful CSV upload (202)
  - [ ] Test file validation (invalid format, oversized file)
  - [ ] Test rate limiting (429 after 10 uploads/min)
  - [ ] Test unauthenticated request (401)
  - [ ] Test Celery task enqueued

**Effort:** 2 hours
**Dependencies:** Epic 2 complete
**Risk:** Low

---

### Story 3.2: CSV Parser Service & Duplicate Detection (3 hours)

**Objective:** Implement robust CSV parsing with validation, auto-creation, and duplicate detection.

**Acceptance Criteria:**

- [ ] CSV Parser Service
  - [ ] `apps/transactions/services.py` contains CSVParserService class
  - [ ] Reads CSV file from disk
  - [ ] Expects columns: Date, Product, Quantity, Amount, [Customer], [Payment Method]
  - [ ] Flexible: Handles optional columns gracefully
  - [ ] Returns: { "created_count": 100, "skipped_count": 5, "errors": [...] }

- [ ] Row parsing & validation
  - [ ] Date: Must be YYYY-MM-DD format, not future-dated
  - [ ] Product: Required, string, auto-created if not exists
  - [ ] Quantity: Required, positive integer, <1000 (sanity check)
  - [ ] Amount: Required, positive decimal, <10M TK (sanity check)
  - [ ] Customer: Optional, string, auto-created if not exists
  - [ ] Payment Method: Optional, enum (cash, bkash, nagad, rocket, card, credit, other)

- [ ] Data creation
  - [ ] Create Transaction record with validated data
  - [ ] Create Product if not exists: Use product_name as lookup key
  - [ ] Create Customer if not exists: Use customer_name as lookup key
  - [ ] Update Product.current_stock -= quantity
  - [ ] Atomicity: All-or-nothing per transaction (row)

- [ ] Duplicate detection
  - [ ] Hash row content: MD5(date + product + qty + amount + customer)
  - [ ] Store hash in Transaction.csv_import_hash
  - [ ] Check: If hash exists for same business, skip row
  - [ ] Prevent: Same transaction processed twice
  - [ ] Return: Count of duplicates skipped

- [ ] Error handling
  - [ ] Invalid row: Log error, skip, continue processing
  - [ ] Database error: Rollback row, log, continue
  - [ ] Missing required column: Fail immediately, return error
  - [ ] Errors stored in FailedJob table for admin review

- [ ] Celery task implementation
  - [ ] `apps/transactions/tasks.py` contains `transaction_uploaded` task
  - [ ] Signature: `transaction_uploaded(file_id, business_id, user_id)`
  - [ ] Loads file, calls CSVParserService
  - [ ] Handles exceptions: Retry 3x with exponential backoff
  - [ ] Triggers downstream: Enqueue transaction.parsed event

- [ ] Tests
  - [ ] Test successful parsing: 10 rows → 10 transactions created
  - [ ] Test invalid date: Row skipped, error logged
  - [ ] Test duplicate detection: Same row twice → second skipped
  - [ ] Test auto-create product: New product created from transaction
  - [ ] Test auto-create customer: New customer created from transaction
  - [ ] Test stock update: Product stock decremented correctly
  - [ ] Test missing required column: Fail with clear error
  - [ ] Minimum 7 tests, all passing

**Effort:** 3 hours
**Dependencies:** Story 3.1 complete
**Risk:** Medium (CSV parsing can be fragile; test edge cases)

---

### Story 3.3: Receipt OCR Upload Endpoint (Mocked) (1.5 hours)

**Objective:** Implement receipt image upload endpoint with mocked OCR extraction.

**Acceptance Criteria:**

- [ ] Receipt Upload endpoint
  - [ ] `POST /data/upload-receipt` accepts multipart form-data
  - [ ] Required: image (JPG/PNG file)
  - [ ] Optional: receipt_date (date override)
  - [ ] Returns [202 ACCEPTED]
  - [ ] Requires JWT authentication

- [ ] File validation
  - [ ] Check file type: JPG, PNG only
  - [ ] Check file size: max 5MB
  - [ ] Return [400 Bad Request] if invalid

- [ ] Receipt processing (Mocked)
  - [ ] Extract sample data: { "date": "2025-11-03", "items": [{ "name": "Shirt", "qty": 2, "price": 300 }], "total": 600 }
  - [ ] Create Transaction record from extracted data
  - [ ] Mark is_verified=false if extraction confidence <70% (mock: always true)
  - [ ] Store original image file

- [ ] Celery task
  - [ ] `receipt_uploaded(image_id, business_id)` task
  - [ ] Enqueue async task (returns 202 immediately)
  - [ ] Task: Extract data (mocked), create Transaction

- [ ] Response format
  - [ ] [202 ACCEPTED]: { "status": "pending", "data": { "message": "Extracting receipt data...", "image_id": "uuid", "estimated_processing_time": 10 } }

- [ ] Tests
  - [ ] Test successful receipt upload (202)
  - [ ] Test invalid image format (400)
  - [ ] Test oversized image (413)
  - [ ] Test Celery task enqueued

**Effort:** 1.5 hours
**Dependencies:** Story 3.1 complete
**Risk:** Low (mocked, no external API)

---

### Story 3.4: Transaction List Endpoint (2 hours)

**Objective:** Implement filterable, paginated transaction list endpoint.

**Acceptance Criteria:**

- [ ] Transaction List endpoint
  - [ ] `GET /transactions` returns paginated list
  - [ ] Requires JWT authentication
  - [ ] Filters by: product_id, date_from, date_to, payment_method
  - [ ] Sorts by: date (default), amount
  - [ ] Pagination: limit (default 50, max 100), offset
  - [ ] Returns: { "count": 1250, "next": "...", "previous": "...", "results": [...], "summary": {...} }

- [ ] Response format
  - [ ] Results array: [{ id, date, product_name, quantity, amount, customer_name, payment_method }, ...]
  - [ ] Summary: { "total_revenue": 450000, "average_value": 360, "transaction_count": 50 }
  - [ ] Next/Previous URLs for pagination

- [ ] Data isolation
  - [ ] Only returns transactions for authenticated user's business
  - [ ] Filter: filter(business_id=request.user.business_id)

- [ ] Query optimization
  - [ ] Use select_related for product, customer (N+1 prevention)
  - [ ] Index on (business_id, date) for fast sorting
  - [ ] P95 response time <500ms for typical business (1000 transactions)

- [ ] Filtering
  - [ ] product_id: Filter by specific product (optional)
  - [ ] date_from, date_to: ISO 8601 format (optional)
  - [ ] payment_method: Single enum value (optional)
  - [ ] Sort: "date" or "amount" (default "date")
  - [ ] Order: "asc" or "desc" (default "desc")

- [ ] Tests
  - [ ] Test list all transactions (pagination)
  - [ ] Test filter by product_id
  - [ ] Test filter by date range
  - [ ] Test filter by payment_method
  - [ ] Test sorting (date ascending/descending)
  - [ ] Test summary stats (total revenue, average)
  - [ ] Test data isolation (user A cannot see user B's transactions)
  - [ ] Minimum 7 tests, all passing

**Effort:** 2 hours
**Dependencies:** Story 3.2 complete
**Risk:** Low

---

### Story 3.5: Integration & Error Handling (1.5 hours)

**Objective:** Connect all components, implement error handling, and test end-to-end flow.

**Acceptance Criteria:**

- [ ] Event/Task adapter
  - [ ] `events/adapter.py` contains publish_event() function
  - [ ] Enqueues Celery task based on event topic
  - [ ] Topics: transaction.uploaded, transaction.parsed, forecast.requested, rfm.recalculate
  - [ ] Future-proof: Can be replaced with Kafka for Phase 2

- [ ] Error recovery
  - [ ] Failed CSV parse: Stored in FailedJob table
  - [ ] Admin can view failed jobs: GET /admin/jobs
  - [ ] Admin can retry: POST /admin/jobs/{id}/retry
  - [ ] Errors logged to Sentry

- [ ] Downstream triggering
  - [ ] After transaction.parsed completes: Enqueue forecast.requested
  - [ ] After transaction.parsed completes: Enqueue rfm.recalculate
  - [ ] Events fired correctly; logging visible in Celery logs

- [ ] End-to-end test
  - [ ] Upload 30-row CSV
  - [ ] Verify: 30 transactions created
  - [ ] Verify: Products updated
  - [ ] Verify: Customers created
  - [ ] Verify: Downstream tasks enqueued
  - [ ] Wait for tasks to complete
  - [ ] Verify: Forecasts + ChurnScores generated (placeholder, Epics 4-5 implement actual logic)

- [ ] Data consistency
  - [ ] Product.current_stock reflects all transactions
  - [ ] Customer list includes all unique customers
  - [ ] No orphaned records (products without customers, etc.)

- [ ] Tests
  - [ ] Test CSV upload → transactions created
  - [ ] Test duplicate CSV rejection
  - [ ] Test invalid CSV handling
  - [ ] Test downstream event triggering
  - [ ] Test error recovery (retry failed job)
  - [ ] Minimum 5 integration tests

**Effort:** 1.5 hours
**Dependencies:** Stories 3.1-3.4 complete
**Risk:** Medium (async coordination can be tricky; test thoroughly)

---

## Compatibility Requirements

**N/A (Greenfield)** — No prior data ingestion system to maintain.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Large file upload (10MB+)** | High | Validate file size before processing; chunk uploads if needed | Increase allowed size gradually; implement multipart uploads (Phase 2) |
| **CSV format variations** | Medium | Document expected format; provide template; flexible parser | Manual data entry endpoint (Phase 2) |
| **Duplicate detection false positives** | Medium | Hash entire row; allow manual override | Manual duplicate removal endpoint (Phase 2) |
| **Celery task failures** | High | Retry 3x with backoff; store in FailedJob; admin can retry | Monitor Celery queues; alert on high failure rate |
| **Stock going negative** | Medium | Enforce quantity <= current_stock? No: Allow negative for MVP, warn in Phase 2 | Add inventory warnings when stock < reorder_point |
| **OCR accuracy low (Phase 2)** | Low | MVP: Mocked; Phase 2: Use Google Vision, manual review workflow | Tesseract for open-source fallback |

---

## Definition of Done

### Code Quality
- [ ] CSV parser is robust (handles edge cases)
- [ ] No hardcoded file paths or limits
- [ ] Error messages user-friendly
- [ ] Type hints on all functions
- [ ] Docstrings on services

### Testing
- [ ] All 5 stories have tests
- [ ] CSV parsing: >80% coverage
- [ ] Integration tests cover end-to-end flow
- [ ] Edge cases tested (empty CSV, invalid data, duplicates)

### Documentation
- [ ] CSV format documented (columns, example file in repo)
- [ ] API docs (Swagger) show /data/* endpoints
- [ ] README explains upload flow
- [ ] Sample CSV file provided for testing

### Deployment
- [ ] Works locally (`docker-compose up` → can upload CSV)
- [ ] Works on Railway (file storage, Celery tasks work)
- [ ] Failed jobs stored and retryable
- [ ] Monitoring logs visible

### Sign-Off
- [ ] Backend Lead: "Data pipeline is solid, ready for Epic 4"
- [ ] QA: "Can test with realistic data"

---

## Success Criteria

**Technical Success:**
- ✅ Upload CSV → 202 response within 1 second
- ✅ CSV parsed asynchronously within 30 seconds (1000 rows)
- ✅ All rows processed; invalid rows logged
- ✅ Transactions visible in list endpoint immediately after completion
- ✅ Products auto-created with correct stock
- ✅ Customers auto-created
- ✅ Duplicate detection prevents re-processing
- ✅ Downstream tasks (forecasts, churn) enqueued

**Team Success:**
- ✅ Frontend can upload CSV and poll for completion
- ✅ QA can test with sample data
- ✅ Data available for Epics 4-6 development

**Operational Success:**
- ✅ No data corruption in production
- ✅ Failed jobs monitored and retryable
- ✅ Users can recover from failed uploads

---

## Handoff to Development

### Pre-Story Checklist
- [ ] Pandas library added to requirements.txt
- [ ] File upload directory created (or use cloud storage)
- [ ] Celery worker running (from Epic 1)

### Story Ordering (Sequential)
1. **Story 3.1** (2 hrs) — CSV upload endpoint + validation
2. **Story 3.2** (3 hrs) — CSV parser + duplicate detection
3. **Story 3.3** (1.5 hrs) — Receipt upload (mocked)
4. **Story 3.4** (2 hrs) — Transaction list endpoint
5. **Story 3.5** (1.5 hrs) — Integration + error handling

**Total:** 10 hours

---

**Epic Owner:** Backend Lead
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
