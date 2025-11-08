# Epic 2: Authentication & Authorization - Brownfield Development

**Epic ID:** EPIC-2
**Status:** Ready for Development
**Priority:** Critical (Blocks Epics 3-9)
**Estimated Duration:** 6 hours
**Team:** Backend Lead + 1 Developer
**Depends On:** Epic 1 (Infrastructure)

---

## Epic Goal

**Implement user authentication (registration/login) and authorization (JWT tokens + data isolation) so that every user can securely access their own business data and no user can access another user's data.**

This epic delivers stateless JWT-based authentication with refresh token rotation, multi-tenant data isolation enforced at the database query level, and protected API endpoints that reject unauthenticated/unauthorized requests.

---

## Existing System Context

**Tech Stack (from Epic 1):**
- Django 4.2 LTS with DRF
- PostgreSQL 14 for User/Business models
- Redis for token caching (optional, for blacklisting)
- bcrypt for password hashing

**Pre-Existing Models (from Story 1.3):**
- `User` model (email, password_hash, first_name, business_id, created_at, updated_at)
- `Business` model (id, name, type, user_id, is_demo, created_at, updated_at)

**Integration Points (Downstream):**
- **Epics 3-9** depend on: Protected endpoints that filter by `business_id` from authenticated user
- **Frontend (Epic 7):** Stores JWT tokens in localStorage, sends in Authorization header

---

## Enhancement Details

### What's Being Built

1. **User Registration Endpoint**
   - Accept: email, password (8+ chars), first_name, business_name, business_type, language
   - Validate: email format, password strength, no duplicate emails
   - Create: User + Business records atomically
   - Return: JWT tokens (access + refresh)

2. **User Login Endpoint**
   - Accept: email, password
   - Verify: bcrypt password hash match
   - Return: JWT tokens + user data
   - Reject: Invalid credentials with 401 error

3. **JWT Token Management**
   - `access_token`: 1-hour lifetime
   - `refresh_token`: 30-day lifetime
   - Signature: HS256 (HMAC-SHA256)
   - Storage: Frontend localStorage (secure over HTTPS)

4. **Token Refresh Endpoint**
   - Accept: refresh_token
   - Validate: Token not expired, matches database
   - Return: New access_token
   - Prevent: Refresh token rotation (stays valid)

5. **Protected Endpoints & Data Isolation**
   - Middleware: Validate JWT on all protected endpoints
   - Serializers: Enforce `business_id` filtering
   - Permission Classes: `IsBusinessOwner` (user can only see own business)
   - Error Handling: 401 for invalid/missing token, 403 for unauthorized access

6. **Business Profile Endpoint**
   - Return: User's business + stats (product count, customer count, revenue, etc.)
   - Stats: Pre-calculated to avoid N+1 queries
   - Only user's business returned

### How It Integrates

```
Frontend Login Form
    ↓
POST /auth/register or POST /auth/login
    ↓
Backend: Validate email/password, hash with bcrypt
    ↓
Return: { access_token, refresh_token, user, business }
    ↓
Frontend: Store in localStorage
    ↓
All subsequent requests: Authorization: Bearer {access_token}
    ↓
Backend Middleware: Extract user_id from JWT, attach to request
    ↓
All queries: filter(business_id=request.user.business_id)
    ↓
User sees only their own data
```

### Success Criteria

- ✅ Any user can register with email + password
- ✅ Any user can login and receive valid JWT tokens
- ✅ Access token expires after 1 hour (refresh endpoint renews it)
- ✅ Refresh token valid for 30 days
- ✅ User cannot access another user's business data (403 error)
- ✅ All protected endpoints check JWT and reject 401 if missing/invalid
- ✅ Passwords hashed with bcrypt (never stored plaintext)
- ✅ GET /business/profile returns only authenticated user's business

---

## Stories

### Story 2.1: User Registration & Password Hashing (2 hours)

**Objective:** Implement secure user registration with email validation and bcrypt password hashing.

**Acceptance Criteria:**

- [ ] User Registration endpoint implemented
  - [ ] `POST /auth/register` accepts JSON body
  - [ ] Required fields: email, password (8+ chars), first_name, business_name, business_type, language
  - [ ] Optional fields: phone_number, city
  - [ ] Validates email format (RFC 5322)
  - [ ] Validates password strength (min 8 chars, not common password)
  - [ ] Returns [201 Created] with user + business + tokens on success

- [ ] Email uniqueness enforced
  - [ ] Database constraint: UNIQUE on email
  - [ ] Returns [409 Conflict] if email already registered
  - [ ] Error message: "Email already registered. Try login or use a different email."

- [ ] Business auto-creation
  - [ ] User registration automatically creates Business record
  - [ ] Business linked to user via foreign key
  - [ ] User is owner (1-to-1 relationship)
  - [ ] User can have only 1 business in MVP

- [ ] Password security
  - [ ] Passwords hashed with bcrypt (Django default)
  - [ ] Cost factor: 12 (security vs performance trade-off)
  - [ ] Raw password never logged or stored
  - [ ] Password validation error doesn't reveal if email exists

- [ ] Serializer validation
  - [ ] DRF Serializer for RegistrationSerializer
  - [ ] Validates all fields
  - [ ] Custom validation: password != email
  - [ ] Returns clear error messages for each field

- [ ] Transaction atomicity
  - [ ] User + Business creation wrapped in @transaction.atomic()
  - [ ] If any creation fails, entire operation rolls back
  - [ ] No orphaned users/businesses

- [ ] Response format
  - [ ] [201 Created]: { "status": "success", "data": { "user": {...}, "business": {...}, "tokens": {...} } }
  - [ ] User: id, email, first_name, created_at
  - [ ] Business: id, name, type, created_at
  - [ ] Tokens: access_token, refresh_token, expires_in (seconds)

- [ ] Tests
  - [ ] Test successful registration
  - [ ] Test duplicate email (409 error)
  - [ ] Test weak password (400 error)
  - [ ] Test invalid email (400 error)
  - [ ] Test missing required field (400 error)
  - [ ] Test password is actually hashed (not plaintext)
  - [ ] Minimum 5 tests, all passing

**Effort:** 2 hours
**Dependencies:** Epic 1 complete
**Risk:** Low (standard Django pattern)

---

### Story 2.2: User Login & JWT Token Generation (2 hours)

**Objective:** Implement login endpoint that validates credentials and issues JWT tokens.

**Acceptance Criteria:**

- [ ] Login endpoint implemented
  - [ ] `POST /auth/login` accepts JSON: { email, password }
  - [ ] Looks up user by email (case-insensitive)
  - [ ] Validates password with bcrypt
  - [ ] Returns [200 OK] with tokens on success
  - [ ] Returns [401 Unauthorized] on invalid credentials
  - [ ] Error message is generic: "Invalid email or password" (doesn't reveal if email exists)

- [ ] JWT token generation
  - [ ] Access token: 1-hour lifetime (3600 seconds)
  - [ ] Refresh token: 30-day lifetime (2592000 seconds)
  - [ ] Algorithm: HS256 (HMAC-SHA256)
  - [ ] Secret: From Django settings (DJANGO_SECRET_KEY or JWT_SECRET)
  - [ ] Payload: user_id, business_id, email, exp (expiration timestamp), iat (issued at)
  - [ ] Tokens are valid immediately (iat <= current time)

- [ ] Token signing & verification
  - [ ] Use PyJWT library for signing/verification
  - [ ] Tokens are URL-safe strings (no special characters)
  - [ ] Tokens can be decoded by frontend (verify signature on client)
  - [ ] Invalid/expired tokens fail verification

- [ ] Response format
  - [ ] [200 OK]: { "status": "success", "data": { "user": {...}, "access_token": "jwt...", "refresh_token": "jwt...", "expires_in": 3600 } }
  - [ ] User: id, email, first_name, language_preference
  - [ ] Also return business_id for frontend routing

- [ ] Rate limiting
  - [ ] Prevent brute-force attacks: Max 5 failed logins per IP per 15 minutes
  - [ ] Return [429 Too Many Requests] after threshold
  - [ ] Use Django-ratelimit or custom middleware

- [ ] Last login tracking
  - [ ] Update user.last_login timestamp on successful login
  - [ ] Used for analytics later

- [ ] Tests
  - [ ] Test successful login
  - [ ] Test invalid email (401 error)
  - [ ] Test invalid password (401 error)
  - [ ] Test rate limiting (429 after 5 failed attempts)
  - [ ] Test token claims (payload contains user_id, business_id, exp)
  - [ ] Test token expiration (expired token fails verification)
  - [ ] Minimum 6 tests, all passing

**Effort:** 2 hours
**Dependencies:** Story 2.1 complete
**Risk:** Low-Medium (token handling can be tricky; test thoroughly)

---

### Story 2.3: Token Refresh & Protected Endpoints (1.5 hours)

**Objective:** Implement token refresh endpoint and middleware to protect all API endpoints.

**Acceptance Criteria:**

- [ ] Token refresh endpoint
  - [ ] `POST /auth/token/refresh` accepts JSON: { refresh_token }
  - [ ] Validates refresh_token (signature, expiration)
  - [ ] Returns [200 OK] with new access_token
  - [ ] Refresh token remains valid (no rotation for MVP)
  - [ ] Returns [401 Unauthorized] if refresh_token invalid/expired

- [ ] JWT authentication middleware
  - [ ] `apps/core/middleware.py` or DRF authentication class
  - [ ] Extract token from Authorization header: "Bearer {token}"
  - [ ] Validate token signature and expiration
  - [ ] Attach user_id, business_id to request object
  - [ ] Return [401 Unauthorized] if token missing/invalid

- [ ] Protected endpoint decorator
  - [ ] `@permission_classes([IsAuthenticated])` on all API endpoints
  - [ ] DRF TokenAuthentication or custom JWT authentication
  - [ ] Unauthenticated requests return [401 Unauthorized]

- [ ] Error responses
  - [ ] Missing token: { "error_code": "MISSING_TOKEN", "message": "Authentication required" }
  - [ ] Invalid token: { "error_code": "INVALID_TOKEN", "message": "Token is invalid or expired. Please login again." }
  - [ ] Expired token: { "error_code": "TOKEN_EXPIRED", "message": "Your session has expired. Please refresh or login again." }

- [ ] Token refresh flow
  - [ ] Frontend detects 401 response
  - [ ] Frontend calls POST /auth/token/refresh with refresh_token
  - [ ] Backend returns new access_token
  - [ ] Frontend retries original request with new token
  - [ ] Success without requiring user to re-login

- [ ] Tests
  - [ ] Test token refresh with valid refresh_token
  - [ ] Test token refresh with expired refresh_token (401)
  - [ ] Test protected endpoint without token (401)
  - [ ] Test protected endpoint with expired access_token (401)
  - [ ] Test protected endpoint with valid access_token (200)
  - [ ] Minimum 5 tests, all passing

**Effort:** 1.5 hours
**Dependencies:** Story 2.2 complete
**Risk:** Low (standard DRF pattern)

---

### Story 2.4: Data Isolation & Authorization (0.5 hours)

**Objective:** Enforce that users can only access their own business data via database query filtering.

**Acceptance Criteria:**

- [ ] Business-level data isolation
  - [ ] All models have `business_id` field
  - [ ] All queries filter by: `filter(business_id=request.user.business_id)`
  - [ ] Enforced at serializer level (override `get_queryset()`)
  - [ ] No user can see another user's transactions, products, customers, forecasts, etc.

- [ ] Custom permission class
  - [ ] `apps/core/permissions.py` defines `IsBusinessOwner`
  - [ ] Checks: request.user.business_id == queryset.business_id
  - [ ] Returns [403 Forbidden] if user tries to access other business data
  - [ ] Applied to all viewsets

- [ ] Serializer filtering
  - [ ] DRF ModelViewSet overrides `get_queryset()`
  - [ ] Example: `return Transaction.objects.filter(business_id=self.request.user.business_id)`
  - [ ] All 6 resource viewsets (transactions, products, customers, forecasts, recommendations, etc.) implement this

- [ ] Tests
  - [ ] Create 2 users with different businesses
  - [ ] User A uploads CSV to their business
  - [ ] User B tries to access User A's transactions → [403 Forbidden]
  - [ ] User B uploads CSV to their own business
  - [ ] User B can see their own transactions → [200 OK]
  - [ ] Minimum 1 integration test covering multiple users

**Effort:** 0.5 hours
**Dependencies:** Story 2.3 complete
**Risk:** Low (standard pattern; critical to test)

---

### Story 2.5: Business Profile Endpoint (0.5 hours)

**Objective:** Implement GET /business/profile endpoint that returns user's business + stats.

**Acceptance Criteria:**

- [ ] Business profile endpoint
  - [ ] `GET /business/profile` returns authenticated user's business
  - [ ] Requires JWT token (protected)
  - [ ] Returns [200 OK] with business data + stats

- [ ] Response format
  - [ ] { "status": "success", "data": { "id": 1, "name": "Ali's Tea Shop", "type": "restaurant", "phone_number": "...", "city": "Dhaka", "stats": { "products": 12, "customers": 45, "total_transactions": 1250, "total_revenue": 450000, "last_transaction_date": "2025-11-03" }, "data_sources": ["csv", "receipt_ocr"], "is_demo": false } }

- [ ] Stats calculation
  - [ ] Pre-calculated (not N+1 queries)
  - [ ] Product count: `Product.objects.filter(business_id=...).count()`
  - [ ] Customer count: `Customer.objects.filter(business_id=...).count()`
  - [ ] Total transactions: `Transaction.objects.filter(business_id=...).count()`
  - [ ] Total revenue: `Transaction.objects.filter(business_id=...).aggregate(Sum('amount'))`
  - [ ] Last transaction date: `Transaction.objects.filter(business_id=...).latest('date').date` (or None if no transactions)
  - [ ] Data sources: List of ingestion methods used (["csv"] or ["csv", "receipt_ocr"])

- [ ] Tests
  - [ ] Test profile returns correct business data
  - [ ] Test stats are accurate (create 10 transactions, verify sum)
  - [ ] Test unauthenticated request returns [401]
  - [ ] Test user can only see their own business profile

**Effort:** 0.5 hours
**Dependencies:** Stories 2.1-2.4 complete
**Risk:** Low

---

## Compatibility Requirements

**N/A (Greenfield)** — No prior authentication system to maintain. This is the baseline.

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Password compromise** | Critical | Hash with bcrypt cost=12; never log passwords | Implement password reset endpoint (Phase 2) |
| **JWT secret leaked** | Critical | Store in Railway Secrets (encrypted); rotate in Phase 2 | If leaked: rotate secret, all users re-login |
| **Token forgery** | High | Use PyJWT with HS256 signature; verify on all endpoints | Token validation in middleware catches forgeries |
| **Rate limiting fails** | Medium | Test rate limit logic before deployment | Manual IP blocking via WAF if needed |
| **Refresh token never expires** | Low | MVP: acceptable; Phase 2: implement rotation | Monitor usage; educate users about logout |

---

## Definition of Done

### Code Quality
- [ ] All models use bcrypt (Django default)
- [ ] No passwords in logs
- [ ] No tokens hardcoded
- [ ] Type hints on all functions
- [ ] docstrings on endpoints

### Testing
- [ ] All 5 stories have tests (>80% coverage for auth app)
- [ ] Tests cover success + error cases
- [ ] Integration tests verify data isolation
- [ ] Rate limiting tested

### Documentation
- [ ] API docs (Swagger) show /auth/* endpoints
- [ ] README explains JWT token flow (diagram helpful)
- [ ] Environment variables documented (.env.example)

### Deployment
- [ ] Works locally (`docker-compose up`)
- [ ] Works on Railway (tokens use environment secret)
- [ ] Secrets not exposed in Docker image
- [ ] CORS configured for frontend origin

### Sign-Off
- [ ] Backend Lead: "Auth is solid, ready for Epic 3"
- [ ] Frontend Lead: "Can integrate token storage and refresh logic"

---

## Success Criteria

**Technical Success:**
- ✅ User can register with email/password → receive JWT tokens
- ✅ User can login → receive JWT tokens
- ✅ Access token valid for 1 hour; refresh token valid for 30 days
- ✅ All protected endpoints require valid JWT token
- ✅ User cannot access another user's data (403 error)
- ✅ Password hashing with bcrypt confirmed
- ✅ Token refresh endpoint works (returns new access_token)

**Team Success:**
- ✅ Frontend can integrate token storage/refresh logic
- ✅ All team members understand JWT flow
- ✅ Zero auth-related blockers for Epic 3

**Operational Success:**
- ✅ No failed logins due to token issues in production
- ✅ Rate limiting prevents brute-force attacks
- ✅ Users can remain logged in for 30 days

---

## Handoff to Development

### Pre-Story Checklist
- [ ] PyJWT library added to requirements.txt
- [ ] django-ratelimit added for rate limiting
- [ ] DJANGO_SECRET_KEY set in environment
- [ ] JWT_SECRET configured in settings.py

### Story Ordering (Sequential)
1. **Story 2.1** (2 hrs) — User registration + bcrypt
2. **Story 2.2** (2 hrs) — Login + JWT tokens
3. **Story 2.3** (1.5 hrs) — Token refresh + middleware
4. **Story 2.4** (0.5 hrs) — Data isolation
5. **Story 2.5** (0.5 hrs) — Business profile endpoint

**Total:** 6 hours

---

**Epic Owner:** Backend Lead
**Created:** 2025-11-04
**Status:** ✅ Ready for Development
