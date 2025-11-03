# SmartMarket PRD v1.0

**AI-Powered SME Business Intelligence Platform**

**Document Version:** 1.0
**Date Created:** 2025-10-31
**Status:** Ready for Development
**Project:** Hackathon MVP + Post-Launch Roadmap

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Section 1: Goals and Background Context](#section-1-goals-and-background-context)
3. [Section 2: Requirements](#section-2-requirements)
4. [Section 3: Technical Assumptions](#section-3-technical-assumptions)
5. [Section 4: API Endpoint Specification](#section-4-api-endpoint-specification)
6. [Section 5: User Interface Design Goals](#section-5-user-interface-design-goals)
7. [Section 6: Epic List](#section-6-epic-list)
8. [Section 7: Checklist Results Report](#section-7-checklist-results-report)
9. [Section 8: Next Steps & Handoff](#section-8-next-steps--handoff)

---

## Executive Summary

**SmartMarket** is an AI-powered business intelligence platform designed for Small and Medium Enterprises (SMEs) in Bangladesh. It transforms fragmented business signals (sales, payments, receipts, voice) into actionable intelligence for demand forecasting, inventory management, cash flow prediction, and customer retention.

### Market Opportunity

- **7.8+ million SMEs** in Bangladesh lack affordable, accessible tools for data-driven decision-making
- **Target Users:** Urban retail/restaurant/salon owners with $500-3,000 monthly revenue, 1-10 employees
- **Pain Points:** Stockouts (15-25% annual revenue loss), cash flow crises (40% of SME failures), customer churn (no systematic retention)

### Key Differentiators

1. **Passive Data Capture:** SMS, receipt photos, CSV uploads—no manual data entry
2. **Predict-to-Action Loop:** Not just reports; actionable recommendations users can execute
3. **Bangla-First:** Accessible to low-literacy owners (40-50% of target market)
4. **Affordable:** $2-5/month subscriptions (vs. $15-50 for traditional BI tools)
5. **Mobile-Optimized:** Works on smartphones via WhatsApp, SMS, web browser

### MVP Scope (Hackathon: 48-72 hours)

**Core Features:**
- User authentication (register, login, JWT tokens)
- Data ingestion (CSV upload, receipt OCR simulation)
- Demand forecasting (Prophet models, 7-14 day predictions)
- Customer churn detection (RFM-based risk scoring)
- Action recommendations (prioritized feed of reorder, retention, cash warnings)
- Web dashboard (mobile-responsive, Bangla/English)

**Out of Scope (Phase 2+):**
- Real SMS/WhatsApp integration
- Marketplace with suppliers
- Voice interface
- Native mobile apps
- Advanced ML models

### Success Criteria (Hackathon)

✅ **Technical:** Live demo without crashes, all core features working
✅ **Business:** Judges understand value proposition, realistic roadmap
✅ **Market:** 3+ SME owners express interest in pilot
✅ **Team:** Professional presentation, code quality, documentation

---

## Section 1: Goals and Background Context

### Goals

#### User-Focused Goals

- **Eliminate Stockouts:** Prevent lost sales by providing 7-14 day demand forecasts
- **Predict Cash Flow:** Warn of shortages 14-30 days in advance to prevent payment failures
- **Reduce Customer Churn:** Identify and re-engage at-risk customers before they leave
- **Reduce Manual Work:** Passive data ingestion eliminates hours of bookkeeping
- **Actionable Intelligence:** Recommendations tell users "what to do," not just "what happened"

#### Project Goals (Month 3)

- **50 active SME users** with 70%+ weekly engagement
- **10-15% improvement** in forecasting accuracy, stockout reduction, cash flow predictability
- **$500-1,000 MRR** through subscriptions and early marketplace features
- **Proof-of-concept** for "predict-to-action" loop with measurable business outcomes
- **Network foundation** for Phase 2 marketplace (10+ suppliers engaged)

### Background Context

**Market Opportunity:**

Bangladesh's 7.8 million SMEs generate ~25% of national GDP but operate with minimal business intelligence. Most rely on paper ledgers or basic spreadsheets, making it impossible to spot trends, anticipate shortages, or manage cash flow. Traditional BI tools (Tableau, Power BI, Zoho Analytics) cost $15-50/user/month—prohibitive for SMEs with $500-3,000 monthly revenue—and require technical expertise, clean structured data, and desktop access.

**Why Now:**

- **Digital Payment Surge:** bKash, Nagad, Rocket (60+ million users post-COVID) created transaction data trails
- **Smartphone Penetration:** 80%+ of urban SME owners have smartphones; infrastructure for mobile solutions exists
- **Competitive Pressure:** E-commerce and chain retailers threaten traditional SMEs; intelligence tools = survival tool
- **Government Support:** "Digital Bangladesh 2021" initiative and SME Foundation create favorable policy environment
- **AI Cost Reduction:** Lightweight ML models (Prophet, LightGBM) run on affordable infrastructure without GPUs

**SmartMarket's Approach:**

SmartMarket bypasses the complexity and cost barriers by:
1. **Capturing data passively** from sources SMEs already use (SMS, receipts, spreadsheets)
2. **Delivering predictions locally** using lightweight models that run on cheap servers
3. **Recommending actions** (not just insights) through accessible channels (SMS, WhatsApp, voice, web)
4. **Facilitating execution** through integrated supplier marketplace and microcredit partnerships

Unlike competitors (Khatabook, Dukaan, Zoho), SmartMarket closes the loop: **Forecast → Recommend → Execute**, turning insights into tangible business outcomes.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-31 | 1.0 | Initial PRD created from Project Brief v1.0; all sections completed | John (PM) |

---

## Section 2: Requirements

### Functional Requirements

#### FR-Group 1: Authentication & Account Management

**FR1.1: User Registration**
- Users register with email, password (8+ chars), first name, business name, business type (retail|restaurant|salon|etc), language preference
- Business entity auto-created linked to user
- JWT tokens returned immediately
- Error handling: 409 if email exists, 400 if validation fails
- Password hashed with bcrypt before storage

**FR1.2: User Login**
- Email/password authentication
- Access token (1 hour expiry) + refresh token (30 days) returned on success
- Tokens in JWT format, decodable by frontend
- Error: 401 if credentials invalid

**FR1.3: Token Refresh**
- POST /auth/token/refresh with refresh_token
- Returns new access_token (1 hour)
- Refresh token remains valid, no rotation
- Enables long-lived sessions without re-entering password

**FR1.4: Business Profile Retrieval**
- GET /business/profile returns user's business data + stats
- Stats: product count, customer count, total transactions, total revenue, last transaction date
- Data sources array: which ingestion methods used (csv|receipt|sms)
- Only returns authenticated user's business (data isolation enforced)

#### FR-Group 2: Data Ingestion & Passive Capture

**FR2.1: CSV Upload & Async Processing**
- POST /data/upload-csv accepts sales ledger CSV (Date, Product, Quantity, Amount, optional Customer)
- Returns 202 ACCEPTED (async processing)
- Enqueue background task: transaction.uploaded (Celery)
  - Celery worker parses CSV, validates rows, creates Transaction/Product/Customer records
  - Side effects: Product stock decreases, Customer metrics updated
  - On completion: transaction.parsed task/job triggers downstream jobs (forecasts + RFM)
- Error handling: Process all valid rows, skip invalid rows, log errors

**FR2.2: Receipt OCR Upload & Async Processing**
- POST /data/upload-receipt accepts JPG/PNG images (max 5MB)
- Returns 202 ACCEPTED
 - Enqueue background task: receipt.uploaded (Celery)
 - Celery worker calls OCR service (Tesseract or Google Vision)
 - Extracts: date, items, quantities, prices, total amount
 - Creates Transaction record (or marks is_verified=false if OCR confidence <70%)
- MVP: Can mock OCR extraction for demo purposes

**FR2.3: Transaction List with Filtering**
- GET /transactions returns paginated transaction list
- Query params: limit, offset, product_id, date_from, date_to, payment_method, sort, order
- Response includes: transaction details + summary stats (total revenue, avg value, count)
- Pagination: next/previous URLs
- Error: 401 if not authenticated, 400 if invalid params

#### FR-Group 3: Products (Inventory)

**FR3.1: List Products with Stock & Sales Metrics**
- GET /products returns all products with inventory status
- Each product includes: stock level, sales metrics (7d, 30d, avg daily, last sale), latest forecast status
- Filtering: low_stock_only (show only items below reorder point)
- Products auto-created from transactions (no manual entry)
- Stock updated: every transaction upload decreases current_stock
- Reorder point: user-configurable per product (default = 2 weeks of average demand)

#### FR-Group 4: Customers & Churn Detection

**FR4.1: List Customers with RFM & Churn Risk**
- GET /customers returns paginated customer list
- Each customer includes: purchase history, RFM segment (champion|loyal|potential|at_risk|dormant), churn risk score (0-1), risk reason
- Filtering: churn_risk_only (show at-risk + dormant customers)
- RFM recalculated every transaction upload
- Customers auto-created from transactions

**FR4.2: Churn Risk Algorithm (Rule-Based, MVP)**
- Recency: Days since last purchase (normalize to 1-5)
- Frequency: Total purchases (normalize to 1-5)
- Monetary: Total spent (normalize to 1-5)
- RFM Score: (R+F+M)/3
- Churn risk score: Rule-based (days_since_purchase / 365) + (if declining frequency: +0.3)
- Risk level: low (<0.3), medium (0.3-0.6), high (>0.6)
- Risk reason: Plaintext explanation ("No purchase in 45 days", "Frequency declining 30%")

#### FR-Group 5: Demand Forecasting

**FR5.1: List Demand Forecasts**
- GET /forecasts returns latest forecast per product
- Each forecast includes: predicted demand (daily, 7-14 days), confidence intervals, stockout risk, accuracy (MAPE), days until stockout
- Filtering: has_stockout_warning (only forecasts predicting stockout)
- Minimum data: 30 days of transactions required (if <30, return message "Need more data")

**FR5.2: Request New Forecast**
- POST /forecasts/request with product_ids, forecast_days (7|14|30), force_regenerate flag
- Returns 202 ACCEPTED
- Enqueue background job: forecast.requested (Celery)
  - Celery worker runs Prophet inference
  - Results stored in Forecast table; completion triggers downstream tasks (recommendation generation)

**FR5.3: Forecasting Algorithm (Prophet)**
- Input: Product historical transactions (30+ days minimum)
- Model: Facebook Prophet (auto-ARIMA, seasonal decomposition)
- Output: Predicted daily demand with 95% confidence intervals
- Accuracy: MAPE (Mean Absolute % Error) calculated on validation set
- Handles: Seasonality (weekly patterns), trend, outliers, stockouts in history
- Latency: <10 seconds per product inference
- Edge case: <30 days data → Return "Insufficient data" message

**FR5.4: Supply-awareness & Marketplace Readiness (Phase 2, design in PRD)**
- Scope: MVP focuses on demand forecasting (product-level short horizon). Supply-side forecasting (supplier availability, dynamic pricing, lead-time variability) is scoped for Phase 2 but the system should be designed to collect the necessary signals.
- Inputs to collect for Phase 2: executed RFQs/orders (timestamps, qty, supplier_id), supplier-reported lead times, supplier price history, fulfillment events (delivered_on, quantity_received).
- Phase 2 outputs (planned): supplier lead-time estimates, supplier availability forecasts, supplier reliability scores, and marketplace-level supply/demand imbalance alerts.
 - How MVP supports Phase 2: enqueue background jobs and store canonical events/records in the database (e.g., recommendation.executed, rfq.created, marketplace.order_placed) so Phase 2 can introduce durable event streaming and replay.
- Acceptance (Phase 2): supplier lead-time MAPE < 20% on cohorts with 10+ historical orders; ability to flag suppliers with >80% on-time fulfillment.

#### FR-Group 6: Cash Flow Prediction

**FR6.1: Cash Flow Projection & Risk Analysis**
- GET /cashflow returns projected balance for next 30 days
- Includes: current balance, projected inflows (from demand forecast), projected outflows (from historical spend), daily balance, risk level, critical date
- Risk scoring: low (never below threshold), medium (dips <7 days), high (dips 7+ days)
- Risk threshold: Configurable per business (default 20% of monthly revenue, min 5000 TK)
- Recommendations: Actionable suggestions ("Reduce expenses 10%", "Accelerate collections", "Consider loan")

**FR6.2: Cash Flow Algorithm (Simple Model)**
- Current balance: From last transaction
- Inflows: Forecast demand × unit_price × 90% (payment probability)
- Outflows: Average daily spend from last 30 days
- Daily balance: Balance[N-1] + Inflows[N] - Outflows[N]
- Recalculated: Every transaction upload or forecast generation

#### FR-Group 7: Recommendation Engine

**FR7.1: List Recommendations (Prioritized Feed)**
- GET /recommendations returns all recommendations sorted by priority
- Each recommendation includes: title, description, type (reorder|cash_warning|retention|price_optimization), urgency, priority_score, action_data, engagement status (viewed, executed)
- Filtering: status (pending|viewed|executed|dismissed), type, urgency
- Default sort: By priority_score descending (highest action value first)
- Summary: Total pending, high urgency count, estimated impact

**FR7.2: Mark Recommendation Viewed**
- POST /recommendations/{id}/view records user engagement
- Sets is_viewed=true, viewed_at=now
- Idempotent (safe to call multiple times)
- Analytics: Measures which recommendations get user attention

**FR7.3: Execute Recommendation**
- POST /recommendations/{id}/execute executes user action
- Sets is_executed=true, executed_at=now
- MVP: Side effects mocked ("In Phase 2: would create RFQ", "In Phase 2: would send SMS")
- Optional: User can modify action before executing (e.g., change reorder quantity)
- Idempotent (safe to call multiple times)

**FR7.4: Recommendation Generation Algorithm**
- **Reorder recommendations:**
  - Trigger: Forecast predicts stockout within 7 days
  - Urgency: High (0-3 days), Medium (3-7 days)
  - Impact: 0.8 (prevents lost sales)
  - Action: "Reorder X units by [deadline]"

- **Cash flow warnings:**
  - Trigger: Projected balance < critical threshold
  - Urgency: High (7 days), Medium (8-30 days)
  - Impact: 0.9 (critical business need)
  - Action: "Reduce expenses", "Accelerate collections", "Consider loan"

- **Retention recommendations:**
  - Trigger: 3+ customers with churn_risk_level = high
  - Urgency: Medium (0.6)
  - Impact: 0.7 (improves LTV)
  - Action: "Contact 5 at-risk customers for retention campaign"

- **Priority calculation:** urgency_score × impact_score (0-1 range)
- Deduplication: Don't recommend same action twice in 7 days
 - Triggered: After forecast job completion (background task)

#### FR-Group 8: Admin & Operations (Internal)

**FR8.1: Super‑Admin Dashboard (MVP + Phase 1)**
- Purpose: Provide internal operators and demo presenters with a safe console to monitor system health, manage demo data, inspect errors, and retry background processing.
 - MVP features: health checks (api, db, redis, workers), recent errors/logs, demo dataset seed/reset, user/business list with disable/impersonate (read-only) action, job retry for failed CSV/forecast jobs, audit log viewer for admin actions.
- Phase 1 features: DLQ viewer, reprocess/edit DLQ events, simple ML performance metrics, feature-flag controls, basic billing/plan toggles.
- Acceptance (MVP): admin can seed/reset demo dataset, view health, view recent errors, and re-enqueue a failed forecast job; all admin actions produce audit entries.

**FR8.2: Admin API & Audit**
- Admin APIs exist separately from public APIs and require elevated credentials and optional 2FA/SSO.
- All admin actions must be logged to an immutable AuditLog with admin_id, action, target_type, target_id, metadata, timestamp, and ip_address.
- Admin endpoints must be rate-limited and protected by RBAC policies.

**FR8.3: Data Governance & Compliance Controls (Admin)**
- Admins can view and process user-initiated data export/deletion requests; destructive admin actions require two-step confirmation (and Phase 1: two-person approval for production).
- Admins can toggle anonymization jobs and freeze dataset snapshots for ML training consent.

---

### Non-Functional Requirements

#### NF-Group 1: Performance & Latency

**NF1.1: API Response Time**
- GET endpoints: p95 <500ms (dashboard queries)
- Forecast inference: <10 sec per product
- CSV parsing: <30 sec for 10K rows
- Database queries: <100ms for typical business (1000 transactions)

**NF1.2: Frontend Performance**
- Page load: <3 seconds on 3G (50 Mbps)
- Time to interactive: <5 seconds
- Mobile data usage: <2 MB initial load

#### NF-Group 2: Scalability & Capacity

**NF2.1: Concurrent Users**
- MVP target: 100 concurrent authenticated users
- Database connection pool: 100 connections (pgBouncer added when needed)

**NF2.2: Data Capacity**
- 100 SME businesses
- ~1000-5000 transactions per business (6 months history)
- Total: ~500K transactions, <1 GB database size

**NF2.3: Task Queue Throughput**
- MVP target: ~3,000 tasks/day (CSV parsing, forecasts, churn jobs)
- Celery + Redis (Railway free tier) can comfortably handle this volume for MVP; scale workers as needed
- Upgrade plan: If you migrate to Kafka for Phase 2, use managed Upstash or Confluent for higher throughput and durable retention

**NF2.4: Rate Limiting**
- 100 requests/min per user (generous for MVP)
- File uploads: Max 10 MB CSV, max 5 MB receipt image
- Forecast requests: 10/day per business (prevent spam)

#### NF-Group 3: Reliability & Fault Tolerance

**NF3.1: Uptime Target**
- 99% uptime (MVP, not SLA)
- 3-4 hours downtime/month acceptable

**NF3.2: Data Persistence**
- ACID compliance (PostgreSQL)
- Automatic daily backups (Railway managed)
- Canonical records stored in the database (transactions, forecasts, recommendations). Redis/Celery are not a durable event log; for durable event retention and replay plan to add Kafka in Phase 2.
- Zero data loss for database records is a design goal; background jobs should be idempotent so reprocessing is safe.

**NF3.3: Task Retry & Error Handling**
- Failed Celery tasks retry 3x with exponential backoff (5s, 25s, 125s)
- Failed tasks are recorded in a `failed_jobs` table / admin job viewer for manual inspection and retry
- Send failures to monitoring/service (Sentry, logs) and alert on high error rates
- Alert admin if error rate >1%

#### NF-Group 4: Security & Authentication

**NF4.1: Authentication & Data Isolation**
- JWT required on all protected endpoints
- All queries filtered by business_id (user can only see own data)
- Password hashed with bcrypt (Django default)
- HTTPS/TLS 1.3 enforced in production
 - Admin access: separate admin accounts with RBAC (super-admin, ops, compliance). Admin endpoints require elevated credentials and are protected by 2FA/SSO in production.
 - Admin actions are audited (AuditLog) and destructive operations require explicit confirmation and optional two-person approval for production environments.

**NF4.2: Input Validation**
- All user input validated before processing
- Email format, password strength, CSV format, safe delimiters
- Error messages indicate what's invalid without exposing system details

**NF4.3: Secrets Management**
- No secrets in code or .git history
- Secrets stored in environment variables (Railway Secrets)
- Rotation plan (Phase 2)

#### NF-Group 5: Data Quality & Consistency

**NF5.1: Transaction Validation**
- Date: Valid format (YYYY-MM-DD), not future-dated
- Quantity: Positive integer, <1000 (sanity check)
- Amount: Positive decimal, reasonable (<1M TK)
- Product/Customer: Auto-create if not exists

**NF5.2: Forecast Data Validation**
- Minimum: 30 transactions required
- If <30: Return message "Need more data"

**NF5.3: Eventual Consistency**
- Async updates may have 10-30 second delay
- User expects: Upload CSV → wait 5 seconds → see transactions
- Status: Acceptable for reports, not real-time systems

#### NF-Group 6: Monitoring, Logging & Observability

**NF6.1: Request Logging**
- All API requests logged: timestamp, user_id, endpoint, method, status_code, latency
- Sampling: 100% for MVP
- Sensitive data masked (passwords, payments)
- 15-day rolling retention

**NF6.2: Error Tracking**
- All errors logged with stack trace + context
- Send critical errors to monitoring/alerting (Sentry, PagerDuty) rather than an internal Kafka topic for MVP
- Alert if error rate >1%

**NF6.3: Health Check Endpoint**
- GET /health returns { status, timestamp, services: { db, redis, workers } }
- Used for uptime monitoring (Grafana Cloud)
- 200 if all OK, 503 if service down

#### NF-Group 7: Compliance & Privacy

**NF7.1: Data Privacy**
- Collect only data necessary for functionality
- User can request data export/deletion
- Deletion: Hard-delete all user data within 30 days

**NF7.2: Encryption**
- At rest: Plain PostgreSQL (ok for MVP; upgrade Phase 2)
- In transit: HTTPS/TLS 1.3 (mandatory in production)
- Secrets: Encrypted in environment variables

**NF7.3: Audit Logging**
- Track: Login, data upload, recommendation execution, profile changes
- Event: { user_id, action, resource_id, timestamp, ip_address }
- Retention: 90 days minimum

---

## Section 3: Technical Assumptions

### Architecture: Event-Driven Django + Celery/Redis + PostgreSQL

**Phase 1 (MVP + Months 1-3): Monolithic + Task Queue**
- Single Django application
- PostgreSQL database
- Redis cache
- Celery + Redis (task queue/broker) for async processing and long-running jobs

**Phase 2+ (Months 4-6): Microservices (optional Event Bus)**
- Extract forecasting-service (dedicated ML, GPU support)
- Extract notification-service (SMS, WhatsApp, Email)
- Extract marketplace-service (supplier matching, RFQ)
- When services are split, introduce an event streaming system (Kafka / managed Upstash) for durable event log, replay and multi-consumer scaling

### Technology Stack: Free-Tier Compatible

| Component | Technology | Free Deployment | Cost (Post-MVP) |
|-----------|-----------|-----------------|-----------------|
| **Frontend** | React 18 + TypeScript + Tailwind | **Vercel** (free) | $0-20/mo |
| **Backend** | Django 4.2 + DRF | **Railway** (free $5 credit) | $7-15/mo |
| **Database** | PostgreSQL 14+ | **Railway** (free) | Included in Railway |
| **Cache** | Redis | **Railway** (free) | Included in Railway |
| **Event / Task Queue** | Celery + Redis (broker) | **Railway / Redis** (free) | Included in Railway / low-cost |
| **CI/CD** | GitHub Actions | **Free** (2,000 min/mo) | Free |
| **Container Registry** | GitHub Container Registry | **Free** | Free |
| **Monitoring** | Grafana Cloud | **Free tier** | Free (15-day logs) |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL (Frontend)                           │
│  - React app auto-deployed from GitHub                          │
│  - Free: 100GB bandwidth/mo, custom domain, API routes          │
│  - URL: smartmarket.vercel.app                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│               RAILWAY (Backend, Database, Cache)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Django App (2 containers, 512MB RAM each)               │    │
│  │ - gunicorn + Django app                                 │    │
│  │ - Free tier: $5/mo credit (plenty for MVP)              │    │
│  │ - URL: smartmarket-api.railway.app                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│         ↓ (SQLAlchemy ORM)                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ PostgreSQL 14 (free tier, 10GB storage)                 │    │
│  │ - Managed by Railway, auto-backups, SSL connections     │    │
│  └─────────────────────────────────────────────────────────┘    │
│         ↓ (Redis protocol)                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Redis (free tier, 256MB)                                │    │
│  │ - For Celery broker + session cache                     │    │
│  │ - Managed by Railway                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│         ↓ (Task queue / Redis broker)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Celery Worker (1-2 containers, 512MB RAM each)          │    │
│  │ - Processes background tasks (CSV parsing, forecasts)   │    │
│  │ - Uses Redis as broker & result backend for MVP         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│            OPTIONAL: UPSTASH (Event Streaming for Phase 2)     │
│  - Managed Kafka (use only when migrating to microservices)     │
│  - Useful for durable retention, replay and high-throughput     │
│  - Not required for MVP; Celery+Redis is sufficient for hackathon
└─────────────────────────────────────────────────────────────────┘
```

### Task / Job List (MVP)

| Task/Message | Producer (Trigger) | Worker / Handler | Purpose |
|-------------:|--------------------|------------------|--------|
| `transaction.uploaded` | POST /data/upload-csv or upload-receipt | CSV parsing job (Celery) / OCR job | Parse uploaded file/image and create Transaction/Product/Customer records |
| `transaction.parsed` | CSV/OCR parsing job completion | RFM recalculation job, Forecast trigger job | Normalize data, update metrics and kick off downstream jobs |
| `forecast.requested` | POST /forecasts/request or triggered by parsed data | Forecast generation job (Celery worker runs Prophet) | Generate demand forecasts for products |
| `forecast.completed` | Forecast job completion | Recommendation generation job | Create recommendations based on forecasts and other signals |
| `rfm.recalculate` | Transaction parse / scheduled job | Customer churn scoring job | Recalculate RFM metrics and churn risk |
| `recommendation.generated` | Recommendation generation job | Notification enqueuer / UI store | Persist recommendations and optionally queue notifications |
| `error.monitoring` | Any failing job | Monitoring/Alerting (Sentry, logs) | Surface job failures to ops; failed jobs stored for retry |

### Django App Structure (tasks-first)

```
smartmarket/                           # Django project root
├── apps/
│   ├── auth/                          # User authentication
│   │   ├── models.py                  # User, Business models
│   │   ├── views.py                   # Register, Login, Refresh, Profile
│   │   ├── serializers.py             # UserSerializer, BusinessSerializer
│   │   ├── urls.py                    # /auth/register, /auth/login, etc.
│   │   └── signals.py                 # Post-user-creation signal
│   ├── transactions/                  # Data ingestion
│   │   ├── models.py                  # Transaction, Product, Customer
│   │   ├── views.py                   # Upload CSV, Upload Receipt
│   │   ├── serializers.py             # TransactionSerializer
│   │   ├── services.py                # CSV parser, OCR service
│   │   ├── tasks.py                   # Celery tasks: transaction.uploaded → parsed
│   │   └── urls.py
│   ├── forecasting/                   # Demand + Cash flow predictions
│   │   ├── models.py                  # Forecast, CashFlowForecast
│   │   ├── views.py                   # GET /forecasts, POST /forecasts/request
│   │   ├── serializers.py             # ForecastSerializer
│   │   ├── services.py                # Prophet inference, data prep
│   │   ├── tasks.py                   # Celery tasks: forecast.requested → run models
│   │   ├── ml/
│   │   │   ├── prophet_model.py       # Prophet demand forecasting
│   │   │   └── cash_flow_model.py     # Cash flow projection
│   │   └── urls.py
│   ├── customers/                     # Customer churn detection
│   │   ├── models.py                  # Customer, ChurnScore
│   │   ├── views.py                   # GET /customers
│   │   ├── serializers.py             # CustomerSerializer, ChurnScoreSerializer
│   │   ├── services.py                # RFM scoring, churn detection
│   │   ├── tasks.py                   # Celery tasks: transaction.parsed → calculate RFM
│   │   └── urls.py
│   ├── recommendations/               # Action recommendation engine
│   │   ├── models.py                  # Recommendation, RecommendationAction
│   │   ├── views.py                   # GET /recommendations, POST /execute
│   │   ├── serializers.py             # RecommendationSerializer
│   │   ├── services.py                # Recommendation generation, prioritization
│   │   ├── tasks.py                   # Celery tasks: forecast.completed → generate recs
│   │   ├── rules.py                   # Business rules for recommendations
│   │   └── urls.py
│   ├── marketplace/                   # Supplier directory, RFQ (Phase 2)
│   │   ├── models.py                  # Supplier, Product, RFQ
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── notifications/                 # SMS, WhatsApp, Email (Phase 2)
│   │   ├── models.py                  # NotificationLog, Template
│   │   ├── services.py                # Email/SMS sending service
│   │   ├── tasks.py                   # Celery tasks: recommendation.generated → send
│   │   └── templates/                 # SMS/Email templates
│   ├── adminops/                      # Admin & operations console (internal)
│   │   ├── models.py                  # AdminUser, AuditLog, DemoDataset, JobRecord
│   │   ├── views.py                   # /admin/health, /admin/users, /admin/jobs
│   │   ├── serializers.py             # Admin serializers
│   │   ├── services.py                # Demo seed/reset, job retry helpers
│   │   └── urls.py
│   └── core/                          # Shared utilities
│       ├── models.py                  # BaseModel (timestamps)
│       ├── permissions.py             # IsBusinessOwner, IsAuthenticated
│       ├── exceptions.py              # Custom exceptions
│       ├── constants.py               # Status choices, event/task topics
│       └── utils.py
├── events/                            # Event/task definitions and adapters
│   ├── topics.py                      # Task/topic constants
│   ├── schemas.py                     # Event schema definitions
│   └── adapter.py                     # publish_event() adapter (Celery + future Kafka)
├── workers/                           # Background worker helpers
│   └── base.py                        # Base task/worker helpers
├── middleware/
│   ├── auth_middleware.py             # JWT token validation
│   └── error_middleware.py            # Global error handling
├── smartmarket/                       # Django project settings
│   ├── settings.py                    # Django config, task adapter, email
│   ├── urls.py                        # Root URL routing
│   ├── wsgi.py                        # WSGI for gunicorn
│   └── asgi.py
├── tests/                             # Test suite
│   ├── conftest.py                    # Pytest fixtures
│   ├── test_auth.py
│   ├── test_transactions.py
│   ├── test_forecasting.py
│   ├── test_recommendations.py
│   └── test_integration.py
├── docker-compose.yml                 # Local dev environment
├── Procfile                           # Railway deployment config
├── requirements.txt                   # Python dependencies
└── manage.py
```

### Total MVP Cost: $0-5/month

| Component | Service | Cost |
|-----------|---------|------|
| Frontend | Vercel | $0 |
| Backend App | Railway | Included |
| PostgreSQL | Railway | Included |
| Redis | Railway | Included |
| Celery Worker | Railway | Included |
| Kafka (optional, Phase 2) | Upstash free tier | $0 |
| CI/CD | GitHub Actions | $0 |
| Monitoring | Grafana Cloud free | $0 |
| **TOTAL** | | **$0-5/month** |

**Railway Free $5/month credit covers:** 1 small Django container + 1 Celery worker container + PostgreSQL + Redis

---

## Section 4: API Endpoint Specification

### Total Endpoints: 16 Critical + 5 Optional + 8 Admin = 29 Maximum

#### Critical Path Endpoints (16 Required for MVP)

```
GROUP: /auth - Authentication (4 endpoints)

1. POST /auth/register
   Purpose: Create new SME user account
   Request: { email, password, first_name, business_name, business_type, language }
   Response [201]: { user, business, tokens }
   Error [409]: Email already exists
   Error [400]: Validation failure

2. POST /auth/login
   Purpose: Authenticate user, receive JWT tokens
   Request: { email, password }
   Response [200]: { access_token, refresh_token, expires_in, user }
   Error [401]: Invalid credentials

3. POST /auth/token/refresh
   Purpose: Refresh expired JWT access token
   Request: { refresh_token }
   Response [200]: { access_token, expires_in }
   Error [401]: Invalid/expired refresh token

4. GET /business/profile
   Purpose: Retrieve authenticated user's business profile + stats
   Headers: Authorization (required)
   Response [200]: { id, name, type, stats: { products, customers, revenue }, data_sources }
   Error [401]: Not authenticated

───────────────────────────────────────────────────────────

GROUP: /data - Data Ingestion (2 endpoints)

5. POST /data/upload-csv
   Purpose: Upload sales ledger CSV file
   Headers: Authorization, multipart/form-data
   Request: { file: <binary>, data_source_name: string (optional) }
   Response [202 ACCEPTED]: { message, file_id, file_name, rows_detected, processing_time_seconds }
   Error [400]: Invalid CSV format
   Error [413]: File > 10 MB

6. POST /data/upload-receipt
   Purpose: Upload receipt image for OCR extraction
   Headers: Authorization, multipart/form-data
   Request: { image: <binary JPG/PNG>, receipt_date: date (optional) }
   Response [202 ACCEPTED]: { message, image_id, processing_time_seconds }
   Error [400]: Invalid image format
   Error [413]: File > 5 MB

───────────────────────────────────────────────────────────

GROUP: /transactions - Transaction History (1 endpoint)

7. GET /transactions
   Purpose: List all transactions, filterable by product/date/payment method
   Headers: Authorization
   Query: limit, offset, product_id, date_from, date_to, payment_method, sort, order
   Response [200]: { count, next, previous, results[], summary }
   Error [401]: Not authenticated

───────────────────────────────────────────────────────────

GROUP: /products - Product Inventory (1 endpoint)

8. GET /products
   Purpose: List products with stock status, sales velocity, forecast
   Headers: Authorization
   Query: limit, offset, low_stock_only, sort, order
   Response [200]: {
     count, results: [{
       id, name, sku, unit_price, current_stock, reorder_point, is_low_stock,
       sales_metrics: { sales_7d, sales_30d, avg_daily, last_sale },
       forecast: { forecast_date, next_7d_demand, stockout_predicted, days_until_stockout }
     }]
   }
   Error [401]: Not authenticated

───────────────────────────────────────────────────────────

GROUP: /customers - Customer Analysis (1 endpoint)

9. GET /customers
   Purpose: List customers with purchase history and churn risk
   Headers: Authorization
   Query: limit, offset, churn_risk_only, sort, order
   Response [200]: {
     count, results: [{
       id, name, phone,
       purchase_metrics: { total_spent, purchase_count, last_purchase, days_since, avg_value },
       churn_analysis: { rfm_segment, churn_risk_score, churn_risk_level, risk_reason }
     }]
   }
   Error [401]: Not authenticated

───────────────────────────────────────────────────────────

GROUP: /forecasts - Demand Forecasting (2 endpoints)

10. GET /forecasts
    Purpose: List latest demand forecasts for all products
    Headers: Authorization
    Query: limit, offset, has_stockout_warning, sort
    Response [200]: {
      count, results: [{
        id, product, forecast_date, forecast_days,
        predicted_demand: [ { date, quantity, confidence } ],
        summary: { total_demand, avg_daily, peak_date, peak_qty },
        stockout_risk: { will_stockout, days_until_stockout, confidence, recommendation },
        accuracy: { mape, data_points_used }
      }]
    }
    Error [401]: Not authenticated

11. POST /forecasts/request
    Purpose: Request new forecast generation (async)
    Headers: Authorization
    Request: { product_ids: [int] (optional), forecast_days: 7|14|30, force_regenerate: bool }
    Response [202 ACCEPTED]: { message, product_count, forecast_days, processing_time_seconds }
    Error [401]: Not authenticated
    Error [400]: Invalid params

[Optional for MVP, defer to Phase 2 if time-constrained]
12. GET /forecasts/{product_id}
    Purpose: Detailed forecast with historical accuracy
    Headers: Authorization
    Query: include_historical (bool)
    Response [200]: { latest_forecast, historical_accuracy (if requested), accuracy_trend }
    Error [404]: Product not found

───────────────────────────────────────────────────────────

GROUP: /cashflow - Cash Flow Projection (1 endpoint)

13. GET /cashflow
    Purpose: Get cash flow projection with risk analysis
    Headers: Authorization
    Query: projection_days (7|30|90, default 30)
    Response [200]: {
      forecast: { current_balance, projected_balance: [{date, inflows, outflows, balance}], summary },
      risk_analysis: { risk_level, risk_score, warning, critical_date, critical_threshold },
      recommendations: [{ type, urgency, impact }]
    }
    Error [401]: Not authenticated

───────────────────────────────────────────────────────────

GROUP: /recommendations - Action Recommendations (3 endpoints)

14. GET /recommendations
    Purpose: List recommendations prioritized by urgency × impact
    Headers: Authorization
    Query: limit, offset, status, type, urgency
    Response [200]: {
      count, results: [{
        id, title, description, type, urgency, priority_score,
        action_data: {...},
        engagement: { is_viewed, viewed_at, is_executed, executed_at },
        created_at
      }],
      summary: { total_pending, high_urgency_count, estimated_impact }
    }
    Error [401]: Not authenticated

15. POST /recommendations/{id}/view
    Purpose: Mark recommendation as viewed (engagement tracking)
    Headers: Authorization
    Request: { view_duration_seconds: int (optional) }
    Response [200]: { message, recommendation }
    Error [401]: Not authenticated
    Error [404]: Recommendation not found

16. POST /recommendations/{id}/execute
    Purpose: User executes recommended action
    Headers: Authorization
    Request: { confirmation: bool, modified_action: object (optional) }
    Response [200]: {
      message, recommendation,
      side_effects: { rfq_created, sms_queued },
      next_steps: string
    }
    Error [401]: Not authenticated
    Error [404]: Not found
    Error [409]: Already executed
```

### Optional Endpoints (Defer to Phase 2 if time-constrained)

```
17. GET /forecasts/{product_id}
    Detailed forecast with historical accuracy
    Effort: 1 hour | Value: Medium

18. POST /recommendations/{id}/dismiss
    User rejects recommendation
    Effort: 30 min | Value: Low

19. PATCH /business/profile
    Update business preferences
    Effort: 30 min | Value: Low

20. GET /dashboard/summary
    Consolidated overview dashboard
    Effort: 1 hour | Value: Low

21. GET /data/sources
    Data quality stats per source
    Effort: 1 hour | Value: Low

### Admin / Operations Endpoints (MVP internal)

These endpoints are internal-only and require admin credentials. They enable demo ops, health checks, job retry, DLQ inspection, and audit retrieval.

```
22. GET /admin/health
  Purpose: Service health (db, redis, workers)
  Response [200]: { services: { db: "ok", redis: "ok", workers: "ok" }, timestamp }
  Error [503]: Some service degraded

23. GET /admin/users
  Purpose: List users and businesses for operations
  Query: status, limit, offset
  Response [200]: { count, results: [{ user_id, email, business_id, business_name, status, last_active }] }

24. POST /admin/demo/seed
  Purpose: Seed demo dataset (synthetic 6-month dataset) into a specified business_id or create demo business
  Request: { template: "retail-demo-v1", target_business_id: int (optional) }
  Response [200]: { message, business_id }

25. POST /admin/demo/reset
  Purpose: Reset / tear down demo dataset for cleanup
  Request: { business_id }
  Response [200]: { message }

26. GET /admin/jobs
  Purpose: List recent background jobs (CSV parse, forecast jobs)
  Query: topic, status, limit
  Response [200]: { count, results: [{ job_id, topic, status, attempts, last_error, payload }] }

27. POST /admin/jobs/{job_id}/retry
  Purpose: Re-enqueue a failed background job (admin only)
  Response [200]: { message, job_id }

28. GET /admin/dlq
  Purpose: List dead-letter events for manual inspection
  Query: limit, offset
  Response [200]: { count, results: [{ event_id, topic, error_reason, payload, created_at }] }

29. GET /admin/audit
  Purpose: Query admin audit logs
  Query: admin_id, action, since
  Response [200]: { count, results: [{ id, admin_id, action, target_type, target_id, metadata, timestamp }] }
```
```

### Response Format Standards

**All successful responses:**
```json
{
  "status": "success" or "pending",
  "data": { /* actual response */ },
  "timestamp": "2025-01-15T10:30:00Z",
  "request_id": "uuid"
}
```

**All error responses:**
```json
{
  "status": "error",
  "error_code": "ENUM (INVALID_FILE_FORMAT, INSUFFICIENT_DATA, etc.)",
  "message": "User-friendly error message",
  "details": { /* technical details */ },
  "suggestions": ["How to fix it", "Alternative action"]
}
```

### Rate Limiting & Quotas

- **100 requests/minute per user** (generous for MVP)
- **1 GB/month upload limit** (enough for 6 months CSV data)
- **10 forecast requests/day per business** (prevent spam)
- **No API key required** (JWT authentication only)

---

## Section 5: User Interface Design Goals

### Design Principle: "Intelligence Made Accessible"

SmartMarket's UI translates complex AI into simple, actionable insights for time-pressed, low-literacy SME owners accessing via smartphones on 3G.

**Core Principles:**
- Minimize cognitive load (one decision per screen)
- Visual > Text (colors, icons, numbers)
- Bangla-first (respect for target market)
- Mobile-optimized (95% of users)
- Progressive disclosure (summary first, details on demand)

### Key Interaction Paradigms

#### 1. Card-Based Recommendation Feed

Central to SmartMarket is not dashboards but a **prioritized action feed** like WhatsApp/messaging apps.

```
[HIGH PRIORITY - RED BACKGROUND]
⚠️ Reorder Shirts (Stock Ending Soon)
Current: 5 units | Forecast: 12 units needed in 7 days
Action needed by: Jan 15, 2025
[See Details ▶] [Action ✓] [Dismiss]

[MEDIUM PRIORITY - YELLOW]
💰 Cash Flow Warning
Projected balance drops to ৳8,000 on Jan 18
[Details ▶] [Action ✓]
```

#### 2. Visual Status Indicators (Traffic Light Metaphor)

Color-coded status with icons for accessibility:

```
Stock:  🟢 Safe (>30 days) | 🟡 Warning (10-30d) | 🔴 Critical (0-10d)
Health: 🟢 Champion | 🟡 At-Risk | 🔴 Dormant
Cash:   🟢 Safe | 🟡 Dips <7d | 🔴 Critical (7+ days)
```

#### 3. Progressive Disclosure

Show summary by default, expand for details on tap:

```
[Transactions Summary ▼]
Last 7 days: 15 sales | Total: ৳45,000 | Avg: ৳3,000
[View All Transactions ▶]
```

#### 4. Floating Action Button (FAB)

One big primary action, always visible, context-aware:

```
Home: [+ Upload Data ▲]
Recommendations: [Execute Action ▲]
Forecasts: [Regenerate Forecast ▲]
```

### Core Screens (8 Screens for MVP)

#### Screen 1: Authentication (Signup / Login)

**Signup:** Email, password, first name, business name, type, language
**Login:** Email, password
**UX Goals:** Minimal fields, clear validation, language toggle at signup

#### Screen 2: Home / Dashboard Overview

Layout:
- Welcome greeting + "Last updated: X min ago"
- 3 stat cards (Revenue, Customers, Stock status)
- Top 2-3 recommendations ("See all X recommendations")
- Bottom navigation tabs (Forecasts, CashFlow, Products, Customers)
- Floating button: "+ Upload Data"

**UX:** One-glance status, no scrolling needed to see actions, refresh every 30 seconds

#### Screen 3: Recommendations Feed

Filters: Type (All|Inventory|Cash|Customers), Urgency (High|Med|Low)
Status tabs: Pending|Completed
Card per recommendation: Title, description, priority color, buttons ("Execute ✓", "Details ▶")

**UX:** Color-coded priority, show wins (completed actions), easy execute flow

#### Screen 4: Forecasts View

Horizon selector: 7-day | 14-day | 30-day
Filter: All | Low Stock | High Risk
Regenerate button (floating or top)
Forecast cards: Product name, current stock, forecast chart, status (🟢/🟡/🔴), days left, accuracy %

**UX:** Simple line charts, no overwhelming details, stockout status at a glance

#### Screen 5: Cash Flow View

Current balance + projection period
Area chart: Balance trajectory, red zone (below threshold)
Risk assessment: 🔴 HIGH RISK, critical date, suggested actions
Details button for assumptions

**UX:** Visual trend > table, actionable suggestions, warning prominent

#### Screen 6: Products (Inventory)

Filter: All | Low Stock | High Sales
Sort: Name | Stock | Sales 7d
Product cards: Name, stock bar, sales trend arrow (↑/↓/→), forecast, status

**UX:** Visual stock level (bar), sales arrow, status color

#### Screen 7: Customers

Segment filter: All | Champions | At-Risk | Dormant | New
Sort: Name | Total Spent | Risk Score
Summary stats: "8 Champions, 5 At-Risk, 3 Dormant"
Customer cards: Name, total spent, last purchase, risk level, reason

**UX:** Celebrate champions, identify at-risk, explain why

#### Screen 8: Transactions List

Filters: Date range, Product, Payment method
Compact table: Date | Product | Amount
Summary: Total, average, count
Pagination: "1-20 of 156" + "Load more"

**UX:** Scan-friendly table, filters for auditing, minimal scrolling

### Accessibility: WCAG AA Compliance

- **Color Contrast:** 4.5:1 for text (tested)
- **Text Size:** 16px body, 14px labels (readable on aging eyes)
- **Touch Targets:** 48x48px minimum (for older users, shaky hands)
- **Text Alternatives:** Icons paired with labels (no icon-only buttons)
- **Bangla Language:** Primary, English toggle
- **Keyboard Navigation:** Tab through fields, no mouse required
- **Mobile Responsive:** Single column <600px, two-column ≥768px

### Branding & Visual Design

**Color Palette:**
- Primary (Action): #10B981 (Green) — Growth, "go" signal
- Secondary (Caution): #F59E0B (Amber) — Warning, medium priority
- Danger (Urgent): #EF4444 (Red) — High priority, immediate action
- Neutral (Trustworthy): #6B7280 (Gray) — Professional
- Accent (Information): #3B82F6 (Blue) — Links, secondary actions
- Background: #FFFFFF (White) — Clean, accessible

**Typography:**
- System fonts: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- Bangla font: Noto Sans Bengali
- H1: 32px bold | H2: 24px bold | H3: 18px semibold | Body: 16px regular
- Line height: 1.5 (spacious)

**Spacing:** 8px grid (8px, 16px, 24px, 32px, 48px)

**Buttons:**
- Primary: Green #10B981, white text, 12px V × 16px H padding, 8px border radius
- Secondary: White, green outline, 2px border
- Ghost: Transparent, blue text (#3B82F6)

**Cards:**
- White background, 1px light border (#E5E7EB), 8px radius, 16px padding
- Subtle shadow: 0 1px 3px rgba(0,0,0,0.1)
- Hover: Shadow increases (0 4px 6px)

**Charts:** Recharts (React-friendly)
- Demand: Area chart, green, light green confidence band
- Cash flow: Area chart with red danger zone, dashed critical threshold line

**Mobile vs Desktop:**
- Mobile (<768px): Single column, full-width cards, bottom nav sticky
- Desktop (≥768px): Two-column layout, top nav, max-width 1200px (not full screen)

### Device & Platform Support

**PRIMARY:** Mobile Web (95% of users)
- Smartphones 5"-6.7" (Samsung A10-A50, iPhone SE-13 Pro)
- Android 8+, iOS 13+
- Chrome Mobile, Safari Mobile
- 3G connection (50 Mbps, high latency)
- <2 MB initial load

**SECONDARY:** Tablet (5%)
- iPad, Samsung Tab (7-12")
- Mobile version scales reasonably

**NOT BUILDING (MVP):**
- ❌ Native iOS/Android apps (Phase 2)
- ❌ SMS interface (Phase 2, needs SMS gateway)
- ❌ WhatsApp bot (Phase 2, requires API approval)
- ❌ Voice interface (Phase 2, needs Bangla speech-to-text)
- ❌ PWA (offline support) — Phase 2

---

## Section 6: Epic List

### Hackathon Phase: 9 Epics (84 person-hours, 48-72 hours)

**Sequencing Principle:** Infrastructure → Auth → Data → Models (Forecast + Churn) → Recommendations → Frontend → Integration → Polish

### Epic 1: Infrastructure & Setup (8 hours)

**Goal:** Production-ready infrastructure (Django, PostgreSQL, Redis, Celery, CI/CD, Docker). Team has working local dev environment and can deploy with one git push.

**Stories:**

**1.1: Project Bootstrap & Local Dev Environment (3 hrs)**
- Django 4.2 project initialized
- docker-compose.yml with: postgres, redis, celery worker
- Django + Celery worker containers
- Database auto-migrates on container start
- Task queue (Redis) configured and Celery workers start
- Django admin accessible
- README with setup instructions
- Acceptance: `docker-compose up` starts full stack

**1.2: Railway Deployment & CI/CD Pipeline (3 hrs)**
- GitHub Actions workflow: test → lint → build → deploy
- Railway config: 2 containers (web + worker), PostgreSQL, Redis (optional: Upstash Kafka for Phase 2)
- Auto-deploy on merge to main
- Health check: GET /health returns 200
- Secrets in Railway Secrets (not code)
- HTTPS auto-enabled
- Acceptance: `git push main` → auto-deployed to Railway

**1.3: Vercel Frontend Deployment Setup (2 hrs)**
- React app created (Create React App or Vite)
- Vercel auto-deploy on GitHub push
- Environment variable: REACT_APP_API_URL → Railway backend
- CORS configured for Vercel → Railway calls
- Acceptance: `git push` → auto-deployed to Vercel

**1.4: Database Schema & Migrations (2 hrs)**
- All models defined (User, Business, Transaction, Product, Customer, Forecast, ChurnScore, Recommendation)
- Foreign key relationships
- Indexes on frequently-queried columns
- Migrations created and tested
- Sample data seed script
- Acceptance: `python manage.py migrate` on fresh database succeeds

---

### Epic 2: Authentication & Authorization (6 hours)

**Goal:** Users can register/login, receive JWT tokens. All API calls require valid JWT. Data isolation enforced (user only sees their business).

**Stories:**

**2.1: User Registration Endpoint (2 hrs)**
- POST /auth/register with email, password, first_name, business_name, business_type, language
- Password validation: min 8 chars, not common
- Business auto-created linked to user
- JWT tokens returned
- Error [409] if email exists, [400] if validation fails
- Acceptance: Can signup 100 times/min, no rate limit errors

**2.2: User Login & JWT Tokens (1.5 hrs)**
- POST /auth/login with email, password
- Access token (1 hr) + refresh token (30 days) returned
- JWT includes user_id, business_id, exp
- Error [401] if invalid credentials
- Acceptance: Login successful, tokens valid, can decode on client

**2.3: Token Refresh Endpoint (0.5 hrs)**
- POST /auth/token/refresh with refresh_token
- Returns new access_token
- Refresh token remains valid
- Acceptance: Refresh works, access_token extended

**2.4: Protected Endpoints & Data Isolation (1.5 hrs)**
- Middleware checks Authorization header on all protected endpoints
- All queries filtered by business_id
- User A cannot access User B's transactions
- Permission class (IsBusinessOwner) enforced
- Acceptance: Try accessing other user's data → 403 Forbidden

**2.5: Business Profile Endpoint (1 hr)**
- GET /business/profile returns business + stats
- Stats pre-calculated (no slow queries)
- Only returns authenticated user's business
- Acceptance: GET /business/profile shows correct stats

---

### Epic 3: Data Ingestion Pipeline (10 hours)

**Goal:** Users upload CSV/receipts. System parses asynchronously, validates, creates Transaction/Product/Customer records, and enqueues background tasks for downstream processing.

**Stories:**

**3.1: CSV Upload Endpoint (2 hrs)**
- POST /data/upload-csv with multipart file
- Returns [202 ACCEPTED]
- Validates: .csv format, required columns, max 10MB
- Enqueues background task: transaction.uploaded (Celery)
- Error [400] if invalid, [413] if too large
- Rate limit: 10 uploads/min
- Acceptance: Upload CSV → background task enqueued and processed

**3.2: CSV Parsing Worker (3 hrs)**
- Celery worker processes transaction.uploaded tasks
- Parses each row: validates date, quantity, amount
- Creates Transaction record, auto-creates Product/Customer if not exist
- Updates Product stock, Customer metrics
- Triggers transaction.parsed downstream jobs on completion
- Handles errors: Process valid rows, skip invalid, log errors
- Latency: <30 sec for 1000 rows
- Acceptance: Upload 100-row CSV, see transactions in database within 5 sec

**3.3: Receipt OCR Upload Endpoint (1.5 hrs)**
- POST /data/upload-receipt with JPG/PNG image
- Returns [202 ACCEPTED]
- Validates format, max 5MB
 - Enqueues background task: receipt.uploaded
- MVP: Can mock OCR extraction
 - Acceptance: Upload receipt → background task enqueued, no errors

**3.4: Transaction List Endpoint (1.5 hrs)**
- GET /transactions with pagination, filters
- Query params: limit, offset, product_id, date_from, date_to, payment_method, sort, order
- Response: paginated list + summary stats
- Default: Last 50 transactions, sorted by date descending
- Performance: <100ms query on 10K transactions
- Acceptance: Filter by date, see correct transactions

**3.5: Duplicate Prevention (2 hrs)**
- Hash CSV content (MD5), store in transaction metadata
- If duplicate CSV uploaded: detect and skip or ask user
- Acceptance: Upload same CSV twice → "This file was already uploaded"

---

### Epic 4: Forecasting Engine (12 hours)

**Goal:** System generates 7/14-day demand forecasts using Prophet. Users see predictions, stockout risk, forecast accuracy.

**Stories:**

**4.1: Prophet Model Setup (4 hrs)**
- Facebook Prophet model for demand forecasting
- Input: Historical transactions (30+ days minimum)
- Output: Predicted demand with 95% confidence intervals
- Handles: Seasonality, trend, outliers
- Accuracy: MAPE < 40% acceptable
- Inference: <10 sec per product
- Model size: <100 MB
- Edge case: <30 days → "Need more data" message
- Acceptance: Load test 50 concurrent forecasts, all complete <15 sec

**4.2: Forecast Request Consumer (3 hrs)**
**4.2: Forecast Request Worker (3 hrs)**
- Celery worker processes forecast.requested jobs
- Runs Prophet inference for each product
- Creates Forecast record with predictions, confidence, MAPE
- Triggers forecast.completed downstream jobs on success
- Error handling: send to monitoring and record failed job for retry
- Parallelization: Process multiple products concurrently
- Acceptance: Request forecast → results appear in database

**4.3: Forecast List Endpoint (2 hrs)**
- GET /forecasts returns latest forecast per product
- Includes: predicted demand, confidence intervals, stockout risk, accuracy
- Filter: has_stockout_warning
- Stockout calculation: cumulative demand > current stock
- Confidence levels: low/medium/high based on MAPE
- Acceptance: See forecast cards, understand stockout risk, know accuracy

**4.4: Forecast Request Endpoint (1.5 hrs)**
- POST /forecasts/request triggers forecast generation
- Request: product_ids, forecast_days (7|14|30), force_regenerate
- Returns [202 ACCEPTED]
 - Enqueues background job: forecast.requested
- Rate limit: 10 requests/day per business
- Acceptance: Click "Regenerate Forecast", see "Processing...", results appear after 5 sec

**4.5: Cash Flow Forecasting (1.5 hrs)**
- Project future cash balance based on transactions + forecast
- Input: Current balance, historical outflows, demand forecast
- Output: CashFlowForecast with daily balance, risk level, critical date
- Risk scoring: low/medium/high based on threshold dips
- Recalculated: Every transaction or forecast update
- Simple model: Inflows from forecast, outflows from average spend
- Acceptance: Cash flow projection shows balance dropping below threshold on specific date

---

### Epic 5: Customer Churn Detection (8 hours)

**Goal:** System scores customers by RFM (Recency, Frequency, Monetary). Calculates churn risk (0-1). Users identify at-risk customers for retention.

**Stories:**

**5.1: RFM Scoring Algorithm (2.5 hrs)**
- Recency: Days since last purchase (normalize to 1-5)
- Frequency: Total purchases (normalize to 1-5)
- Monetary: Total spent (normalize to 1-5)
- RFM Score: (R+F+M)/3
- Segments: Champion, Loyal, Potential, At-Risk, Dormant
- Normalize carefully: Document exact bins
- Acceptance: Score 100 customers, verify segments make sense

**5.2: Churn Risk Scoring (1.5 hrs)**
- MVP: Rule-based (not ML)
- Rules: days_since_purchase > 60 + declining frequency → High risk
- Churn score: (days_since / 365) + (if declining: +0.3), capped at 1.0
- Risk levels: low (<0.3), medium (0.3-0.6), high (>0.6)
- Risk reason: Text explanation
- Acceptance: At-risk customer (60 days, declining) scores >0.6

**5.3: RFM Consumer (1.5 hrs)**
**5.3: RFM Worker (1.5 hrs)**
- Celery worker processes transaction.parsed triggers
- Recalculates RFM + churn for affected customers
- Creates/updates ChurnScore record
- Latency: <10 sec to score 100 customers
- Triggered after CSV upload
- Acceptance: Upload transactions → churn scores update

**5.4: Customer List Endpoint (2.5 hrs)**
- GET /customers with pagination, filters
- Returns: customer data + RFM metrics + churn scores
- Filter: churn_risk_only
- Sort: name, total_spent, last_purchase, churn_risk_score
- Summary: Champions count, At-Risk count, Dormant count
- Acceptance: Filter for at-risk customers, see explanation for each

---

### Epic 6: Recommendation Generation (10 hours)

**Goal:** System generates actionable recommendations combining forecasts + churn + cash flow. Users see prioritized feed, can execute recommendations.

**Stories:**

**6.1: Recommendation Generation Logic (3 hrs)**
- **Reorder:** Trigger if stockout predicted within 7 days; Urgency high (0-3d), medium (3-7d); Impact 0.8
- **Cash warning:** Trigger if balance < threshold; Urgency high (7d), medium (8-30d); Impact 0.9
- **Retention:** Trigger if 3+ customers churn_risk = high; Urgency medium (0.6); Impact 0.7
- Priority = urgency × impact
- Deduplication: Don't recommend same action twice in 7 days
- Stored in database with created_at
- Acceptance: Generate recommendations, verify priority ordering

**6.2: Recommendation Consumer (2 hrs)**
**6.2: Recommendation Worker (2 hrs)**
- Celery worker processes forecast.completed triggers
- Generates all recommendations for business
- Creates Recommendation records (batch insert)
- Enqueues recommendation.generated tasks (e.g., notification enqueue) or directly persists notifications
- Latency: <15 sec to generate for all products
- Acceptance: Forecast completes → recommendations appear

**6.3: Recommendation List Endpoint (2 hrs)**
- GET /recommendations returns paginated, prioritized list
- Filters: status (pending|viewed|executed), type, urgency
- Default sort: priority_score descending
- Summary: pending count, high urgency count, estimated impact
- Acceptance: See top recommendations, filter by type, understand priority

**6.4: Mark Viewed Endpoint (0.5 hrs)**
- POST /recommendations/{id}/view records engagement
- Sets is_viewed=true, viewed_at=now
- Idempotent
- Acceptance: Click view, field updates

**6.5: Execute Recommendation Endpoint (1.5 hrs)**
- POST /recommendations/{id}/execute executes action
- Sets is_executed=true, executed_at=now
- MVP: Side effects mocked ("In Phase 2: would create RFQ")
- Optional: Support modified_action (user customizes before executing)
- Idempotent
- Acceptance: Execute recommendation, see success message, recommendation marked done

---

### Epic 7: Frontend - Core Screens & UI (16 hours)

**Goal:** React SPA with 8 screens (Auth, Home, Recommendations, Forecasts, CashFlow, Products, Customers, Transactions). Mobile-first, Bangla/English, connects to Django API.

**Stories:**

**7.1: Project Setup & Component Library (3 hrs)**
- React 18 + TypeScript + Vite
- Tailwind CSS
- react-i18next for Bangla translations
- Reusable components: Button, Card, Filter, Table, Chart (area), Alert, Modal, Navbar, BottomTabs, FloatingButton
- Color palette: Green, Yellow, Red, Blue, Gray
- System fonts + Noto Sans Bengali
- Mobile-first responsive design

**7.2: Authentication Screens (2.5 hrs)**
- Signup: email, password, first_name, business_name, type, language
- Login: email, password
- Validation: inline error messages
- Success: store tokens, redirect to Home
- Token management: localStorage, auto-refresh on expiry
- Logout: clear tokens

**7.3: Home / Dashboard Screen (2 hrs)**
- Welcome greeting, "Last updated" timestamp
- 3 stat cards: Revenue, Customers, Stock
- Top 2-3 recommendations + "See all" link
- Bottom navigation tabs
- Floating button: "+ Upload Data"
- Refresh every 30 sec

**7.4: Recommendations Feed Screen (3 hrs)**
- Filter bar: Type, Urgency
- Status tabs: Pending|Completed
- Recommendation cards: Color-coded, title, description, buttons
- Execute flow: modal confirmation, show success
- Pagination: "Load more"
- Engagement: Show "Viewed X min ago"

**7.5: Forecasts Screen (3 hrs)**
- Horizon selector: 7|14|30 days
- Filter: All|Low Stock|High Risk
- Regenerate button
- Forecast cards: Product, current stock, simple line chart, status, days left, accuracy %
- Mobile: Charts scrollable

**7.6: Cash Flow Screen (2.5 hrs)**
- Current balance summary
- Area chart: Balance trajectory, red danger zone
- Risk assessment: level, critical date, suggestions
- Details button: Show assumptions

**7.7: Inventory (Products) Screen (2.5 hrs)**
- Filter: All|Low Stock|High Sales
- Sort: Name|Stock|Sales
- Product cards: Stock bar, sales arrow, forecast, status

**7.8: Customers Screen (2.5 hrs)**
- Segment filter: All|Champions|At-Risk|Dormant|New
- Sort: Name|Total Spent|Risk Score
- Summary stats
- Customer cards: Name, metrics, risk level, reason

**7.9: Transactions List Screen (2 hrs)**
- Compact table: Date, Product, Amount
- Filters: Date range, Product, Payment method
- Summary: Total, avg, count
- Pagination

**7.10: Data Upload Screen (2 hrs)**
- CSV upload tab: File picker, drag-drop, preview
- Receipt upload tab: Image picker, drag-drop
- Processing state: Spinner, estimated time
- Success: Toast notification, auto-redirect
- Error handling: Show message with suggestions

**7.11: Navigation & App Shell (2 hrs)**
- React Router: Public (login, signup) + Protected routes
- Top navigation bar: Logo, breadcrumbs, language toggle, profile menu
- Bottom navigation (mobile): 5 sticky tabs
- Protected route redirects to login if not authenticated
- Error boundaries

**7.12: Responsive Design & Mobile Testing (1.5 hrs)**
- Test on 320px, 375px, 411px, 600px, 768px, 1024px
- Single column mobile, full-width cards
- Touch targets 48x48px
- <3 sec page load on 3G (simulated)
- Lighthouse score >80
- No horizontal scrolling

---

### Epic 8: API Integration & E2E Testing (8 hours)

**Goal:** Frontend connects to Django API. Complete workflows tested end-to-end.

**Stories:**

**8.1: API Client Setup (2 hrs)**
- Axios/Fetch client with auth, error handling
- Baseurl: https://smartmarket-api.railway.app/api
- Auto-refresh: If 401, refresh token, retry
- Error handling: Specific messages per error code
- Request timeout: 30 sec
- Endpoint wrappers: auth.*, data.*, transactions.*, etc.
- Loading states per endpoint

**8.2: Auth Flow Integration (1.5 hrs)**
- Signup form → POST /auth/register
- Login form → POST /auth/login
- Token storage: localStorage
- Auto-refresh: Check expiry, refresh if <5 min left
- Logout: Clear tokens
- Test: Signup → Login → Redirect to Home

**8.3: Dashboard Data Integration (1.5 hrs)**
- On Home load: Call GET /business/profile, GET /recommendations, GET /transactions
- Update on interval: Refresh every 30 sec
- Loading state: Skeleton loaders
- Error handling: Show banner, allow retry
- Test: Navigate to Home → See real stats

**8.4: CSV Upload E2E (1.5 hrs)**
- Test flow: Login → Upload CSV → See "Processing..." → Navigate to Transactions → See new transactions
- Validate: Transactions correct, Product stock updated, Customer metrics updated
- Error handling: Upload invalid CSV → Error shown with suggestion
- Test data: Sample CSV in repo

**8.5: Forecast & Recommendation E2E (1.5 hrs)**
- Test flow: Upload 30+ days data → Click "Regenerate Forecast" → Wait 5 sec → See forecasts → See recommendations
- Validate: Forecast exists, Recommendation generated, Execution recorded
- Error handling: <30 days data → Helpful message
- Test: Execute recommendation → See success, marked completed

**8.6: Integration Testing & Bug Fixes (1 hour)**
- Smoke tests: Auth, upload, lists, actions
- API contract validation: Response structure, status codes
- Performance: Dashboard <2 sec, Forecast <5 sec
- Bug tracking: List, prioritize critical
- Sign-off: Critical tests passing, demo-ready

---

### Epic 9: Demo Preparation & Polish (6 hours)

**Goal:** System demo-ready. Code clean, documentation written, video recorded, pitch deck prepared, team practices presentation.

**Stories:**

**9.1: Code Cleanup & Documentation (1.5 hrs)**
- Remove debug prints, commented code
- Docstrings on all API endpoints
- README: Installation, running tests, deployment
- Linting: black (Python), ESLint (JS)
- .env.example with all variables
- No secrets in repo

**9.2: Sample Data & Demo Scenario (1 hr)**
- 1 demo business with 6 months history
- 50+ customers (varied patterns, churn, champions)
- 10 products with different stock levels
- Bangla names, BDT prices
- Realistic patterns: weekend sales spikes, seasonal products
- Management command: `python manage.py seed_demo`
- Demo script: Login → Upload → Show forecasts → Execute recommendation

**9.3: Demo Video (2 hrs)**
- 3-5 minute walkthrough
- Hook: "Bangladesh SMEs lack BI tools"
- Problem: SME owner confusion
- Solution: Upload → Forecast → Recommendation → Action
- Impact: "Revenue up 15%, stockouts down 20%"
- Production quality: Screen recording, voiceover, subtitles
- File: MP4, <100 MB

**9.4: Pitch Deck (1.5 hrs)**
- 10-12 slides
- Problem, Solution, Differentiators, Demo, Technical, Business Model, Market, Traction, Roadmap, Team, CTA
- Design: Clean, readable, visuals not clutter
- Speaker notes per slide
- Timing: 1 min/slide = 12 min total

**9.5: Live Demo Practice & Contingency (1 hr)**
- 3+ rehearsals (full team)
- Demo script (step-by-step what to click)
- Contingency plans: Internet fails (fallback to video), API crashes (restart), browser freezes (backup device)
- Setup: docker-compose up, seed data, test all steps
- Presentation skills: Eye contact, clear voice, passion

**9.6: Documentation for Judges (1 hr)**
- Architecture doc: Diagram, data flow, why these choices, scalability plan
- Testing doc: What tests run, results, known issues
- Assumptions doc: Key assumptions, validation plan
- Deployment doc: Run locally, deploy to Vercel/Railway, monitoring
- Format: Markdown in /docs or Google Docs

**9.7: Final QA & Bug Bash (0.5 hrs)**
- Checklist: Screens load, API responds, data flows, no console errors
- Known bugs: Document, have fixes or workarounds
- Performance: <3 sec on 3G, no timeouts
- Sign-off: "Ready to demo"

---

### Post-Hackathon Epics (Conditional on Success)

```
EPIC 10: Pilot Onboarding & Real User Feedback (Phase 1, Weeks 1-4)
  Duration: 40-60 hours
  Goals: Onboard 10-15 SME pilot users, collect real usage data, validate assumptions
  Key stories: Onboarding flow, NPS survey, usage analytics, support documentation

EPIC 11: WhatsApp Business Integration (Phase 2, Weeks 8-12)
  Duration: 40-50 hours
  Goals: Enable SME owners to get alerts via WhatsApp
  Key stories: WhatsApp API integration, notification templates, conversational bot

EPIC 12: Hyperlocal Marketplace (Phase 2, Weeks 12-20)
  Duration: 60-80 hours
  Goals: SME owners can purchase from suppliers via recommendations
  Key stories: Supplier onboarding, RFQ flow, order management, payment integration
```

---

## Section 7: Checklist Results Report

### Pre-Launch PM Checklist: SmartMarket PRD v1.0

**REQUIREMENTS COMPLETENESS**
- ✅ Functional Requirements (FR1-8): 40+ specific requirements
- ✅ Non-Functional Requirements (NF1-7): Performance, scalability, reliability, security, data quality, monitoring, privacy
- ✅ API Specification: 16 critical endpoints, 5 optional
- ✅ UI/UX Design: 8 core screens, WCAG AA accessibility, mobile-first

**SCOPE & FEASIBILITY**
- ✅ Hackathon Epics (1-9): 84 person-hours, achievable with 4-person team
- ✅ MVP Cut criteria: Can reduce to 13 endpoints + skip detail views if needed
- ✅ Deferred features: Marketplace, WhatsApp, voice, native apps → Phase 2+
- ✅ Free-tier deployment: All services $0-5/month (Vercel, Railway, Upstash)

**TECHNICAL ARCHITECTURE**
-- ✅ Django + DRF (backend) + React (frontend) + Celery/Redis (task queue) + PostgreSQL (database)
-- ✅ Event-driven design: Async processing via Celery tasks, clear event/task contracts; Kafka is optional for Phase 2 when moving to microservices
- ✅ Scalability: Monolith → Microservices path documented
- ✅ Deployment: Docker, Railway, Vercel, GitHub Actions

**TEAM & ROLES**
- ✅ 4-person team: Backend, ML, Frontend, Floater
- ✅ Time allocation: ~20 hours per person productive work
- ✅ Dependency sequencing: Clear blocking order (Infra → Auth → Data → Models → Frontend → Integration)

**DATA & PRIVACY**
- ✅ No unnecessary collection
- ✅ Encryption in transit (HTTPS/TLS 1.3)
- ✅ Data isolation: business_id filtering enforced
- ✅ Audit logging: Important actions tracked

**MARKET & POSITIONING**
- ✅ Target: 7.8M urban SMEs in Bangladesh
- ✅ Differentiation: Passive capture, predict-to-action, Bangla-first, affordable
- ✅ Competition: Zoho/Tableau expensive, Khatabook lacks forecasting
- ✅ Business model: $2-5/month subscriptions + marketplace commissions

**RISKS & MITIGATIONS**
- ✅ Adoption risk: Build trust with accuracy tracking, start low-stakes
- ✅ Data quality: Validation on upload, confidence scores, synthetic baselines
-- ✅ Task-queue limits: Celery/Redis adequate for MVP; upgrade plan to Kafka/managed event streaming ready for Phase 2
- ✅ Forecast accuracy: Minimum 30 days enforced, clear messaging
- ✅ Live demo risk: Pre-recorded video fallback, contingency plans

**GO/NO-GO DECISION**
- ✅ **GO:** All requirements defined, architecture sound, team capable, timeline realistic
- ✅ Ready to assign epics and begin development

---

## Section 8: Next Steps & Handoff

### For Development Team

1. **Fork/clone repository:** `github.com/smartmarket/smartmarket`
2. **Read this PRD:** Especially Sections 2-6
3. **Assign epics by person/role:**
   - **Backend:** Lead Epic 1, 2, 3, 6, 8
   - **ML:** Lead Epic 4, 5, 6
   - **Frontend:** Lead Epic 7, 8
   - **Floater:** Support Epic 1, assist Epic 8, 9
  - **Ops / Admin:** Implement adminops (demo seed/reset, health, job retry) as part of Epic 1/3 and Epic 8
4. **Set up local dev environment:** `docker-compose up` (from Epic 1)
5. **Begin Epic 1 immediately** (blocks all others)
6. **Daily standups:** 15 min, track progress against epic stories
7. **Commit messages:** Reference epic/story (e.g., "Epic 1.1: Setup docker-compose")

### Post-Hackathon (If Successful)

1. **Pilot Recruitment (Week 1-2):** Reach out to 10-15 SMEs from network
2. **Pilot Onboarding (Week 3-4):** Setup accounts, train users, collect feedback
3. **Phase 2 Planning (Week 4-6):** Prioritize next features based on pilot feedback
5. **Admin & Ops hardening (Week 4-6):** Implement RBAC, 2FA for admin accounts, DLQ viewer and audit exports before production pilots
6. **Supply-side data collection (Week 4-8):** Begin instrumenting executed RFQs/orders and supplier fulfillment events to enable Phase 2 supply predictions
4. **Supplier Outreach (Week 4+):** Begin marketplace partnerships
5. **WhatsApp Business API Application (Week 4+):** 6-8 week approval process

### Key Metrics to Track (Post-Launch)

- **Adoption:** Signups/week, active users/week, WAU/MAU ratio
- **Engagement:** Forecast requests/user, recommendation executions/user, NPS score
- **Accuracy:** Forecast MAPE, churn detection precision, recommendation adoption rate
- **Retention:** Users active after 3 months, monthly churn rate
- **Satisfaction:** NPS >40, user satisfaction >4/5, 30%+ recommend to friend

### Communication & Escalation

- **Blockers:** Escalate to PM immediately (blocks team)
- **API changes:** Notify frontend + backend lead (contract change)
- **Scope creep:** Discuss with PM before adding features
- **Demo readiness:** Confirm with PM 48 hours before presentation

---

**Document Owner:** John (PM)
**Last Updated:** 2025-11-02
**Change Log:** 2025-11-02 - Added Admin & Operations requirements, Admin API endpoints, and Phase-2 supply-awareness notes (lead-time & supplier predictions). 
**Next Review:** After Hackathon (post-launch)
**Status:** Ready for Development
