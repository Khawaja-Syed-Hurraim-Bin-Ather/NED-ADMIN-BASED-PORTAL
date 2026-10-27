# EduCompass — Master Project Handover & Depth Checklist
**Last Updated:** October 25, 2026  
**Solo Developer:** Syed Hurraim (Ram) — `syed.hurraim898@gmail.com`  
**Source of Truth:** SRS v1.0 (19 Oct 2026), NED University, Dept. of CISE  

---

## 1. Quick Start Commands (Any IDE / Terminal)

```bash
# 1. Install dependencies
pnpm install

# 2. Run all tests across the entire monorepo (Vitest)
pnpm test

# 3. Run TypeScript typecheck across all 6 packages
pnpm --recursive typecheck

# 4. Build Next.js 15 Web production bundle (20 routes)
pnpm --filter @educompass/web build

# 5. Start development servers
# Web (Next.js 15): http://localhost:3000
pnpm --filter @educompass/web dev

# API (Express REST): http://localhost:4000
pnpm --filter @educompass/api dev
```

---

## 2. Monorepo Architecture (D1 SRS-Literal)

```
educompass/
├── apps/
│   ├── web/                    # Next.js 15 (App Router, Tailwind CSS, React Flow)
│   │   ├── src/app/
│   │   │   ├── (auth)/         # /login, /signup, /forgot-password, /auth/callback
│   │   │   ├── dashboard/      # Authenticated student hub
│   │   │   ├── fyp/            # FYP Portal (search, filters, shortlists)
│   │   │   ├── recommendations/# GitHub FYP Recommendations (CS vs CSE, industry readiness)
│   │   │   ├── gpa/            # GPA Calculator & What-If Planner
│   │   │   ├── explorer/       # Prerequisite Explorer (React Flow @xyflow/react)
│   │   │   ├── careers/        # Career Hub (12 tech roadmap tracks)
│   │   │   ├── chat/           # 4-Layer AI Academic Chatbot
│   │   │   ├── admin/          # Admin Console (FYP review queue, audit logs)
│   │   │   ├── settings/       # Profile preferences & Rule 9 deletion requests
│   │   │   ├── help/           # Help Centre (18 searchable FAQs)
│   │   │   ├── terms/          # Terms & Disclaimer (Rule 13 compliance)
│   │   │   └── privacy/        # Privacy Policy (RLS, local GPA calculation)
│   │   └── middleware.ts       # Supabase session refresh & route protection
│   │
│   └── api/                    # Express 4 REST API (/api/v1/...)
│       ├── src/routes/
│       │   ├── account.ts      # Profile management & deletion requests
│       │   ├── fyp.ts          # FYP search, domain filter, shortlists
│       │   ├── careers.ts      # Career tracks & roadmap steps
│       │   ├── admin.ts        # Review queue, batch actions, audit logs
│       │   ├── chat.ts         # 4-layer chatbot engine & suggestions
│       │   └── prereq.ts       # DAG validation, eligibility, failure simulator
│       ├── src/lib/
│       │   ├── llm-gateway.ts  # THE ONLY FILE calling LLMs (Rules 3, 4, 14, 15)
│       │   └── supabase.ts     # Supabase admin service client
│       └── src/middleware/
│           └── auth.ts         # requireRole('enrolled' | 'admin') guard
│
├── packages/
│   ├── shared/                 # Zod schemas, TypeScript contracts, apiError helper
│   ├── engine/                 # Pure TypeScript prerequisite engine (no I/O)
│   ├── gpa/                    # Pure TypeScript GPA engine & transcript parser
│   └── ui/                     # Design system atoms, molecules & DisclaimerBanner
│
├── pipeline/                   # Python ETL (Offline only, never called at runtime)
│   ├── raw/                    # 5 FYP PDFs, 9 Roadmap PDFs, Detailed Syllabi PDF
│   └── core/                   # Profiler (Phase 0), Extractor (Phase 1), Loader (Phase 2)
│
├── docs/                       # Specifications, ingestion playbooks, course charts
└── supabase/migrations/        # 4 SQL migrations applied to PostgreSQL
```

---

## 3. The 15 Non-Negotiable Rules (AGENTS.md)

| # | Rule | Status | Where Enforced |
|---|---|---|---|
| **1** | **No live scraping at runtime** | ✅ Obeyed | All data extracted offline via `pipeline/core/loader.py` |
| **2** | **No unreviewed data reaches users** | ✅ Obeyed | Records: `extracted` → `approved` → `published`. Anon users see only `published` |
| **3** | **Zero PII sent to LLM** | ✅ Obeyed | Regex scrubber in `apps/api/src/lib/llm-gateway.ts` redacts roll numbers, emails, phones |
| **4** | **Hard LLM caps** | ✅ Obeyed | 300 char input, 500 token output, daily per-user & global budget in `llm-gateway.ts` |
| **5** | **Chatbot works with LLM OFF** | ✅ Obeyed | Layer 1 (preloaded) & Layer 2 (retrieval) answer offline independently |
| **6** | **"I do not have that information"** | ✅ Obeyed | Strict Layer 4 fallback; never hallucinates or guesses |
| **7** | **Scores labeled as Estimates** | ✅ Obeyed | Importance & match scores show 4-part breakdown labeled "Estimate" |
| **8** | **Simulation never alters real data** | ✅ Obeyed | Failure simulator operates on in-memory clone |
| **9** | **No self-delete** | ✅ Obeyed | Users submit deletion requests; Admin completes within 7 days, logged in `audit_log` |
| **10** | **No placeholder content in demo** | ✅ Obeyed | Simulated items labeled "Demo data" |
| **11** | **API keys in server env ONLY** | ✅ Obeyed | Never exposed to client bundles or logged |
| **12** | **Never send email for user** | ✅ Obeyed | `mailto:` links only |
| **13** | **Disclaimer notice on every page** | ✅ Obeyed | `DisclaimerBanner` in root layout + footer/header links to `/terms` |
| **14** | **Scraped text is untrusted data** | ✅ Obeyed | Bounded inside `<context></context>` in system prompts |
| **15** | **Zero live API calls in tests** | ✅ Obeyed | 100% mocked fixtures in test suite |

---

## 4. Master Cards Progress Checklist

### ✅ COMPLETED CARDS (14 Cards Done)

- [x] **Card F1 — Monorepo Scaffold**: pnpm workspaces, TypeScript strict mode, Turbo/Vitest setup.
- [x] **Card F2 — Database Schema**: 4 SQL migrations applied to Supabase (34 tables & views, pgvector enabled).
- [x] **Card F3 — Auth & Access Control**: Supabase Auth, Next.js middleware, `requireRole('enrolled' | 'admin')`, profile settings, deletion requests.
- [x] **Card F4 — Data Pipeline**: Phase 0 profiler, Phase 1 extractor, Phase 2 loader. 68 real FYP records in database.
- [x] **Card E1 — Design System**: `@educompass/ui` with theme tokens, Button, Input, Card, Badge, Alert, Modal, `DisclaimerBanner`.
- [x] **Card E2 — Career Hub**: `/careers` with 12 tech tracks, category filters, curriculum roadmaps, and `/api/v1/careers`.
- [x] **Card E3 — Legal & Help**: Upgraded `/terms`, `/privacy`, and `/help` FAQ (18 Q&As).
- [x] **Card E4 — GPA Calculator**: Semester GPA, Cumulative CGPA, retake policies, and What-If graduation ceiling calculator in `@educompass/gpa` + `/gpa`.
- [x] **Card E5 — FYP Portal v1**: `/fyp` with title/supervisor search, domain filters, bookmark shortlists, and `/api/v1/fyp`.
- [x] **Card E6 — Transcript Parser**: PII-safe CSV/text transcript parser in `@educompass/gpa` (6 unit tests).
- [x] **Card H1 — Prerequisite Engine**: Pure TypeScript engine in `@educompass/engine` with DAG cycle validation, eligibility rules, Rule 8 in-memory failure simulator, Rule 7 importance scoring, and `/api/v1/prereq` (14 unit tests).
- [x] **Card H2 — Prerequisite Explorer**: Interactive React Flow visualizer (`/explorer` using `@xyflow/react`), 8 semester columns, What-If failure simulator, and critical path toggle.
- [x] **Card H3 — 4-Layer AI Chatbot**: `/chat` frontend + `/api/v1/chat` with Layer 1 (instant official), Layer 2 (retrieval), Layer 3 (`llm-gateway.ts` with hard caps), and Layer 4 (strict fallback).
- [x] **Card M4 — Admin Console**: `/admin` portal with FYP review queue, bulk approve/publish/reject, audit log viewer, and deletion request resolver.

---

### ⏳ REMAINING CARDS TO BUILD (7 Cards)

#### 1. **Card M2 — Professor Directory**
* **Goal:** Faculty directory with verified research domains and outreach assistant.
* **Requirements:**
  * Page `/professors` with department filter (CS, SE, CIS).
  * Research area tags matching FYP domains.
  * Professional email outreach modal generating draft email subject and body (Rule 12: `mailto:` link only).
  * API route `/api/v1/professors`.

#### 2. **Card M1 — FYP Advanced (Similarity & Matching)**
* **Goal:** Semantic similarity search against the 68 loaded FYP records + student team matching.
* **Requirements:**
  * Embedding-based similarity search using `pgvector` or keyword cosine overlap.
  * "Find Similar FYPs" button on each project card in `/fyp`.
  * Team formation board where students can list project ideas and required skills.

#### 3. **Card M3 — Student Planner**
* **Goal:** Drag-and-drop semester schedule planner with prerequisite validation.
* **Requirements:**
  * Uses `@educompass/engine` to validate semester course combinations (max 18 credits per semester).
  * Alerts students if they plan a course without completing its prerequisites.
  * Allows exporting plan as PDF or saving to `semester_plans` in Supabase.

#### 4. **Card F5 — First Deployment (Vercel & Render/Railway)**
* **Goal:** Deploy Next.js frontend to Vercel and Express API to Render/Railway.
* **Requirements:**
  * Configure build commands and environment variables on hosting platforms.
  * Verify SSL, CORS, and production Supabase connections.

#### 5. **Card F6 — Security Hardening**
* **Goal:** Production security audit and penetration testing checks.
* **Requirements:**
  * Rate limiting checks on API (`express-rate-limit`).
  * Helmet security headers verification.
  * Supabase RLS penetration test: verify anonymous users cannot read unapproved records or user profiles.

#### 6. **Card F7 — Integration & Demo Polish**
* **Goal:** End-to-end integration walkthrough and final demo script.
* **Requirements:**
  * Seed demo accounts (Student: `student@educompass.edu.pk`, Admin: `admin@educompass.edu.pk`).
  * Verify all 20 routes work smoothly with zero console errors.
  * Rule 10 check: all demo data labeled clearly.

---

## 5. Test Suite Verification Metrics

```
Monorepo Test Results:
- apps/api:         28 passed (7 test files)
- packages/gpa:     21 passed (2 test files)
- packages/engine:   9 passed (1 test file)
- packages/ui:       3 passed (1 test file)
- packages/shared:   3 passed (1 test file)
-----------------------------------------------
TOTAL:              64 passed (100% green)

TypeScript Check:
- packages/shared:  0 errors
- packages/engine:  0 errors
- packages/gpa:     0 errors
- packages/ui:      0 errors
- apps/api:         0 errors
- apps/web:         0 errors
-----------------------------------------------
TOTAL:              0 errors across all 6 packages

Next.js Production Build:
- 20 / 20 static & server routes compiled cleanly
```
