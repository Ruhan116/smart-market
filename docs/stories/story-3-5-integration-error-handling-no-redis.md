# Story 3.5: Integration & Error Handling (No Redis)

**Story ID:** STORY-3.5
**Epic:** Epic 3 - Data Ingestion Pipeline
**Effort:** 1.5 hours
**Dependencies:** Stories 3.1-3.4 complete
**Status:** Draft

## User Story

As a **system administrator**,
I want to **see failed uploads, recover from errors, and trigger downstream processing**,
So that **the data pipeline is reliable and I can monitor data quality**.

---

## Story Context

**Existing System Integration:**
- Integrates with: FileUploadRecord, ReceiptUploadRecord, FailedJob (all stories)
- Technology: Django signals, ThreadPoolExecutor callbacks
- Follows pattern: Event-driven via Django signals (no message queue)
- Touch points: Connects CSV → downstream jobs (forecasting, churn)

---

## Acceptance Criteria

### Error Recovery UI & API

1. **Failed Job Listing Endpoint**
   - [ ] `GET /admin/api/v1/failed-jobs` returns list of failed records
   - [ ] Requires staff authentication (`user.is_staff=True`)
   - [ ] Response:
     ```json
     {
       "count": 5,
       "results": [
         {
           "id": "uuid-xxxx",
           "file_id": "uuid-yyyy",
           "row_number": 5,
           "row_data": {"date": "2025-11-07", "product": "Shirt", ...},
           "error_message": "Invalid date format",
           "created_at": "2025-11-07T12:00:00Z",
           "file_name": "sales.csv",
           "business_name": "Ahmed's Shop"
         }
       ]
     }
     ```
   - [ ] Filterable by: business_id, file_id, date range
   - [ ] Sortable by: created_at, file_id

2. **Failed Job Retry Endpoint**
   - [ ] `POST /admin/api/v1/failed-jobs/{id}/retry` retries specific failed row
   - [ ] Requires staff authentication
   - [ ] Response:
     ```json
     {
       "status": "pending",
       "message": "Row will be reprocessed",
       "retry_count": 1
     }
     ```
   - [ ] Spawns new thread to reprocess row
   - [ ] Updates FailedJob with retry_count

### Downstream Event Triggering

3. **Event Adapter (No Message Queue)**
   - [ ] Create `apps/events/adapter.py` with event publication
   - [ ] Function: `publish_event(topic, payload)`
   - [ ] Instead of Celery/Kafka, trigger Python functions directly:
     ```python
     def publish_event(topic, payload):
         if topic == "transaction.parsed":
             trigger_forecast_generation(payload)
             trigger_churn_calculation(payload)
         elif topic == "forecast.requested":
             forecast_service.generate(payload)
     ```
   - [ ] All synchronously or spawned as threads (TBD based on performance)

4. **Downstream Task Triggering**
   - [ ] After CSV parsing completes: Call `publish_event("transaction.parsed", {...})`
   - [ ] After receipt OCR completes: Call `publish_event("transaction.parsed", {...})`
   - [ ] `transaction.parsed` triggers:
     - [ ] Forecast generation (Epic 4 stub: just log "Forecast job enqueued")
     - [ ] Churn/RFM recalculation (Epic 5 stub: just log "Churn job enqueued")
   - [ ] Logging: All events logged to Sentry / file
   - [ ] No actual Epic 4-5 implementation (those are separate epics)

5. **Downstream Stub Functions**
   ```python
   # In apps/forecasting/tasks.py
   def generate_forecasts(business_id, affected_products):
       logger.info(f"[STUB] Generating forecasts for business {business_id}, products: {affected_products}")
       # Phase 2: Actual forecasting logic

   # In apps/churn/tasks.py
   def recalculate_rfm_scores(business_id, affected_customers):
       logger.info(f"[STUB] Recalculating RFM for business {business_id}, customers: {affected_customers}")
       # Phase 2: Actual churn logic
   ```

### Logging & Monitoring

6. **Comprehensive Logging**
   - [ ] All CSV parsing steps logged to `logger.info()` / `logger.error()`
   - [ ] Log format: `[timestamp] [level] [service] message`
   - [ ] Examples:
     - "CSV upload started: file_id={id}, rows={count}"
     - "CSV parsing: Created 100 transactions, skipped 5, failed 2"
     - "Duplicate detected: hash={hash}, skipped"
     - "Event published: topic=transaction.parsed, payload={...}"
   - [ ] Errors logged to Sentry with context
   - [ ] Logs visible in Django logs and stdout (docker-compose)

7. **Upload Status Monitoring**
   - [ ] `GET /admin/api/v1/upload-status` shows active/recent uploads
   - [ ] Requires staff authentication
   - [ ] Response:
     ```json
     {
       "active_uploads": 2,
       "recent_uploads": [
         {
           "file_id": "uuid-xxxx",
           "file_name": "sales.csv",
           "status": "processing",
           "rows_processed": 150,
           "rows_total": 300,
           "percent_complete": 50,
           "started_at": "2025-11-07T12:00:00Z",
           "elapsed_seconds": 10
         }
       ]
     }
     ```

### End-to-End Data Consistency

8. **Data Consistency Verification**
   - [ ] After parsing completes: Assert all transactions belong to correct business
   - [ ] Assert: Product.current_stock is consistent (sum of transactions)
   - [ ] Assert: All customers referenced in transactions exist
   - [ ] Log warnings if inconsistencies detected

### Testing Requirements

9. **Integration Test Coverage (Minimum 6 tests)**
   - [ ] Test CSV upload → transactions created → downstream events fired
   - [ ] Test duplicate CSV rejection (second upload skipped)
   - [ ] Test invalid CSV handling (errors stored in FailedJob)
   - [ ] Test failed job retry (row reprocessed)
   - [ ] Test downstream stub functions called with correct payload
   - [ ] Test logging captures all events
   - [ ] Test data consistency after parsing
   - [ ] **Minimum 6 tests, all passing**

10. **Manual Testing Checklist**
    - [ ] Upload 30-row CSV locally
    - [ ] Verify: 30 transactions created in DB
    - [ ] Verify: Products updated (stock decreased)
    - [ ] Verify: Customers created
    - [ ] Verify: Status polling shows progress
    - [ ] Verify: Logs show event published
    - [ ] Verify: Failed jobs endpoint accessible (admin only)
    - [ ] Verify: Can retry failed row

### Documentation Requirements

11. **Documentation**
    - [ ] README section: "Data Ingestion Flow (MVP)"
    - [ ] API docs: List all /data/* and /admin/* endpoints
    - [ ] Sample CSV file provided in `docs/sample-data/sales.csv`
    - [ ] Troubleshooting guide: "What if upload fails?"
    - [ ] Architecture diagram: CSV → Parser → DB → Events

---

## Definition of Done

- [ ] Event adapter implemented (no external queue)
- [ ] Failed job tracking and retry working
- [ ] Downstream event stubs in place
- [ ] Logging comprehensive and visible
- [ ] Upload status monitoring endpoint working
- [ ] Data consistency verified
- [ ] All 6+ integration tests passing
- [ ] Manual testing checklist completed
- [ ] Documentation updated
- [ ] Code reviewed and approved

---

**Story Status:** ✅ Ready for Development
**Created:** 2025-11-07
