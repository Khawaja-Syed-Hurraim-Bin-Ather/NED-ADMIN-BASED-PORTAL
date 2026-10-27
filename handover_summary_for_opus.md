# EduCompass — Master Handover Document for Claude Opus

**Date:** 25 October 2026  
**Developer:** Ram (syed.hurraim898@gmail.com)  
**Author:** Antigravity (Assistant)  
**Target Agent:** Claude Opus / Antigravity (Next Session)  
**Source of Truth:** SRS v1.0 (19 Oct 2026), `AGENTS.md`, `.agent/STATE.md`, `docs/data/INGESTION_PLAYBOOK.md`

---

## 1. Executive Summary & Current State

- **Current Progress:**
  - **Card F1 (Scaffolding & Infrastructure):** ✅ **DONE**. Monorepo with pnpm workspaces, Next.js 15 App Router (`apps/web`), Express 4 REST API (`apps/api`), FastAPI pipeline (`services/pipeline`), and 4 shared packages (`@educompass/shared`, `@educompass/engine`, `@educompass/gpa`, `@educompass/ui`).
  - **Card F2 (Database Schema & Migrations):** ✅ **DONE & VERIFIED**. All 4 migrations are applied to the live dev Supabase PostgreSQL database. 34 public tables and analytical views are active and verified.
  - **Data Staging & Validation Core:** ✅ **DONE**. 5 FYDP PDFs and 9 Roadmap PDFs staged in `pipeline/raw/`. Controlled vocabularies and the strict Privacy Validator are implemented.
  - **Code Health:** ✅ `pnpm typecheck` (0 errors), `pnpm lint` (0 errors), and `pnpm test` (Vitest passing) across the monorepo.

---

## 2. Key Decisions & Agreements Made with Ram

All golden rules in [AGENTS.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/AGENTS.md) and Decisions D1–D12 in [.agent/STATE.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/.agent/STATE.md) are active:

1. **D6 (Privacy):** Student names and roll numbers are **NEVER** stored anywhere in the database or extraction outputs. Redaction occurs at extraction time.
2. **D7 (Roadmaps):** `data-engineer.pdf` maps into the existing *Data Science* and *Back-End* tracks, not a 13th track.
3. **D8 (Roadmap Progress):** Keyed by `(user_id, track_slug, topic_key)` — not `step_id` — so that switching between variants (e.g. beginner/advanced) preserves completed checkmarks.
4. **D9 (FYDP Status):** Proposal outcome default is **`accepted`** if no status is specified in the list. If status is explicitly present, follow it (`accepted` or `rejected`).
5. **D10 (Programs Scope):** Only computing programs are included:
   - Computer Systems Engineering (CSE / CIS)
   - Computer Science (CS)
   - Software Engineering (SE)  
   All other engineering disciplines are classified as `out_of_scope`.
6. **D11 (Permissions):** Ram granted formal permission to extract and convert the 5 FYDP PDFs for the project. Documented in [PERMISSIONS.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/docs/permissions/PERMISSIONS.md).
7. **D12 (Roadmap Licensing):** All 9 roadmap PDFs are open-source from `roadmap.sh`. Attribute source in the UI and data records.

---

## 3. Database Infrastructure & Supabase Status

- **Project Ref:** `hrzzxtjuiofivnytqldj`
- **Region:** `ap-southeast-2` (Sydney, AWS)
- **IPv4 Connection Pooling:** Direct Supabase hosts (`db.hrzz...supabase.co`) only provide IPv6 `AAAA` records, causing `ENOTFOUND` on standard IPv4 networks. We resolved this by routing through the Supavisor session connection pooler:
  ```text
  postgresql://postgres.hrzzxtjuiofivnytqldj:[PASSWORD]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres
  ```
- **Syncing Secrets:** Run `node scripts/sync-env.js` anytime `.secrets/env.master` is updated. It propagates the correct environment variables to `apps/web/.env.local`, `apps/api/.env.local`, and `services/pipeline/.env` without leaking server secrets into `NEXT_PUBLIC_` variables.
- **Migration Runner:** `node scripts/migrate.js` runs migrations transactionally and tracks applied migrations in the `public._migrations` table.
- **Applied Migrations (in order):**
  1. `20261024000000_init_schema.sql` (Base accounts, RLS, courses, programs, professors, chatbot)
  2. `20261024000001_seed_data.sql` (Universities, sample courses)
  3. `20261025000001_fyp_v2_schema.sql` (FYP v2 fields, companies table, company interest, domain track map, 4 analytics views)
  4. `20261025000002_roadmap_progress.sql` (roadmap steps, roadmap progress)

---

## 4. Repository Layout & Key Files

| Path | Purpose / Description |
|---|---|
| [.agent/STATE.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/.agent/STATE.md) | Project status, active decisions, card tracking |
| [AGENTS.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/AGENTS.md) | Always-on non-negotiable rules for all AI agents |
| [docs/data/INGESTION_PLAYBOOK.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/docs/data/INGESTION_PLAYBOOK.md) | Complete v2 ingestion playbook for FYP & roadmap data |
| [docs/data/fyp_data_dictionary.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/docs/data/fyp_data_dictionary.md) | Full schema and field descriptions for FYP v2 tables |
| [docs/permissions/PERMISSIONS.md](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/docs/permissions/PERMISSIONS.md) | Written licensing and permission audit log |
| `pipeline/raw/fyp/` | 5 raw FYP PDFs (2022 to 2025) — gitignored |
| `pipeline/raw/roadmaps/` | 9 roadmap PDFs from roadmap.sh — gitignored |
| `pipeline/vocab/` | `domains.json`, `tools.json`, `company_aliases.json` |
| `pipeline/core/privacy_validator.py` | Enforces no student names, no forbidden keys, no roll numbers |
| `pipeline/core/test_privacy_validator.py` | Pytest suite testing the privacy validator |
| `scripts/migrate.js` | Safe, idempotent migration runner using pg client |
| `scripts/sync-env.js` | Secrets distributor |
| `packages/shared/` | Shared TypeScript types, schemas (Zod), and API contracts |

---

## 5. Outstanding Blocker

- **Scheme of Studies PDF:**
  - Required for Card H1 (Prerequisite Engine) and Card H2 (Prerequisite Explorer).
  - The course chart JSON ([ned_cse_course_chart.json](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/docs/data/ned_cse_course_chart.json)) has been cross-checked with Ram's chart image, but the official prerequisite rules (which courses are strictly required before taking another) must come from the official NED Scheme of Studies handbook.
  - Ram has been asked to provide this PDF when available. Card H1 remains paused until then, but all other cards can proceed.

---

## 6. Recommended Next Steps for Opus

Opus should present one of two cards and wait for Ram's "go" (per `AGENTS.md` protocol):

### Option A (Recommended): Card F4 / X4 — Data Pipeline Phase 0 Profiling
**Goal:** Inspect and profile the 5 FYP PDFs and 9 Roadmap PDFs without loading to DB yet, generating structural profiles and verifying that extraction scripts will not leak student names or roll numbers.
**10-Line Plan:**
1. Read `pipeline/raw/fyp/` files to inspect page counts and layouts.
2. Build PDF reader profiling script in `pipeline/core/profiler.py` using pdfplumber/pypdf (or pdf-parse in Node).
3. Extract header columns and sample rows from each FYP PDF.
4. Record column layout variations (e.g. 2022 vs 2025 table columns).
5. Detect supervisor name formatting and department notes.
6. Verify roll numbers and student columns are detected and masked.
7. Run privacy validator on sample extractions.
8. Inspect 9 roadmap PDFs for node hierarchy and topic keys.
9. Generate `pipeline/reports/phase_0_profile_report.md`.
10. Submit report to Ram for approval before Phase 1 extraction.

### Option B: Card F3 — Auth & Access Control
**Goal:** Implement authentication flow (Supabase Auth / NextAuth) in `apps/web` and `apps/api`.
**10-Line Plan:**
1. Configure Supabase Auth client helpers in `apps/web/src/lib/supabase/`.
2. Implement auth middleware for route protection in Next.js.
3. Build sign-in, sign-up, and forgot-password pages matching design system tokens.
4. Handle session callback and automatic profile creation in `public.profiles`.
5. Implement `requireRole('enrolled' | 'admin')` API middleware in `apps/api`.
6. Write unit and integration tests for role-based access.
7. Add profile settings view to view/edit user interests and career goals.
8. Implement account deletion request handler (SRS SEC-07).
9. Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
10. Update `.agent/STATE.md` and commit.
