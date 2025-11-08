# Epic 4: Forecasting Engine - Brownfield Development

**Epic ID:** EPIC-4
**Status:** Ready for Development
**Priority:** Critical (Enables Epics 6+)
**Estimated Duration:** 12 hours
**Team:** ML Lead + Backend Developer
**Depends On:** Epic 1 (Infrastructure), Epic 3 (Data Ingestion)

---

## Epic Goal

**Implement demand forecasting using Facebook Prophet to predict product demand for 7/14/30 day horizons, calculate stockout risk, measure forecast accuracy (MAPE), and project cash flow based on transaction history and demand predictions.**

This epic delivers lightweight ML predictions (inference <10 seconds per product) with confidence intervals, accuracy metrics, and actionable risk scoring that inform reorder recommendations and cash flow warnings.

---

## Existing System Context

**Tech Stack (from Epics 1-3):**
- Django 4.2 + DRF
- PostgreSQL 14 for Forecast/CashFlowForecast models
- Redis + Celery 5.3 for async inference
- Python 3.11 + Pandas, NumPy, Scikit-Learn
- Facebook Prophet (time-series forecasting library)

**Pre-Existing Data (from Epic 3):**
- Transaction records with date, product_id, quantity
- Product records with current_stock, unit_price
- Customer spend history (for cash flow inputs)

**Integration Points (Downstream):**
- **Epic 5 (Churn):** Depends on transaction metrics
- **Epic 6 (Recommendations):** Triggered after forecasts complete
- **Frontend (Epic 7):** Displays forecast charts and stockout warnings

---

## Enhancement Details

### What's Being Built

1. **Prophet Demand Forecasting Model**
   - Input: Historical transactions (30+ days minimum)
   - Output: Daily demand predictions with 95% confidence intervals
   - Handles: Seasonality (weekly patterns), trend, outliers
   - Accuracy: MAPE (Mean Absolute % Error) calculated on validation set

2. **Forecast Request Endpoint**
   - Accept: product_ids, forecast_days (7|14|30), force_regenerate flag
   - Return: 202 ACCEPTED (async processing)
   - Enqueue: Celery task to run Prophet inference

3. **Forecast Storage & Querying**
   - Store: Forecast records with JSON predictions, confidence intervals, accuracy metrics
   - Return: GET /forecasts with latest forecast per product
   - Filter: By stockout risk, product name
   - Sort: By priority, accuracy

4. **Stockout Risk Calculation**
   - Logic: If cumulative forecast demand > current_stock, flag stockout
   - Calculate: Days until stockout (when stock depletes)
   - Confidence: Based on forecast confidence intervals

5. **Cash Flow Projection**
   - Input: Current balance, historical outflows, demand forecast
   - Output: Daily projected balance for 30 days
   - Risk: Detect balance dips below critical threshold
   - Recommendations: Suggest actions (reduce expenses, accelerate collections, loan)

### How It Integrates

```
User: "Generate forecasts"
    ↓
POST /forecasts/request { product_ids: [1, 2], forecast_days: 7 }
    ↓
Backend: Validate, return 202 ACCEPTED
    ↓
Enqueue: forecast.requested(product_ids, forecast_horizon, business_id)
    ↓
Celery Worker: For each product:
    ├→ Load 30+ days of transaction history
    ├→ Train Prophet model (seasonality, trend)
    ├→ Generate 7-day predictions with confidence intervals
    ├→ Calculate MAPE accuracy on validation set
    ├→ Calculate stockout risk (if demand > stock)
    └→ Store Forecast record
    ↓
Enqueue: forecast.completed(business_id)
    ↓
Frontend: GET /forecasts → See latest predictions + risk scores
    ↓
Enqueue: recommendation.generated (from Epic 6)
```

### Success Criteria

- ✅ Request forecast → 202 response within 1 second
- ✅ Forecasts generated within 15 seconds (all products)
- ✅ Forecast MAPE <40% acceptable (varies by product demand pattern)
- ✅ Stockout risk calculated correctly (cumulative demand vs stock)
- ✅ Cash flow projection shows balance trajectory + critical dates
- ✅ GET /forecasts returns latest forecast per product
- ✅ Minimum 30 days transaction history enforced
- ✅ Forecast accuracy visible to user

---

## Stories

### Story 4.1: Prophet Model Setup & Training (4 hours)

**Objective:** Implement Prophet model training, inference, and accuracy calculation.

**Acceptance Criteria:**

- [ ] Prophet library integration
  - [ ] `facebook-prophet` library installed
  - [ ] `apps/forecasting/ml/prophet_model.py` created
  - [ ] ProphetService class with train() and predict() methods

- [ ] Model training
  - [ ] Input: DataFrame with columns [ds (date), y (quantity)]
  - [ ] Data preparation: Aggregate daily sales by product
  - [ ] Split: 80% train, 20% validation
  - [ ] Prophet configuration:
    - [ ] yearly_seasonality: False (limited historical data)
    - [ ] weekly_seasonality: True (detect weekly patterns)
    - [ ] daily_seasonality: False (too granular)
    - [ ] interval_width: 0.95 (95% confidence intervals)
  - [ ] Fitting: Model trains in <5 seconds

- [ ] Prediction generation
  - [ ] Forecast horizon: 7, 14, or 30 days
  - [ ] Output: DataFrame with [ds, yhat (prediction), yhat_lower, yhat_upper]
  - [ ] Inference: <10 seconds per product
  - [ ] Handle edge case: Forecast goes negative → clip to 0

- [ ] Accuracy calculation
  - [ ] Method: MAPE (Mean Absolute Percentage Error)
  - [ ] Formula: mean(|actual - predicted| / actual) * 100
  - [ ] Calculate on validation set (20% holdout)
  - [ ] Handle division by zero: MAPE = NaN if all actuals = 0
  - [ ] Store: accuracy.mape (percentage), accuracy.data_points_used (count)

- [ ] Error handling
  - [ ] <30 days data: Return "Need more data" message (don't train)
  - [ ] All zeros (no demand): Return message "No demand pattern"
  - [ ] Prophet convergence failure: Log, return error, don't store

- [ ] Tests
  - [ ] Test training with 30 days data
  - [ ] Test prediction: yhat_lower <= yhat <= yhat_upper
  - [ ] Test MAPE calculation
  - [ ] Test <30 days rejection
  - [ ] Test inference speed (<10 seconds)
  - [ ] Minimum 5 tests

**Effort:** 4 hours
**Dependencies:** Epic 3 complete (need transaction data)
**Risk:** Medium (ML model quality depends on data quality)

---

### Story 4.2: Forecast Request Worker & Storage (3 hours)

**Objective:** Implement async Celery task for forecast generation and storage.

**Acceptance Criteria:**

- [ ] Celery task implementation
  - [ ] `apps/forecasting/tasks.py` contains `forecast_requested` task
  - [ ] Signature: `forecast_requested(product_ids, forecast_days, business_id, user_id)`
  - [ ] product_ids: List or None (all if None)
  - [ ] forecast_days: 7, 14, or 30 (validate)
  - [ ] Retry: 3 times with exponential backoff (5s, 25s, 125s)
  - [ ] Timeout: 5 minutes per task (safety limit)

- [ ] Forecast generation workflow
  - [ ] For each product in product_ids:
    - [ ] Load transaction history (all time)
    - [ ] Call ProphetService.train() + predict()
    - [ ] Calculate stockout risk (below)
    - [ ] Store Forecast record
    - [ ] Log progress ("Generated forecast for Product X")
  - [ ] If product has <30 days data: Skip, log "Insufficient data"
  - [ ] If error: Store in FailedJob, continue next product (fail gracefully)

- [ ] Forecast model
  - [ ] Model created if not exists: Forecast(business_id, product_id, ...)
  - [ ] Model updated if exists: Store latest forecast
  - [ ] Fields:
    - [ ] business_id, product_id, forecast_date (now), forecast_horizon_days
    - [ ] forecast_data (JSON): [{ date, yhat, yhat_lower, yhat_upper }, ...]
    - [ ] summary (JSON): { total_demand, avg_daily, peak_date, peak_qty }
    - [ ] stockout_risk (JSON): { will_stockout, days_until_stockout, confidence }
    - [ ] accuracy (JSON): { mape, data_points_used }
    - [ ] status: "completed" or "error"
    - [ ] error_message: If failed
    - [ ] created_at, updated_at

- [ ] Stockout risk calculation
  - [ ] Cumulative demand over horizon: sum(yhat) for all forecast days
  - [ ] Compare: cumulative_demand vs current_stock
  - [ ] If cumulative > stock: will_stockout = true
  - [ ] Calculate days_until_stockout: Find day when cumulative > stock
  - [ ] Confidence: Based on forecast confidence intervals (if yhat_upper > stock earlier, higher confidence)

- [ ] Forecast summary
  - [ ] total_demand: Sum of yhat over forecast period
  - [ ] avg_daily: total_demand / forecast_days
  - [ ] peak_date: Date with highest yhat
  - [ ] peak_qty: Highest yhat value

- [ ] Downstream triggering
  - [ ] After task completes: Enqueue forecast.completed event
  - [ ] Event triggers: recommendation.generated (from Epic 6)
  - [ ] Event triggers: cashflow.recalculate (below)

- [ ] Tests
  - [ ] Test forecast generation (end-to-end)
  - [ ] Test <30 days rejection
  - [ ] Test stockout risk calculation
  - [ ] Test retry on failure
  - [ ] Test downstream event enqueuing
  - [ ] Minimum 5 tests

**Effort:** 3 hours
**Dependencies:** Story 4.1 complete
**Risk:** Low

---

### Story 4.3: Forecast List & Request Endpoints (2.5 hours)

**Objective:** Implement API endpoints for forecasts and forecast requests.

**Acceptance Criteria:**

- [ ] Forecast List endpoint
  - [ ] `GET /forecasts` returns paginated list
  - [ ] Requires JWT authentication
  - [ ] Returns: Latest forecast for each product
  - [ ] Query params: limit, offset, has_stockout_warning (filter), sort, order

- [ ] Forecast response format
  - [ ] { id, product: { id, name }, forecast_date, forecast_days, predicted_demand: [...], summary: {...}, stockout_risk: {...}, accuracy: {...} }
  - [ ] predicted_demand: [{ date, quantity, confidence }, ...]
  - [ ] confidence: Calculated from yhat_upper - yhat (range/2)

- [ ] Forecast filtering
  - [ ] has_stockout_warning: Show only forecasts with will_stockout=true
  - [ ] Sort: By product_name, stockout_risk, accuracy
  - [ ] Order: asc or desc

- [ ] Forecast Request endpoint
  - [ ] `POST /forecasts/request` triggers async forecast generation
  - [ ] Request: { product_ids: [1, 2, 3] (optional), forecast_days: 7|14|30, force_regenerate: false }
  - [ ] Returns [202 ACCEPTED] immediately
  - [ ] Response: { message, product_count, forecast_days, estimated_processing_time }
  - [ ] Validates: forecast_days is valid; product_ids exist

- [ ] Rate limiting
  - [ ] Max 10 forecast requests per business per day
  - [ ] Return [429 Too Many Requests] if exceeded
  - [ ] Counter resets daily

- [ ] Data isolation
  - [ ] Only user's forecasts returned
  - [ ] Filter: filter(business_id=request.user.business_id)

- [ ] Tests
  - [ ] Test forecast list (pagination)
  - [ ] Test forecast filtering (stockout_warning)
  - [ ] Test forecast request (202 accepted)
  - [ ] Test rate limiting (429 after 10 requests/day)
  - [ ] Test forecast_days validation
  - [ ] Minimum 5 tests

**Effort:** 2.5 hours
**Dependencies:** Story 4.2 complete
**Risk:** Low

---

### Story 4.4: Cash Flow Projection Service (2 hours)

**Objective:** Implement cash balance projection with risk analysis and recommendations.

**Acceptance Criteria:**

- [ ] Cash Flow Service
  - [ ] `apps/forecasting/ml/cash_flow_model.py` contains CashFlowService
  - [ ] Method: project(business_id, projection_days=30) → CashFlowForecast
  - [ ] Inputs: Current balance, historical outflows (avg), demand forecast

- [ ] Current balance retrieval
  - [ ] Query: Latest transaction amount → assume current balance
  - [ ] Or: User-provided balance (Phase 2: implement balance entry)
  - [ ] If no transactions: current_balance = 0

- [ ] Historical outflows calculation
  - [ ] Query: All transactions last 30 days
  - [ ] Average daily spend: sum(amount) / 30
  - [ ] Handle: <30 days data → use available days

- [ ] Inflow projection
  - [ ] Source: Demand forecast (from Epic 4.1)
  - [ ] For each forecast day: inflow = yhat * unit_price * 0.9 (payment probability)
  - [ ] Assumption: 90% of predicted demand converts to payment (some default/discount)

- [ ] Cash flow trajectory
  - [ ] For each day D from 1 to projection_days:
    - [ ] balance[D] = balance[D-1] + inflows[D] - outflows[D]
  - [ ] Track: daily_balance, min_balance, max_balance
  - [ ] Output: [{ date, inflows, outflows, balance }, ...]

- [ ] Risk analysis
  - [ ] Critical threshold: User-configurable (default = 20% of monthly revenue, min 5000 TK)
  - [ ] Risk score: (min_balance - threshold) / threshold (normalized, 0-1)
  - [ ] Risk level: low (<0.3), medium (0.3-0.6), high (>0.6)
  - [ ] Critical date: First date when balance < threshold
  - [ ] Warning: "Balance drops to ৳{min_balance} on {critical_date}" (if high risk)

- [ ] Recommendations
  - [ ] If balance never dips: { type: "all_clear", message: "No cash flow concerns" }
  - [ ] If dips 7+ days: { type: "reduce_expenses", message: "Reduce expenses by 10%", urgency: "high" }
  - [ ] If dips <7 days: { type: "accelerate_collections", message: "Accelerate collections", urgency: "high" }
  - [ ] If dips 8-30 days: { type: "plan_ahead", message: "Consider short-term loan", urgency: "medium" }

- [ ] Celery task (triggered from Story 4.2)
  - [ ] `cashflow.recalculate(business_id)` enqueued after forecasts complete
  - [ ] Calls CashFlowService.project()
  - [ ] Stores CashFlowForecast record

- [ ] Tests
  - [ ] Test projection with 30+ days data
  - [ ] Test risk calculation (balance dips)
  - [ ] Test risk levels (low/medium/high)
  - [ ] Test recommendations generated
  - [ ] Test edge case: No transactions (<30 days)
  - [ ] Minimum 5 tests

**Effort:** 2 hours
**Dependencies:** Story 4.1 complete (need forecasts)
**Risk:** Low

---

### Story 4.5: Cash Flow Endpoint & Integration (0.5 hours)

**Objective:** Implement GET /cashflow endpoint and integrate with forecast workflow.

**Acceptance Criteria:**

- [ ] Cash Flow endpoint
  - [ ] `GET /cashflow` returns latest cash flow forecast
  - [ ] Query params: projection_days (7|30|90, default 30)
  - [ ] Returns: { forecast: { current_balance, projected_balance: [...], summary: {...} }, risk_analysis: {...}, recommendations: [...] }
  - [ ] Requires JWT authentication
  - [ ] Data isolation: Only user's business

- [ ] Response format
  - [ ] forecast: { current_balance, projected_balance: [{ date, inflows, outflows, balance }, ...], summary: { avg_daily_balance, min_balance, max_balance } }
  - [ ] risk_analysis: { risk_level: "high"|"medium"|"low", risk_score: 0.78, warning: "...", critical_date: "2025-11-18", critical_threshold: 20000 }
  - [ ] recommendations: [{ type, urgency, impact, description }, ...]

- [ ] Integration with forecast workflow
  - [ ] GET /cashflow always returns latest CashFlowForecast
  - [ ] If no forecast: Return message "Generate forecasts first"
  - [ ] Auto-updated when forecasts refresh

- [ ] Tests
  - [ ] Test cash flow endpoint (200)
  - [ ] Test projection_days validation
  - [ ] Test data isolation
  - [ ] Unauthenticated request (401)

**Effort:** 0.5 hours
**Dependencies:** Story 4.4 complete
**Risk:** Low

---

## Compatibility Requirements

**N/A (Greenfield)** — No prior forecasting system to maintain.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Prophet model training fails** | High | Validate data before training; handle exceptions gracefully | Return "Need more data" or "No pattern detected"; fall back to simple average |
| **Forecast accuracy low (MAPE >40%)** | Medium | Document acceptable accuracy ranges; warn user if low | Show confidence intervals; suggest more data; manual input option (Phase 2) |
| **Inference too slow (>10s)** | Medium | Optimize Prophet config; parallelize product inference | Cache predictions; reduce horizon if needed; batch inference |
| **Cash flow projections unrealistic** | Medium | Test assumptions (payment probability, outflow avg); document| Allow user to input assumptions (Phase 2) |
| **Negative stock/balance in projections** | Low | Clip to 0 for presentation; track in risk metrics | Add warnings for unusual values |

---

## Definition of Done

### Code Quality
- [ ] Prophet service abstracted (not in views)
- [ ] No hardcoded thresholds (configurable)
- [ ] Type hints on all functions
- [ ] Docstrings explaining ML logic
- [ ] Error handling comprehensive

### Testing
- [ ] All 5 stories have tests
- [ ] ML tests use synthetic data (consistent, repeatable)
- [ ] Prophet model quality verified (MAPE calculation correct)
- [ ] Accuracy metrics calculated correctly
- [ ] Edge cases: <30 days, no demand, negative predictions

### Documentation
- [ ] Prophet configuration documented (why these settings?)
- [ ] MAPE calculation explained
- [ ] Cash flow assumptions documented
- [ ] Risk threshold explained

### Deployment
- [ ] Works locally (`docker-compose up`)
- [ ] Celery inference doesn't timeout (5 min limit)
- [ ] Large forecasts (100 products) don't crash
- [ ] Monitoring logs visible for inference time

### Sign-Off
- [ ] ML Lead: "Forecasting quality acceptable for MVP"
- [ ] Backend Lead: "Integration smooth; ready for Epic 6"

---

## Success Criteria

**Technical Success:**
- ✅ POST /forecasts/request → 202 response within 1 second
- ✅ Forecasts generated within 15 seconds (all products)
- ✅ Forecast MAPE <40% (acceptable for MVP)
- ✅ Stockout risk calculated (cumulative demand vs stock)
- ✅ Cash flow projection shows balance trajectory
- ✅ GET /forecasts returns latest forecasts
- ✅ GET /cashflow shows risk analysis + recommendations
- ✅ Minimum 30-day data requirement enforced

**Team Success:**
- ✅ Frontend can display forecast charts (data available)
- ✅ QA can test with demo data
- ✅ Forecast-based recommendations (Epic 6) can be built

**Operational Success:**
- ✅ Forecasts stable and consistent
- ✅ User trusts accuracy (visible MAPE metric)
- ✅ Cash flow warnings help users plan ahead

---

## Handoff to Development

### Pre-Story Checklist
- [ ] `facebook-prophet` added to requirements.txt
- [ ] Pandas, NumPy, Scikit-Learn installed
- [ ] Celery worker running (from Epic 1)

### Story Ordering (Sequential)
1. **Story 4.1** (4 hrs) — Prophet setup + training/prediction
2. **Story 4.2** (3 hrs) — Forecast worker + storage
3. **Story 4.3** (2.5 hrs) — Forecast endpoints
4. **Story 4.4** (2 hrs) — Cash flow service
5. **Story 4.5** (0.5 hrs) — Cash flow endpoint

**Total:** 12 hours

---

**Epic Owner:** ML Lead
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
