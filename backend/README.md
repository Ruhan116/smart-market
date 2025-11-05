# SmartMarket Backend (MVP)

This is a lightweight prototype backend for SmartMarket (MVP): authentication + basic business profile APIs.

Quick start (Django)

1. Copy `.env.example` to `.env` and edit if needed.
2. Create and activate a Python virtual environment:

   ```cmd
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. Install Python dependencies:

   ```cmd
   pip install -r requirements.txt
   ```

4. Run migrations and start the development server:

   ```cmd
   set DATABASE_URL=postgres://user:password@host:5432/dbname   (optional)
   set DJANGO_SECRET=your-secret
   python manage.py migrate
   python manage.py runserver 0.0.0.0:8000
   ```

Run the smoke test (requires `requests`):

```cmd
pip install requests
python tests/django_smoke.py
```

Notes

- This repository is Django-only. Node/NPM artifacts have been removed.
- If `DATABASE_URL` is not set, the project falls back to SQLite (db.sqlite3) for local development.

API Endpoints (base path `/api`)

- POST /api/auth/register { email, password, first_name, business_name, business_type, language? }
- POST /api/auth/login { email, password }
- POST /api/auth/token/refresh { refresh_token }
- GET /api/business/profile (Authorization: Bearer <access_token>)

Notes: This prototype uses Django and JSON Web Tokens (Simple JWT) for authentication.

If you want me to convert the smoke test to a pytest test or add a short CI job to run the smoke test, say so and I'll implement it.
