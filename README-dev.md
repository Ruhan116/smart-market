# Smart‑Market — Developer Quick Start (Docker + Railway DB)

This guide shows the minimal, repeatable steps your teammates should follow to run the app with Docker while using the remote Railway PostgreSQL (the shared DB). Follow exactly in Windows PowerShell.

Preconditions (each dev)
- Git installed
- Docker Desktop running (Compose v2)
- Node 18+ and npm
- You have Railway project access (Rumman will give access inshallah)



1) Clone repo
```powershell
cd F:\
git clone <repo-url> smart-market
cd F:\smart-market
git checkout -b <branch>    # e.g. nijer branch create pls
git pull origin dev

```

2) Create .env from template and add Railway DATABASE_URL

- Edit `.env` (paste Railway public connection string and set secret):
  - DATABASE_URL=postgresql://postgres:<PASSWORD>@<HOST>:<PORT>/railway
  - DJANGO_SECRET_KEY=<some-random-secret>
  - DJANGO_DEBUG=True
  - VITE_API_URL=http://localhost:8000/api
  - VITE_DEMO_MODE=false

Notes:
- Use Railway “Connect” → copy the public connection string (railway.app host), not internal `.railway.internal`.
- Remove or rename any `.env.local` that points to a local DB to avoid overrides.

3) Start Docker services (web will use Railway DB)
```powershell
cd F:\smart-market
docker compose down --remove-orphans
docker compose up -d --build
```
- The `web` container will read DATABASE_URL from `.env` and connect to Railway.

4) Run migrations (Railway may already have tables)
- If Railway DB is fresh:
```powershell
docker compose exec web python manage.py migrate
```
- If Railway DB already has tables (you get migration errors), run the safe fake sequence:
```powershell
docker compose exec web bash -lc "python manage.py migrate contenttypes --fake && python manage.py migrate auth --fake && python manage.py migrate admin --fake && python manage.py migrate sessions --fake && python manage.py migrate accounts --fake && python manage.py migrate --noinput"
```

5) Create superuser (optional)
```powershell
docker compose exec web python manage.py createsuperuser
```

6) Start frontend dev server (local)
```powershell
cd F:\smart-market\frontend
npm install
npm run dev
```
- Open the Vite URL printed in terminal (typically http://localhost:5173 or http://localhost:8080).
- Ensure `VITE_API_URL` is `http://localhost:8000/api` and `VITE_DEMO_MODE=false`.

7) Verify everything works
- Visit frontend, try Signup / Login (uses Railway DB).
- Check backend logs:
```powershell
docker compose logs --tail 200 web
```
- Confirm Django is connected to Railway:
```powershell
docker compose exec web python manage.py shell -c "from django.db import connection; print(connection.settings_dict)"
```

8) Inspect Railway DB (via Railway web UI)
- Open https://railway.app → Project → PostgreSQL service → Data / Query
- Run:
```sql
SELECT id, email, first_name FROM auth_user LIMIT 50;
SELECT id, owner_id, name FROM accounts_business LIMIT 50;
```

9) Troubleshooting (common)
- CORS / 401: ensure `VITE_API_URL` matches backend and `VITE_DEMO_MODE=false`.
- “Cannot connect to DB”: ensure your `.env` DATABASE_URL is the public Railway string and Docker host has outbound access.
- Migrations errors on Railway: use the fake sequence in step 4.
- If you accidentally used a local DB: remove `.env.local` or ensure DATABASE_URL in `.env` is the Railway URL and rebuild.

10) Quick helper commands
```powershell
# Restart services
docker compose down --remove-orphans
docker compose up -d --build

# Tail logs
docker compose logs --follow web

# Run Django shell
docker compose exec web python manage.py shell
```


