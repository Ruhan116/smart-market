# 🚀 Quick Deploy - Django Backend

Your Django backend is ready to deploy! Choose your platform:

## ⚡ Fastest Path: Render (Recommended)

1. **Push to GitHub** (if not already)
   ```bash
   git add .
   git commit -m "Prepare backend for deployment"
   git push origin main
   ```

2. **Deploy to Render**
   - Go to: https://render.com/dashboard
   - Click: **New +** → **Blueprint**
   - Connect repo: `smart-market`
   - Click: **Apply** ✅
   - Wait 3-5 minutes ⏱️

3. **Generate Secret Key**
   ```bash
   cd backend
   python generate_secret_key.py
   ```
   Copy the output and add to Render environment variables.

4. **Set Environment Variables** in Render Dashboard
   ```
   DJANGO_SECRET_KEY=<from-step-3>
   ALLOWED_HOSTS=your-app.onrender.com
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```

5. **Create Admin User** (in Render Shell)
   ```bash
   python manage.py createsuperuser
   ```

6. **Done!** 🎉
   - Backend: `https://your-app.onrender.com`
   - Admin: `https://your-app.onrender.com/admin/`
   - API: `https://your-app.onrender.com/api/`

---

## 🚂 Alternative: Railway

1. **Push to GitHub** (if not already)

2. **Deploy to Railway**
   - Go to: https://railway.app/new
   - Click: **Deploy from GitHub repo**
   - Select: `smart-market`

3. **Add PostgreSQL**
   - Click: **+ New** → **Database** → **PostgreSQL**

4. **Configure Service**
   - Root Directory: `backend`
   - Start Command: `gunicorn project.wsgi:application --bind 0.0.0.0:$PORT --workers 2`
   - Build Command: `pip install -r requirements.txt && python manage.py migrate && python manage.py collectstatic --no-input`

5. **Set Environment Variables**
   ```
   DJANGO_SECRET_KEY=<generate-using-generate_secret_key.py>
   DJANGO_DEBUG=False
   ALLOWED_HOSTS=your-project.up.railway.app
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   ```

6. **Create Admin User** (in Railway Shell)
   ```bash
   python manage.py createsuperuser
   ```

7. **Done!** 🎉

---

## 📋 Files Created for Deployment

✅ All ready to go:
- `render.yaml` - Render Blueprint (infrastructure as code)
- `railway.json` - Railway configuration
- `build.sh` - Build script for migrations & static files
- `runtime.txt` - Python version (3.11.0)
- `Dockerfile` - Updated for production with gunicorn
- `requirements.txt` - Updated with gunicorn + whitenoise
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `generate_secret_key.py` - Secret key generator
- `.env.example` - Updated with production variables

✅ Settings updated:
- WhiteNoise for static files
- Environment-driven ALLOWED_HOSTS
- Environment-driven CORS_ALLOWED_ORIGINS
- Production-ready database config

---

## 🔍 What Happens During Deployment?

1. **Build Phase**
   - Install Python 3.11
   - Install dependencies from `requirements.txt`
   - Run `collectstatic` (collect static files)
   - Run `migrate` (apply database migrations)

2. **Runtime**
   - Start Gunicorn WSGI server
   - Connect to PostgreSQL database
   - Serve API on HTTPS
   - Handle static files with WhiteNoise

---

## 🔗 Connect Frontend

After backend is deployed:

1. **Get your backend URL**
   - Render: `https://your-app.onrender.com`
   - Railway: `https://your-project.up.railway.app`

2. **Update Vercel (Frontend)**
   - Go to: Vercel → Project → Settings → Environment Variables
   - Add: `VITE_API_URL=https://your-backend-url`
   - Redeploy frontend

3. **Update Backend CORS**
   - Add your Vercel URL to `CORS_ALLOWED_ORIGINS`
   - Example: `https://my-frontend.vercel.app`

---

## 🆘 Need Help?

- 📖 Full Guide: `DEPLOYMENT.md`
- ✅ Checklist: `DEPLOYMENT_CHECKLIST.md`
- 🔐 Generate Key: `python generate_secret_key.py`

---

## 📊 Cost

Both platforms offer free tiers:
- **Render Free:** Web service spins down after 15 min inactivity
- **Railway Free:** $5 credit/month

Perfect for development and small projects!

---

**Ready to deploy?** Pick Render or Railway and follow the steps above! 🚀

