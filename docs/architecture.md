# SmartMarket Backend Architecture Document v1.0

**Document Version:** 1.0
**Date:** 2025-11-03
**Status:** Ready for Development
**Author:** Winston (Architect)

---

## Table of Contents

1. [Introduction](#introduction)
2. [High-Level Architecture](#high-level-architecture)
3. [Tech Stack](#tech-stack)
4. [Data Models](#data-models)
5. [Components & Services](#components--services)
6. [REST API Specification](#rest-api-specification)
7. [Database Schema](#database-schema)
8. [Source Tree Structure](#source-tree-structure)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Error Handling & Logging](#error-handling--logging)
11. [Security Patterns](#security-patterns)
12. [Testing Strategy](#testing-strategy)
13. [Next Steps](#next-steps)

---

## Introduction

This document outlines the backend architecture for **SmartMarket**, an AI-powered business intelligence platform for Bangladesh SMEs. It defines:

- **System design:** Modular monolith + event-driven task queue
- **Technology choices:** Django 4.2 LTS + PostgreSQL + Celery/Redis
- **API contracts:** RESTful JSON endpoints matching frontend expectations
- **Data models:** 10 core entities with relationships
- **Deployment:** Single Railway container + Celery workers
- **Scalability path:** Ready for Phase 2 microservices extraction

**Reference Documents:**
- [PRD (Product Requirements)](./prd.md) - Business requirements & feature specs
- [Frontend Architecture](./frontend-architecture.md) - React SPA design (if created)

---

## High-Level Architecture

### System Overview

SmartMarket backend is a **modular monolithic Django application** with the following characteristics:

```
┌─────────────────────────────────────────────────────┐
│          DJANGO REST API (Monolithic)               │
│  ┌───────────────────────────────────────────────┐  │
│  │  API Layer: gunicorn (8 workers)              │  │
│  │  - /auth/* endpoints                          │  │
│  │  - /data/* endpoints                          │  │
│  │  - /transactions, /products, /customers       │  │
│  │  - /forecasts, /cashflow, /recommendations    │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Business Logic Layer (Services + Models)     │  │
│  │  - Auth Service (JWT, registration)           │  │
│  │  - Data Ingestion Service (CSV parse, OCR)    │  │
│  │  - Forecasting Service (Prophet inference)    │  │
│  │  - Churn Detection Service (RFM scoring)      │  │
│  │  - Recommendation Engine                      │  │
│  │  - CashFlow Projection Service                │  │
│  │  - Admin Operations Service                   │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │  Event/Task Producer (publishes to queue)     │  │
│  │  - Enqueues: transaction.uploaded → Celery    │  │
│  │  - Enqueues: forecast.requested → Celery      │  │
│  │  - Enqueues: recommendation.generated → Task  │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────┘
                   │ (connection pooling, ORM)
                   ↓
        ┌──────────────────────┐
        │    PostgreSQL        │
        │  (Django Models)     │
        │  - Users, Business   │
        │  - Transactions      │
        │  - Products          │
        │  - Customers         │
        │  - Forecasts         │
        │  - Recommendations   │
        │  - AuditLog          │
        └──────────────────────┘

        ┌──────────────────────┐
        │   Redis (Broker)     │
        │  - Celery Message Q  │
        │  - Result Backend    │
        │  - Cache (optional)  │
        └──────────────────────┘
                   ↓
        ┌──────────────────────────────┐
        │  Celery Worker (2-4 workers) │
        │  ┌──────────────────────────┐│
        │  │  transaction.uploaded    ││ → CSV parsing
        │  ├──────────────────────────┤│
        │  │  forecast.requested      ││ → Prophet inference
        │  ├──────────────────────────┤│
        │  │  rfm.recalculate         ││ → Churn scoring
        │  ├──────────────────────────┤│
        │  │  recommendation.generate ││ → Rule engine
        │  └──────────────────────────┘│
        └──────────────────────────────┘
```

### Architectural Patterns

| Pattern | Choice | Rationale |
|---------|--------|-----------|
| **Architectural Style** | Modular Monolith + Event-Driven | Simple to deploy (MVP), clear boundaries for Phase 2 microservices. Async task queue handles long-running ML jobs. |
| **Repository Structure** | Monorepo | Single Django project with domain-organized apps. Easier MVP development. Phase 2: extract to polyrepo. |
| **Service Organization** | Domain-Driven Design (by feature) | Each app (`auth/`, `transactions/`, `forecasting/`) is a domain boundary. Clear interfaces, testable, future-proof. |
| **Task Queue** | Celery + Redis | Handles async processing (CSV, forecasts). Redis for MVP simplicity; upgrade to Kafka Phase 2. |
| **API Style** | RESTful JSON | Stateless, matches frontend expectations. GraphQL deferred to Phase 2. |
| **Data Layer** | Single PostgreSQL | ACID guarantees, scalable, single source of truth. Shard/replicate in Phase 2. |
| **Authentication** | JWT (Bearer tokens) | Stateless, scalable, matches frontend. Refresh token flow for long sessions. |
| **Error Handling** | Structured exceptions + logging | All errors logged to Sentry, failed tasks stored in DB for retry. |
| **Testing** | Pyramid (unit → integration → E2E) | Unit tests for models/services, integration with pytest, E2E via frontend. |

---

## Tech Stack

### Language & Runtime

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Language** | Python | 3.11 | Server-side logic | Mature, ML ecosystem, stable |
| **Framework** | Django | 4.2 LTS | Web application | Industry standard, ORM, long-term support |
| **REST API** | Django REST Framework | 3.14 | API serialization | Clear conventions, validation, filtering |

### Database & Cache

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Primary DB** | PostgreSQL | 14+ | Transactional data | ACID guarantees, JSON support, reliability |
| **ORM** | Django ORM | Built-in | Data access | Native to Django, sufficient for MVP |
| **Cache** | Redis | 7.0+ | Celery broker + caching | Fast, stateless, pub/sub for task queue |

### Async & Background Processing

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Task Queue** | Celery | 5.3 | Async job processing | Mature, distributed, retries, priority queues |
| **Task Broker** | Redis | 7.0+ | Message queue | Simple for MVP, sufficient throughput |
| **Result Backend** | Redis | 7.0+ | Task result storage | Fast in-memory access |

### ML & Data

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Forecasting** | Facebook Prophet | 1.1 | Demand prediction | Battle-tested, seasonality, confidence intervals |
| **Data Manipulation** | Pandas | 2.0 | Data processing | Flexible, fast, industry standard |
| **Validation** | Django Forms | Built-in | Request validation | Integrated, schema-driven |

### Development & Deployment

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **App Server** | gunicorn | 21.2 | WSGI server | Fast, multi-worker, Railway-native |
| **Containerization** | Docker | Latest | Container runtime | Consistent dev → prod |
| **Orchestration** | Docker Compose | 2.x | Local development | Multi-container testing |
| **CI/CD** | GitHub Actions | Latest | Continuous integration | Free, native GitHub, parallelization |
| **Deployment** | Railway | Latest | Managed hosting | Free $5/mo, auto-deploy, includes PostgreSQL/Redis |

### Monitoring & Observability

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Error Tracking** | Sentry | Cloud | Exception monitoring | Stack traces, context, alerts |
| **Logging** | Python logging | Built-in | Application logs | Structured, sent to Sentry |
| **Uptime Monitoring** | Grafana Cloud | Free tier | Health checks | 15-day log retention |

### Testing

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Unit Testing** | pytest | 7.4 | Test framework | Flexible, fixtures, parametrization |
| **Mocking** | pytest-mock, responses | Latest | Mock services/APIs | Easy HTTP mocking |
| **Test Data** | factory-boy | Latest | Data generation | Realistic factories, consistency |
| **Coverage** | pytest-cov | Latest | Code coverage | Target: 70%+ critical paths |

### Code Quality

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **Formatting** | black, isort | Latest | Code style | Consistent, auto-fixable |
| **Linting** | flake8 | Latest | Static analysis | PEP 8 compliance |
| **Type Checking** | mypy | Latest | Type annotations | Catch errors before runtime |
| **Dependency Security** | pip-audit | Latest | Vulnerability scan | CVE detection |

### API Documentation

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| **OpenAPI Schema** | drf-spectacular | 0.26 | API specification | Auto-generates from serializers |
| **Interactive Docs** | Swagger UI / ReDoc | Latest | Documentation | Self-hosted at /api/docs |

---

## Data Models

### Core Entities (Quick Reference)

| Entity | Purpose | Key Fields |
|--------|---------|-----------|
| **User** | Registered SME owner | email, password_hash, first_name, business_id |
| **Business** | SME business account | name, type, user_id, stats |
| **Transaction** | Sales/purchase record | date, product_name, customer_name, amount, business_id |
| **Product** | Inventory item | name, sku, unit_price, current_stock, reorder_point |
| **Customer** | Buyer | name, phone, purchase_metrics (auto-calculated) |
| **ChurnScore** | RFM + risk scoring | recency/frequency/monetary_score, churn_risk_level, risk_reason |
| **Forecast** | Demand prediction (Prophet) | product_id, forecast_data (JSON), accuracy (MAPE), stockout_risk |
| **CashFlowForecast** | Cash balance projection | forecast_data, risk_analysis, recommendations |
| **Recommendation** | AI-generated action | type, urgency, priority_score, action_data, execution_status |
| **AuditLog** | Compliance tracking | action, resource_type, user_id, details, timestamp |
| **FailedJob** | Async job retry tracking | celery_task_id, error_message, attempt_count |

### Entity-Relationship Diagram

```
User (1) ──owns── (1) Business
         │
         └─ has_many ─ AuditLog

Business (1) ──contains── (N) Transaction
         │
         ├─ contains ─ Product
         ├─ contains ─ Customer
         ├─ generates ─ Forecast
         ├─ generates ─ CashFlowForecast
         ├─ generates ─ Recommendation
         └─ tracks ─ FailedJob

Product (1) ──sold_in── (N) Transaction
        │
        └─ predicted_demand ─ Forecast

Customer (1) ──buys_in── (N) Transaction
         │
         └─ has ─ ChurnScore
```

### Key Business Rules

**Data Isolation:**
- All queries must filter by `business_id` (user can only see own business)
- Enforced at serializer + queryset level

**Transaction Processing:**
- Min/max validations: date (past), quantity (1-1000), amount (1-10M TK)
- Auto-create Product if not exists
- Auto-create Customer if not exists
- Duplicate detection: MD5 hash of CSV row

**Forecast Requirements:**
- Minimum 30 historical transactions per product
- If <30: return "Need more data" message
- Prophet auto-handles seasonality, trend, outliers
- MAPE accuracy calculated on validation set

**Churn Detection:**
- RFM normalization by quartile within business
- Churn rules: days_since_purchase > 60 + declining frequency
- Risk levels: low (<0.3), medium (0.3-0.6), high (>0.6)

**Recommendation Generation:**
- **Reorder:** Trigger if stockout predicted ≤7d; Urgency high/medium; Impact 0.8
- **Cash Warning:** Trigger if balance < threshold; Urgency high/medium; Impact 0.9
- **Retention:** Trigger if 3+ customers at_risk; Urgency medium; Impact 0.7
- **Deduplication:** Hash-based, prevent same action twice in 7 days

---

## Components & Services

### 1. Auth Service (`apps/auth/`)

**Responsibility:** User registration, login, JWT token management

**Endpoints:**
- `POST /auth/register` - Create account + business
- `POST /auth/login` - Authenticate, return tokens
- `POST /auth/token/refresh` - Refresh expired access_token
- `GET /business/profile` - Get business + stats

**Core Classes:**
- `User` model with bcrypt password hashing
- `Business` model auto-created on registration
- `TokenProvider` class for JWT generation/validation
- `AuthSerializer` for request/response validation

**Dependencies:**
- bcrypt (password hashing)
- PyJWT (token management)
- PostgreSQL

---

### 2. Data Ingestion Service (`apps/transactions/`)

**Responsibility:** CSV upload, receipt OCR (Phase 2), transaction/product/customer creation

**Endpoints:**
- `POST /data/upload-csv` - Async CSV parsing
- `POST /data/upload-receipt` - Async OCR (Phase 2, mocked MVP)
- `GET /transactions` - Paginated transaction list with filters

**Celery Tasks:**
- `transaction.uploaded(file_id, business_id)` - Parse CSV asynchronously
  - Create Transaction records
  - Auto-create/update Product (update stock)
  - Auto-create/update Customer
  - Trigger: `transaction.parsed` event
  - Trigger: `forecast.requested` event

**Core Classes:**
- `TransactionService` - CRUD + bulk operations
- `CSVParserService` - CSV validation + parsing
- `ProductService` - Inventory management
- `CustomerService` - Customer records

**Error Handling:**
- Invalid row skipping (log, continue)
- Duplicate detection (CSV hash)
- Validation failures → AuditLog + FailedJob

---

### 3. Forecasting Service (`apps/forecasting/`)

**Responsibility:** Demand forecasting (Prophet), cash flow projection

**Endpoints:**
- `GET /forecasts` - List latest forecasts
- `POST /forecasts/request` - Request new forecast (async)
- `GET /cashflow` - Cash balance projection

**Celery Tasks:**
- `forecast.requested(product_ids, forecast_horizon, business_id)` - Run Prophet inference
  - Train Prophet on 30+ days of history
  - Generate predictions (7/14/30 day horizon)
  - Calculate MAPE accuracy
  - Store Forecast record
  - Trigger: `forecast.completed` event
  - Trigger: `recommendation.generated` event

**Core Classes:**
- `ProphetService` - Train, forecast, accuracy calculation
- `ForecastService` - CRUD + bulk operations
- `CashFlowService` - Project balance, detect risk

**Algorithms:**
- Prophet auto-ARIMA, seasonal decomposition
- Confidence intervals (95%)
- Stockout risk: cumulative demand > current_stock
- Cash flow: current_balance + inflows(forecast) - outflows(historical avg)

---

### 4. Customer Analytics Service (`apps/customers/`)

**Responsibility:** RFM scoring, churn detection, customer segmentation

**Endpoints:**
- `GET /customers` - Paginated customer list with RFM/churn data

**Celery Tasks:**
- `rfm.recalculate(business_id)` - Recalculate RFM + churn for all customers
  - Triggered after `transaction.parsed` event
  - Calculate R/F/M scores (1-5 scale)
  - Assign RFM segment (champion/loyal/potential/at_risk/dormant)
  - Calculate churn_risk_score (0-1) + risk_reason
  - Update ChurnScore records

**Core Classes:**
- `RFMService` - RFM calculation, segmentation
- `ChurnService` - Risk scoring, prediction
- `CustomerService` - CRUD + analytics

**Algorithm (RFM):**
```
For each customer:
  Recency: days_since_purchase normalized to [1,5]
    1 = >120 days, 2 = 61-120, 3 = 31-60, 4 = 8-30, 5 = <8
  Frequency: purchase_count normalized by quartile [1,5]
  Monetary: total_spent normalized by quartile [1,5]
  RFM Score = (R + F + M) / 3

  Segments:
    4.7-5.0: Champion (high on all 3)
    3.7-4.7: Loyal
    2.7-3.7: Potential
    1.7-2.7: At-Risk
    <1.7: Dormant

  Churn Risk:
    score = (days_since_purchase / 365) + (if declining_frequency: +0.3)
    capped at 1.0

    Levels:
      <0.3: low
      0.3-0.6: medium
      >0.6: high
```

---

### 5. Recommendation Engine (`apps/recommendations/`)

**Responsibility:** Generate actionable recommendations from forecasts, churn, cash flow

**Endpoints:**
- `GET /recommendations` - Paginated, prioritized recommendation list
- `POST /recommendations/{id}/view` - Mark recommendation as viewed
- `POST /recommendations/{id}/execute` - User executes recommendation

**Celery Tasks:**
- `recommendation.generated(business_id)` - Generate all recommendations
  - Triggered after `forecast.completed` event
  - Apply business rules (reorder, cash_warning, retention)
  - Calculate priority = urgency × impact
  - Deduplicate (prevent same action twice in 7 days)
  - Create Recommendation records
  - Optional: Enqueue notification tasks (Phase 2)

**Core Classes:**
- `RecommendationService` - Generation, prioritization, execution
- `RecommendationRules` - Business logic for each type
- `RecommendationSerializer` - Request/response validation

**Recommendation Types:**

| Type | Trigger | Urgency | Impact | Example |
|------|---------|---------|--------|---------|
| **reorder** | Stockout ≤7d | high (0-3d) / medium (3-7d) | 0.8 | "Reorder 20 Shirts by Nov 10" |
| **cash_warning** | Balance < threshold | high (7d) / medium (8-30d) | 0.9 | "Balance drops to ৳8K on Nov 18" |
| **retention** | 3+ customers at_risk | medium | 0.7 | "Contact 5 at-risk customers" |
| **price_optimization** | High demand, low stock | medium | 0.6 | "Consider raising price" (Phase 2) |

---

### 6. Admin Operations Service (`apps/adminops/`)

**Responsibility:** Demo data seeding, health checks, job retry, audit logging

**Endpoints:**
- `GET /admin/health` - Service health (db, redis, workers)
- `GET /admin/users` - User/business list (admin only)
- `POST /admin/demo/seed` - Seed demo dataset
- `POST /admin/demo/reset` - Reset demo data
- `GET /admin/jobs` - Failed job list
- `POST /admin/jobs/{id}/retry` - Retry failed job
- `GET /admin/audit` - Audit log viewer

**Features:**
- **Health Check:** Ping PostgreSQL, Redis, Celery workers
- **Demo Seeding:** Faker-generated 6-month dataset
- **Job Management:** Inspect failed Celery tasks, manual retry
- **Audit Viewer:** Filter by user, action, timestamp

---

## REST API Specification

### Base URL

```
Development: http://localhost:8000/api
Production: https://smartmarket-api.railway.app/api
```

### Authentication

All protected endpoints require Bearer token in `Authorization` header:

```
Authorization: Bearer {access_token}
```

Token flow:
1. Login: `POST /auth/login` → returns `access_token` + `refresh_token`
2. All requests: Include `Authorization: Bearer {access_token}`
3. If 401: `POST /auth/token/refresh` → new `access_token`
4. If refresh fails → redirect to login

### Response Format

**Success (2xx):**
```json
{
  "status": "success",
  "data": { /* actual response */ },
  "timestamp": "2025-11-03T10:30:00Z",
  "request_id": "uuid"
}
```

**Error (4xx/5xx):**
```json
{
  "status": "error",
  "error_code": "ENUM_ERROR_CODE",
  "message": "User-friendly message",
  "details": { /* technical details */ },
  "suggestions": ["How to fix", "Alternative action"]
}
```

### Endpoints

#### Authentication (4 endpoints)

**1. POST /auth/register**

Register new SME user.

```
Request:
{
  "email": "owner@shop.bd",
  "password": "SecurePass123",
  "first_name": "Ali",
  "business_name": "Ali's Tea Shop",
  "business_type": "restaurant",
  "language": "bn"  // or "en"
}

Response [201]:
{
  "status": "success",
  "data": {
    "user": { "id": 1, "email": "owner@shop.bd", "first_name": "Ali", ... },
    "business": { "id": 1, "name": "Ali's Tea Shop", "type": "restaurant", ... },
    "tokens": { "access_token": "jwt...", "refresh_token": "jwt...", "expires_in": 3600 }
  }
}

Errors:
[409] Email already registered
[400] Validation failed (password too weak, invalid email, etc.)
```

**2. POST /auth/login**

Authenticate user, return JWT tokens.

```
Request:
{
  "email": "owner@shop.bd",
  "password": "SecurePass123"
}

Response [200]:
{
  "status": "success",
  "data": {
    "user": { "id": 1, "email": "...", ... },
    "access_token": "jwt...",
    "refresh_token": "jwt...",
    "expires_in": 3600
  }
}

Errors:
[401] Invalid credentials
[429] Too many login attempts
```

**3. POST /auth/token/refresh**

Refresh expired access token.

```
Request:
{
  "refresh_token": "jwt..."
}

Response [200]:
{
  "status": "success",
  "data": {
    "access_token": "jwt...",
    "expires_in": 3600
  }
}

Errors:
[401] Invalid or expired refresh token
```

**4. GET /business/profile**

Get authenticated user's business profile + stats.

```
Headers: Authorization: Bearer {access_token}

Response [200]:
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Ali's Tea Shop",
    "type": "restaurant",
    "phone_number": "+880123456789",
    "city": "Dhaka",
    "stats": {
      "products": 12,
      "customers": 45,
      "total_transactions": 1250,
      "total_revenue": 450000,
      "last_transaction_date": "2025-11-03"
    },
    "data_sources": ["csv", "receipt_ocr"],
    "is_demo": false
  }
}

Errors:
[401] Not authenticated
```

#### Data Ingestion (2 endpoints)

**5. POST /data/upload-csv**

Upload CSV sales ledger. Async processing.

```
Headers:
  Authorization: Bearer {access_token}
  Content-Type: multipart/form-data

Body:
  file: <binary CSV file>
  data_source_name: "May 2025 Sales" (optional)

Response [202 ACCEPTED]:
{
  "status": "pending",
  "data": {
    "message": "Processing file...",
    "file_id": "uuid",
    "file_name": "sales_may_2025.csv",
    "rows_detected": 156,
    "estimated_processing_time": 5
  }
}

Errors:
[400] Invalid CSV format (missing columns, invalid delimiters)
[413] File > 10 MB
[429] Too many uploads (rate limited)

CSV Format Expected:
  Date,Product,Quantity,Amount[,Customer][,Payment Method]
  2025-10-01,Shirt,2,600,Ali,Cash
  2025-10-02,Pants,1,1200,,bKash
```

**6. POST /data/upload-receipt**

Upload receipt image. Async OCR processing (Phase 2, mocked MVP).

```
Headers:
  Authorization: Bearer {access_token}
  Content-Type: multipart/form-data

Body:
  image: <binary JPG/PNG, max 5MB>
  receipt_date: "2025-11-03" (optional)

Response [202 ACCEPTED]:
{
  "status": "pending",
  "data": {
    "message": "Extracting receipt data...",
    "image_id": "uuid",
    "estimated_processing_time": 10
  }
}

Errors:
[400] Invalid image format
[413] File > 5 MB
```

#### Transactions (1 endpoint)

**7. GET /transactions**

List transactions with filters.

```
Headers: Authorization: Bearer {access_token}

Query Params:
  limit: 50 (default, max 100)
  offset: 0 (pagination)
  product_id: 5 (filter by product)
  date_from: "2025-10-01" (filter by date range)
  date_to: "2025-11-03"
  payment_method: "cash|bkash|nagad|rocket|card|credit|other" (filter)
  sort: "date|amount" (field to sort)
  order: "asc|desc" (direction)

Response [200]:
{
  "status": "success",
  "data": {
    "count": 1250,
    "next": "/api/transactions?offset=50",
    "previous": null,
    "results": [
      {
        "id": 1,
        "date": "2025-11-03T14:30:00Z",
        "product_name": "Shirt",
        "quantity": 2,
        "amount": 600,
        "customer_name": "Fatema",
        "payment_method": "cash"
      },
      ...
    ],
    "summary": {
      "total_revenue": 45000,
      "average_value": 360,
      "transaction_count": 50
    }
  }
}

Errors:
[401] Not authenticated
[400] Invalid query params
```

#### Products (1 endpoint)

**8. GET /products**

List products with stock status and forecasts.

```
Headers: Authorization: Bearer {access_token}

Query Params:
  limit: 20 (default)
  offset: 0
  low_stock_only: true (show only items below reorder point)
  sort: "name|stock|sales_7d" (field)
  order: "asc|desc"

Response [200]:
{
  "status": "success",
  "data": {
    "count": 12,
    "results": [
      {
        "id": 1,
        "name": "Basmati Rice",
        "sku": "RIC-001",
        "unit_price": 120,
        "current_stock": 5,
        "reorder_point": 20,
        "is_low_stock": true,
        "sales_metrics": {
          "sales_7d": 25,
          "sales_30d": 89,
          "avg_daily": 3.0,
          "last_sale": "2025-11-03T14:30:00Z"
        },
        "forecast": {
          "id": 42,
          "forecast_date": "2025-11-03",
          "next_7d_demand": 28,
          "stockout_predicted": true,
          "days_until_stockout": 2
        }
      },
      ...
    ]
  }
}

Errors:
[401] Not authenticated
```

#### Customers (1 endpoint)

**9. GET /customers**

List customers with RFM + churn analysis.

```
Headers: Authorization: Bearer {access_token}

Query Params:
  limit: 20
  offset: 0
  churn_risk_only: true (show only at-risk + dormant)
  sort: "name|total_spent|days_since|churn_score"
  order: "asc|desc"

Response [200]:
{
  "status": "success",
  "data": {
    "count": 45,
    "results": [
      {
        "id": 1,
        "name": "Fatema",
        "phone": "+880123456789",
        "email": "fatema@example.com",
        "purchase_metrics": {
          "total_spent": 45000,
          "purchase_count": 35,
          "last_purchase": "2025-11-02T10:00:00Z",
          "days_since": 1,
          "avg_value": 1286
        },
        "churn_analysis": {
          "rfm_segment": "champion",
          "churn_risk_score": 0.05,
          "churn_risk_level": "low",
          "risk_reason": "Recent and frequent buyer"
        }
      },
      ...
    ],
    "summary": {
      "champions": 8,
      "at_risk": 5,
      "dormant": 2
    }
  }
}

Errors:
[401] Not authenticated
```

#### Forecasts (2 endpoints)

**10. GET /forecasts**

List demand forecasts.

```
Headers: Authorization: Bearer {access_token}

Query Params:
  limit: 20
  offset: 0
  has_stockout_warning: true (show only forecasts predicting stockout)
  sort: "product_name|stockout_risk"
  order: "asc|desc"

Response [200]:
{
  "status": "success",
  "data": {
    "count": 12,
    "results": [
      {
        "id": 1,
        "product": { "id": 1, "name": "Basmati Rice" },
        "forecast_date": "2025-11-03",
        "forecast_days": 7,
        "predicted_demand": [
          { "date": "2025-11-04", "quantity": 3, "confidence": 0.95 },
          { "date": "2025-11-05", "quantity": 4, "confidence": 0.93 },
          ...
        ],
        "summary": {
          "total_demand": 28,
          "avg_daily": 4.0,
          "peak_date": "2025-11-07",
          "peak_qty": 6
        },
        "stockout_risk": {
          "will_stockout": true,
          "days_until_stockout": 2,
          "confidence": 0.88,
          "recommendation": "Reorder by 2025-11-05"
        },
        "accuracy": {
          "mape": 12.5,
          "data_points_used": 45
        }
      },
      ...
    ]
  }
}

Errors:
[401] Not authenticated
[400] Invalid query params
```

**11. POST /forecasts/request**

Request new forecast generation (async).

```
Headers: Authorization: Bearer {access_token}

Request:
{
  "product_ids": [1, 2, 3],  // optional, all if omitted
  "forecast_days": 7,         // or 14, 30
  "force_regenerate": false   // force even if exists
}

Response [202 ACCEPTED]:
{
  "status": "pending",
  "data": {
    "message": "Generating forecasts...",
    "product_count": 3,
    "forecast_days": 7,
    "estimated_processing_time": 15
  }
}

Errors:
[401] Not authenticated
[400] Invalid params or invalid forecast_days
[429] Rate limited (10 requests/day per business)
```

#### Cash Flow (1 endpoint)

**12. GET /cashflow**

Get cash balance projection.

```
Headers: Authorization: Bearer {access_token}

Query Params:
  projection_days: 30 (or 7, 90, default 30)

Response [200]:
{
  "status": "success",
  "data": {
    "forecast": {
      "current_balance": 95000,
      "projected_balance": [
        {
          "date": "2025-11-04",
          "inflows": 12000,
          "outflows": 8500,
          "balance": 98500
        },
        ...
      ],
      "summary": {
        "avg_daily_balance": 85000,
        "min_balance": 18500,
        "max_balance": 105000
      }
    },
    "risk_analysis": {
      "risk_level": "high",
      "risk_score": 0.78,
      "warning": "Balance drops below critical threshold (৳20K) on 2025-11-18",
      "critical_date": "2025-11-18",
      "critical_threshold": 20000
    },
    "recommendations": [
      {
        "type": "reduce_expenses",
        "urgency": "high",
        "impact": 0.8,
        "description": "Reduce expenses by 10% to stay above threshold"
      },
      {
        "type": "accelerate_collections",
        "urgency": "high",
        "impact": 0.7,
        "description": "Collect outstanding payments from customers"
      }
    ]
  }
}

Errors:
[401] Not authenticated
```

#### Recommendations (3 endpoints)

**13. GET /recommendations**

List recommendations, prioritized.

```
Headers: Authorization: Bearer {access_token}

Query Params:
  limit: 20
  offset: 0
  status: "pending|viewed|executed|dismissed"
  type: "reorder|cash_warning|retention|price_optimization"
  urgency: "high|medium|low"
  sort: "priority_score|created_at" (default: priority descending)

Response [200]:
{
  "status": "success",
  "data": {
    "count": 5,
    "results": [
      {
        "id": 1,
        "title": "Reorder Basmati Rice",
        "description": "Stock ending in 2 days. Current: 5 units. Predicted demand: 28 units.",
        "type": "reorder",
        "urgency": "high",
        "priority_score": 0.88,
        "action_data": {
          "product_id": 1,
          "product_name": "Basmati Rice",
          "current_stock": 5,
          "recommended_qty": 25,
          "reorder_by_date": "2025-11-05"
        },
        "engagement": {
          "is_viewed": true,
          "viewed_at": "2025-11-03T14:00:00Z",
          "is_executed": false,
          "executed_at": null,
          "view_duration_seconds": 45
        },
        "created_at": "2025-11-03T10:30:00Z"
      },
      ...
    ],
    "summary": {
      "total_pending": 3,
      "high_urgency_count": 2,
      "estimated_impact": 0.85
    }
  }
}

Errors:
[401] Not authenticated
```

**14. POST /recommendations/{id}/view**

Mark recommendation as viewed.

```
Headers: Authorization: Bearer {access_token}

Request:
{
  "view_duration_seconds": 45  // optional
}

Response [200]:
{
  "status": "success",
  "data": {
    "message": "Recommendation viewed",
    "recommendation": { ... }
  }
}

Errors:
[401] Not authenticated
[404] Recommendation not found
```

**15. POST /recommendations/{id}/execute**

Execute recommendation.

```
Headers: Authorization: Bearer {access_token}

Request:
{
  "confirmation": true,
  "modified_action": { /* optional user modifications */ }
}

Response [200]:
{
  "status": "success",
  "data": {
    "message": "Action executed",
    "recommendation": { ... },
    "side_effects": {
      "rfq_created": false,
      "sms_queued": false,
      "note": "Phase 2: would create RFQ / send SMS"
    },
    "next_steps": "You can monitor inventory from the Products page"
  }
}

Errors:
[401] Not authenticated
[404] Not found
[409] Already executed
```

#### Admin Endpoints (6 endpoints, internal only)

**16. GET /admin/health**

Service health check.

```
Response [200]:
{
  "status": "success",
  "data": {
    "services": {
      "database": "ok",
      "redis": "ok",
      "celery_workers": "ok"
    },
    "timestamp": "2025-11-03T10:30:00Z"
  }
}

Response [503]:
{
  "status": "error",
  "error_code": "SERVICE_DEGRADED",
  "message": "Redis connection failed",
  "details": { ... }
}
```

**17-22. Additional Admin Endpoints**

- `GET /admin/users` - List users + businesses
- `POST /admin/demo/seed` - Seed demo dataset
- `POST /admin/demo/reset` - Reset demo data
- `GET /admin/jobs` - List failed jobs
- `POST /admin/jobs/{id}/retry` - Retry failed job
- `GET /admin/audit` - View audit logs

---

## Database Schema

### PostgreSQL DDL

```sql
-- Users table
CREATE TABLE auth_user (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    business_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    language_preference VARCHAR(2) DEFAULT 'bn',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_email ON auth_user(email);
CREATE INDEX idx_user_business ON auth_user(business_id);

-- Business table
CREATE TABLE auth_business (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20),
    city VARCHAR(100),
    description TEXT,
    monthly_revenue_estimate DECIMAL(12,2),
    employee_count INTEGER,
    is_demo BOOLEAN DEFAULT FALSE,
    demo_seed_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE
);
CREATE INDEX idx_business_is_demo ON auth_business(is_demo);

-- Transactions table
CREATE TABLE transactions_transaction (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    date TIMESTAMP NOT NULL,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    customer_id INTEGER,
    customer_name VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    csv_import_hash VARCHAR(32),
    data_source VARCHAR(50),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES transactions_product(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES transactions_customer(id) ON DELETE SET NULL
);
CREATE INDEX idx_transaction_business_date ON transactions_transaction(business_id, date);
CREATE INDEX idx_transaction_business_product ON transactions_transaction(business_id, product_id);
CREATE INDEX idx_transaction_business_customer ON transactions_transaction(business_id, customer_id);
CREATE UNIQUE INDEX idx_transaction_csv_hash ON transactions_transaction(business_id, csv_import_hash) WHERE csv_import_hash IS NOT NULL;

-- Products table
CREATE TABLE transactions_product (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    unit_price DECIMAL(10,2) NOT NULL,
    current_stock INTEGER DEFAULT 0,
    reorder_point INTEGER,
    last_stock_update TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE
);
CREATE INDEX idx_product_business ON transactions_product(business_id);
CREATE INDEX idx_product_business_active ON transactions_product(business_id, is_active);

-- Customers table
CREATE TABLE transactions_customer (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE
);
CREATE INDEX idx_customer_business ON transactions_customer(business_id);

-- Churn Scores table
CREATE TABLE customers_churnscore (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL UNIQUE,
    recency_score INTEGER CHECK (recency_score BETWEEN 1 AND 5),
    frequency_score INTEGER CHECK (frequency_score BETWEEN 1 AND 5),
    monetary_score INTEGER CHECK (monetary_score BETWEEN 1 AND 5),
    rfm_segment VARCHAR(50),
    churn_risk_score DECIMAL(3,2) CHECK (churn_risk_score BETWEEN 0 AND 1),
    churn_risk_level VARCHAR(50),
    risk_reason TEXT,
    last_recalculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES transactions_customer(id) ON DELETE CASCADE
);
CREATE INDEX idx_churnscore_business ON customers_churnscore(business_id);
CREATE INDEX idx_churnscore_risk_level ON customers_churnscore(business_id, churn_risk_level);

-- Forecasts table
CREATE TABLE forecasting_forecast (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    forecast_date TIMESTAMP NOT NULL,
    forecast_horizon_days INTEGER,
    forecast_data JSONB NOT NULL,
    summary JSONB,
    stockout_risk JSONB,
    accuracy JSONB,
    model_version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES transactions_product(id) ON DELETE CASCADE
);
CREATE INDEX idx_forecast_business ON forecasting_forecast(business_id);
CREATE INDEX idx_forecast_product ON forecasting_forecast(business_id, product_id);
CREATE INDEX idx_forecast_status ON forecasting_forecast(status);

-- Cash Flow Forecasts table
CREATE TABLE forecasting_cashflowforecast (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    forecast_date TIMESTAMP NOT NULL,
    projection_days INTEGER,
    current_balance DECIMAL(12,2),
    forecast_data JSONB NOT NULL,
    risk_analysis JSONB,
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE
);
CREATE INDEX idx_cashflow_business ON forecasting_cashflowforecast(business_id);

-- Recommendations table
CREATE TABLE recommendations_recommendation (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    urgency VARCHAR(50),
    priority_score DECIMAL(3,2),
    action_data JSONB,
    engagement JSONB DEFAULT '{"is_viewed": false, "is_executed": false}',
    generated_by VARCHAR(50),
    deduplication_key VARCHAR(255),
    expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE
);
CREATE INDEX idx_recommendation_business ON recommendations_recommendation(business_id);
CREATE INDEX idx_recommendation_status ON recommendations_recommendation(business_id, status);
CREATE INDEX idx_recommendation_type ON recommendations_recommendation(type);
CREATE INDEX idx_recommendation_priority ON recommendations_recommendation(business_id, priority_score DESC);

-- Audit Logs table
CREATE TABLE adminops_auditlog (
    id SERIAL PRIMARY KEY,
    business_id INTEGER,
    user_id INTEGER,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id INTEGER,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE SET NULL
);
CREATE INDEX idx_auditlog_business ON adminops_auditlog(business_id);
CREATE INDEX idx_auditlog_user ON adminops_auditlog(user_id);
CREATE INDEX idx_auditlog_action ON adminops_auditlog(action);
CREATE INDEX idx_auditlog_created ON adminops_auditlog(created_at DESC);

-- Failed Jobs table
CREATE TABLE adminops_failedjob (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL,
    celery_task_id VARCHAR(255) UNIQUE NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    task_args JSONB,
    task_kwargs JSONB,
    error_type VARCHAR(255),
    error_message TEXT,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    status VARCHAR(50) DEFAULT 'failed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempted_at TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES auth_business(id) ON DELETE CASCADE
);
CREATE INDEX idx_failedjob_business ON adminops_failedjob(business_id);
CREATE INDEX idx_failedjob_status ON adminops_failedjob(status);
CREATE INDEX idx_failedjob_task_id ON adminops_failedjob(celery_task_id);
```

### Migrations Strategy

```bash
# Initial migration
python manage.py makemigrations

# Apply to database
python manage.py migrate

# Create backup before changes
pg_dump smartmarket > backup.sql
```

---

## Source Tree Structure

```
smartmarket-backend/
│
├── smartmarket/                    # Django project settings
│   ├── __init__.py
│   ├── settings.py                # Main Django config (DB, Redis, Celery, auth)
│   ├── urls.py                    # Root URL routing
│   ├── wsgi.py                    # WSGI entry point for gunicorn
│   ├── asgi.py                    # ASGI (future WebSocket support)
│   └── celery.py                  # Celery app config + task scheduling
│
├── apps/                           # Domain-specific Django apps
│   │
│   ├── auth/                       # User authentication & authorization
│   │   ├── __init__.py
│   │   ├── models.py              # User, Business models
│   │   ├── views.py               # Register, Login, Refresh, Profile views
│   │   ├── serializers.py         # UserSerializer, BusinessSerializer
│   │   ├── services.py            # AuthService class
│   │   ├── urls.py                # /auth/* routes
│   │   ├── permissions.py         # Custom permission classes
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── test_register.py
│   │       ├── test_login.py
│   │       └── test_permissions.py
│   │
│   ├── transactions/               # Data ingestion (CSV, receipts)
│   │   ├── __init__.py
│   │   ├── models.py              # Transaction, Product, Customer models
│   │   ├── views.py               # Upload CSV, Upload Receipt, List Transactions
│   │   ├── serializers.py         # TransactionSerializer, ProductSerializer
│   │   ├── services.py            # CSVParserService, TransactionService, etc.
│   │   ├── tasks.py               # Celery tasks: transaction.uploaded, etc.
│   │   ├── urls.py                # /data/*, /transactions, /products routes
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── test_csv_upload.py
│   │       ├── test_product_creation.py
│   │       └── test_duplicate_detection.py
│   │
│   ├── forecasting/                # Demand & cash flow forecasting
│   │   ├── __init__.py
│   │   ├── models.py              # Forecast, CashFlowForecast models
│   │   ├── views.py               # GET /forecasts, POST /forecasts/request, GET /cashflow
│   │   ├── serializers.py         # ForecastSerializer, CashFlowSerializer
│   │   ├── services.py            # ForecastService, CashFlowService, etc.
│   │   ├── tasks.py               # Celery tasks: forecast.requested, etc.
│   │   ├── urls.py                # /forecasts/*, /cashflow routes
│   │   ├── ml/
│   │   │   ├── prophet_model.py   # Prophet training & inference
│   │   │   └── cash_flow_model.py # Cash flow projection logic
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── test_forecast_generation.py
│   │       ├── test_cash_flow_projection.py
│   │       └── test_forecast_accuracy.py
│   │
│   ├── customers/                  # Customer analytics & churn detection
│   │   ├── __init__.py
│   │   ├── models.py              # Customer, ChurnScore models
│   │   ├── views.py               # GET /customers
│   │   ├── serializers.py         # CustomerSerializer, ChurnScoreSerializer
│   │   ├── services.py            # RFMService, ChurnService, etc.
│   │   ├── tasks.py               # Celery tasks: rfm.recalculate, etc.
│   │   ├── urls.py                # /customers routes
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── test_rfm_scoring.py
│   │       ├── test_churn_detection.py
│   │       └── test_segmentation.py
│   │
│   ├── recommendations/            # Action recommendation engine
│   │   ├── __init__.py
│   │   ├── models.py              # Recommendation model
│   │   ├── views.py               # GET /recommendations, POST /execute
│   │   ├── serializers.py         # RecommendationSerializer
│   │   ├── services.py            # RecommendationService, etc.
│   │   ├── tasks.py               # Celery tasks: recommendation.generated, etc.
│   │   ├── rules.py               # Business rules for recommendation generation
│   │   ├── urls.py                # /recommendations/* routes
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── test_reorder_recommendations.py
│   │       ├── test_cash_warnings.py
│   │       ├── test_retention_recommendations.py
│   │       └── test_recommendation_prioritization.py
│   │
│   ├── adminops/                   # Admin console & operations
│   │   ├── __init__.py
│   │   ├── models.py              # AuditLog, FailedJob models
│   │   ├── views.py               # /admin/* endpoints
│   │   ├── serializers.py         # AdminSerializer classes
│   │   ├── services.py            # AdminService, HealthService, JobService
│   │   ├── urls.py                # /admin/* routes
│   │   ├── management/
│   │   │   └── commands/
│   │   │       ├── seed_demo.py   # `python manage.py seed_demo` command
│   │   │       └── reset_demo.py  # `python manage.py reset_demo` command
│   │   ├── migrations/
│   │   └── tests/
│   │       ├── test_demo_seeding.py
│   │       ├── test_health_check.py
│   │       └── test_job_retry.py
│   │
│   ├── notifications/              # SMS, WhatsApp, Email (Phase 2)
│   │   ├── __init__.py
│   │   ├── models.py              # NotificationLog model
│   │   ├── services.py            # NotificationService (mocked MVP)
│   │   ├── tasks.py               # Celery tasks: send_sms, send_whatsapp (Phase 2)
│   │   ├── templates/             # SMS/Email templates
│   │   └── migrations/
│   │
│   └── core/                       # Shared utilities
│       ├── __init__.py
│       ├── models.py              # BaseModel (auto timestamps)
│       ├── permissions.py         # IsBusinessOwner, custom permissions
│       ├── exceptions.py          # Custom exception classes
│       ├── constants.py           # Status choices, task topics, error codes
│       ├── utils.py               # Helper functions (validation, formatting)
│       ├── pagination.py          # Custom pagination classes
│       ├── filters.py             # DRF filter backends
│       └── tests/
│           └── test_utils.py
│
├── events/                         # Event/task definitions
│   ├── __init__.py
│   ├── topics.py                  # Task topic constants (transaction.uploaded, etc.)
│   ├── schemas.py                 # Event schema definitions (Pydantic)
│   └── adapter.py                 # publish_event() adapter (Celery + future Kafka)
│
├── workers/                        # Background worker helpers
│   ├── __init__.py
│   └── base.py                    # Base task/worker helpers
│
├── middleware/                     # Custom middleware
│   ├── __init__.py
│   ├── auth_middleware.py         # JWT token validation
│   └── error_middleware.py        # Global error handling
│
├── tests/                          # Top-level test utilities
│   ├── conftest.py                # Pytest fixtures (db, user, business, etc.)
│   ├── factories.py               # Factory classes for test data
│   ├── fixtures.py                # Shared test data
│   └── test_integration.py        # End-to-end integration tests
│
├── docker-compose.yml             # Local dev: Django + PostgreSQL + Redis + Celery
├── Dockerfile                     # Multi-stage build for gunicorn + worker
├── .dockerignore                  # Exclude from Docker context
├── .github/
│   └── workflows/
│       └── deploy.yml             # GitHub Actions CI/CD pipeline
├── Procfile                       # Railway deployment config
├── requirements.txt               # Python dependencies (pip)
├── requirements-dev.txt           # Dev dependencies (pytest, black, etc.)
├── manage.py                      # Django management script
├── .env.example                   # Environment variable template
├── README.md                      # Setup & deployment instructions
├── CONTRIBUTING.md                # Development guidelines
└── LICENSE                        # Project license
```

---

## Deployment & Infrastructure

### Local Development Setup

**Prerequisites:**
- Docker + Docker Compose
- Python 3.11 (optional, for IDE support)
- Git

**Start Local Stack:**

```bash
cd smartmarket-backend
docker-compose up
```

This starts:
- Django (port 8000)
- PostgreSQL (port 5432)
- Redis (port 6379)
- Celery worker (background)

**Access:**
- API: http://localhost:8000/api
- API Docs: http://localhost:8000/api/docs
- Django Admin: http://localhost:8000/admin (user: admin, pass: admin)

### Production Deployment (Railway)

**Environment Variables (Railway Secrets):**

```
DJANGO_SECRET_KEY=<generate new uuid>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=smartmarket-api.railway.app

DATABASE_URL=postgresql://user:pass@host:5432/smartmarket
REDIS_URL=redis://host:port

SENTRY_DSN=https://...@sentry.io/...

CORS_ALLOWED_ORIGINS=https://smartmarket.vercel.app

JWT_SECRET=<secret for token signing>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_LIFETIME=3600
JWT_REFRESH_TOKEN_LIFETIME=2592000
```

**Deployment Process:**

1. **GitHub Actions CI/CD Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
      - run: pip install -r requirements.txt
      - run: pytest tests/
      - run: black --check .
      - run: flake8 .

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v4
      - run: docker tag smartmarket ghcr.io/user/smartmarket:latest
      - run: docker push ghcr.io/user/smartmarket:latest

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: railway up --detach
```

2. **Railway Configuration:**

```yaml
# Procfile
web: gunicorn smartmarket.wsgi:application --workers 8 --bind 0.0.0.0:$PORT
worker: celery -A smartmarket worker --loglevel=info
```

3. **Auto-Deploy:**
   - Push to `main` branch
   - GitHub Actions tests + builds
   - Railway auto-deploys on successful build

### Environments

| Environment | Purpose | Database | Redis | Workers |
|-------------|---------|----------|-------|---------|
| **Development** | Local testing | SQLite or postgres:latest (docker) | docker redis:latest | docker celery |
| **Staging** | QA & pre-release | Railway PostgreSQL | Railway Redis | 1 Celery worker |
| **Production** | Live users | Railway PostgreSQL (backup hourly) | Railway Redis (256MB) | 2-4 Celery workers |

### Environment Promotion Flow

```
Code Commit
    ↓
GitHub Actions (test, lint, build)
    ↓
Docker Image Build & Push to GHCR
    ↓
Railway Auto-Deploy (if main branch)
    ↓
Production: smartmarket-api.railway.app
```

### Rollback Strategy

**Primary Method:** Re-deploy previous commit

```bash
git revert <bad-commit-hash>
git push main  # Auto-triggers CI/CD → rollback
```

**Trigger Conditions:**
- 500+ error rate spike
- Data corruption detected
- Critical functionality broken

**Recovery Time Objective (RTO):** <5 minutes

---

## Error Handling & Logging

### Exception Hierarchy

```python
# core/exceptions.py
CustomException (base)
├── AuthenticationError
│   ├── InvalidCredentialsError
│   └── TokenExpiredError
├── ValidationError
│   ├── InvalidCSVFormatError
│   └── InsufficientDataError
├── BusinessLogicError
│   ├── StockoutWarningError
│   └── DuplicateTransactionError
└── ExternalServiceError
    ├── ProphetInferenceError
    └── OCRServiceError
```

### Logging Standards

**Library:** Python `logging` module (integrated with Sentry)

**Log Levels:**
- `DEBUG` - Variable values, flow tracing (dev only)
- `INFO` - Major events (user login, CSV uploaded, forecast completed)
- `WARNING` - Recoverable issues (retry attempt, rate limit approaching)
- `ERROR` - Unrecoverable issues (database error, external API down)
- `CRITICAL` - System failure (Redis down, PostgreSQL down)

**Log Format:**
```
[%(asctime)s] %(levelname)s [%(name)s] %(message)s
```

**Structured Logging (Context):**
```python
import logging

logger = logging.getLogger(__name__)

logger.info(
    "CSV uploaded successfully",
    extra={
        "user_id": user.id,
        "business_id": business.id,
        "file_name": filename,
        "row_count": 150,
        "processing_time_ms": 2500
    }
)
```

### Error Handling Patterns

**External API Calls (Retry Policy):**
- Retry 3x with exponential backoff (5s, 25s, 125s)
- Circuit breaker after 10 consecutive failures
- Timeout: 30 seconds
- Error translation: Map external errors to domain errors

**Business Logic Errors (Handled):**
- Validate inputs before processing
- Raise custom exceptions (InvalidCSVFormatError, etc.)
- Return user-friendly error messages
- Log stack trace for debugging

**Data Consistency (Transactions):**
- Use Django `@transaction.atomic()` decorator
- Rollback on error
- Compensation logic for distributed transactions (Phase 2)
- Idempotent operations for failed job retry

**Task Queue Error Handling:**
```python
# tasks.py
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def process_csv_upload(self, file_id, business_id):
    try:
        # ... processing logic ...
    except Exception as exc:
        logger.error(f"Task failed: {exc}", exc_info=True)
        # Auto-retry with exponential backoff
        raise self.retry(exc=exc, countdown=300 * (2 ** self.request.retries))
```

### Monitoring & Alerting

**Sentry Integration:**
- Capture all unhandled exceptions
- Context: user_id, business_id, request_id
- Alert on error rate >1%
- Track issue trends

**Health Check Endpoint:**
```
GET /health
Response [200]: { "status": "ok", "services": { "db": "ok", "redis": "ok", "workers": "ok" } }
Response [503]: { "status": "error", "failed_service": "redis" }
```

**Logging to Sentry:**
```python
import sentry_sdk

sentry_sdk.capture_exception(exc)
sentry_sdk.capture_message("Business event", level="info")
```

---

## Security Patterns

### Input Validation

**Location:** Serializers (DRF) + Model validation

**Rules:**
- Email: Format validation (RFC 5322)
- Password: Min 8 chars, not common passwords (Django defaults)
- CSV: File size <10MB, valid delimiter, required columns
- Dates: ISO 8601 format, not future-dated
- Numbers: Positive, reasonable ranges (quantity <1000, amount <10M)
- Usernames/names: No SQL injection patterns, safe characters only

**Framework:** Django Forms + DRF Serializers + Pydantic (future)

### Authentication & Authorization

**JWT Tokens:**
- `access_token`: Lifetime 1 hour
- `refresh_token`: Lifetime 30 days
- Signature algorithm: HS256 (HMAC-SHA256)
- Storage: Frontend localStorage (secure by HTTPS)

**Data Isolation:**
- All queries: `filter(business_id=user.business_id)`
- Enforced at serializer + queryset level
- Permission class: `IsBusinessOwner` (custom)

**Admin Access:**
- Separate `is_staff` flag (Django built-in)
- Admin endpoints require staff status
- 2FA: Planned for Phase 2 production

### Secrets Management

**Development:**
- `.env` file (git-ignored)
- Environment variables loaded via `python-decouple`

**Production:**
- Railway Secrets (encrypted)
- Never hardcode secrets
- No secrets in logs or error messages
- Rotation plan: Phase 2

**Example:**
```python
# settings.py
from decouple import config

SECRET_KEY = config('DJANGO_SECRET_KEY')
DATABASE_URL = config('DATABASE_URL')
SENTRY_DSN = config('SENTRY_DSN', default=None)
```

### API Security

**Rate Limiting:**
- 100 requests/min per user (generous for MVP)
- 10 forecast requests/day per business
- File uploads: Max 10MB CSV, 5MB receipt image

**CORS Policy:**
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "https://smartmarket.vercel.app",
    "https://www.smartmarket.vercel.app",
]
```

**Security Headers:**
```python
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

**HTTPS Enforcement:**
- Production: HTTPS only
- Development: HTTP allowed (localhost)

### Data Protection

**Encryption at Rest:**
- PostgreSQL: Plain text (ok for MVP)
- Phase 2: Enable PostgreSQL encryption, or use encrypted filesystem

**Encryption in Transit:**
- HTTPS/TLS 1.3 mandatory in production
- Certificate: Auto-generated by Railway

**PII Handling:**
- Collect only: email, first_name, business_name, phone, address
- Don't log: passwords, credit card numbers
- Deletion: Hard-delete on user request (within 30 days)

**Audit Logging:**
- Track: login, csv_upload, forecast_request, recommendation_execute, profile_change
- Fields: user_id, action, resource_id, timestamp, ip_address
- Retention: 90 days minimum

### Dependency Security

**Scanning:** `pip-audit` (GitHub Actions)

**Update Policy:**
- Check for vulnerabilities weekly
- Update critical vulnerabilities immediately
- Update non-critical quarterly

**Process:**
```bash
pip-audit  # Check for CVEs
pip list --outdated  # Check for updates
pip install --upgrade package-name
```

---

## Testing Strategy

### Test Pyramid

```
                  E2E
                 /   \
                /     \
            Integration
           /           \
          /             \
      Unit
    /                     \
```

**Target Coverage:** 70%+ for critical paths (auth, data ingestion, forecasting)

### Unit Tests

**Framework:** pytest 7.4

**Scope:** Models, serializers, services (no database)

**File Convention:** `apps/{app}/tests/test_{module}.py`

**Mocking:** pytest-mock, responses (for HTTP)

**Example:**

```python
# apps/customers/tests/test_rfm_scoring.py
import pytest
from apps.customers.services import RFMService

@pytest.fixture
def business(db):
    return BusinessFactory()

@pytest.fixture
def customer_with_transactions(db, business):
    customer = CustomerFactory(business=business)
    TransactionFactory.create_batch(10, business=business, customer=customer)
    return customer

def test_rfm_scoring_calculates_recency(customer_with_transactions):
    rfm = RFMService.calculate_rfm(customer_with_transactions.id)
    assert rfm['recency_score'] in [1, 2, 3, 4, 5]

def test_rfm_scoring_detects_at_risk_customer(customer_with_transactions):
    # Modify last transaction to 60+ days ago
    customer_with_transactions.transaction_set.last().date -= timedelta(days=70)
    customer_with_transactions.transaction_set.last().save()

    rfm = RFMService.calculate_rfm(customer_with_transactions.id)
    assert rfm['churn_risk_level'] == 'high'
```

### Integration Tests

**Scope:** Database + services + models

**Infrastructure:** pytest-django, factory-boy

**Example:**

```python
# apps/transactions/tests/test_csv_upload_integration.py
import pytest
from apps.transactions.services import CSVParserService
from io import StringIO

@pytest.mark.django_db
def test_csv_upload_creates_transactions_and_products(business):
    csv_content = """Date,Product,Quantity,Amount,Customer
2025-10-01,Shirt,2,600,Ali
2025-10-02,Pants,1,1200,Fatema
"""
    csv_file = StringIO(csv_content)

    service = CSVParserService(business_id=business.id)
    result = service.parse(csv_file)

    assert result['created_count'] == 2
    assert Transaction.objects.filter(business=business).count() == 2
    assert Product.objects.filter(business=business).count() == 2
    assert Customer.objects.filter(business=business).count() == 2
```

### End-to-End Tests

**Scope:** Complete workflows (frontend → backend → database)

**Tool:** Selenium + pytest (future) or manual smoke testing for MVP

**Example Workflow:**
1. Sign up → Create account
2. Upload CSV → See transactions
3. Generate forecast → See predictions
4. View recommendation → Execute action

### Test Data Management

**Fixtures:** conftest.py (shared across all tests)

```python
# tests/conftest.py
import pytest
from .factories import UserFactory, BusinessFactory, TransactionFactory

@pytest.fixture
def user(db):
    return UserFactory(email="test@example.com")

@pytest.fixture
def business(db, user):
    return BusinessFactory(user=user)

@pytest.fixture
def transactions_with_history(db, business):
    return TransactionFactory.create_batch(30, business=business)
```

**Factories:** factory-boy for realistic data

```python
# tests/factories.py
import factory
from django.utils import timezone
from datetime import timedelta

class TransactionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Transaction

    business = factory.SubFactory(BusinessFactory)
    date = factory.Faker('date_time_this_month')
    product_name = factory.Faker('word')
    quantity = factory.Faker('random_int', min=1, max=10)
    amount = factory.Faker('pydecimal', positive=True, left_digits=5, right_digits=2)
```

### Continuous Testing

**CI Integration:**
- Run unit tests on every commit
- Run integration tests on PR
- Run E2E tests before deployment

**Performance Tests:**
- Forecast inference: <10 seconds per product
- CSV parsing: <30 seconds for 10K rows
- API response: <500ms for GET, <1s for POST

**Security Tests:**
- SAST: bandit (Python security linter)
- Dependency scan: pip-audit
- OWASP Top 10 coverage

---

## Next Steps

### Immediate Actions (Before Development)

1. **Review & Confirm:**
   - All stakeholders review this architecture
   - Confirm tech stack choices
   - Agree on deployment strategy

2. **Setup Infrastructure:**
   - Create GitHub repository
   - Setup Railway account + PostgreSQL + Redis
   - Configure GitHub Actions CI/CD
   - Setup Sentry account

3. **Developer Setup:**
   - Each team member clones repo
   - Runs `docker-compose up`
   - Confirms local stack works

### Development Sequence (Epic Order)

**Epic 1:** Infrastructure & Setup (8 hours)
- Django + DRF project bootstrap
- Docker Compose local dev
- Railway deployment pipeline
- Database schema + migrations

**Epic 2:** Authentication (6 hours)
- User registration + login
- JWT token management
- Protected endpoints + data isolation
- Business profile endpoint

**Epic 3:** Data Ingestion (10 hours)
- CSV upload + async parsing
- Product/Customer auto-creation
- Transaction CRUD + filtering
- Duplicate detection

**Epic 4:** Forecasting (12 hours)
- Prophet model setup
- Forecast generation (async)
- Cash flow projection
- Forecast list + request endpoints

**Epic 5:** Customer Analytics (8 hours)
- RFM scoring
- Churn detection
- Customer list + filtering
- ChurnScore calculation (async)

**Epic 6:** Recommendations (10 hours)
- Recommendation generation rules
- Prioritization + deduplication
- Recommendation list + filtering
- View + execute endpoints

**Epic 7:** Admin Operations (6 hours)
- Health check endpoint
- Demo seeding + reset
- Failed job viewer
- Audit log viewer

**Epic 8:** Frontend Integration (8 hours)
- API client tests
- E2E workflow tests
- Bug fixes + polish
- Performance optimization

**Epic 9:** Demo Preparation (6 hours)
- Code cleanup
- Documentation
- Demo video
- Pitch deck

### Success Criteria

**Technical:**
- All endpoints implemented ✓
- Tests passing (70%+ coverage) ✓
- API documented (Swagger) ✓
- Zero critical bugs ✓
- <3 sec page load on 3G ✓

**Business:**
- Live demo without crashes ✓
- Judges understand value prop ✓
- 3+ SME owners interested ✓
- Professional presentation ✓

---

## Appendix: Additional Resources

### Documentation URLs

- [Django Official Docs](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery Docs](https://docs.celeryproject.org/)
- [Prophet Forecasting](https://facebook.github.io/prophet/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Railway Docs](https://docs.railway.app/)

### Development Guidelines

- **Git Workflow:** Feature branches + PR reviews
- **Commit Messages:** Reference epic/story (e.g., "Epic 2.1: JWT token validation")
- **Code Style:** black + flake8 + mypy
- **PR Requirements:** 2 approvals, tests passing, no new warnings

### Team Communication

- **Daily Standups:** 15 min, track blockers
- **Code Reviews:** Fast feedback (<2 hours)
- **Escalations:** Slack #blockers channel

---

**Document Status:** ✅ Ready for Development
**Last Updated:** 2025-11-03
**Next Review:** Post-Hackathon

