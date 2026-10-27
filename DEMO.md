# EduCompass — Local Demo Guide (F7)
*Last updated: 2026-10-26 | Built by Ram (syed.hurraim898@gmail.com)*

---

## 🚀 Start Everything (Two Terminals)

Open **Terminal 1** — Express API:
```powershell
cd C:\Users\syedh\.gemini\antigravity\scratch\educompass
pnpm dev:api
```
Expect: `✅ EduCompass API v1.0 running on http://localhost:4000`

Open **Terminal 2** — Next.js Web:
```powershell
cd C:\Users\syedh\.gemini\antigravity\scratch\educompass
pnpm dev:web
```
Expect: `✓ Ready in Xs` → open http://localhost:3000

---

## ✅ Smoke Test (all routes in one shot)

With both servers running:
```powershell
node scripts/smoke-test.mjs
```
Expected output: `🎉 All smoke tests passed! EduCompass is fully operational.`

---

## 🗺️ Demo Walkthrough (Tester's Route)

### 1. Landing Page — http://localhost:3000
- Hero with stats (68 FYPs, 16 professors, 12 career tracks)
- 8 feature cards with hover animations
- CTAs: Dashboard / Browse FYP / Sign In

### 2. Sign Up / Sign In — http://localhost:3000/signup
- Create account with any email + password
- Supabase Auth — profile row auto-created via DB trigger
- Log in and land on Dashboard

### 3. Dashboard — http://localhost:3000/dashboard
- All 8 feature cards with links
- Academic profile snapshot (email, role, semester)
- Admin badge shown if logged in as admin

### 4. FYP Portal — http://localhost:3000/fyp ⭐ Card M1
- **Tab 1 — Browse FYP Archive:**
  - Filter by year / domain / outcome
  - Click card → Project details modal
  - ☆ Star to shortlist (saved to Supabase)
  - Click **✨ Similar FYPs** → similarity drawer with % match
- **Tab 2 — Team Formation Board:**
  - Browse open teammate requests
  - Click **+ Pitch Your Team Idea** → form modal
  - Contact lead via mailto: button (Rule #12)

### 5. Professor Directory — http://localhost:3000/professors ⭐ Card M2
- 16 faculty profiles with research domains
- AI match score bar (domain + area + keyword overlap)
- Click profile → modal with supervised FYPs, expertise
- "Request Supervision" → pre-filled mailto: draft

### 6. Degree Planner — http://localhost:3000/planner ⭐ Card M3
- 8-semester grid — add/remove courses per semester
- Live prerequisite violation pills
- Workload badge: Light / Balanced / Overload
- Export button → JSON schedule to clipboard

### 7. Prerequisite Explorer — http://localhost:3000/explorer ⭐ Card H2
- React Flow DAG of full NED CISE course graph
- What-If panel → simulate failing a course → cascade effects

### 8. AI Academic Chatbot — http://localhost:3000/chat ⭐ Card H3
- Ask: "What is the minimum CGPA to graduate?"
- 4-layer response: preloaded → retrieval → Gemini → fallback
- Layer indicator and source shown per answer
- Hard 300-char input limit enforced

### 9. GPA Calculator — http://localhost:3000/gpa
- Enter course grades → semester GPA computed instantly
- What-If: simulate improving a grade → see CGPA change

### 10. Career Hub — http://localhost:3000/careers
- 12 career tracks with skill maps
- Track detail modal with role descriptions

### 11. Admin Console — http://localhost:3000/admin *(admin only)*
- Login as: `cursor.pro.test124@gmail.com`
- Review queue: Extracted → Approved → Published
- Audit log, bulk actions, deletion request processor

---

## 🔑 F5 — Vercel Deployment Requirements

> **Current goal is working localhost.** Use this section when you're ready to go live.

### Step 1 — Vercel Account (FREE)
Go to https://vercel.com → Sign up with GitHub

### Step 2 — Push to GitHub
```powershell
git init
git add .
git commit -m "feat: EduCompass FYP 2026 complete"
git remote add origin https://github.com/YOUR_USERNAME/educompass.git
git push -u origin main
```

### Step 3 — Vercel Project Settings
| Setting | Value |
|---|---|
| Framework | Next.js (auto-detected) |
| Root Directory | `apps/web` |
| Build Command | `cd ../.. && pnpm build --filter=@educompass/web...` |
| Node.js version | 20.x |

### Step 4 — Vercel Environment Variables (safe/public ones only)
| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from your `.env` | Public — safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from your `.env` | Public — safe |
| `NEXT_PUBLIC_SITE_URL` | `https://yourapp.vercel.app` | Set after first deploy |
| `NEXT_PUBLIC_API_URL` | `https://your-api.onrender.com` | After Express deploy |

> ⚠️ **Rule #11**: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY` NEVER go in `NEXT_PUBLIC_` vars. They live only on Render.

### Step 5 — Deploy Express API to Render (FREE)
1. Go to https://render.com → New **Web Service**
2. Connect the same GitHub repo, **Root Directory**: `apps/api`
3. **Build**: `pnpm install --frozen-lockfile && pnpm build`
4. **Start**: `pnpm start`
5. **Environment Variables** (server-only):

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Your `.env` (the https://... URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Your `.env` |
| `GEMINI_API_KEY` | Your `.env` |
| `XAI_API_KEY` | Your `.env` |
| `ALLOWED_ORIGINS` | Your Vercel URL |
| `NODE_ENV` | `production` |
| `LLM_MAX_INPUT_CHARS` | `300` |
| `LLM_MAX_OUTPUT_TOKENS` | `500` |
| `LLM_USER_DAILY_LIMIT` | `20` |
| `LLM_GLOBAL_DAILY_BUDGET` | `100` |

### Step 6 — Supabase Auth Redirect URLs
In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://yourapp.vercel.app`
- **Redirect URLs**: Add `https://yourapp.vercel.app/**`

---

## 🔬 Security Features Active (F6)

| Feature | Status |
|---|---|
| CSP / HSTS / X-Frame / nosniff headers (Next.js) | ✅ |
| Helmet.js on Express | ✅ |
| CORS strict allow-list | ✅ |
| Auth rate limiter: 10 req / 15 min | ✅ |
| Chat rate limiter: 30 req / 15 min | ✅ |
| Write rate limiter: 60 req / 15 min | ✅ |
| Request sanitizer (null bytes, control chars) | ✅ |
| 10kb request body cap | ✅ |
| Security event logger (no secrets) | ✅ |
| Error sanitizer (no stack traces in prod) | ✅ |
| Supabase RLS on all tables | ✅ |
| JWT + requireRole() on all protected routes | ✅ |

---

## 📋 Final Card Status

| Card | Feature | Status |
|---|---|---|
| F1 | Monorepo scaffold | ✅ Done |
| F2 | Database schema + migrations | ✅ Done |
| F3 | Supabase Auth + requireRole | ✅ Done |
| F5 | Deployment guide | 📋 Guide above |
| **F6** | **Security hardening** | ✅ Done |
| **F7** | **Integration + demo** | ✅ Done |
| E1 | Design system | ✅ Done |
| E2 | Career Hub | ✅ Done |
| E3 | Legal pages | ✅ Done |
| E4 | GPA Calculator | ✅ Done |
| E5 | FYP Portal v1 | ✅ Done |
| H1 | Prerequisite Engine | ✅ Done |
| H2 | Prerequisite Explorer | ✅ Done |
| H3 | AI Chatbot | ✅ Done |
| M1 | FYP Advanced (similarity + team board) | ✅ Done |
| M2 | Professor Directory | ✅ Done |
| M3 | Student Planner | ✅ Done |
| M4 | Admin Console | ✅ Done |
