# Frontend Deployment on Vercel Guide

This guide will help you deploy your React frontend to Vercel and connect it to your Railway backend.

## Step 1: Get Your Railway Backend Domain

Your frontend needs to know where your backend is deployed. Here's how to find it:

### Option A: Using Railway Dashboard

1. Go to https://railway.app
2. Open your **smart-market** project
3. Click on the **web** service (your Django backend)
4. Look for **Service Domain** (should look like: `smart-market-production-xxxx.up.railway.app`)
5. Your full API URL will be: `https://smart-market-production-xxxx.up.railway.app/api`

### Option B: Check via Railway CLI

```bash
railway link
railway status
```

This will show your service domain.

---

## Step 2: Prepare Frontend for Deployment

Your frontend is already configured to use environment variables! The API service file (`frontend/src/services/api.ts`) already reads:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

This means it will use:
- `VITE_API_URL` environment variable if set (production)
- Fallback to `http://localhost:8000/api` if not set (local development)

No code changes needed!

---

## Step 3: Deploy to Vercel

### Option A: Using Vercel Dashboard (Easiest)

1. Go to https://vercel.com
2. Sign up or log in with GitHub
3. Click **"New Project"**
4. Select your **smart-market** repository
5. In **Settings** → **Root Directory**, set it to `frontend`
6. Click **"Deploy"**

Vercel will detect Vite and build automatically.

### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from your project root
vercel --cwd=frontend

# Follow the prompts
```

---

## Step 4: Add Environment Variables in Vercel

After deployment, add your Railway backend URL:

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-railway-domain.up.railway.app/api`
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**
5. Redeploy (or wait for auto-redeployment)

**Example:**
```
VITE_API_URL=https://smart-market-production-abc123.up.railway.app/api
```

---

## Step 5: Update Backend CORS Settings

Your Django backend needs to allow requests from your Vercel domain.

1. Go to your Railway project
2. Click on the **web** service
3. Go to **Variables**
4. Update `CORS_ALLOWED_ORIGINS` to include your Vercel domain

**In your code**, edit `backend/project/settings.py`:

```python
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://your-vercel-domain.vercel.app',  # Add your Vercel URL here
    ]
```

---

## Step 6: Verify Everything Works

1. Visit your Vercel URL: `https://your-project.vercel.app`
2. Log in to your app
3. Check browser console (F12 → Console) for any errors
4. Test an API call (e.g., navigate to a page that fetches data)
5. If it works, you should see data loading

### Troubleshooting API Calls

**Check the Network tab (F12 → Network):**
- Look for requests to your Railway API
- Check if they're successful (200 status)
- If you see CORS errors, update `CORS_ALLOWED_ORIGINS` in Django

---

## Complete Checklist

### Railway Backend:
- [ ] Backend deployed on Railway
- [ ] PostgreSQL database connected
- [ ] `DJANGO_DEBUG=False`
- [ ] `DJANGO_SECRET_KEY` set
- [ ] Service domain available
- [ ] Migrations ran successfully

### Vercel Frontend:
- [ ] Repository connected
- [ ] Root directory set to `frontend`
- [ ] `VITE_API_URL` environment variable set
- [ ] Deployment successful
- [ ] Vercel domain accessible

### Django Settings:
- [ ] `CORS_ALLOWED_ORIGINS` includes Vercel domain
- [ ] `ALLOWED_HOSTS` includes Railway domain
- [ ] Static files serving working (if needed)

---

## Useful Links

- **Railway**: https://railway.app
- **Vercel**: https://vercel.com
- **Vite Docs**: https://vitejs.dev
- **Vite Environment Variables**: https://vitejs.dev/guide/env-and-mode

---

## Environment Variable Examples

Here's what your variables should look like:

### Railway (Backend)
```
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
ALLOWED_HOSTS=your-railway-domain.up.railway.app
DATABASE_URL=postgres://...
CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

### Vercel (Frontend)
```
VITE_API_URL=https://your-railway-domain.up.railway.app/api
```

---

## Common Issues & Solutions

### Issue: "API is undefined" or 404 errors
**Solution**: Check that `VITE_API_URL` is set correctly in Vercel environment variables

### Issue: CORS errors (Access-Control-Allow-Origin)
**Solution**: Add your Vercel domain to `CORS_ALLOWED_ORIGINS` in Django settings

### Issue: 401 Unauthorized errors
**Solution**: Make sure your authentication tokens are being sent correctly (should be automatic via interceptors)

### Issue: Static files not loading
**Solution**: Ensure `STATIC_URL` is set correctly in Django settings and whitenoise is installed

---

## Redeployment Tips

If you make changes to your code:

**Backend changes:**
1. Push to GitHub
2. Railway automatically redeploys

**Frontend changes:**
1. Push to GitHub
2. Vercel automatically redeploys

**Environment variable changes:**
1. Update in Vercel/Railway dashboard
2. Trigger a redeployment manually
