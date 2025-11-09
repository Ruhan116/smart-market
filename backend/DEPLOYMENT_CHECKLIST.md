# 🚀 Backend Deployment Checklist

## Pre-Deployment

- [ ] Push your code to GitHub
- [ ] Review `DEPLOYMENT.md` for detailed instructions
- [ ] Generate Django SECRET_KEY: `python generate_secret_key.py`
- [ ] Choose deployment platform (Render or Railway)

---

## Render Deployment Steps

### Quick Deploy (Using Blueprint)
1. [ ] Go to https://render.com/dashboard
2. [ ] Click "New +" → "Blueprint"
3. [ ] Connect GitHub repo: `smart-market`
4. [ ] Render detects `render.yaml` automatically
5. [ ] Review services: web service + PostgreSQL
6. [ ] Click "Apply"
7. [ ] Wait 3-5 minutes for initial deploy
8. [ ] Update environment variables (see below)

### Environment Variables (Render)
- [ ] `DJANGO_SECRET_KEY` - Use generate_secret_key.py
- [ ] `DJANGO_DEBUG` = `False`
- [ ] `DATABASE_URL` - Auto-set by Render
- [ ] `ALLOWED_HOSTS` = `your-app.onrender.com`
- [ ] `CORS_ALLOWED_ORIGINS` = `https://your-frontend.vercel.app`

### Post-Deploy (Render)
- [ ] Open Shell in Render dashboard
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Test admin: `https://your-app.onrender.com/admin/`
- [ ] Test API: `https://your-app.onrender.com/api/`

---

## Railway Deployment Steps

### Setup
1. [ ] Go to https://railway.app/new
2. [ ] Click "Deploy from GitHub repo"
3. [ ] Select `smart-market` repository
4. [ ] Railway detects Python automatically

### Add Database
1. [ ] In project, click "+ New"
2. [ ] Select "Database" → "Add PostgreSQL"
3. [ ] `DATABASE_URL` is auto-created

### Configure Service
1. [ ] Click your service → Settings
2. [ ] Set Root Directory: `backend`
3. [ ] Set Start Command: `gunicorn project.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
4. [ ] Set Build Command: `pip install -r requirements.txt && python manage.py collectstatic --no-input && python manage.py migrate`

### Environment Variables (Railway)
- [ ] `DJANGO_SECRET_KEY` - Use generate_secret_key.py
- [ ] `DJANGO_DEBUG` = `False`
- [ ] `DATABASE_URL` - Auto-set from PostgreSQL
- [ ] `ALLOWED_HOSTS` = `your-project.up.railway.app`
- [ ] `CORS_ALLOWED_ORIGINS` = `https://your-frontend.vercel.app`
- [ ] `PYTHON_VERSION` = `3.11.0`

### Post-Deploy (Railway)
- [ ] Go to service → Deployments (wait for success)
- [ ] Open Shell
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Test admin: `https://your-project.up.railway.app/admin/`
- [ ] Test API: `https://your-project.up.railway.app/api/`

---

## Connect Frontend

### Update Vercel Environment Variables
1. [ ] Go to Vercel project → Settings → Environment Variables
2. [ ] Add/Update: `VITE_API_URL` = `https://your-backend-url`
3. [ ] Redeploy frontend

### Update Backend CORS
- [ ] Add frontend URL to `CORS_ALLOWED_ORIGINS` in backend env vars
- [ ] Format: `https://your-frontend.vercel.app` (no trailing slash)

---

## Verification

- [ ] Backend deployed successfully
- [ ] Database connected and migrations applied
- [ ] Admin panel accessible and login works
- [ ] API endpoints responding
- [ ] Frontend can call backend API
- [ ] No CORS errors in browser console
- [ ] Static files loading correctly

---

## Troubleshooting

### Build Fails
- Check Python version matches `runtime.txt` (3.11.0)
- Verify all dependencies in `requirements.txt`
- Check build logs for specific errors

### Database Issues
- Confirm `DATABASE_URL` is set
- Check database service is running
- Try manual migration: `python manage.py migrate`

### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL
- No trailing slashes in URLs
- Check middleware order in settings.py

### 500 Errors
- Temporarily set `DJANGO_DEBUG=True` to see detailed errors
- Check application logs in dashboard
- Verify all environment variables are set

---

## Next Steps

- [ ] Set up custom domain (optional)
- [ ] Configure monitoring/alerts
- [ ] Set up automated backups
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Configure logging service (Sentry, etc.)

---

## Useful Commands

Generate secret key:
```bash
cd backend
python generate_secret_key.py
```

Test local build:
```bash
cd backend
pip install -r requirements.txt
python manage.py check
python manage.py collectstatic --no-input
gunicorn project.wsgi:application --bind 0.0.0.0:8000
```

---

## Support Links

- 📚 Render Docs: https://render.com/docs
- 📚 Railway Docs: https://docs.railway.app
- 📚 Django Deployment: https://docs.djangoproject.com/en/stable/howto/deployment/
- 📖 Full Guide: See `DEPLOYMENT.md`

