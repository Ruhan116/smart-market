# Epic 8: API Integration & E2E Testing - Brownfield Development

**Epic ID:** EPIC-8
**Status:** Ready for Development
**Priority:** Critical (Pre-release validation)
**Estimated Duration:** 8 hours
**Team:** Full team (Frontend, Backend, QA)
**Depends On:** Epics 2-7 (All features complete)

---

## Epic Goal

**Connect frontend to backend API, test complete workflows end-to-end, fix integration bugs, validate data contracts, and ensure system works as a cohesive whole without crashes or errors.**

This epic validates that all moving parts work together seamlessly from user registration through recommendation execution.

---

## Existing System Context

**Complete Stack (Epics 1-7):**
- ✅ Backend: Django + DRF with all endpoints
- ✅ Frontend: React with all 8 screens
- ✅ Infrastructure: Docker, Railway, Vercel
- ✅ API contracts: Defined in PRD + Architecture docs
- ✅ Database: PostgreSQL with schema + migrations
- ✅ Task queue: Celery + Redis for async

**Pre-Existing Integration Points:**
- JWT token management (login → store → API calls)
- Error handling (401 → refresh or logout)
- Async operations (202 ACCEPTED → polling or websocket Phase 2)
- CORS (Vercel origin calling Railway API)

---

## Enhancement Details

### What's Being Built

1. **API Client Integration**
   - Axios instance with JWT token handling
   - Automatic token refresh on 401
   - Request/response logging (dev mode)
   - Error handling (display user-friendly messages)

2. **Complete Workflows (E2E Tests)**
   - **Auth Flow:** Signup → Login → Dashboard
   - **Upload Flow:** Login → Upload CSV → Poll for completion → See transactions
   - **Forecast Flow:** Upload → Wait for forecast → See predictions → Understand risk
   - **Recommendation Flow:** Forecast completes → See recommendations → Execute action
   - **Customer Flow:** Upload → See RFM segments → Filter at-risk → View churn reason

3. **Data Contract Validation**
   - API response format matches expected schema
   - All required fields present
   - Data types correct (number, string, boolean, array)
   - Error responses contain error_code + message

4. **Performance Testing**
   - Dashboard loads <2 seconds
   - Forecast generation <15 seconds (backend)
   - Recommendations appear <5 seconds after forecast
   - Large lists (100+ items) paginate smoothly

5. **Error Scenarios**
   - Network offline: Show offline banner
   - API rate limit (429): Show "Too many requests" message
   - Server error (5xx): Show "Service temporarily unavailable"
   - Invalid data: Show validation error messages

### How It Integrates

```
Test: User Signup Flow
    ↓
Frontend: POST /auth/register (Signup form)
    ↓
Backend: Validate, create User + Business, return tokens
    ↓
Frontend: Store tokens, redirect to /dashboard
    ↓
Frontend: GET /business/profile
    ↓
Backend: Return user's business + stats
    ↓
Frontend: Display dashboard with stats
    ↓
Test: ✅ PASS if all data matches expected values
```

### Success Criteria

- ✅ All 5 workflows tested and passing
- ✅ No 4xx/5xx errors in production (except intentional validation errors)
- ✅ API contract validation: 100% matches expected schema
- ✅ Performance: Dashboard <2s, Forecasts <15s
- ✅ Error handling: User-friendly messages for all error cases
- ✅ Token refresh: Automatic, no user action required
- ✅ CORS: Vercel → Railway calls work without issues

---

## Stories

### Story 8.1: API Client Setup & Auth Integration (2 hours)

**Objective:** Create Axios client with JWT token handling and integrate auth endpoints.

**Acceptance Criteria:**

- [ ] Axios instance created
  - [ ] `src/services/api.ts` contains axios instance
  - [ ] Base URL: REACT_APP_API_URL (from environment)
  - [ ] Default headers: { "Content-Type": "application/json" }
  - [ ] Timeout: 30 seconds

- [ ] JWT token handling
  - [ ] Middleware: Add Authorization header with access_token on all requests
  - [ ] Request: `headers["Authorization"] = "Bearer {access_token}"`
  - [ ] Token from: localStorage.getItem("access_token")

- [ ] Token refresh logic
  - [ ] Interceptor: Catch 401 responses
  - [ ] On 401: Call POST /auth/token/refresh with refresh_token
  - [ ] On success: Update localStorage with new access_token
  - [ ] On failure (401 on refresh): Redirect to /login
  - [ ] Retry: Original request with new token
  - [ ] Prevent: Multiple simultaneous refresh requests (use queue)

- [ ] Error handling
  - [ ] 400: Validation error (display field-specific messages)
  - [ ] 401: Token invalid/expired (refresh or logout)
  - [ ] 403: Forbidden (user cannot access resource)
  - [ ] 404: Not found (resource doesn't exist)
  - [ ] 429: Rate limited (show "Too many requests, try later")
  - [ ] 5xx: Server error (show "Service error, try again later")
  - [ ] Network error: Show "Connection error"

- [ ] Logging (dev mode only)
  - [ ] Log API requests: Method, URL, status
  - [ ] Log API responses: Status, data size
  - [ ] Never log: Passwords, tokens (except dev mode)

- [ ] Tests
  - [ ] API client instance created
  - [ ] Authorization header added
  - [ ] 401 response triggers refresh
  - [ ] Successful refresh updates token
  - [ ] Failed refresh redirects to login
  - [ ] Error handling for all status codes

**Effort:** 2 hours
**Dependencies:** Epics 2 (Auth endpoints) + 7 (Frontend)
**Risk:** Medium (token refresh edge cases can be tricky)

---

### Story 8.2: Dashboard & Data List Integration (1.5 hours)

**Objective:** Connect frontend dashboard and list endpoints to backend APIs.

**Acceptance Criteria:**

- [ ] Dashboard data loading
  - [ ] On mount: Call GET /business/profile
  - [ ] Parse response: Extract stats (revenue, customers, products)
  - [ ] Call: GET /recommendations?limit=3
  - [ ] Parse: Top 3 recommendations by priority
  - [ ] Display: All data on dashboard
  - [ ] Error: Show alert if API calls fail

- [ ] Transaction list integration
  - [ ] On mount: GET /transactions?limit=50
  - [ ] Parse: Array of transactions
  - [ ] Display: Paginated table
  - [ ] Filtering: Pass filter params to API (product_id, date_from, etc.)
  - [ ] Pagination: "Load more" calls GET with offset

- [ ] Product list integration
  - [ ] GET /products
  - [ ] Display: Product list with stock status
  - [ ] Filter: low_stock_only (pass to API)
  - [ ] Sort: By name, stock, sales (pass to API)

- [ ] Customer list integration
  - [ ] GET /customers
  - [ ] Display: Customer list with RFM + churn data
  - [ ] Filter: churn_risk_only (pass to API)
  - [ ] Sort: By name, churn_score (pass to API)

- [ ] Recommendation list integration
  - [ ] GET /recommendations
  - [ ] Display: Prioritized feed
  - [ ] Filter: status, type, urgency (pass to API)
  - [ ] Pagination: Load more

- [ ] Data validation
  - [ ] Check: All expected fields present in response
  - [ ] Check: Data types match (numbers, strings, arrays)
  - [ ] Check: Nested objects have expected structure

- [ ] Loading states
  - [ ] Show skeleton/spinner while fetching
  - [ ] Hide spinner when data loaded
  - [ ] Show error message if request fails

- [ ] Tests
  - [ ] Dashboard loads all stats
  - [ ] Transaction list loads and paginates
  - [ ] Product list loads with filters
  - [ ] Customer list loads with filters
  - [ ] Recommendation list loads and sorts
  - [ ] Error states show user-friendly messages

**Effort:** 1.5 hours
**Dependencies:** Story 8.1 complete
**Risk:** Low

---

### Story 8.3: Upload & Async Flow Integration (1.5 hours)

**Objective:** Connect CSV/receipt upload to backend and implement polling for async completion.

**Acceptance Criteria:**

- [ ] CSV upload flow
  - [ ] Frontend: POST /data/upload-csv with FormData
  - [ ] Response: 202 ACCEPTED with file_id, rows_detected, estimated_time
  - [ ] Store: file_id in component state
  - [ ] Poll: GET /transactions every 2 seconds (to detect when uploaded)
  - [ ] Or: Listen to Celery task status (Phase 2: WebSocket)
  - [ ] Success: Show "CSV uploaded successfully" toast
  - [ ] Error: Show error message + suggestions ("Check CSV format...")

- [ ] Receipt upload flow
  - [ ] Similar to CSV flow
  - [ ] Frontend: POST /data/upload-receipt with FormData
  - [ ] 202 response, poll for completion

- [ ] Polling logic
  - [ ] Poll interval: 2 seconds
  - [ ] Max polls: 60 (2 minutes timeout)
  - [ ] Stop when: New transactions appear OR timeout
  - [ ] Don't hammer API: Cancel polls if user navigates away

- [ ] Processing state
  - [ ] Show spinner: "Processing... {estimated_time} seconds"
  - [ ] Show progress: "Processed 50 of 156 rows"
  - [ ] Allow cancel: User can stop waiting

- [ ] Success handling
  - [ ] Redirect to /transactions (show new transactions)
  - [ ] Or: Stay on upload screen, show summary
  - [ ] Show: "100 transactions created, 2 skipped (invalid)"

- [ ] Tests
  - [ ] Upload CSV → 202 response
  - [ ] Polling detects completion
  - [ ] Success message shows
  - [ ] Error message shows on failure
  - [ ] Cancel stops polling

**Effort:** 1.5 hours
**Dependencies:** Story 8.2 complete
**Risk:** Medium (async polling can have race conditions)

---

### Story 8.4: Forecast & Recommendation Workflow (1.5 hours)

**Objective:** Test complete forecast generation and recommendation flow.

**Acceptance Criteria:**

- [ ] Forecast request flow
  - [ ] User clicks "Regenerate Forecast" button
  - [ ] Frontend: POST /forecasts/request { forecast_days: 7 }
  - [ ] 202 response, show "Generating forecasts..."
  - [ ] Poll: GET /forecasts every 2 seconds
  - [ ] Detect: New forecasts (compare timestamps)
  - [ ] Success: Show updated forecast list + charts
  - [ ] Latency: Forecasts should appear within 15 seconds

- [ ] Forecast display validation
  - [ ] Check: Forecast fields present (product, yhat, confidence)
  - [ ] Check: Charts render without errors
  - [ ] Check: Stockout risk displayed correctly

- [ ] Recommendation flow
  - [ ] After forecast completes: Recommendations should auto-populate
  - [ ] Polling: GET /recommendations (same as above)
  - [ ] Verify: Reorder recommendations for stockout-at-risk products
  - [ ] Verify: Cash warnings if balance risk detected
  - [ ] Verify: Retention recommendations for at-risk customers

- [ ] Recommendation action flow
  - [ ] Click "Execute" on recommendation
  - [ ] Modal: Confirm action
  - [ ] Backend: POST /recommendations/{id}/execute
  - [ ] Response: 200 with updated recommendation
  - [ ] Frontend: Update recommendation status to "executed"
  - [ ] Show: Success message "Action executed"

- [ ] Tests
  - [ ] Forecast request → 202 response
  - [ ] Polling detects new forecasts
  - [ ] Forecasts display correctly
  - [ ] Recommendations auto-populate after forecast
  - [ ] User can execute recommendation
  - [ ] Engagement tracked (is_executed = true)

**Effort:** 1.5 hours
**Dependencies:** Story 8.3 complete
**Risk:** Medium (async coordination)

---

### Story 8.5: Error Handling & Performance Testing (1 hour)

**Objective:** Test error scenarios and measure performance metrics.

**Acceptance Criteria:**

- [ ] Error scenarios
  - [ ] Network offline: POST fails → Show offline banner
  - [ ] API rate limit (429): Show "Too many requests"
  - [ ] Server error (500): Show "Service temporarily unavailable"
  - [ ] Validation error (400): Show field-specific errors
  - [ ] Unauthorized (401): Auto-refresh or redirect to login
  - [ ] Forbidden (403): Show "You don't have access"

- [ ] Performance metrics
  - [ ] Dashboard load time: <2 seconds (measure with DevTools)
  - [ ] Forecast generation: <15 seconds backend (measure in Chrome DevTools Network tab)
  - [ ] Recommendation rendering: <1 second (after data arrives)
  - [ ] Large list (100+ items): Pagination works smoothly
  - [ ] Mobile (3G throttling): No major slowdowns

- [ ] Bundle size check
  - [ ] Frontend bundle: <500KB gzipped
  - [ ] No unexpected large packages (audit with `npm list`)
  - [ ] Code splitting: Check with DevTools

- [ ] Error message validation
  - [ ] All errors show user-friendly messages (not stack traces)
  - [ ] Suggestions provided ("Check your network" for offline, etc.)
  - [ ] Errors logged to console (dev mode)

- [ ] Tests
  - [ ] Dashboard load time <2 seconds
  - [ ] Error messages display correctly
  - [ ] Offline detection works
  - [ ] Rate limiting respected

**Effort:** 1 hour
**Dependencies:** All integration complete
**Risk:** Low

---

### Story 8.6: End-to-End Workflow Tests (1 hour)

**Objective:** Run complete user workflows from signup through recommendation execution.

**Acceptance Criteria:**

- [ ] E2E Workflow 1: Auth + Dashboard
  - [ ] Signup new account
  - [ ] Dashboard loads without errors
  - [ ] Profile data displays
  - [ ] Logout works

- [ ] E2E Workflow 2: CSV Upload
  - [ ] Upload 30-row CSV
  - [ ] Wait for processing
  - [ ] Transactions visible in list
  - [ ] Products auto-created
  - [ ] Customers visible

- [ ] E2E Workflow 3: Forecasting
  - [ ] Upload data
  - [ ] Trigger forecast
  - [ ] Wait for generation
  - [ ] See predictions + charts
  - [ ] Stockout risk detected

- [ ] E2E Workflow 4: Recommendations
  - [ ] Forecasts complete
  - [ ] Recommendations appear
  - [ ] User views recommendation
  - [ ] User executes action
  - [ ] Status updates to "executed"

- [ ] E2E Workflow 5: Customer Analysis
  - [ ] Upload data with customers
  - [ ] RFM segments assigned
  - [ ] Churn risk calculated
  - [ ] At-risk customers filterable
  - [ ] Risk reasons displayed

- [ ] Test environment
  - [ ] Smoke test on local (http://localhost:5173 → http://localhost:8000/api)
  - [ ] Smoke test on staging (Vercel → Railway)
  - [ ] Demo data seed successful
  - [ ] Database clean between tests

- [ ] Tests
  - [ ] 5 end-to-end workflows passing
  - [ ] No crashes or unhandled errors
  - [ ] All data flows correctly
  - [ ] Performance acceptable

**Effort:** 1 hour
**Dependencies:** Stories 8.1-8.5 complete
**Risk:** Medium (E2E tests can be flaky due to timing)

---

## Compatibility Requirements

**N/A (Greenfield)** — No prior integration to maintain.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Token refresh fails silently** | High | Log refresh attempts; test with expired tokens; monitor in Sentry | Manual logout if refresh fails (acceptable for MVP) |
| **API response format mismatch** | High | Validate response schema before rendering; use TypeScript types | Check API docs; adjust types if needed |
| **Polling misses completion** | Medium | Increase polling frequency; add exponential backoff | Show manual "Refresh" button |
| **Large datasets timeout** | Medium | Paginate responses; show loading state | Reduce page size; defer non-critical data |
| **CORS fails intermittently** | High | Check CORS headers in Railway; test preflight requests | Whitelist specific Vercel origins; check browser CORS proxy |
| **Mobile network drops** | Low | Retry failed requests; cache data | Offline mode (Phase 2) |

---

## Definition of Done

### Code Quality
- [ ] API client well-structured
- [ ] Error handling comprehensive
- [ ] No hardcoded API URLs
- [ ] Loading states consistent
- [ ] TypeScript types for all API responses

### Testing
- [ ] All 6 stories have tests
- [ ] API integration tests (mock API)
- [ ] E2E tests (real API calls)
- [ ] Error scenarios tested
- [ ] Performance baseline established

### Documentation
- [ ] API contract document (request/response examples)
- [ ] Error codes documented
- [ ] Integration guide for future developers
- [ ] Testing instructions (how to run E2E tests)

### Deployment
- [ ] Works locally (Vite → Django)
- [ ] Works on staging (Vercel → Railway)
- [ ] CORS configured correctly
- [ ] No console errors on real data
- [ ] Token refresh works in production

### Sign-Off
- [ ] Backend Lead: "All endpoints working, integration solid"
- [ ] Frontend Lead: "Confident in data flow"
- [ ] QA: "Ready for demo + final testing"

---

## Success Criteria

**Technical Success:**
- ✅ All 5 workflows tested and passing
- ✅ No 4xx/5xx errors (except validation)
- ✅ API contract validation 100%
- ✅ Token refresh automatic + reliable
- ✅ CORS working (Vercel ↔ Railway)
- ✅ Error messages user-friendly
- ✅ Performance: Dashboard <2s, Forecast <15s

**Team Success:**
- ✅ Full team confident in system
- ✅ Integration issues resolved
- ✅ Ready for demo and user testing

**Operational Success:**
- ✅ System stable under typical load
- ✅ Error rates tracked + acceptable
- ✅ No data loss or corruption

---

## Handoff to Development

### Pre-Story Checklist
- [ ] All backend endpoints deployed (Epic 2-6 complete)
- [ ] All frontend screens built (Epic 7 complete)
- [ ] CORS configured on backend
- [ ] Environment variables set (API URL, etc.)

### Story Ordering (Sequential)
1. **Story 8.1** (2 hrs) — API client setup
2. **Story 8.2** (1.5 hrs) — Dashboard + list integration
3. **Story 8.3** (1.5 hrs) — Upload flow
4. **Story 8.4** (1.5 hrs) — Forecast + recommendation flow
5. **Story 8.5** (1 hr) — Error handling + performance
6. **Story 8.6** (1 hr) — E2E workflow tests

**Total:** 8 hours

**Parallelization:** Stories 8.3-8.4 can run in parallel with 8.2 (after 8.1 complete)

---

**Epic Owner:** Full Team (QA Lead)
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
