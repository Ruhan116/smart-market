# Deployment Summary: Backend on Railway + Frontend on Vercel

Quick reference for getting your `VITE_API_URL` and deploying everything.

## 🚀 Quick Setup Steps

### 1. Get Your Railway Backend Domain

After deploying to Railway:

1. Go to https://railway.app
2. Open your **smart-market** project
3. Click the **web** service
4. Look for **Service Domain** (e.g., `smart-market-production-abc123.up.railway.app`)

**Your API URL:** `https://smart-market-production-abc123.up.railway.app/api`

---

### 2. Deploy Frontend to Vercel

1. Go to https://vercel.com
2. Click **"New Project"**
3. Select **smart-market** repository
4. Set **Root Directory** to `frontend`
5. Click **"Deploy"**

---

### 3. Add Environment Variable to Vercel

1. In Vercel dashboard → **Settings** → **Environment Variables**
2. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://smart-market-production-abc123.up.railway.app/api` (your Railway domain)
3. Select all environments
4. Save and redeploy

---

### 4. Update Django CORS Settings

Update `backend/project/settings.py` with your Vercel domain:

```python
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://your-vercel-domain.vercel.app',  # Add this
    ]
```

Then push to GitHub (Railway auto-deploys).

---

## 📋 Complete Checklist

### Backend (Railway)
- [ ] Push commits to GitHub
- [ ] Check deployment status at https://railway.app
- [ ] Note down your **Service Domain**
- [ ] Add `VITE_API_URL` to frontend env vars

### Frontend (Vercel)
- [ ] Connect GitHub repo
- [ ] Set root directory to `frontend`
- [ ] Add `VITE_API_URL` environment variable
- [ ] Deployment completes successfully

### Django Settings
- [ ] Update `CORS_ALLOWED_ORIGINS` with Vercel domain
- [ ] Push changes to GitHub
- [ ] Railway auto-redeploys

---

## 🔗 Important URLs

Replace `xxx` with your actual domains:

| Service | Type | URL |
|---------|------|-----|
| Backend | API | `https://smart-market-xxx.up.railway.app/api` |
| Frontend | App | `https://smart-market-xxx.vercel.app` |
| Admin | Django | `https://smart-market-xxx.up.railway.app/admin` |

---

## 📝 Frontend Configuration

Your frontend already has the right setup in `frontend/src/services/api.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
```

It automatically uses:
- `VITE_API_URL` if set (production/Vercel)
- Fallback to `http://localhost:8000/api` (local development)

**No code changes needed!**

---

## 🐛 Troubleshooting

### CORS Error
- Update `CORS_ALLOWED_ORIGINS` in Django with your Vercel domain
- Wait for Railway to redeploy
- Clear browser cache (Ctrl+Shift+Del)

### 404 API Errors
- Check that `VITE_API_URL` is set in Vercel environment variables
- Verify the value matches your Railway domain exactly
- Redeploy Vercel after changing env vars

### 401 Unauthorized
- Login might be failing
- Check browser DevTools → Network tab for auth errors
- Ensure backend is running and responding

### Blank Page
- Check browser console for JavaScript errors
- Verify `VITE_API_URL` is being read (DevTools → Console)
- Check Vercel deployment logs

---

## 📚 Detailed Guides

- **Backend Deployment**: See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)
- **Frontend Deployment**: See [FRONTEND_DEPLOYMENT_VERCEL.md](FRONTEND_DEPLOYMENT_VERCEL.md)

---

## 🎯 Local Development

For local testing before production:

```bash
# Terminal 1: Backend
cd backend
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev
```

Frontend will be at `http://localhost:8080` and use the local backend at `http://localhost:8000/api`.

---

## ✅ Verification

Once deployed, test with:

```bash
# Test backend API
curl https://your-railway-domain.up.railway.app/api/

# Test frontend
Visit: https://your-vercel-domain.vercel.app
```

If you see the app load and can interact with data, everything is working!
