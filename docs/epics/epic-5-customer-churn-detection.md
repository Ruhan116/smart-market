# Epic 5: Customer Churn Detection - Brownfield Development

**Epic ID:** EPIC-5
**Status:** Ready for Development
**Priority:** High
**Estimated Duration:** 8 hours
**Team:** Backend Developer
**Depends On:** Epic 1 (Infrastructure), Epic 3 (Data Ingestion)

---

## Epic Goal

**Implement RFM (Recency, Frequency, Monetary) scoring and rule-based churn risk detection to identify at-risk customers and dormant segments, enabling targeted retention campaigns.**

This epic delivers customer segmentation (champion, loyal, at-risk, dormant) with risk scoring and explainable reasons for churn risk, triggering retention recommendations.

---

## Existing System Context

**Tech Stack (from Epics 1-3):**
- Django 4.2 + DRF
- PostgreSQL 14 for Customer, ChurnScore models
- Redis + Celery for async churn recalculation
- Pandas for score calculations

**Pre-Existing Data (from Epic 3):**
- Customer records with purchase history
- Transaction records with dates, amounts

**Integration Points:**
- **Epic 6 (Recommendations):** Triggered after churn scores calculated
- **Frontend (Epic 7):** Displays at-risk customer list

---

## Enhancement Details

### What's Being Built

1. **RFM Scoring Algorithm**
   - Recency: Days since last purchase (normalized 1-5)
   - Frequency: Purchase count (normalized 1-5 by quartile)
   - Monetary: Total spent (normalized 1-5 by quartile)
   - RFM Score: (R+F+M)/3 (average, 0-5 scale)

2. **Customer Segmentation**
   - Champion: High on all 3 (RFM 4.7-5.0)
   - Loyal: Good on all 3 (RFM 3.7-4.7)
   - Potential: Room to grow (RFM 2.7-3.7)
   - At-Risk: Declining engagement (RFM 1.7-2.7)
   - Dormant: No recent activity (RFM <1.7)

3. **Churn Risk Scoring**
   - Score: 0-1 (0 = safe, 1 = imminent churn)
   - Factors: Days since purchase, frequency trend, monetary decline
   - Risk Level: low (<0.3), medium (0.3-0.6), high (>0.6)
   - Reason: Explainable text ("No purchase in 45 days", "Frequency declining 30%")

4. **Churn Recalculation Worker**
   - Triggered: After transaction.parsed event
   - Recalculates: RFM scores for all affected customers
   - Updates: ChurnScore records with latest metrics
   - Latency: <10 seconds for 100 customers

### How It Integrates

```
CSV Upload (Epic 3)
    ↓
transaction.parsed event
    ↓
Enqueue: rfm.recalculate(business_id) Celery task
    ↓
Celery Worker: For each customer:
    ├→ Calculate Recency (days_since_purchase)
    ├→ Calculate Frequency (purchase_count)
    ├→ Calculate Monetary (total_spent)
    ├→ Normalize each to 1-5 scale
    ├→ Calculate RFM Score
    ├→ Assign segment (champion, loyal, etc.)
    ├→ Calculate churn_risk_score + risk_reason
    └→ Store ChurnScore record
    ↓
GET /customers → See RFM segments + churn risk
    ↓
Enqueue: recommendation.generated (retention recs from Epic 6)
```

### Success Criteria

- ✅ RFM scores calculated correctly (normalized 1-5)
- ✅ Customer segmentation accurate (5 segments)
- ✅ Churn risk score 0-1 with clear reason
- ✅ At-risk customers identifiable via GET /customers filter
- ✅ Recalculation triggered after CSV upload
- ✅ Performance: <10 seconds for 100 customers
- ✅ Scores updated immediately (no stale data)

---

## Stories

### Story 5.1: RFM Scoring Algorithm (2.5 hours)

**Objective:** Implement RFM calculation and customer segmentation.

**Acceptance Criteria:**

- [ ] RFM Service class
  - [ ] `apps/customers/services.py` contains RFMService
  - [ ] Method: calculate_rfm(customer_id, business_id) → { recency, frequency, monetary, rfm_score, segment }
  - [ ] Uses only customer's business data (isolation)

- [ ] Recency calculation
  - [ ] Query: Latest transaction date for customer
  - [ ] Calculate: days_since = (today - last_transaction_date).days
  - [ ] Normalize to 1-5:
    - [ ] 5 = <8 days (very recent)
    - [ ] 4 = 8-30 days (recent)
    - [ ] 3 = 31-60 days (moderate)
    - [ ] 2 = 61-120 days (old)
    - [ ] 1 = >120 days (very old)
  - [ ] Edge case: No transactions → recency = 1

- [ ] Frequency calculation
  - [ ] Query: Total purchase count for customer
  - [ ] Normalize by quartile within business:
    - [ ] Get quartiles of all customers' purchase counts
    - [ ] Assign 1-5 based on which quartile this customer falls into
    - [ ] Example: If 25% of customers have 0 purchases, 50% have <5, 75% have <10, 100% have <20
      - [ ] <0 (impossible) = N/A
      - [ ] 0-5 purchases = 1-2 (bottom quartile)
      - [ ] 5-10 = 2-3
      - [ ] 10-15 = 3-4
      - [ ] 15+ = 4-5
  - [ ] Edge case: Single purchase → frequency depends on other customers

- [ ] Monetary calculation
  - [ ] Query: Total amount spent by customer
  - [ ] Normalize by quartile within business (similar to frequency)
  - [ ] Example: If top 25% spent >50K TK
    - [ ] <10K = 1-2
    - [ ] 10-30K = 2-3
    - [ ] 30-50K = 3-4
    - [ ] >50K = 4-5

- [ ] RFM Score
  - [ ] Formula: (recency + frequency + monetary) / 3
  - [ ] Range: 0-5 (but typically 1-5)
  - [ ] Used for comparison/trending

- [ ] Segmentation
  - [ ] RFM 4.7-5.0: "champion" (high activity, high spend, recent)
  - [ ] RFM 3.7-4.7: "loyal" (consistent, good spend, recent)
  - [ ] RFM 2.7-3.7: "potential" (some activity but room to grow)
  - [ ] RFM 1.7-2.7: "at_risk" (declining engagement)
  - [ ] RFM <1.7: "dormant" (inactive, needs reactivation)

- [ ] Tests
  - [ ] Test recency normalization (8d=5, 100d=1)
  - [ ] Test frequency normalization (quartile-based)
  - [ ] Test monetary normalization (quartile-based)
  - [ ] Test segmentation (champion, loyal, at_risk, dormant)
  - [ ] Test edge case: New customer (1 purchase)
  - [ ] Test edge case: Inactive customer (no purchases in 200 days)
  - [ ] Minimum 6 tests

**Effort:** 2.5 hours
**Dependencies:** Epic 3 complete (need customer data)
**Risk:** Medium (RFM binning can be tricky; test with real data distributions)

---

### Story 5.2: Churn Risk Scoring (1.5 hours)

**Objective:** Implement rule-based churn risk calculation with explanations.

**Acceptance Criteria:**

- [ ] Churn Service class
  - [ ] `apps/customers/services.py` contains ChurnService
  - [ ] Method: calculate_churn_risk(customer_id, business_id) → { churn_score, churn_level, reason }
  - [ ] Churn score: 0-1 (0 = safe, 1 = high risk)

- [ ] Base churn score calculation
  - [ ] Formula: (days_since_purchase / 365) + frequency_factor + monetary_factor
  - [ ] Capped at 1.0
  - [ ] Examples:
    - [ ] 30 days since purchase, stable frequency → score ≈ 0.08
    - [ ] 60 days, frequency declining → score ≈ 0.25
    - [ ] 120 days, frequency declining, low spend → score ≈ 0.8

- [ ] Frequency trend detection
  - [ ] Query: Purchases in last 30 days vs 30-60 days
  - [ ] Calculate: trend = current_30d / prior_30d
  - [ ] If trend <0.7 (declining >30%): Add +0.3 to churn score
  - [ ] If trend >1.3 (growing): Subtract -0.1 from churn score

- [ ] Monetary trend detection (optional for MVP)
  - [ ] Query: Total spent last 30 days vs 30-60 days
  - [ ] If spending declined significantly: Add +0.2
  - [ ] Not critical; focus on recency + frequency

- [ ] Risk level assignment
  - [ ] Low: churn_score <0.3 ("Recent and frequent buyer")
  - [ ] Medium: 0.3-0.6 ("Frequency declining or inactive" + duration)
  - [ ] High: >0.6 ("At immediate risk of churn")

- [ ] Risk reason generation
  - [ ] Text explanation: "No purchase in 45 days", "Frequency declining 30%", "Last purchase 90+ days ago"
  - [ ] Actionable: Tells user why customer is at risk
  - [ ] Examples:
    - [ ] Low: "Active and recent buyer"
    - [ ] Medium: "No purchase in 30 days; previously more frequent"
    - [ ] High: "No purchase in 90+ days; frequency declining 60%"

- [ ] Integration with RFM
  - [ ] ChurnService uses RFMService results
  - [ ] Churn score informed by RFM segment

- [ ] Tests
  - [ ] Test score calculation (ranges)
  - [ ] Test frequency decline detection (+0.3)
  - [ ] Test risk level assignment
  - [ ] Test reason generation (text matches score)
  - [ ] Test edge case: New customer (should be low risk)
  - [ ] Test edge case: Long-time dormant customer (high risk)
  - [ ] Minimum 6 tests

**Effort:** 1.5 hours
**Dependencies:** Story 5.1 complete
**Risk:** Medium (rule tuning based on domain knowledge)

---

### Story 5.3: Churn Recalculation Worker (1.5 hours)

**Objective:** Implement Celery task to recalculate churn for all customers after transaction upload.

**Acceptance Criteria:**

- [ ] Celery task
  - [ ] `apps/customers/tasks.py` contains `rfm_recalculate` task
  - [ ] Signature: `rfm_recalculate(business_id, customer_ids=None)`
  - [ ] customer_ids: List to update specific customers (if None, update all)
  - [ ] Triggered: After transaction.parsed event

- [ ] Batch processing
  - [ ] Query: All customers (or specific list) for business
  - [ ] For each customer: Calculate RFM + churn
  - [ ] Batch create/update: Use bulk_create/bulk_update for performance
  - [ ] Latency: <10 seconds for 100 customers

- [ ] ChurnScore model update/create
  - [ ] Model: ChurnScore(business_id, customer_id, recency_score, frequency_score, monetary_score, rfm_segment, churn_risk_score, churn_risk_level, risk_reason, last_recalculated_at)
  - [ ] Update if exists: Get existing ChurnScore, update fields
  - [ ] Create if not exists: Insert new ChurnScore
  - [ ] Unique constraint: One ChurnScore per customer

- [ ] Error handling
  - [ ] If customer has no transactions: Set defaults (all 1s, dormant segment)
  - [ ] If calculation fails: Log error, skip customer, continue
  - [ ] Retry: 3 times with backoff

- [ ] Downstream triggering
  - [ ] After task completes: Enqueue recommendation.generated event
  - [ ] Retention recommendations triggered

- [ ] Tests
  - [ ] Test churn recalculation for single customer
  - [ ] Test batch recalculation (10 customers)
  - [ ] Test update vs create (first time vs subsequent)
  - [ ] Test downstream event enqueuing
  - [ ] Minimum 4 tests

**Effort:** 1.5 hours
**Dependencies:** Stories 5.1-5.2 complete
**Risk:** Low

---

### Story 5.4: Customer List Endpoint (1.5 hours)

**Objective:** Implement GET /customers endpoint with RFM and churn data.

**Acceptance Criteria:**

- [ ] Customer List endpoint
  - [ ] `GET /customers` returns paginated customer list
  - [ ] Requires JWT authentication
  - [ ] Returns only authenticated user's business customers
  - [ ] Includes: Customer data + RFM metrics + churn risk

- [ ] Response format
  - [ ] { id, name, phone, email, purchase_metrics: { total_spent, purchase_count, last_purchase, days_since, avg_value }, churn_analysis: { rfm_segment, churn_risk_score, churn_risk_level, risk_reason } }
  - [ ] purchase_metrics: Calculated or from ChurnScore record
  - [ ] churn_analysis: From ChurnScore record

- [ ] Query parameters
  - [ ] limit: Default 20, max 100
  - [ ] offset: Pagination
  - [ ] churn_risk_only: Filter for churn_risk_level in ["medium", "high"]
  - [ ] sort: "name", "total_spent", "days_since", "churn_score"
  - [ ] order: "asc" or "desc"

- [ ] Summary statistics
  - [ ] Return: { champions: 8, loyal: 15, potential: 20, at_risk: 5, dormant: 2 }
  - [ ] Shows segment distribution

- [ ] Filtering & sorting
  - [ ] churn_risk_only=true: Only at_risk + dormant (high risk)
  - [ ] Sort by churn_score descending (highest risk first)
  - [ ] Sort by days_since descending (oldest inactivity first)

- [ ] Query optimization
  - [ ] Use select_related for ChurnScore (N+1 prevention)
  - [ ] Index on (business_id, churn_risk_level)
  - [ ] P95 <500ms for typical business (100 customers)

- [ ] Tests
  - [ ] Test list all customers (pagination)
  - [ ] Test filter by churn_risk_only
  - [ ] Test sorting (by churn_score, days_since)
  - [ ] Test summary statistics
  - [ ] Test data isolation (user A cannot see user B's customers)
  - [ ] Minimum 5 tests

**Effort:** 1.5 hours
**Dependencies:** Stories 5.1-5.3 complete
**Risk:** Low

---

### Story 5.5: Integration & Testing (0.5 hours)

**Objective:** Connect churn detection to transaction flow and test end-to-end.

**Acceptance Criteria:**

- [ ] Event integration
  - [ ] After transaction.parsed: Enqueue rfm.recalculate event
  - [ ] After rfm.recalculate: Enqueue recommendation.generated event
  - [ ] Events propagate correctly through Celery queue

- [ ] End-to-end test
  - [ ] Upload CSV with 10 transactions from 5 customers
  - [ ] Verify: ChurnScore records created
  - [ ] Verify: RFM segments assigned
  - [ ] Verify: Churn risk scores calculated
  - [ ] Verify: GET /customers shows updated data

- [ ] Data consistency
  - [ ] ChurnScore always in sync with transaction data
  - [ ] RFM scores match manual calculation
  - [ ] Churn risk reasons match scores

- [ ] Tests
  - [ ] Integration test: CSV upload → churn recalc → results visible
  - [ ] Minimum 1 comprehensive integration test

**Effort:** 0.5 hours
**Dependencies:** Stories 5.1-5.4 complete
**Risk:** Low

---

## Compatibility Requirements

**N/A (Greenfield)** — No prior churn detection system to maintain.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **RFM binning inaccurate** | Medium | Test with real customer distributions; adjust quartiles if needed | Manual review; allow user to configure thresholds (Phase 2) |
| **Churn reason unclear** | Low | Use multiple factors (recency, frequency, monetary); explain in reason text | Show all metrics in UI so user can interpret |
| **Performance: Recalc takes >30s** | Medium | Optimize queries; use bulk operations; parallelize by customer batch | Defer less important customers; background recalc |
| **High false positives** | Medium | Start conservative (high risk threshold); adjust based on feedback | Review and iterate; manual validation (Phase 2) |

---

## Definition of Done

### Code Quality
- [ ] RFM logic abstracted into service
- [ ] No hardcoded quartile values (configurable)
- [ ] Type hints on all functions
- [ ] Docstrings explaining RFM/churn logic

### Testing
- [ ] All 5 stories have tests
- [ ] RFM tests use synthetic customer data
- [ ] Churn tests cover all risk levels
- [ ] Integration test covers full flow

### Documentation
- [ ] RFM normalization documented (why those bins?)
- [ ] Churn risk formula explained
- [ ] API docs (Swagger) show /customers endpoint
- [ ] Example customer segments in README

### Deployment
- [ ] Works locally
- [ ] Churn recalc doesn't timeout (Celery timeout set)
- [ ] Large customer lists (500+) don't crash

### Sign-Off
- [ ] Backend Lead: "Churn detection solid, ready for Epic 6"
- [ ] Frontend Lead: "Can display at-risk customer list"

---

## Success Criteria

**Technical Success:**
- ✅ RFM scores calculated correctly (1-5 scale)
- ✅ Customer segments assigned (champion, loyal, at-risk, dormant)
- ✅ Churn risk score 0-1 with clear reason
- ✅ At-risk customers filterable via GET /customers
- ✅ Churn recalc triggered after CSV upload
- ✅ Performance: <10 seconds for 100 customers
- ✅ Scores updated immediately after transactions

**Team Success:**
- ✅ Frontend can display customer segmentation
- ✅ QA can identify at-risk cohorts
- ✅ Retention recommendations (Epic 6) have data to work with

**Operational Success:**
- ✅ Accurate customer segmentation helps target retention
- ✅ Churn risk scores trusted by users
- ✅ No stale data (scores always current)

---

## Handoff to Development

### Pre-Story Checklist
- [ ] Pandas installed (for calculations)
- [ ] Celery worker running (from Epic 1)

### Story Ordering (Sequential)
1. **Story 5.1** (2.5 hrs) — RFM scoring
2. **Story 5.2** (1.5 hrs) — Churn risk scoring
3. **Story 5.3** (1.5 hrs) — Churn worker
4. **Story 5.4** (1.5 hrs) — Customer list endpoint
5. **Story 5.5** (0.5 hrs) — Integration + testing

**Total:** 8 hours

---

**Epic Owner:** Backend Developer
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
