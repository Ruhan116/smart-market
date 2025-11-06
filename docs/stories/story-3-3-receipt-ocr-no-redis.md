# Story 3.3: Receipt OCR Upload Endpoint (Mocked, No Redis)

**Story ID:** STORY-3.3
**Epic:** Epic 3 - Data Ingestion Pipeline
**Effort:** 1.5 hours
**Dependencies:** Story 3.1 complete
**Status:** Draft

## User Story

As a **SME user**,
I want to **upload a receipt image and have it processed automatically**,
So that **I can input transaction data via photo without manual CSV entry**.

---

## Story Context

**Existing System Integration:**
- Integrates with: FileUploadRecord (from Story 3.1), Transaction model
- Technology: Django file upload, ThreadPoolExecutor (no Celery)
- Follows pattern: Same pattern as CSV upload (202 ACCEPTED + polling)
- Touch points: Called from background thread, stores to Transaction

---

## Acceptance Criteria

### Receipt Upload Endpoint

1. **Endpoint Implementation**
   - [ ] `POST /data/upload-receipt` accepts multipart form-data
   - [ ] Required: `image` (JPG/PNG file)
   - [ ] Optional: `receipt_date` (date override, YYYY-MM-DD)
   - [ ] Optional: `data_source_name` (string)
   - [ ] Returns `202 ACCEPTED` immediately
   - [ ] Requires JWT authentication
   - [ ] Response:
     ```json
     {
       "status": "pending",
       "data": {
         "message": "Extracting receipt data...",
         "image_id": "uuid-xxxx",
         "file_name": "receipt.jpg",
         "estimated_processing_time": 10
       }
     }
     ```

### File Validation

2. **Image File Validation**
   - [ ] Check file type: JPG, PNG only
   - [ ] Check file size: max 5MB
   - [ ] Check MIME type: `image/jpeg` or `image/png`
   - [ ] Return `400 Bad Request` if invalid
   - [ ] Return `413 Payload Too Large` if oversized

### Mocked OCR Processing

3. **Receipt Data Extraction (Mocked)**
   - [ ] Extract sample data (hardcoded for MVP):
     ```json
     {
       "date": "2025-11-07",
       "items": [
         {"name": "Shirt", "qty": 2, "price": 300},
         {"name": "Pants", "qty": 1, "price": 500}
       ],
       "total": 1100,
       "confidence": 95
     }
     ```
   - [ ] In Phase 2, replace with actual OCR (Tesseract / Google Vision)
   - [ ] Store confidence score (mock: always 95)

4. **Transaction Creation from Receipt**
   - [ ] Create one Transaction per item in receipt:
     - `date`: From receipt or override
     - `product`: Item name (auto-create if not exists)
     - `quantity`: Item qty
     - `amount`: Item price
     - `customer`: Generic customer "Walk-in" (auto-create if not exists)
     - `payment_method`: "cash" (default)
   - [ ] Use same Transaction model as CSV import
   - [ ] Follow same duplicate detection (hash-based)

### Status Polling Endpoint

5. **Receipt Processing Status**
   - [ ] `GET /data/upload-receipt/{image_id}` returns current status
   - [ ] Requires JWT authentication
   - [ ] Response (processing):
     ```json
     {
       "image_id": "uuid-xxxx",
       "status": "processing",
       "file_name": "receipt.jpg",
       "percent_complete": 50,
       "error_message": null
     }
     ```
   - [ ] Response (completed):
     ```json
     {
       "image_id": "uuid-xxxx",
       "status": "completed",
       "file_name": "receipt.jpg",
       "extracted_data": {
         "date": "2025-11-07",
         "items": [...],
         "total": 1100,
         "confidence": 95
       },
       "created_transactions": 2,
       "completed_at": "2025-11-07T12:05:00Z"
     }
     ```

### Database Model

6. **ReceiptUploadRecord Model**
   ```python
   class ReceiptUploadRecord(models.Model):
       image_id = models.UUIDField(primary_key=True, default=uuid.uuid4)
       business_id = models.ForeignKey(Business, on_delete=models.CASCADE)
       user_id = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
       file_path = models.CharField(max_length=500)
       original_filename = models.CharField(max_length=255)
       file_size = models.BigIntegerField()
       status = models.CharField(
           max_length=20,
           choices=[
               ('pending', 'Pending'),
               ('processing', 'Processing'),
               ('completed', 'Completed'),
               ('failed', 'Failed')
           ]
       )
       extracted_data = models.JSONField(blank=True, null=True)
       created_transactions = models.IntegerField(default=0)
       error_message = models.TextField(blank=True, null=True)
       uploaded_at = models.DateTimeField(auto_now_add=True)
       processing_started_at = models.DateTimeField(blank=True, null=True)
       processing_completed_at = models.DateTimeField(blank=True, null=True)
   ```

### Background Processing

7. **Thread-Based Processing**
   - [ ] Use `ThreadPoolExecutor` (same as Story 3.1)
   - [ ] Spawn thread immediately after returning 202
   - [ ] Thread: Mock OCR → Create transactions → Update status
   - [ ] Update `ReceiptUploadRecord.status` and `extracted_data`

### Testing Requirements

8. **Test Coverage (Minimum 6 tests)**
   - [ ] Test successful receipt upload (202)
   - [ ] Test invalid image format (400)
   - [ ] Test oversized image (413)
   - [ ] Test polling endpoint (processing, completed)
   - [ ] Test transaction creation from receipt
   - [ ] Test mocked OCR returns sample data
   - [ ] **Minimum 6 tests, all passing**

---

## Definition of Done

- [ ] Receipt upload endpoint implemented and tested
- [ ] ReceiptUploadRecord model created and migrated
- [ ] Mocked OCR returns sample data
- [ ] Status polling endpoint works
- [ ] Transactions created from receipt items
- [ ] All 6+ tests passing
- [ ] Code reviewed and approved

---

**Story Status:** ✅ Ready for Development
**Created:** 2025-11-07
