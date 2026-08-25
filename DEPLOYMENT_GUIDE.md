# 🚀 Portfolia - Production Deployment Guide

This guide walks you through deploying **Portfolia** live using **Vercel** (Frontend) + **Render / Railway** (Backend) + **Supabase / Neon** (Free Cloud PostgreSQL).

---

## 🛠 Architecture Overview
- **Frontend**: Next.js 14 App Router → Hosted on **[Vercel](https://vercel.com)** (Free Tier)
- **Backend**: FastAPI + SLSQP Optimizer + Gemini LLM → Hosted on **[Render](https://render.com)** or **[Railway](https://railway.app)** (Free Tier)
- **Database**: Cloud PostgreSQL → Hosted on **[Supabase](https://supabase.com)** or **[Neon](https://neon.tech)** (Free Tier)

---

## Step 1: Push Code to GitHub

Open your terminal in `/Users/aadeshchourasiya/Desktop/financial-ai-agent` and run:

```bash
git init
git add .
git commit -m "feat: complete Portfolia full-stack with real Gemini AI intelligence"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/portfolia.git
git push -u origin main
```

---

## Step 2: Set Up Free Cloud PostgreSQL (Supabase / Neon)

1. Go to **[Supabase](https://supabase.com)** (or Neon) and create a new project named `portfolia`.
2. Copy your **PostgreSQL Connection String** from *Project Settings → Database → Connection String (URI)*:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```

---

## Step 3: Deploy Backend (on Render / Railway)

### Using Render (Recommended):
1. Sign in to **[Render](https://dashboard.render.com)**.
2. Click **New +** → **Web Service** → Connect your GitHub repo.
3. Configure the service settings:
   - **Name**: `portfolia-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables** in Render:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@...` (From Step 2) |
   | `SECRET_KEY` | `your_secret_jwt_key_2026_prod` |
   | `GEMINI_API_KEY` | `your_google_gemini_api_key` |
   | `GEMINI_FALLBACK_API_KEY` | `your_fallback_gemini_api_key` |
   | `GEMINI_MODEL` | `gemini-3.6-flash` |
   | `SMTP_SERVER` | `smtp.gmail.com` |
   | `SMTP_PORT` | `587` |
   | `SMTP_USER` | `portfolia.yourportfoliomanager@gmail.com` |
   | `SMTP_PASSWORD` | `your_smtp_app_password` |
   | `EMAILS_FROM_NAME` | `Portfolia` |
   | `EMAILS_FROM_EMAIL` | `portfolia.yourportfoliomanager@gmail.com` |
5. Click **Create Web Service**.
6. Once deployed, copy your backend live URL:
   `https://portfolia-backend.onrender.com`

---

## Step 4: Deploy Frontend (on Vercel)

1. Sign in to **[Vercel](https://vercel.com)**.
2. Click **Add New...** → **Project** → Select your `portfolia` repository.
3. In Project Configuration:
   - **Root Directory**: Click `Edit` and select **`frontend`**.
   - **Framework Preset**: `Next.js`
4. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://portfolia-backend.onrender.com` (Your Render Backend URL from Step 3) |
5. Click **Deploy**!

---

## Step 5: Verification & Live URL
- Once Vercel finishes building, your app is live worldwide with SSL (e.g. `https://portfolia.vercel.app`)!
- Try signing up, receiving verification emails, building Markowitz portfolios, and chatting with the Financial Copilot!
