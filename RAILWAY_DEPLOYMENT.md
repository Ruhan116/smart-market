# Railway Deployment Guide

This guide walks you through deploying your Django backend to Railway.

## Prerequisites

1. **GitHub Account**: Your repository is already on GitHub (https://github.com/Ruhan116/smart-market)
2. **Railway Account**: Create one at https://railway.app
3. **Railway CLI** (optional, but helpful): `npm install -g @railway/cli`

---

## Step 1: Set Up Railway Project

### Option A: Using Railway Dashboard (Easiest)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub"**
4. Connect your GitHub account when prompted
5. Select the repository: `Ruhan116/smart-market`
6. Railway will automatically detect the root `railway.json` and Dockerfile

### Option B: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create a new project in your repo directory
cd /path/to/your/repo
railway init

# Follow the prompts
```

---

## Step 2: Configure Environment Variables

Railway needs environment variables for your Django app to work properly.

### In Railway Dashboard:

1. Go to your project → **Variables** (or **Settings**)
2. Add these environment variables:

```
DJANGO_SECRET_KEY=your-secret-key-here
DJANGO_DEBUG=False
DATABASE_URL=will-be-set-automatically
ALLOWED_HOSTS=your-domain.railway.app
```

### Critical Variables Explained:

- **DJANGO_SECRET_KEY**: Generate a new secret key for production
  ```bash
  # Generate using Python
  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
  ```

- **DJANGO_DEBUG**: Must be `False` for production
- **DATABASE_URL**: Railway will automatically provide this when you add a PostgreSQL service
- **ALLOWED_HOSTS**: Set to your Railway domain

---

## Step 3: Add PostgreSQL Database (Recommended)

Railway's built-in SQLite won't persist data properly. Add PostgreSQL:

1. In your Railway project dashboard, click **"Add Service"** or **"+"**
2. Select **PostgreSQL**
3. Railway will automatically:
   - Create a PostgreSQL instance
   - Set the `DATABASE_URL` environment variable
   - Update your Django app to use the Postgres database

---

## Step 4: Deploy

### Using Dashboard:
1. Click the **Deploy** button
2. Watch the logs in the **Deployments** tab
3. Railway will:
   - Build the Docker image
   - Run migrations automatically (via Procfile `release` command)
   - Start your Django app with Gunicorn

### Using CLI:
```bash
railway deploy
```

---

## Step 5: View Your App

1. In your Railway project, click on the **web** service
2. Find the **Service Domain** (e.g., `smart-market-production.up.railway.app`)
3. Visit `https://your-domain.up.railway.app/api/` to verify

---

## Step 6: Update Frontend CORS Settings

Update your `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS` for your frontend:

In `backend/project/settings.py`:

```python
# Add your frontend domain
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://your-frontend-domain.com',  # Add your frontend URL
]

# Update ALLOWED_HOSTS
ALLOWED_HOSTS = ['your-railway-domain.up.railway.app']
```

---

## Troubleshooting

### Logs Not Showing?
Check Railway's deployment logs:
1. Project → Deployments tab
2. Click on the deployment
3. View full logs

### Database Connection Error
- Ensure PostgreSQL service is added to your project
- Check that DATABASE_URL is in environment variables
- Run migrations manually if needed: `railway run python manage.py migrate`

### Static Files Not Working
Railway uses `whitenoise` (already in requirements.txt) to serve static files. Ensure:
```python
# In settings.py
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
```

### Secret Key Issues
Generate a new secret key and add it to environment variables:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Memory/Storage Limits
- Free tier: 100 MB disk, limited resources
- For production, consider upgrading to a paid plan
- Monitor resource usage in Railway dashboard

---

## Production Checklist

- [ ] DJANGO_DEBUG = False
- [ ] DJANGO_SECRET_KEY set (not default)
- [ ] PostgreSQL database added
- [ ] ALLOWED_HOSTS configured
- [ ] CORS_ALLOWED_ORIGINS set for your frontend
- [ ] Static files configured
- [ ] Environment variables set
- [ ] Database migrations ran successfully
- [ ] Tested API endpoints
- [ ] Checked Railway logs for errors

---

## Next Steps

1. **Frontend Deployment**: Deploy your React frontend to Vercel or Netlify
2. **Custom Domain**: Add a custom domain in Railway settings
3. **Environment Management**: Consider using Railway templates for multiple environments (dev, staging, prod)

---

## Useful Commands

```bash
# View logs locally
railway logs

# Run migrations
railway run python manage.py migrate

# Create superuser
railway run python manage.py createsuperuser

# Access shell
railway run python manage.py shell

# Check for errors
railway status
```

---

## Support

- Railway Docs: https://docs.railway.app
- Django Deployment Docs: https://docs.djangoproject.com/en/stable/howto/deployment/
- Issues: Check your Railway project's deployment logs
