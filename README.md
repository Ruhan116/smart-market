# Smart Market Platform

Smart Market is an end-to-end retail intelligence platform that helps small and medium merchants upload transactional data, monitor inventory health, forecast demand, and take data-driven actions. The system combines a Django REST backend, a React (Vite) frontend, and auxiliary ML workflows that orchestrate forecasting and churn analytics.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Solution Architecture](#solution-architecture)
3. [Core Features](#core-features)
4. [Monorepo Layout](#monorepo-layout)
5. [Backend (Django + DRF)](#backend-django--drf)
6. [Frontend (React + Vite)](#frontend-react--vite)
7. [Data & ML Workflows](#data--ml-workflows)
8. [Database Design](#database-design)
9. [API Reference](#api-reference)
10. [Environment & Configuration](#environment--configuration)
11. [Local Development Guide](#local-development-guide)
12. [Testing Strategy](#testing-strategy)
13. [Deployment & Operations](#deployment--operations)
14. [Troubleshooting & Support](#troubleshooting--support)

---

## Platform Overview

| Layer      | Stack / Services                         | Responsibilities |
|------------|------------------------------------------|------------------|
| Frontend   | React (Vite), Tailwind, Shadcn UI, Sonner | Auth flows, dashboards, inventory tools, AI recommendations UI |
| Backend    | Django, Django REST Framework, Celery-ready task structure | Authentication, data ingestion, analytics APIs, receipt OCR orchestration |
| Storage    | PostgreSQL (Railway compatible), Media storage | Persistent transactional, inventory, customer data; receipt images |
| ML Support | Prophet notebooks, synthetic data scripts | Forecasting models, churn analytics, synthetic dataset generation |
| DevOps     | Docker Compose, Railway deployment (docs) | Local orchestration, hosted environment guidance |

The project emphasises quick data onboarding (CSV uploads, OCR), actionable analytics (forecasting, churn), and mobile-friendly UI for small devices.

---

## Solution Architecture

```
 ┌─────────────────────────┐         ┌─────────────────────┐
 │  React SPA (Vite)       │  https  │ Django REST Backend │
 │  - Auth (JWT)           │────────▶│ - Auth, Data APIs   │
 │  - Data Upload UX       │         │ - CSV ingestion     │
 │  - Dashboards           │         │ - Analytics services │
 └──────────▲───────┬──────┘         └───────────▲────────┘
             │       │                           │
             │       │JWT, JSON APIs             │
             │       │                           │
     Local Storage  Media uploads        Celery-ready tasks
             │       │                           │
             │       ▼                           ▼
       ┌────────────┴──────────┐       ┌──────────────────────┐
       │ PostgreSQL (Railway)   │◀─────▶│ ML/Analytics Engines │
       │ - Transactions         │       │ - Forecasting         │
       │ - Inventory            │       │ - Churn services      │
       │ - Customers            │       └──────────────────────┘
       └────────────────────────┘
```

Key Integration Points:
- **JWT Authentication** via SimpleJWT between React SPA and DRF.
- **CSV & OCR Pipelines** produce `UploadRecord` rows and trigger inventory/transaction sync.
- **Forecasting Services** aggregate transactional data to build demand summaries and optional Prophet-based projections (notebooks + API stubs).

---

## Core Features

- Secure email/password authentication with refresh tokens.
- Guided CSV upload workflows for transactions and inventory, with async processing and retry tooling.
- Real-time dashboards: revenue KPIs, inventory health, customer churn segments, AI recommendations.
- Demand forecasting summaries with drill-down views and model activation hooks.
- Receipt OCR review UI with editable line items and confirmation flow.
- Admin tools for monitoring failed jobs and upload status.

---

## Monorepo Layout

```
smart-market/
├── backend/            # Django project & apps
├── frontend/           # React (Vite) SPA
├── docs/               # Product docs, architecture notes, epics, stories
├── ml_models/          # Notebooks, datasets for forecasting experiments
├── scripts/            # Synthetic data helpers, SQL snapshots
├── docker-compose.yml  # Local orchestration for web + db
├── README-dev.md       # Legacy developer notes
└── README.md           # (This file)
```

---

## Backend (Django + DRF)

### Structure
- `backend/project/` – Django settings for prod/dev + WSGI.
- `backend/backend/` – Core config (settings overrides, URL router).
- `backend/accounts/` – Custom user model, serializers, auth views (SimpleJWT).
- `backend/data/` – Central domain logic: inventory, transactions, customers, OCR, APIs, Celery-ready services, DRF viewsets.
- `backend/apps/` – Domain-specific extensions (churn detection, forecasting, event adapters).

### Key Dependencies
- Django, Django REST Framework
- SimpleJWT for auth
- Pillow & OCR helpers for receipts
- Celery/RQ-ready service structure (tasks modules)

### Notable Modules
- `data/services.py` – transactional ingestion utilities.
- `data/inventory_service.py` – stock adjustments, alerts.
- `data/forecast_service.py` – demand summaries & insights.
- `data/receipt_ocr.py` – OCR extraction pipeline.
- `apps/churn/services.py` – churn risk evaluation.

---

## Frontend (React + Vite)

### Key Technologies
- Vite + TypeScript for rapid SPA development.
- Tailwind CSS + Shadcn UI kit for consistent styling.
- React Query for async state (upload monitoring, admin dashboards).
- Axios with interceptors for JWT token handling (`src/services/api.ts`).
- Sonner toasts & custom `ErrorBanner` for UX feedback.

### Pages & Navigation
- `App.tsx` sets up SPA routes with auth gating and a mobile bottom tab bar.
- Primary views: Dashboard (`Home`), Inventory, Forecasts & Details, Customers, Transactions (quick entry + list), Recommendations, Data Upload, Admin Dashboard, Receipt Preview.
- Shared components: `LoadingSpinner`, `SplashScreen`, `QRScanner`, `StatCard`, plus shadcn UI primitives.

---

## Data & ML Workflows

- `ml_models/training/` notebooks demonstrate Prophet-based forecasting experiments using M5 dataset references.
- `ml_models/datasets/` hosts sample and mapped datasets for ingestion pipelines.
- `scripts/generate_synthetic_sql.py` and `ml_models/.../synthetic_transactions.sql` enable seeded data for demos.

ML integration is optional for local dev; the backend provides hooks (`/data/forecast/`) to consume generated forecasts when models are deployed.

---

## Database Design

The platform uses PostgreSQL (works with SQLite for quick starts) with the following core tables/models:

### Accounts App
- `accounts.User`
  - Fields: email (unique login), name, is_active, is_staff, is_superuser, timestamps.
  - Related tokens handled via SimpleJWT (no persistent session table).

### Data App
- `Business` – metadata about the merchant (name, type, stats caches).
- `Product` – SKU, name, pricing, reorder point, current stock.
- `InventoryUploadRecord` – metadata for CSV ingestion jobs.
- `StockAlert` – low/out-of-stock alerts with acknowledgement tracking.
- `StockMovement` – history of manual/automatic stock adjustments.
- `Transaction` – sales transactions, product link, customer context.
- `Customer` – churn metrics, purchase metrics, segmentation.
- `ChurnAnalysis` (related) – risk scores (high/medium/low), RFM segments.
- `Recommendation` – AI generated action items with urgency & engagement status.
- `ReceiptUploadRecord` – OCR submissions with extracted line items.

### Relationships
- `Transaction` references `Product` and optional `Customer`.
- `StockAlert` and `StockMovement` reference `Product`.
- `Customer` aggregates transactions for churn analysis.
- `ReceiptUploadRecord` stores extracted line items used to generate transactions on confirm.

---

## API Reference

High-level endpoints (prefix `/api` or `/` depending on routing). Authentication uses JWT access/refresh tokens via headers.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login/` | POST | Obtain access & refresh tokens. |
| `/auth/refresh/` | POST | Refresh access token using refresh token. |
| `/auth/register/` | POST | Create new user account. |
| `/data/inventory/products/` | GET | List products with stock data. Supports pagination. |
| `/data/inventory/report/` | GET | Inventory KPIs (totals, low/out-of-stock counts). |
| `/data/inventory/alerts/` | GET | Active stock alerts. |
| `/data/inventory/movements/` | GET | Stock adjustment history. |
| `/data/inventory/adjust-stock/` | POST | Adjust stock for a product (increase/decrease). |
| `/data/transactions/` | GET/POST | List recent transactions; create transaction (with stock sync). |
| `/data/customers/` | GET | Customer list with churn metrics (supports refresh flag). |
| `/data/recommendations/` | GET | AI recommendation feed (demo data fallback). |
| `/data/upload/transactions/` | POST | CSV transaction upload. |
| `/data/upload/inventory/` | POST | CSV inventory upload. |
| `/data/upload/receipt/` | POST | Receipt image upload for OCR. |
| `/data/receipts/{id}/` | GET | Retrieve receipt OCR preview. |
| `/data/receipts/{id}/confirm/` | POST | Confirm OCR results, create transactions. |
| `/data/receipts/{id}/reject/` | POST | Reject OCR submission. |
| `/data/forecast/summary/` | GET | Forecast summaries per product. |
| `/data/forecast/{product_id}/` | GET | Detailed forecast + reorder recommendations. |
| `/admin/uploads/failed/` | GET | Failed job list (staff only). |
| `/admin/uploads/status/` | GET | Upload status monitor. |

> **Note:** Some endpoints rely on background job infrastructure; when running locally without Celery/Redis, services fall back to synchronous execution or mock data (`frontend/src/services/mockData.ts`).

---

## Environment & Configuration

Key environment variables (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Django secret key. |
| `DATABASE_URL` | PostgreSQL connection string (Railway compatible). |
| `DEBUG` | Toggle Django debug mode. |
| `ALLOWED_HOSTS` | Comma-separated hostnames. |
| `FRONTEND_URL` | SPA origin for CORS. |
| `CORS_ALLOWED_ORIGINS` | Additional allowed origins. |
| `JWT_ACCESS_LIFETIME` | Access token lifetime (minutes). |
| `JWT_REFRESH_LIFETIME` | Refresh token lifetime (days). |
| `OCR_PROVIDER_URL` | Optional: external OCR service endpoint. |

Frontend uses `.env.local` with Vite prefixes (e.g., `VITE_API_URL`).

---

## Local Development Guide

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (optional but recommended)

### Quick Start with Docker Compose

```powershell
# from repository root
cp .env.example .env
# set secrets inside .env and frontend/.env.local

docker-compose up --build
```

Services:
- `backend` at http://localhost:8000
- `frontend` at http://localhost:5173 (Vite dev server)
- `db` (PostgreSQL) exposed on 5432 if enabled in compose file

### Manual Setup

Backend:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # optional
python manage.py runserver
```

Frontend:
```powershell
cd frontend
npm install
npm run dev
```

Optional utilities:
- Populate synthetic data: `python manage.py generate_synthetic_transactions`
- Assign demo customers: `python manage.py assign_customers`

---

## Testing Strategy

| Layer | Command | Notes |
|-------|---------|-------|
| Backend | `python manage.py test data` | Focused tests for data services. |
| Frontend | `npm run lint` / `npm run test` | Linting via ESLint, component tests scaffold-ready. |
| E2E | See `E2E_TESTING_GUIDE.md` | Uses Playwright/Cypress (config outlined in docs). |

Test data and fixtures live in `backend/data/tests/` and front-end mocks (`frontend/src/services/mockData.ts`).

---

## Deployment & Operations

- **Railway**: project structured for Railway deployment (refer to `docs/epics/epic-1-infrastructure-setup.md`). Use Railway-provided `DATABASE_URL` and set secret environment variables.
- **Static Assets**: Vite build output served via CDN or Django staticfiles (depending on deployment choice).
- **Background Jobs**: For production, configure Celery + Redis (tasks stubs are ready in `apps/forecasting/tasks.py`, `apps/churn/tasks.py`).
- **Monitoring**: Admin dashboard includes visibility into data uploads; extend with Sentry/New Relic per `docs/architecture.md` recommendations.

---

## Troubleshooting & Support

| Symptom | Resolution |
|---------|------------|
| 401 responses on API calls | Ensure frontend points to correct API origin and JWT tokens exist in localStorage. |
| CSV uploads stuck in `processing` | Check background worker logs; in local fallback mode, ensure `useDataUpload` hooks return mock data or run `python manage.py process_uploads`. |
| Missing forecasts | Confirm sufficient transaction history (>=30 days) or execute ML notebooks to generate Prophet outputs. |
| OCR preview blank | Verify Pillow dependency installed and `media/receipts/` volume writable. |

For deeper reference, consult:
- `docs/architecture.md` for component diagrams.
- `docs/epics/` and `docs/stories/` for agile breakdowns and data schemas.
- `README-dev.md` plus `QUICK_START.md` for legacy setup notes.

---

