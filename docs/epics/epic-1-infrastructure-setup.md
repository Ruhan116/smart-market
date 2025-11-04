# Epic 1: Infrastructure & Setup - Brownfield Development

**Epic ID:** EPIC-1
**Status:** Ready for Development
**Priority:** Critical (Blocks all other epics)
**Estimated Duration:** 8 hours
**Team:** Backend Lead + DevOps/Floater

---

## Table of Contents

1. [Epic Goal](#epic-goal)
2. [Existing System Context](#existing-system-context)
3. [Enhancement Details](#enhancement-details)
4. [Stories](#stories)
5. [Compatibility Requirements](#compatibility-requirements)
6. [Risk Mitigation](#risk-mitigation)
7. [Definition of Done](#definition-of-done)
8. [Success Criteria](#success-criteria)

---

## Epic Goal

**Establish a production-ready, containerized development and deployment infrastructure for SmartMarket that enables the team to build, test, and deploy the Django/React application to Render with zero friction.**

This epic delivers a fully functional local development environment (Docker Compose) and automated CI/CD pipeline (GitHub Actions → Render) so that team members can develop independently and deploy changes with a single `git push`.

---

## Existing System Context

**Current State (Pre-Development):**
- ✅ Project Brief & PRD completed (v1.0)
- ✅ Architecture documentation drafted (v1.0)
- ✅ Tech stack selected: Django 4.2 LTS + React 18 + PostgreSQL 14 + Redis 7.0 + Celery 5.3
- ✅ GitHub repository created (ready for code)
- ⏳ No code or infrastructure yet deployed

**Technology Stack (Baseline):**

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend Framework** | Django + DRF | 4.2 LTS | REST API, ORM, auth |
| **Primary Database** | PostgreSQL | 14+ | Transactional data |
| **Cache/Queue** | Redis | 7.0+ | Celery broker, caching |
| **Background Jobs** | Celery | 5.3 | Async task processing |
| **Frontend** | React | 18 | SPA with TypeScript |
| **Styling** | Tailwind CSS | 3.3 | Utility-first CSS |
| **Containerization** | Docker | Latest | Local dev + production |
| **Orchestration** | Docker Compose | 2.x | Multi-container local dev |
| **App Server** | gunicorn | 21.2+ | WSGI server |
| **CI/CD** | GitHub Actions | Latest | Automated testing & deployment |
| **Hosting** | Render | Latest | Managed Django + PostgreSQL + Redis |

**Integration Points (Downstream):**
- **Epic 2** depends on: Django app running, migrations working, auth models created
- **Epic 3** depends on: Transaction models, database schema, async task queue
- **Epics 4-9** depend on: Stable backend infrastructure, working Celery, PostgreSQL connectivity

---

## Enhancement Details

### What's Being Built

This epic establishes the **foundational infrastructure** for SmartMarket development:

1. **Local Development Environment**
   - Single `docker-compose up` command starts full stack (Django, PostgreSQL, Redis, Celery worker)
   - Zero manual setup required (database auto-migrates, fixtures auto-seed)
   - Hot-reload enabled for Python + JavaScript changes
   - All developers have identical environment

2. **Production Deployment Pipeline**
   - GitHub Actions workflow: Test → Lint → Build Docker image → Push to Render
   - Auto-deploy on merge to `main` branch (zero-downtime if possible)
   - Render: 2 services (web + worker), shared PostgreSQL + Redis
   - Health checks at `/health` endpoint

3. **Database Schema & Migrations**
   - 10 core Django models defined (User, Business, Transaction, Product, Customer, Forecast, ChurnScore, Recommendation, AuditLog, FailedJob)
   - Migrations auto-generated and tested
   - Seed data script for demo purposes
   - Backward compatibility ensured

### How It Integrates

```
Developer Machine
    ↓
docker-compose.yml (starts 4 containers)
    ├→ Django API (localhost:8000)
    ├→ PostgreSQL (localhost:5432)
    ├→ Redis (localhost:6379)
    └→ Celery Worker (background process)

    ↓ (git push main)

GitHub Actions
    ├→ Run pytest (all tests)
    ├→ Run linting (black, flake8)
    ├→ Build Docker image
    └→ Push to ghcr.io

    ↓ (on successful build)

Render (Production)
    ├→ Web service: gunicorn + Django
    ├→ Worker service: Celery worker
    ├→ PostgreSQL: Managed, auto-backups
    └→ Redis: Managed, 256MB free tier
```

### Success Criteria

- ✅ Any team member can run `docker-compose up` and have a working stack in <2 minutes
- ✅ All Django migrations apply without errors
- ✅ API accessible at `http://localhost:8000/api/` with Swagger docs
- ✅ Celery worker processes test tasks without errors
- ✅ `git push main` automatically deploys to `smartmarket-api.onrender.com`
- ✅ Health check endpoint returns 200 when all services OK, 503 if any fail
- ✅ Zero hardcoded secrets in repository
- ✅ Team can begin Epic 2 development without infrastructure blockers

---

## Stories

### Story 1.1: Project Bootstrap & Local Dev Environment (3 hours)

**Objective:** Create Django project structure, Docker Compose stack, and local development workflow.

**Acceptance Criteria:**

- [ ] Django 4.2 project initialized with DRF
  - [ ] Project created: `django-admin startproject smartmarket`
  - [ ] DRF installed and configured in settings
  - [ ] CORS middleware configured
  - [ ] Custom exception handlers set up

- [ ] All Django apps created and registered
  - [ ] `python manage.py startapp auth`
  - [ ] `python manage.py startapp transactions`
  - [ ] `python manage.py startapp forecasting`
  - [ ] `python manage.py startapp customers`
  - [ ] `python manage.py startapp recommendations`
  - [ ] `python manage.py startapp adminops`
  - [ ] `python manage.py startapp core`
  - [ ] `python manage.py startapp notifications`
  - [ ] All apps added to `INSTALLED_APPS` in settings

- [ ] Docker Compose configuration complete
  - [ ] `docker-compose.yml` defines 4 services: web, db, redis, worker
  - [ ] Django container (gunicorn + hot-reload)
  - [ ] PostgreSQL 14 auto-initialized with smartmarket database
  - [ ] Redis 7.0 configured
  - [ ] Celery worker configured with Redis broker
  - [ ] Volume mounts for code (hot-reload), database persistence
  - [ ] `.dockerignore` file excludes unnecessary files

- [ ] Dockerfile created and tested
  - [ ] Multi-stage build (builder + runtime)
  - [ ] Python 3.11 base image
  - [ ] `requirements.txt` dependencies installed
  - [ ] Static files collected
  - [ ] Image builds without errors

- [ ] Local development workflow functional
  - [ ] `docker-compose up` starts full stack
  - [ ] Django migrations run automatically on startup
  - [ ] API accessible at `http://localhost:8000/api/`
  - [ ] Swagger/ReDoc docs at `http://localhost:8000/api/docs/`
  - [ ] Django admin at `http://localhost:8000/admin/`
  - [ ] Python code changes hot-reload (no container restart needed)
  - [ ] Celery worker logs visible in `docker-compose logs worker`

- [ ] Environment configuration
  - [ ] `.env.example` file with all required variables (template)
  - [ ] `.env` (git-ignored) for local development
  - [ ] Settings load from environment variables (using `python-decouple`)
  - [ ] No hardcoded secrets in code

- [ ] Documentation
  - [ ] `README.md` with setup instructions
    - [ ] Prerequisites (Docker, Python 3.11 optional)
    - [ ] "Getting Started" section with `docker-compose up` command
    - [ ] How to access API, admin, docs
    - [ ] How to run migrations, create superuser
    - [ ] How to stop/remove containers
  - [ ] `CONTRIBUTING.md` with development guidelines

- [ ] Initial test
  - [ ] `pytest` installed and configured
  - [ ] `conftest.py` created with basic fixtures
  - [ ] Run `pytest tests/` and confirm 0 errors
  - [ ] Test coverage report generated (target: 0% initially, will increase)

**Effort:** 3 hours
**Dependencies:** None (blocks all other epics)
**Risk:** Low (standard Django setup, no novel patterns)

---

### Story 1.2: Render Deployment & CI/CD Pipeline (3 hours)

**Objective:** Configure GitHub Actions for automated testing/linting/building, and setup Render auto-deployment.

**Acceptance Criteria:**

- [ ] GitHub Actions CI/CD workflow created
  - [ ] `.github/workflows/deploy.yml` file created
  - [ ] Workflow triggers on `push` to `main` branch
  - [ ] Workflow runs on `ubuntu-latest`

- [ ] Linting & formatting step
  - [ ] Install black (code formatter)
  - [ ] Install flake8 (linter)
  - [ ] Install isort (import sorter)
  - [ ] Run: `black --check .` (fails if format issues)
  - [ ] Run: `flake8 .` (fails if linting issues)
  - [ ] Run: `isort --check-only .` (fails if import order issues)

- [ ] Testing step
  - [ ] Install pytest + coverage
  - [ ] Run: `pytest tests/ --cov=apps --cov-report=term-missing`
  - [ ] Minimum coverage: 50% (for MVP, increase later)
  - [ ] Fail workflow if tests fail or coverage drops

- [ ] Docker build step
  - [ ] Setup Docker buildx (for multi-platform builds if needed)
  - [ ] Build Docker image: `docker build -t smartmarket:latest .`
  - [ ] Tag image: `ghcr.io/user/smartmarket:latest`
  - [ ] Push to GitHub Container Registry

- [ ] Render deployment configuration
  - [ ] `render.yaml` created with services (web + worker)
  - [ ] Or: Manual setup in Render dashboard (GitHub integration)
  - [ ] Render environment variables set (in Render dashboard):
    - [ ] `DJANGO_SECRET_KEY` (generate: `openssl rand -hex 32`)
    - [ ] `DJANGO_DEBUG=False`
    - [ ] `DJANGO_ALLOWED_HOSTS=smartmarket-api.onrender.com`
    - [ ] `DATABASE_URL` (auto-provided by Render PostgreSQL)
    - [ ] `REDIS_URL` (auto-provided by Render Redis)
    - [ ] `SENTRY_DSN` (optional, for error tracking)
    - [ ] `CORS_ALLOWED_ORIGINS=https://smartmarket.vercel.app`

- [ ] Health check endpoint implemented
  - [ ] `GET /health` endpoint
  - [ ] Response: `{ "status": "ok", "services": { "db": "ok", "redis": "ok", "workers": "ok" } }`
  - [ ] Tests database connectivity
  - [ ] Tests Redis connectivity
  - [ ] Tests Celery worker availability
  - [ ] Returns 200 if all OK, 503 if any service down
  - [ ] Registered with Render for health checks

- [ ] Auto-deployment tested
  - [ ] Commit dummy change to main branch
  - [ ] Confirm GitHub Actions workflow runs
  - [ ] Confirm Docker image builds
  - [ ] Confirm Render receives GitHub webhook + auto-deploys
  - [ ] Confirm `https://smartmarket-api.onrender.com/health` returns 200
  - [ ] Confirm deployments show in Render dashboard

- [ ] Rollback procedure documented
  - [ ] Documented how to rollback: `git revert <commit> && git push main`
  - [ ] Tested rollback with dummy change
  - [ ] Confirmed RTO <5 minutes

- [ ] Monitoring setup (optional for MVP, nice-to-have)
  - [ ] Sentry DSN configured (error tracking)
  - [ ] Render health checks enabled
  - [ ] Team receives alerts on deployment failure

**Effort:** 3 hours
**Dependencies:** Story 1.1 (needs working Django app)
**Risk:** Low-Medium (Render configuration straightforward; test thoroughly)

---

### Story 1.3: Database Schema & Migrations (2 hours)

**Objective:** Define all 10 core Django models, create migrations, and seed test data.

**Acceptance Criteria:**

- [ ] All models defined in respective apps
  - [ ] **auth/models.py:**
    - [ ] `User` model (email, password_hash, first_name, business_id, created_at, updated_at)
    - [ ] `Business` model (name, type, user_id, is_demo, created_at, updated_at)

  - [ ] **transactions/models.py:**
    - [ ] `Transaction` model (business_id, date, product_id, customer_id, quantity, amount, payment_method, created_at)
    - [ ] `Product` model (business_id, name, sku, unit_price, current_stock, reorder_point, created_at)
    - [ ] `Customer` model (business_id, name, phone, email, created_at)

  - [ ] **customers/models.py:**
    - [ ] `ChurnScore` model (business_id, customer_id, recency_score, frequency_score, monetary_score, rfm_segment, churn_risk_score, churn_risk_level, created_at)

  - [ ] **forecasting/models.py:**
    - [ ] `Forecast` model (business_id, product_id, forecast_date, forecast_horizon_days, forecast_data[JSON], accuracy[JSON], status, created_at)
    - [ ] `CashFlowForecast` model (business_id, forecast_date, projection_days, forecast_data[JSON], risk_analysis[JSON], created_at)

  - [ ] **recommendations/models.py:**
    - [ ] `Recommendation` model (business_id, title, description, type, urgency, priority_score, action_data[JSON], engagement[JSON], status, created_at)

  - [ ] **adminops/models.py:**
    - [ ] `AuditLog` model (business_id, user_id, action, resource_type, resource_id, details[JSON], ip_address, created_at)
    - [ ] `FailedJob` model (business_id, celery_task_id, task_name, error_message, attempt_count, status, created_at)

- [ ] Models follow best practices
  - [ ] All have `id` as primary key
  - [ ] All have `created_at` and `updated_at` timestamps
  - [ ] Foreign key relationships defined correctly
  - [ ] Indexes on frequently-queried columns (business_id, customer_id, status, etc.)
  - [ ] `business_id` filtering enforced on all models (for multi-tenancy)
  - [ ] Constraints set (e.g., quantity > 0, churn_risk_score between 0 and 1)

- [ ] Migrations created and tested
  - [ ] Run `python manage.py makemigrations` (no errors)
  - [ ] All migration files generated in `migrations/` directories
  - [ ] Run `python manage.py migrate` on fresh database (no errors)
  - [ ] Migrations are reversible: `python manage.py migrate <app> <migration_number>` works
  - [ ] No migration conflicts or duplicates

- [ ] Database schema validated
  - [ ] All tables exist in PostgreSQL
  - [ ] All columns match model definitions
  - [ ] All indexes created
  - [ ] Foreign key constraints enforced

- [ ] Seed data / fixtures
  - [ ] `management/commands/seed_demo.py` command created
  - [ ] Generates demo business, users, 30 products, 100 transactions, 50 customers
  - [ ] All data uses realistic Bangla names, BDT currency
  - [ ] Run `python manage.py seed_demo --users=1` creates demo data
  - [ ] Seed data is idempotent (can run multiple times safely)

- [ ] Tests for models
  - [ ] Test model creation and field validation
  - [ ] Test foreign key relationships
  - [ ] Test custom model methods (if any)
  - [ ] Minimum 5 model tests passing

**Effort:** 2 hours
**Dependencies:** Story 1.1 (needs Django apps)
**Risk:** Low (standard Django models, well-understood patterns)

---

### Story 1.4: Frontend Vercel Deployment Setup (2 hours)

**Objective:** Initialize React frontend project and configure auto-deployment to Vercel.

**Acceptance Criteria:**

- [ ] Frontend project structure created
  - [ ] React 18 project initialized (using Vite or Create React App)
  - [ ] TypeScript configured
  - [ ] Tailwind CSS installed and configured
  - [ ] react-router-dom installed for routing
  - [ ] axios or fetch client configured for API calls
  - [ ] Environment variable: `REACT_APP_API_URL=https://smartmarket-api.onrender.com/api` (for prod)

- [ ] Basic components created
  - [ ] App.tsx (main layout + routing)
  - [ ] Router setup (public routes: /login, /signup; protected routes: /dashboard, /forecasts, etc.)
  - [ ] Protected route wrapper (redirect to login if not authenticated)
  - [ ] Navigation component (top navbar + bottom tabs for mobile)

- [ ] Frontend API client setup
  - [ ] `services/api.ts` with axios instance
  - [ ] Base URL from environment variables
  - [ ] Bearer token handling in request headers
  - [ ] Error handling (401 → redirect to login)
  - [ ] Loading states for async operations

- [ ] Vercel deployment configured
  - [ ] `vercel.json` created with build settings
  - [ ] Build command: `npm run build` (generates dist/)
  - [ ] Output directory: `dist/`
  - [ ] Environment variables set in Vercel dashboard:
    - [ ] `REACT_APP_API_URL=https://smartmarket-api.onrender.com/api`
  - [ ] Auto-deploy on `git push` to `main` branch enabled

- [ ] Frontend accessible and working
  - [ ] `npm run dev` starts local dev server on `http://localhost:5173` or similar
  - [ ] Frontend accessible at `https://smartmarket.vercel.app`
  - [ ] CORS headers from backend allow Vercel origin
  - [ ] Can navigate between pages without 404 errors
  - [ ] API calls from frontend reach backend (test with login endpoint)

- [ ] GitHub integration working
  - [ ] Vercel app linked to GitHub repo
  - [ ] Preview deployments created for PRs
  - [ ] Production deployment only on `main` branch
  - [ ] Deployment status visible in GitHub PR checks

- [ ] Documentation
  - [ ] Frontend `README.md` with setup instructions
  - [ ] How to run locally: `npm install && npm run dev`
  - [ ] How to build: `npm run build`
  - [ ] Environment variables documented

**Effort:** 2 hours
**Dependencies:** None (can run in parallel with Story 1.1-1.3)
**Risk:** Low (standard React + Vercel setup)

---

## Compatibility Requirements

Since this is a **greenfield project** (starting from scratch), compatibility is not a concern. However, for **future maintenance**:

- ✅ **Existing APIs remain unchanged** — N/A (no prior APIs)
- ✅ **Database schema changes are backward compatible** — Use Django migrations for any future schema changes
- ✅ **UI changes follow existing patterns** — Use Tailwind utility classes consistently
- ✅ **Performance impact is minimal** — Django + Celery can handle 100 concurrent users; scale workers if needed

---

## Risk Mitigation

| Risk | Impact | Mitigation | Contingency |
|------|--------|-----------|-------------|
| **Docker setup fails on some machines** | High | Provide troubleshooting guide in README (test on Windows, Mac, Linux) | Provide pre-built VM image or cloud IDE (GitHub Codespaces) |
| **Render deployment takes >30 min** | Medium | Test Render setup before day 1; have backup deployment option (Heroku) | Manual Render configuration if Actions fails |
| **PostgreSQL auto-migration fails** | High | Test migrations on fresh database before push; use Django's built-in migration system | Rollback to previous migration; manual database fix |
| **GitHub Actions fails intermittently** | Medium | Retry failed jobs; monitor logs for flakiness | Manually trigger deployment via Render CLI if needed |
| **Redis/Celery issues in development** | Medium | Provide `docker-compose restart worker` command in docs | Can skip async tasks for MVP, run them synchronously for testing |
| **Vercel build fails** | Medium | Test `npm run build` locally before push | Manual Vercel redeployment or rollback to previous commit |

---

## Definition of Done

### Code Quality
- [ ] All code follows project conventions (black, flake8, isort)
- [ ] No hardcoded secrets or API keys
- [ ] No commented-out code or debug statements
- [ ] TypeScript strict mode enabled (frontend)
- [ ] Type hints on all functions (backend)

### Testing
- [ ] All models have tests (>80% coverage)
- [ ] Health check endpoint tested
- [ ] Database migrations tested (forward + backward)
- [ ] Docker image builds without warnings
- [ ] All tests pass on local machine and in GitHub Actions

### Documentation
- [ ] Backend README with setup, running, testing, deployment instructions
- [ ] Frontend README with same structure
- [ ] `.env.example` file with all required environment variables
- [ ] CONTRIBUTING.md with development guidelines
- [ ] API documentation (Swagger) accessible at `/api/docs/`
- [ ] Architecture diagram in docs (even if ASCII art)

### Deployment & Infrastructure
- [ ] Docker Compose environment fully functional (`docker-compose up` → all services healthy)
- [ ] Health check endpoint working and integrated with monitoring
- [ ] GitHub Actions CI/CD pipeline passing all checks
- [ ] Render deployment successful and accessible
- [ ] Vercel frontend deployment working and calling backend API
- [ ] Database migrations auto-run on deployment
- [ ] Secrets not exposed in logs, GitHub, or Docker images

### Team Onboarding
- [ ] New team member can clone repo, run `docker-compose up`, and be productive in <15 minutes
- [ ] All team members have access to Render dashboard and can view logs
- [ ] Team understands deployment process and can push changes
- [ ] Any team member can rollback a bad deployment

### Sign-Off
- [ ] Backend Lead: "Infrastructure is solid, ready for Epic 2"
- [ ] Frontend Lead: "Frontend environment ready for screens"
- [ ] DevOps/PM: "Team can deploy changes; monitoring in place"

---

## Success Criteria

**Technical Success:**
- ✅ Docker Compose starts all 4 services without errors
- ✅ API responds with 200 at `/health` within 5 seconds
- ✅ GitHub Actions workflow runs and passes in <10 minutes
- ✅ Render deployment completes in <5 minutes after push
- ✅ Frontend builds and deploys to Vercel without errors
- ✅ Frontend can call backend API (test with simple GET request)
- ✅ Database migrations run automatically on deployment
- ✅ Celery worker processes tasks (test with simple async task)

**Team Success:**
- ✅ All team members have working local environment
- ✅ No environment-specific issues blocking development
- ✅ CI/CD pipeline trusted by team (no false positives)
- ✅ Team can describe deployment process in <2 minutes
- ✅ Zero infrastructure blockers for Epic 2 development

**Operational Success:**
- ✅ Production environment stable for >24 hours
- ✅ Health check monitored (Grafana Cloud or similar)
- ✅ Team can deploy multiple times per day without issues
- ✅ Rollback procedure tested and documented

---

## Handoff to Development

### Pre-Epic 1 Checklist
- [ ] GitHub repository created and access granted to all team members
- [ ] Render account created; PostgreSQL + Redis provisioned
- [ ] Sentry account created (optional but recommended)
- [ ] Vercel account created; custom domain configured (optional)
- [ ] Team has Docker Desktop installed locally

### Story Ordering (Sequential)
1. **Story 1.1** (3 hrs) — Backend lead starts; establishes local dev environment
2. **Story 1.4** (2 hrs) — Frontend lead starts in parallel; Vercel setup
3. **Story 1.2** (3 hrs) — DevOps/Backend lead; CI/CD pipeline (depends on 1.1 to be buildable)
4. **Story 1.3** (2 hrs) — Backend lead; database models (can start after 1.1)

**Parallelization:** Stories 1.1 + 1.4 can start simultaneously; 1.3 can start after 1.1 models are stubbed; 1.2 last.

### Communication Cadence
- **Start of Epic:** Team kickoff (30 min) to confirm approach
- **Daily:** 15-min standup; flag blockers immediately
- **Story Complete:** Demo story to team + merge to main
- **Epic Complete:** Deploy to production + celebrate 🎉

---

## Appendix: Key Commands Reference

**Local Development:**
```bash
# Start full stack
docker-compose up

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Seed demo data
docker-compose exec web python manage.py seed_demo

# Run tests
docker-compose exec web pytest tests/ -v

# View logs
docker-compose logs -f web
docker-compose logs -f worker
docker-compose logs -f db

# Stop stack
docker-compose down

# Remove all data
docker-compose down -v
```

**Frontend Development:**
```bash
# Install dependencies
npm install

# Run local server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

**Deployment:**
```bash
# Push to main (triggers GitHub Actions → Render)
git push origin main

# View GitHub Actions logs
# Visit: https://github.com/smartmarket/smartmarket/actions

# View Render logs
# Visit: https://render.com/ → select app → Deployments tab

# Manual Render deployment (if needed)
# Use Render dashboard or API
```

---

## Notes

- **This epic is the **critical path** for all other epics.** It must be 100% complete before Epic 2 begins.
- **Use the brownfield-epic template** to evaluate scope on future enhancements (this is greenfield, but format applies).
- **Document decisions:** Why Docker Compose? Why Render? This helps future maintainers understand trade-offs.
- **Test edge cases:** What happens if PostgreSQL is down? Redis is down? Handle gracefully with 503 responses.

---

**Epic Owner:** Backend Lead
**Created:** 2025-11-04
**Last Updated:** 2025-11-04
**Status:** ✅ Ready for Development
