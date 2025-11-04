# Epic 6: Recommendation Generation - Brownfield Development

**Epic ID:** EPIC-6
**Status:** Ready for Development
**Priority:** Critical
**Estimated Duration:** 10 hours
**Team:** Backend Lead + Backend Developer
**Depends On:** Epic 1 (Infrastructure), Epic 4 (Forecasting), Epic 5 (Churn)

---

## Epic Goal

**Implement recommendation engine that combines forecasts, churn scores, and cash flow projections to generate actionable, prioritized recommendations (reorder, cash warnings, retention campaigns) that users can view, understand, and execute.**

This epic delivers a rule-based recommendation engine with deduplication, prioritization by urgency × impact, and clear engagement tracking (viewed/executed).

---

## Existing System Context

**Tech Stack (from Epics 1-5):**
- Django 4.2 + DRF
- PostgreSQL 14 for Recommendation model
- Redis + Celery for async recommendation generation
- Forecast + ChurnScore data available from prior epics

**Pre-Existing Data:**
- Forecast records with stockout risk
- ChurnScore records with risk levels
- CashFlowForecast with risk analysis

**Integration Points:**
- **Epic 7 (Frontend):** Displays recommendation feed
- **Phase 2:** Execute recommendations (create RFQ, send SMS, etc.)

---

## Enhancement Details

### What's Being Built

1. **Recommendation Generation Rules**
   - **Reorder:** Stockout predicted within 7 days
     - Urgency: high (0-3d) / medium (3-7d)
     - Impact: 0.8 (prevents lost sales)
     - Action: "Reorder X units by deadline"

   - **Cash Warning:** Projected balance < critical threshold
     - Urgency: high (dips in 7d) / medium (8-30d)
     - Impact: 0.9 (critical business need)
     - Action: "Reduce expenses", "Accelerate collections", "Consider loan"

   - **Retention:** 3+ customers at high churn risk
     - Urgency: medium (0.6)
     - Impact: 0.7 (improves LTV)
     - Action: "Contact 5 at-risk customers for retention campaign"

   - **Price Optimization:** High demand, low stock (Phase 2)

2. **Recommendation Prioritization**
   - Priority Score: urgency × impact (0-1 range)
   - Sorted: Highest score first (most actionable)
   - Example: (0.8 urgency × 0.9 impact = 0.72 priority)

3. **Deduplication**
   - Hash-based: Same action type + target not recommended twice in 7 days
   - Prevents: Recommendation fatigue
   - Allows: Same product recommended again after 7 days if still at risk

4. **Engagement Tracking**
   - Viewed: Track when user views recommendation
   - Executed: Track when user executes action
   - Used: For analytics, measuring recommendation effectiveness

### How It Integrates

```
Forecast completes (Epic 4)
    ↓
forecast.completed event
    ↓
Enqueue: recommendation.generated(business_id) Celery task
    ↓
Celery Worker:
    ├→ Load latest forecasts for all products
    ├→ Load latest cash flow forecast
    ├→ Load churn scores for all customers
    ├→ Apply rules:
    │  ├→ If stockout predicted: Generate reorder rec
    │  ├→ If cash warning: Generate cash warning rec
    │  └→ If 3+ at-risk customers: Generate retention rec
    ├→ Check deduplication (not same action in last 7 days)
    ├→ Calculate priority (urgency × impact)
    ├→ Create Recommendation records (batch insert)
    └→ Enqueue: notification jobs (Phase 2)
    ↓
GET /recommendations → See prioritized feed
    ↓
User: Views + executes recommendations
    ↓
Engagement: Tracked for analytics
```

### Success Criteria

- ✅ Reorder recommendations generated for stockout-at-risk products
- ✅ Cash warning recommendations generated for negative cash flow
- ✅ Retention recommendations generated for cohorts of at-risk customers
- ✅ Deduplication prevents same action twice in 7 days
- ✅ Priority scoring (urgency × impact) correct
- ✅ User can view recommendations and mark engaged
- ✅ User can execute recommendation (MVP: mocked side effects)
- ✅ GET /recommendations returns prioritized list

---

## Stories

### Story 6.1: Recommendation Generation Logic (3 hours)

**Objective:** Implement business rules for generating recommendations.

**Acceptance Criteria:**

- [ ] Recommendation Rules class
  - [ ] `apps/recommendations/rules.py` contains RecommendationRules
  - [ ] Methods for each recommendation type:
    - [ ] generate_reorder_recommendations(business_id)
    - [ ] generate_cash_warnings(business_id)
    - [ ] generate_retention_recommendations(business_id)

- [ ] Reorder recommendation logic
  - [ ] Query: Latest Forecast for each product
  - [ ] Check: Forecast.stockout_risk.will_stockout AND days_until_stockout ≤ 7
  - [ ] Urgency: "high" if days ≤ 3, "medium" if 4-7
  - [ ] Impact: 0.8
  - [ ] Priority: 0.8 × urgency_score (high=0.8, medium=0.6)
  - [ ] Action data: { product_id, product_name, current_stock, recommended_qty, reorder_by_date }
  - [ ] Title: "Reorder {product} (Stock ending in {days} days)"
  - [ ] Description: "Current: {stock} units. Predicted demand: {forecast} units."

- [ ] Cash warning logic
  - [ ] Query: Latest CashFlowForecast
  - [ ] Check: risk_analysis.risk_level in ["medium", "high"]
  - [ ] Urgency: "high" if critical_date ≤ 7 days, "medium" if 8-30 days
  - [ ] Impact: 0.9
  - [ ] Priority: 0.9 × urgency_score
  - [ ] Recommendations: Based on risk type
    - [ ] If declining revenue: "Reduce expenses by 10%"
    - [ ] If high outflow: "Accelerate collections from customers"
    - [ ] If long-term issue: "Consider short-term loan or financing"
  - [ ] Action data: { balance_at_risk, threshold, critical_date }
  - [ ] Title: "Cash Flow Warning"
  - [ ] Description: "Balance drops to ৳{min_balance} on {date}. Consider {action}."

- [ ] Retention recommendation logic
  - [ ] Query: ChurnScore records where churn_risk_level = "high"
  - [ ] Check: Count ≥ 3 customers at risk
  - [ ] Urgency: "medium" (0.6)
  - [ ] Impact: 0.7
  - [ ] Priority: 0.42
  - [ ] Action data: { at_risk_customers: [{ id, name, days_since }], count: 5 }
  - [ ] Title: "Retention Campaign Needed"
  - [ ] Description: "5 customers are at risk of churning. Contact them to re-engage."

- [ ] Priority calculation
  - [ ] Formula: urgency_score × impact_score
  - [ ] Urgency scores: high=0.8, medium=0.6, low=0.3
  - [ ] Example: Reorder high urgency = 0.8 × 0.8 = 0.64
  - [ ] Used for sorting (highest first)

- [ ] Tests
  - [ ] Test reorder recommendation generation (stockout detected)
  - [ ] Test cash warning generation (balance risk detected)
  - [ ] Test retention recommendation generation (3+ at-risk customers)
  - [ ] Test priority calculation (urgency × impact)
  - [ ] Test edge case: No recommendations (no risky products/customers)
  - [ ] Minimum 5 tests

**Effort:** 3 hours
**Dependencies:** Epic 4-5 complete (need forecasts + churn scores)
**Risk:** Medium (rule tuning based on feedback)

---

### Story 6.2: Deduplication & Recommendation Worker (2 hours)

**Objective:** Implement deduplication logic and async Celery task for recommendation generation.

**Acceptance Criteria:**

- [ ] Deduplication logic
  - [ ] `apps/recommendations/services.py` contains dedup function
  - [ ] Hash key: type + product_id (for reorder), type + "cash_flow" (for cash warnings), type + "retention" (for retention)
  - [ ] Check: No recommendation with same dedup_key created in last 7 days
  - [ ] Query: Recommendation.objects.filter(deduplication_key=key, created_at__gte=now-7d)
  - [ ] If exists: Skip creating duplicate; log "Recommendation already exists"

- [ ] Celery task
  - [ ] `apps/recommendations/tasks.py` contains `recommendation_generated` task
  - [ ] Signature: `recommendation_generated(business_id, user_id=None)`
  - [ ] Triggered: After forecast.completed event (from Epic 4)
  - [ ] Retry: 3 times with backoff

- [ ] Recommendation generation workflow
  - [ ] Load: All forecasts, cash flow forecast, churn scores
  - [ ] For each rule type: Generate applicable recommendations
  - [ ] Apply deduplication: Skip if already recommended in last 7 days
  - [ ] Create: Recommendation records (batch insert for performance)
  - [ ] Log: How many recommendations created (reorder, cash, retention)

- [ ] Recommendation model fields
  - [ ] business_id, title, description, type, urgency, priority_score
  - [ ] action_data (JSON): { product_id, current_stock, etc. }
  - [ ] engagement (JSON): { is_viewed, viewed_at, is_executed, executed_at, view_duration_seconds }
  - [ ] generated_by (string): "recommendation_engine"
  - [ ] deduplication_key (string): For dedup logic
  - [ ] expires_at (timestamp): Optional, for Phase 2 (delete old recs)
  - [ ] status (string): "pending" | "viewed" | "executed" | "dismissed"
  - [ ] created_at, updated_at

- [ ] Batch insertion
  - [ ] Collect all recommendations before inserting
  - [ ] Use bulk_create for efficiency
  - [ ] Prevent: Individual inserts (N+1)

- [ ] Tests
  - [ ] Test deduplication (same rec not created twice in 7 days)
  - [ ] Test worker generates all rec types
  - [ ] Test batch insertion (10 recs inserted at once)
  - [ ] Test retry on failure
  - [ ] Minimum 4 tests

**Effort:** 2 hours
**Dependencies:** Story 6.1 complete
**Risk:** Low

---

### Story 6.3: Recommendation List Endpoint (2 hours)

**Objective:** Implement GET /recommendations endpoint with filtering and sorting.

**Acceptance Criteria:**

- [ ] Recommendation List endpoint
  - [ ] `GET /recommendations` returns paginated, prioritized list
  - [ ] Requires JWT authentication
  - [ ] Returns only authenticated user's recommendations
  - [ ] Default sort: priority_score descending (highest first)

- [ ] Response format
  - [ ] { id, title, description, type, urgency, priority_score, action_data, engagement: { is_viewed, viewed_at, is_executed, executed_at }, created_at }
  - [ ] Includes: All fields needed to display in UI

- [ ] Query parameters
  - [ ] limit: Default 20, max 100
  - [ ] offset: Pagination
  - [ ] status: "pending" | "viewed" | "executed" | "dismissed" (filter)
  - [ ] type: "reorder" | "cash_warning" | "retention" | "price_optimization" (filter)
  - [ ] urgency: "high" | "medium" | "low" (filter)
  - [ ] sort: "priority_score" | "created_at" (default: priority)
  - [ ] order: "asc" | "desc"

- [ ] Summary statistics
  - [ ] Return: { total_pending: 3, high_urgency_count: 1, estimated_impact: 0.85 }
  - [ ] Helps user understand recommendation importance

- [ ] Data isolation
  - [ ] Only user's business recommendations returned
  - [ ] Filter: filter(business_id=request.user.business_id)

- [ ] Query optimization
  - [ ] Use select_related for related models (if any)
  - [ ] Index on (business_id, status, priority_score)
  - [ ] P95 <500ms for 50 recommendations

- [ ] Tests
  - [ ] Test list all recommendations (pagination)
  - [ ] Test filter by status (pending, executed)
  - [ ] Test filter by type (reorder, cash_warning)
  - [ ] Test filter by urgency
  - [ ] Test sorting (priority, creation date)
  - [ ] Test summary stats
  - [ ] Test data isolation
  - [ ] Minimum 7 tests

**Effort:** 2 hours
**Dependencies:** Story 6.2 complete
**Risk:** Low

---

### Story 6.4: Mark Viewed & Execute Endpoints (2 hours)

**Objective:** Implement engagement tracking (view + execute) endpoints.

**Acceptance Criteria:**

- [ ] Mark Viewed endpoint
  - [ ] `POST /recommendations/{id}/view` marks recommendation as viewed
  - [ ] Request: { view_duration_seconds: 45 (optional) }
  - [ ] Updates: recommendation.engagement.is_viewed = true, viewed_at = now
  - [ ] Idempotent: Safe to call multiple times
  - [ ] Returns: [200 OK] with updated recommendation
  - [ ] Response: { status: "success", data: { message: "Recommendation viewed", recommendation: {...} } }

- [ ] Execute Endpoint
  - [ ] `POST /recommendations/{id}/execute` marks recommendation as executed
  - [ ] Request: { confirmation: true, modified_action: {...} (optional) }
  - [ ] Updates: recommendation.engagement.is_executed = true, executed_at = now
  - [ ] Status: recommendation.status = "executed"
  - [ ] Idempotent: Safe to call multiple times
  - [ ] Side effects: MVP mocked (log "Would create RFQ", "Would send SMS")
  - [ ] Returns: [200 OK] with success message + next steps

- [ ] Side Effects (MVP: Mocked)
  - [ ] Reorder execution: Log "Would create RFQ to supplier"
  - [ ] Cash warning execution: Log "Would send SMS reminder"
  - [ ] Retention execution: Log "Would enqueue SMS campaign"
  - [ ] Phase 2: Implement actual RFQ creation, SMS sending

- [ ] Error handling
  - [ ] [404]: Recommendation not found
  - [ ] [401]: Not authenticated
  - [ ] [403]: User cannot access other business's recommendations
  - [ ] [409]: Cannot execute already-executed recommendation (optional, or allow idempotent)

- [ ] Tests
  - [ ] Test mark viewed (200)
  - [ ] Test mark viewed twice (idempotent)
  - [ ] Test execute recommendation (200)
  - [ ] Test execute twice (idempotent)
  - [ ] Test engagement fields updated
  - [ ] Test 404 for non-existent recommendation
  - [ ] Minimum 6 tests

**Effort:** 2 hours
**Dependencies:** Story 6.3 complete
**Risk:** Low

---

### Story 6.5: Integration & Triggers (1 hour)

**Objective:** Connect recommendation generation to forecast workflow and test end-to-end.

**Acceptance Criteria:**

- [ ] Event integration
  - [ ] After forecast.completed: Enqueue recommendation.generated event
  - [ ] After rfm.recalculate: Enqueue recommendation.generated event
  - [ ] Events propagate correctly

- [ ] End-to-end test
  - [ ] Upload CSV with 30 days of data
  - [ ] Forecasts generated
  - [ ] RFM calculated
  - [ ] Recommendations generated
  - [ ] Verify: GET /recommendations shows reorder, cash, retention recs
  - [ ] User can view + execute

- [ ] Data consistency
  - [ ] Recommendations match forecast/churn data
  - [ ] No orphaned recommendations (product/customer deleted)
  - [ ] Deduplication works (no duplicate recs in 7 days)

- [ ] Tests
  - [ ] Integration test: Forecast + churn → recommendations generated
  - [ ] Minimum 1 comprehensive integration test

**Effort:** 1 hour
**Dependencies:** Stories 6.1-6.4 complete
**Risk:** Low

---

## Compatibility Requirements

**N/A (Greenfield)** — No prior recommendation system to maintain.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Too many recommendations (fatigue)** | Medium | Prioritization + deduplication limits noise | Allow user to configure recommendation frequency (Phase 2) |
| **Recommendations not actionable** | High | Clear action data + next steps; test with users | Manual review; iterate on wording |
| **Deduplication blocks valid recs** | Medium | 7-day window; manual override option | Reduce to 3-day window if feedback suggests |
| **Side effects fail in Phase 2** | Medium | MVP: Mocked; Phase 2: Robust error handling | Fallback to SMS or manual intervention |

---

## Definition of Done

### Code Quality
- [ ] Rules abstracted into service
- [ ] No hardcoded thresholds (configurable)
- [ ] Type hints on all functions
- [ ] Docstrings on recommendation logic

### Testing
- [ ] All 5 stories have tests
- [ ] Rules tests use synthetic forecast/churn data
- [ ] Integration test covers full flow
- [ ] Deduplication tested thoroughly

### Documentation
- [ ] Recommendation types documented
- [ ] Priority formula explained
- [ ] API docs (Swagger) show /recommendations/* endpoints
- [ ] Example recommendations in README

### Deployment
- [ ] Works locally
- [ ] Recommendation generation doesn't timeout
- [ ] Deduplication works correctly

### Sign-Off
- [ ] Backend Lead: "Recommendations solid, ready for Epic 7"
- [ ] Frontend Lead: "Can display recommendation feed"

---

## Success Criteria

**Technical Success:**
- ✅ Reorder recommendations generated for stockout-at-risk products
- ✅ Cash warnings generated for negative cash flow
- ✅ Retention recommendations for at-risk customers
- ✅ Deduplication prevents duplicate recommendations
- ✅ Priority scoring correct (urgency × impact)
- ✅ GET /recommendations returns prioritized list
- ✅ User can view + execute recommendations
- ✅ Engagement tracked

**Team Success:**
- ✅ Frontend can display recommendation feed
- ✅ Frontend can implement view/execute actions
- ✅ QA can test recommendation flow

**Operational Success:**
- ✅ Recommendations trusted by users (accurate + actionable)
- ✅ Engagement metrics show usage (viewed, executed)
- ✅ Deduplication prevents recommendation fatigue

---

## Handoff to Development

### Pre-Story Checklist
- [ ] Celery worker running (from Epic 1)
- [ ] Forecast + ChurnScore data available

### Story Ordering (Sequential)
1. **Story 6.1** (3 hrs) — Recommendation rules
2. **Story 6.2** (2 hrs) — Deduplication + worker
3. **Story 6.3** (2 hrs) — Recommendation list endpoint
4. **Story 6.4** (2 hrs) — View + execute endpoints
5. **Story 6.5** (1 hr) — Integration + triggers

**Total:** 10 hours

---

**Epic Owner:** Backend Lead
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
