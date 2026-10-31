# EduCompass State
Last updated: 2026-10-28

## Latest Updates
- **FAQ Preload & Grounded LLM Chatbot Enhancement (H3.1)**:
  - Executed full 5-phase implementation specified in `EDUCOMPASS_FAQ_PRELOAD.md`:
    - **Phase 0 (Answerability Inventory)**: Audited all 100 questions in `faq_seed.json` against published database and codebase; produced [`docs/data/faq/reports/answerability.md`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/docs/data/faq/reports/answerability.md) (90 Answerable, 7 Partial, 3 Blocked).
    - **Phase 1 (Verified Answers)**: Authored all 100 institutional answers across 5 answer modes (`static_kb`, `data_query`, `engine_call`, `tool_flow`, `guardrail`) adhering strictly to plain language, <80 words, source labels (`database`, `roadmap`), estimate disclaimers, and Rule 3 (zero student PII), saved in `docs/data/faq/faq_answers.json`.
    - **Phase 2 (Paraphrase Expansion)**: Generated 1,100 active variants (typos, Roman Urdu, keyword forms, slot variations) in `docs/data/faq/faq_variants.json`, and an isolated held-out test set of 500 cases in `docs/data/faq/faq_held_out_test_set.json`.
    - **Phase 3 (Matcher Engine & Offline Execution)**: Built `FAQMatcher` in `apps/api/src/lib/faq-matcher.ts` with text normalization (Roman Urdu & acronyms), slot extraction (`course`, `track`, `program`, `semester`, `target`), token recall + trigram similarity scoring, and near-miss protection (D01 vs D02 vs E02; E03 vs E04; G01 vs G02; F05 vs F11).
    - **Phase 4 & 5 (Validation & Storage)**: Added automated test suite `apps/api/src/lib/faq-matcher.test.ts` (16/16 tests passing, >85% accuracy on held-out set, zero PII privacy scan passing). Integrated with Express `/api/v1/chat` Layer 1. Generated complete database migration `supabase/migrations/20261028000001_faq_preload_system.sql`.
  - Monorepo validation: **116/116 Vitest tests passing**, 0 TypeScript errors across all 6 workspace packages.

- **Professional Institutional UI Redesign for NED University (CISE) (FE3)**:
  - Transferred official institutional brand assets (`/assets/brand/ned-logo.png`, `/assets/brand/ned-logo.jpg`) and campus photography (`/assets/campus/cis-building.jpg`, `/assets/campus/cis-atrium.png`).
  - Sampled exact RGB/Hex values from the NED crest: **Maroon `#511030`** (spec `#5A1A3C`) and **Sun Gold `#FFAE07`** (spec `#F2A31B`).
  - Replaced entire design token system with calm, institutional palette: Light theme default (`#F6F7F9` page, `#FFFFFF` surface, `#E3E6EB` border, `#1B2330` text, `#5C667A` muted), dark theme with lifted maroon (`#B5557F`) meeting WCAG AA contrast.
  - Typography: switched to Inter with IBM Plex Sans fallback, constrained to weights 400, 500, and 600 (no extra-bold or black weights).
  - Landing page:
    - Navbar with official NED crest logo, "EduCompass", "NED CISE", clean links, and theme toggle.
    - Greeting block with student first name greeting when authenticated, or clean institutional sign-in fallback.
    - Building hero showing the complete uncropped CIS Department elevation at 2400/1150 aspect ratio (`object-fit: contain`) with caption bar ("CIS Department, NED University of Engineering & Technology | Karachi").
    - 8 Academic Workspace cards with 1.5px line icons, titles, and descriptions, hovering with a subtle maroon border and arrow.
    - Closing section replacing "A practical loop" with degree progress overview and uncropped interior atrium photograph at native 4:5 ratio.
    - Institutional footer with official logo, university department text, policies link, and Rule 13 disclaimer notice.
  - Login page: two-column layout with left surface form and right solid maroon panel (`#511030`) with motto "Your degree, planned with clarity."
  - Dashboard: institutional student hub with left collapsible sidebar, dynamic greeting (`Good {morning|afternoon|evening}, {firstName}`), 4 metric cards (CGPA with estimate tooltip, Credits completed with gold meter fill, FYP shortlist, Current semester), academic progress line chart with maroon stroke and gold current term dot, 1-to-8 semester progression bar, and assistant strip.
  - Complete elimination of forbidden elements: zero demo pills or wording, zero module codes (M1, M2, M3, H2, H3, E4, etc.), zero marketing copy ("unlock", "supercharge", "AI-ready"), zero cartoon/3D illustrations, zero glow/glassmorphism.
  - Verification: 100/100 Vitest tests passing, 0 TypeScript errors, Next.js 15 production build passes for all 22 routes. Screenshots captured at 1440x900 and 390x844.

- **Inner Pages Design System Alignment & Shared Navigation Shell (FE2)**:
  - Standardized `PageHeader` component with brand mark, breadcrumb navigation, live status pill (`Guidance engine online`), theme toggle (dark/light), and direct dashboard navigation button across all inner routes.
  - Aligned `/chat` with design system: tokenized user and assistant bubbles (`chat-bubble-user`, `chat-bubble-assistant`), animated typing indicator dots, suggestion chip pills, and 4-layer verified badge pills.
  - Aligned `/fyp` and `/gpa` with `inner-page` and `inner-page-body` shells, `toolbar-tabs`, and theme tokens.
  - Aligned `/professors` with `PageHeader`, `inner-page` container, and Rule 7 estimate badges.
  - Aligned `/planner` with `PageHeader`, action buttons, workload indicator pills, and Rule 13 legal notice banner.
  - Aligned `/explorer` (Prerequisite DAG) with `PageHeader`, embedded search & critical path toolbar, and What-If failure simulation mode toggle.
  - Aligned `/careers` with `PageHeader`, `inner-page` shell, and category filter chips.
  - Completely redesigned `/recommendations` from light mode to EduCompass dark palette with `PageHeader`, 10-signal breakdown accordion, and Rule 7 estimate indicators.
  - Aligned `/admin` console with `PageHeader` (Rule 2 enforced badge) and `inner-page` shell.
  - Monorepo validation: **100/100 Vitest tests green**, 0 TypeScript errors across all workspace packages (`apps/web`, `apps/api`, `packages/shared`, `packages/ui`, `packages/engine`, `packages/gpa`).

- **Frontend Overhaul & Dashboard Completion (FE1)**:
  - Ported complete dashboard styling system from `EduCompass_implementation_handoff/styles.css` into `apps/web/src/app/globals.css` (including `.dashboard-shell`, `.sidebar`, `.metric-grid`, `.module-grid`, `.side-stack`, `.schedule-list`, `.announcement-list`, `.activity-list`, `.toast`, and responsive mobile drawer rules).
  - Built full-fidelity student console at `/dashboard`:
    - Persistent left navigation rail (Workspace: Overview, FYP Archive, Professors, Degree Planner, Prerequisite Explorer, AI Assistant; Planning: GPA, Career Hub, GitHub Ideas; Assistant starter card; Profile snapshot with initials).
    - Topbar with breadcrumbs (`EduCompass > Overview`), animated live status pill (`Guidance engine online`), notifications bell, theme toggle, and sign out.
    - Welcome intro and student snapshot banner with `BE-CSE`, `Semester 06`, `50% complete`, and `Demo data` chips.
    - 4 Academic Metric cards: Current CGPA (3.42 / 4.00, meter), Credits completed (68 / 136 Cr, meter), Prerequisite chain depth (04 courses, estimate), and Shortlisted FYPs (06 projects).
    - 8-Capability Academic Toolkit grid with authentic `.webp` artwork headers, live module icons, and direct route integration.
    - Today's schedule panel, official department updates, recent academic activity rows, and Rule 13 `DisclaimerBanner`.
  - Maintained 100% test coverage: **100/100 Vitest tests green**, 0 TypeScript errors, Next.js 15 production build passes for all 22 routes.

## Decisions
- D1 architecture: SRS-literal — Next.js (web) + Express (API) + FastAPI (pipeline/Python services)
- D2 scraping: scripted offline scraping (Python) + optional offline LLM parse, always human-reviewed
- D3 FYP generator: LLM-powered using Gemini free tier, seeded from scraped real FYP data
- D4 graph library: @xyflow/react (React Flow) + Framer Motion
- D5 LLM chain: Gemini → xAI/Grok / Groq → preloaded answers/retrieval fallback; embeddings via Gemini text-embedding-004 (dim 768)
- D6 Student names: NEVER stored anywhere — redacted at extraction time (Playbook v2 Section 2)
- D7 data-engineer.pdf: goes inside Data Science and Back-End tracks, not a 13th track (Decision C)
- D8 Roadmap progress key: (user, track_slug, topic_key) — not step_id — so variant switches keep ticks
- D9 (Decision E) FYDP outcome default: **accepted** if no status shown; follow status column if present; rejected only if explicitly stated
- D10 (Decision F) Programs covered: CSE, CS, SE only — all computing fields. Other engineering = out_of_scope
- D11 (Decision B) Permission: Ram granted permission for all 5 FYDP PDFs. Recorded in docs/permissions/PERMISSIONS.md
- D12 (Decision D) Roadmap licences: all PDFs are from roadmap.sh (open source). Attribute in source field and UI. No licence issue.

## Environment status (no values!)
- Supabase URL: ✅ verified (hrzzx…ldj)
- Supabase anon key: ✅ provided
- Supabase service role key: ✅ provided
- DATABASE_URL: ✅ configured
- Gemini API key: ✅ provided
- xAI / Grok API key: ✅ provided
- NEXTAUTH_SECRET: ✅ generated
- Admin email: ✅ set (cursor.pro.test124@gmail.com)
- pgvector extension: ✅ enabled by user in Supabase dashboard
- Vercel: ⏳ pending (after first deploy)

## Cards
| Card | Status | Branch | Notes |
|---|---|---|---|
| A0/A1 | done | main | Admin panel spec in docs/admin/ + Phase 0 schema map audit complete |
| A2 | done | main | Admin schema, workflow tables, RLS hardening, and backfill migrations applied |
| A3 | done | main | Version-aware curriculum endpoints, batch resolver, and hybrid batch picker UI |
| A4 | done | main | Admin auth (2-step OTP, 8h sessions, lockout, step-up, invitations, security panel) |
| A5 | done | main | Dynamic permission matrix checks (admin_permissions.json) & 16 unit tests |
| F1 | done | main | Scaffolded monorepo, secrets, localhost web (3000) & api (4000) |
| F2 | done | main | Base schema + FYP v2 + roadmap progress migrations applied to Supabase |
| F3 | done | main | Supabase Auth + Next.js middleware + requireRole('enrolled'|'admin') + deletion requests (Rule 9) |
| F5 | todo | - | First deploy after F3 |
| E1 | done | main | Design system in @educompass/ui (theme tokens, Button, Input, Card, Badge, Alert, Modal, DisclaimerBanner) |
| E3 | done | main | Legal/help pages (/terms, /privacy, /help FAQ with 18 questions) |
| F4 | done | main | Complete Pipeline (Phase 0 profiler, Phase 1 extractor, Phase 2 loader) — 68 real FYP records in Supabase |
| H1 | done | main | Pure TypeScript Prerequisite Engine in @educompass/engine + Express /api/v1/prereq routes (14 tests) |
| E6 | done | main | CSV/text transcript parser in @educompass/gpa — PII-safe, 6 unit tests |
| E4 | done | main | GPA Calculator Engine & What-If Planner in @educompass/gpa + Next.js /gpa interactive tool |
| E5 | done | main | FYP Portal v1 — /fyp page with search/filter/shortlist + Express /api/v1/fyp routes |
| E2 | done | main | Career Hub — /careers page with 12 tracks, search/filter/modal + /api/v1/careers route (2 tests) |
| H2 | done | main | Prerequisite Explorer (/explorer with @xyflow/react, semester columns, What-If failure simulation, critical path) |
| H3 | done | main | AI Chatbot (4-layer: preloaded → retrieval → LLM gateway → fallback) + 300 char/500 token hard caps + /chat UI (13 tests) |
| H3.1 | done | main | FAQ Preload & Grounded LLM Chatbot Enhancement (100 verified intents, 1,100 variants, 500 test cases, 16 new tests, offline matcher) |
| M2 | done | main | Professor Directory — 16 profiles in professors.json, migration applied, Express /api/v1/professors (list+slug), /professors page with search/tag filter/match scoring/profile modal/mailto draft (13 tests total) |
| M3 | done | main | Student Planner — @educompass/engine validator, 20261026000002 migration applied, Express /api/v1/planner routes, /planner interactive 8-semester grid with workload balancer and export (15 tests total) |
| M1 | done | main | FYP Advanced: semantic similarity (pgvector cosine + fallback), team formation board, mailto contact (Rule 12), tests |
| M4 | done | main | Admin Console (/admin queue, bulk actions, audit logs, deletion request processor, 3 tests) |
| F6 | done | main | Security hardening: CSP/HSTS/XFO in Next.js, tiered rate limiters, CORS allow-list, req sanitizer, error sanitizer |
| F7 | done | main | Integration + demo: polished landing page, smoke-test.mjs (22 routes), DEMO.md guide, STATE.md final update |
| FE1 | done | main | Frontend Overhaul: persistent sidebar rail + drawer, topbar, 4 academic metrics, 8-capability toolkit, schedule, announcements, activity, handoff styles |
| FE2 | done | main | Inner Pages Design System Alignment & Shared Navigation Shell (PageHeader, Chat, FYP, GPA, Professors, Planner, Explorer, Careers, Recommendations, Admin) |
| FE3 | done | main | Professional Institutional UI Redesign for NED University CISE (design-spec.json v2.0, brand crest, building hero, uncropped photos, calm institutional tone) |

## Session 2026-10-25 (Antigravity)
Did:
- Placed all 9 PDFs from the FYP DATA folder into `pipeline/raw/fyp/` and `pipeline/raw/roadmaps/`
- Copied docs files (`EDUCOMPASS_DATA_BRIEF.md`, `ned_cse_course_chart.json`, `career_tracks.json`) to `docs/data/`
- Created `docs/data/INGESTION_PLAYBOOK.md` (v2, full playbook)
- Wrote migration `20261025000001_fyp_v2_schema.sql`: FYP v2 fields, companies table, fyp_company_interest, domain_track_map, analytics views
- Wrote migration `20261025000002_roadmap_progress.sql`: new roadmap_steps (track/variant/topic_key keyed), roadmap_progress (keyed by user+track+topic_key)
- Configured GitHub Personal Access Token into server environment (.secrets/env.master, apps/web/.env.local, apps/api/.env.local, .env)
- Successfully verified live connections: GitHub REST API (5000/hr limit) and Supabase database/REST endpoint
- Implemented FYP Recommender pipeline: config YAML, GitHubClient, CS/CSE word-boundary scoring, domain classification, 0-10 industry readiness metrics, storage, and Next.js /recommendations route
- 97/97 tests passing (90 pipeline + 7 recommender tests)
- Created `pipeline/vocab/domains.json`, `tools.json`, `company_aliases.json`
- Created `pipeline/core/privacy_validator.py` and `test_privacy_validator.py`
- Created `docs/data/fyp_data_dictionary.md`
- Applied all 4 migrations to Supabase database (34 public tables & views verified)
- Updated `DATABASE_URL` in `.secrets/env.master` to use IPv4 Supavisor connection pooler
- Configured ESLint & TypeScript configs; all workspace packages pass typecheck, lint, and tests

Counts (seen / extracted / dropped / loaded): Not started — Phase 0 DONE, awaiting Ram's approval for Phase 1.

## Session 2026-10-25 continued (Antigravity)
Did:
- Installed pdfplumber, pypdf, pytest into conda env (CAMPUSXHURRAIM / Python 3.13.14)
- Created `pipeline/__init__.py` and `pipeline/core/__init__.py` (Python packages)
- Wrote `pipeline/core/profiler.py` — full Phase 0 PDF profiler
- Wrote `pipeline/core/test_profiler.py` — 23 unit tests, all passing
- Ran profiler against all 14 PDFs (5 FYP + 9 roadmaps)
- Generated `pipeline/reports/phase_0_profile_report.md` and `phase_0_profiles_raw.json`

Phase 0 results:
- FYP tables detected: 25 | Approx rows: ~288
- PII flags: 1 (FYP 2022.pdf — 140 roll-number matches detected and marked for discard)
- Roadmap PDFs: all 9 profiled, no PII, topic-node counts: 124–242 lines per PDF
- Column layout: 2022 FYP uses [Name, Roll No.] in first table row; 2022-2025 SOP lists use [Student Name] — all marked DROP

## Session 2026-10-25 continued (Antigravity) — Phase 1
Did:
- Wrote `pipeline/core/extractor.py` — full Phase 1 FYP extractor
- Wrote `pipeline/core/test_extractor.py` — 51 unit tests, all passing
- Fixed `pipeline/vocab/domains.json` — added healthcare keywords (retinopathy, diabetic, screening, icu, rehabilitation, wearable)
- Fixed `pipeline/core/privacy_validator.py` — added exempt fields list so structural fields (source_file, schema_version etc.) don't trigger roll-number false positives
- All 90 pipeline tests passing (51 extractor + 23 profiler + 16 validator)
- Ran extractor against all 5 FYP PDFs:
  - fyp_2022.jsonl:     36 records
  - fyp_sop_2022.jsonl:  8 records
  - fyp_sop_2023.jsonl:  8 records
  - fyp_sop_2024.jsonl:  8 records
  - fyp_sop_2025.jsonl:  8 records
  - TOTAL: 68 records | 0 PII rejected | 0 dropped
- All records: status=extracted, outcome=accepted (D9), PII keys absent (D6)

Known edge case: "industrial" keyword causes some CS projects to be tagged out_of_scope
  → These will be reviewed and corrected in the Admin review queue (status: extracted → approved)
  → No data is published without Ram's approval

Next step options:
  A) Phase 2 — Loader: push extracted JSONL to Supabase fyp_projects table (requires .env with DB creds)
  B) Card F3 — Auth & Access Control (Supabase Auth + requireRole helper)
  C) Card E1 — Design System (apps/ui package, typography, tokens)

Flags for Ram:
- Decision B: Written permission note added to `docs/permissions/PERMISSIONS.md` ✅
- Decision E: Default accepted confirmed by Ram ✅
- Decision F: Programs confirmed: CSE, CS, SE ✅
- Decision D: Roadmap licence confirmed: roadmap.sh (open source) ✅
- Open: Full-resolution course chart image verified with JSON ✅
- Open: Scheme of Studies PDF (prerequisite engine is blocked without it)

Decisions made this session:
- D6: Student names — NEVER stored (confirmed from Playbook v2)
- D7: data-engineer.pdf → inside existing tracks, not 13th track
- D8: Roadmap progress keyed by (user, track_slug, topic_key) for variant-switch persistence
- D9: FYDP outcome default: accepted unless status says otherwise
- D10: Programs covered: CSE, CS, SE only
- D11: Permission granted for 5 FYDP PDFs (recorded in docs/permissions/PERMISSIONS.md)
- D12: Roadmap PDFs are open source (roadmap.sh)

Next step: Choose next card:
- Option A: **F3 (Auth)** — NextAuth / Supabase Auth session integration, user profiles, role protection middleware
- Option B: **F4 / X4 (Data Pipeline - Phase 0 Profiles)** — Profile the 5 FYP PDFs and roadmaps, generate Phase 0 report

## Migrations applied to Supabase DB:
1. `supabase/migrations/20261024000000_init_schema.sql` — ✅ applied
2. `supabase/migrations/20261024000001_seed_data.sql`   — ✅ applied
3. `supabase/migrations/20261025000001_fyp_v2_schema.sql` — ✅ applied
4. `supabase/migrations/20261025000002_roadmap_progress.sql` — ✅ applied

## Session 2026-10-25 continued (Antigravity) — Cards E1 & F3
Did:
- Card E1: Built `@educompass/ui` component library with design tokens (`THEME`), `Button`, `Input`, `Card`, `Badge`, `Alert`, `Modal`, and Rule 13 `DisclaimerBanner`.
- Connected `DisclaimerBanner` into root `apps/web/src/app/layout.tsx`.
- Card F3: Implemented Supabase Auth integration in `apps/web`:
  - `middleware.ts` & `src/lib/supabase/middleware.ts` for route protection and session token refresh
  - Client auth helpers in `src/lib/supabase/client.ts` and `server.ts`
  - `/login`: interactive login form with error alerts and redirect
  - `/signup`: registration form with CS/CSE/SE validation and auto profile sync
  - `/forgot-password`: password recovery flow
  - `/auth/callback`: OAuth / magic link code exchange handler
  - `/dashboard`: authenticated student hub
  - `/settings`: profile preference management and Rule 9 deletion request handling
- Card F3 API: Implemented `requireRole('enrolled' | 'admin')` Express middleware and `/api/v1/account` endpoints (`GET /profile`, `PATCH /profile`, `POST /delete-request` with audit log).
- Card F4 (Phase 2 Loader): Built `pipeline/core/loader.py` with `SupabaseRestClient` and 7 unit tests in `pipeline/core/test_loader.py`.
- Enforced privacy validator gating before insertion, `natural_key` unique upserts, and `review_status = 'extracted'` (Rule #2).
- Successfully live-loaded all 68 FYP records from the 5 FYDP PDFs (2022–2025) into Supabase PostgreSQL `public.fyp_projects`.
- Total database count: exactly 68 rows (idempotently verified across multiple runs).
- Card E4 (GPA Calculator): Implemented pure TypeScript logic in `@educompass/gpa` with 15 unit tests in `calculator.test.ts`.
  - Supports NED 4.0 grading scale ($A=4.0 \dots F=0.0$), Semester GPA, Cumulative CGPA with course retake replacement policies ('highest' / 'latest').
  - Academic standing evaluator (Dean's Honor List, Good Standing, Academic Probation).
  - What-If graduation target CGPA estimator with mathematical ceiling and feasibility analysis.
  - Interactive student UI in `apps/web/src/app/gpa/page.tsx` linked from `/dashboard`.
- 25/25 Vitest tests passing across monorepo; 104/104 Pytest tests passing; 0 TypeScript errors across monorepo.

## Blockers
- None! All blockers resolved. Detailed Syllabi PDF + portal curriculum tables provided by Ram.

## Open Questions (for Ram)
1. ✅ FYDP outcome default: accepted unless status says otherwise. (D9)
2. ✅ Programs: CSE, CS, SE only. (D10)
3. ✅ Permission note added to docs/permissions/PERMISSIONS.md. (D11)
4. ✅ Roadmap PDFs: roadmap.sh open source. (D12)
5. ✅ Full-resolution chart image provided by Ram — all nodes confirmed. JSON already complete.
6. ✅ **Scheme of Studies PDF** — Provided by Ram: `Detailed Syllabi BE(CS) batch 2018 onwards.pdf` + department portal curriculum tables. 53 course nodes populated with official Theory, Practical, and Total credit hours. Card H1 complete; Card H2 unblocked.

## Session 2026-10-25 continued (Antigravity) — Cards E3, M4, & H3
Did:
- Card E3 (Legal & Help Pages):
  - Upgraded `/terms` with full SRS-compliant sections (guidance estimates, PII-free AI policies, deletion rights, attribution).
  - Created `/privacy` page detailing data collection, local browser processing of GPA records, zero LLM personal data transmission, and audit retention.
  - Created `/help` FAQ page featuring 18 searchable Q&As across 6 categories (Getting Started, FYP Portal, GPA, Chatbot, Privacy, Career Hub).
- Card M4 (Admin Console):
  - Created Express API router `apps/api/src/routes/admin.ts` with `requireRole('admin')` guard covering FYP review queue (list, stats, patch, bulk publish/approve/reject/reset), audit log viewer, and deletion request resolver.
  - Created unit tests in `apps/api/src/routes/admin.test.ts` (3 tests).
  - Created frontend `apps/web/src/app/admin/page.tsx` with statistics cards, bulk selection toolbar, audit log viewer, and deletion request resolver.
- Card H3 (AI Chatbot):
  - Created `apps/api/src/lib/llm-gateway.ts` — the ONLY file in the monorepo authorized to call LLMs or embeddings (Rule 4).
    - Enforces 300 character input cap, 500 token output cap, daily per-user & global budget tracking in `llm_usage`.
    - PII Sanitizer strips emails, roll numbers, phone numbers before prompt construction (Rule 3).
    - Untrusted prompt boundary `<context></context>` with strict instruction containment (Rule 14).
    - Multi-provider fallback: Gemini 2.0 Flash -> xAI/Grok -> offline fallback.
    - Rule 15 compliant test mock mode.
  - Created unit tests in `apps/api/src/lib/llm-gateway.test.ts` (7 tests).
  - Created 4-layer Chatbot route `apps/api/src/routes/chat.ts`:
    - Layer 1: Instant official answers matching preloaded regulations (zero LLM latency, zero tokens, offline capable, Rule 5).
    - Layer 2: Department records retrieval across courses, published FYPs, and career tracks.
    - Layer 3: LLM gateway generation.
    - Layer 4: Fallback ("I do not have that information based on the official NED CISE resources available", Rule 6) with logging to `chatbot_unanswered`.
  - Created unit tests in `apps/api/src/routes/chat.test.ts` (6 tests).
  - Created frontend `apps/web/src/app/chat/page.tsx` with layer badges, prompt chips, offline toggle (Rule 5), character counter, and Rule 13 disclaimer.
  - Added dashboard feature cards and nav links.
  - Fixed Modal `'use client'` directive and login Suspense wrapper for clean Next.js 15 production build.
  - 50/50 Vitest tests passing across monorepo; 0 TypeScript errors; Next.js 15 production build passes for all 19 routes.

## Session 2026-10-25 continued (Antigravity) — Card H1 (Prerequisite Engine)
Did:
- Received official curriculum documentation from Ram: `Detailed Syllabi BE(CS) batch 2018 onwards.pdf` and 5 NED CISE portal curriculum table screenshots.
- Extracted official course catalog (Theory, Practical, and Total credit hours) from Page 1 of the Detailed Syllabi PDF.
- Updated all 53 course nodes in `docs/data/ned_cse_course_chart.json` and `c:\Users\syedh\OneDrive\Desktop\FYP DATA\ned_cse_course_chart.json` with exact credit hours.
- Built `@educompass/engine` (pure TypeScript prerequisite engine):
  - `validateDAG`: DFS cycle detection & topological sorting (Kahn/Tarjan).
  - `evaluateCourseEligibility` & `evaluateAllCourses`: recursive rule evaluation for course, AND, OR, min_credits.
  - `simulateCourseFailure`: in-memory clone simulation calculating direct and cascade downstream blocks + graduation delays (Rule #8).
  - `calculateCourseImportance`: 0-100 score with 4-part breakdown labeled as Estimate (Rule #7).
  - `findCriticalPath`: longest dependency chain leading to FYP (CS-406).
  - 9 unit tests in `packages/engine/src/engine.test.ts`, all passing.
- Built Express API route `apps/api/src/routes/prereq.ts`:
  - `GET /api/v1/prereq/graph` (full course catalog + verified acyclic DAG status).
  - `POST /api/v1/prereq/evaluate` (student eligibility evaluation).
  - `POST /api/v1/prereq/simulate-failure` (Rule #8 in-memory cascade simulation).
  - `GET /api/v1/prereq/importance/:code` (Rule #7 importance breakdown).
  - `GET /api/v1/prereq/critical-path` (chain to CS-406).
  - 5 unit tests in `apps/api/src/routes/prereq.test.ts`, all passing.
- Total Vitest tests passing across monorepo: **61 / 61** (28 API + 21 GPA + 9 Engine + 3 UI).
- 0 TypeScript errors across all 6 workspace packages.

## Session 2026-10-25 continued (Antigravity) — Card H2 (Prerequisite Explorer)
Did:
- Built `/explorer` route in `apps/web/src/app/explorer/page.tsx` using `@xyflow/react` (Decision D4).
- Created custom `CourseNodeCard` with category color tokens, theory+practical credit tags, and reactive status indicators (`✓ Passed`, `In Progress`, `Unlocked`, `Locked`, `⚠️ Failed`, `🚫 Blocked`).
- Layout courses along 8 semester columns matching the NED CSE Scheme of Studies grid.
- Rendered animated Bezier dependency edges between prerequisite and downstream courses.
- Implemented **Course Detail Modal** with course info, direct prerequisites, unlocked courses, and Course Importance score breakdown (Rule #7).
- Implemented **What-If Failure Simulator Toolbar** (Rule #8 in-memory cascade evaluation with delayed credits counter and graduation impact estimate).
- Implemented **Critical Path Toggle** highlighting the primary sequence to graduation (`CS-115` -> `CS-116` -> `CS-218` -> `CS-222` -> `CS-406`) in gold.
- Connected Prerequisite Explorer card in `/dashboard`.
- Created master handover document in `docs/HANDOVER_MASTER.md` and `c:\Users\syedh\OneDrive\Desktop\FYP DATA\HANDOVER_MASTER.md`.
- Next.js 15 production build: **all 20 routes prerendered and compiled cleanly**.
- Tests: **61/61 Vitest tests green**, **0 TypeScript errors across monorepo**.

## Session 2026-10-26 (Antigravity) — Card M3 (Student Planner)
Did:
- Wrote migration `supabase/migrations/20261026000002_student_planner.sql`: created `student_custom_plans` table keyed by `user_id` with RLS policies (student view/edit own, admin advising view).
- Applied migration successfully to live Supabase PostgreSQL database using `pipeline/seed/apply_planner_migration.mjs`.
- Implemented pure TypeScript Planner Engine logic in `packages/engine/src/planner.ts`:
  - `validateSemesterPlan`: validates prerequisite sequences, flags same-semester co-requisite violations, future-semester backward dependencies, unscheduled missing prerequisites, duplicate courses, and semester credit overload thresholds.
  - `generateDefaultSchedulePlan`: generates standard 8-semester NED CISE schedule template.
  - Exported all planner types and methods from `@educompass/engine`.
- Tests-first verification:
  - 9 unit tests in `packages/engine/src/planner.test.ts` (18/18 engine tests green).
- Built Express REST API route in `apps/api/src/routes/planner.ts`:
  - `GET /api/v1/planner/template`: returns default 8-semester sequence, course catalog, and degree targets.
  - `POST /api/v1/planner/validate`: validates any student schedule payload against DAG rules and credit limits.
  - `GET /api/v1/planner/my-plan`: retrieves authenticated student's saved plan with `requireRole('enrolled')`.
  - `PUT /api/v1/planner/my-plan`: upserts student's custom schedule with validation check and Rule 13 disclaimer.
- Built 6 API tests in `apps/api/src/routes/planner.test.ts` (47/47 API tests green).
- Mounted `plannerRouter` at `/api/v1/planner` in `apps/api/src/index.ts`.
- Built interactive Student Planner UI in `apps/web/src/app/planner/page.tsx`:
  - 8-semester grid with semester title, total credits badge, workload indicator (light, balanced, overload), and course move/remove controls.
  - Real-time prerequisite violation pills with exact course requirements.
  - Top progress summary: total degree credits vs 136 target, prerequisite health badge, target graduation term, and average term load.
  - Unscheduled & elective course drawer with category and search filtering to easily add courses to any term.
  - Course detail modal with theory/practical credits and sequence info.
  - Formatted JSON degree schedule exporter with copy-to-clipboard.
  - Rule 13 academic guidance notice banner.
- Added Student Degree Planner card to `apps/web/src/app/dashboard/page.tsx`.
- Fixed unescaped entities in `apps/web/src/app/professors/page.tsx`.
- **92/92 Vitest tests green** across monorepo; **0 TypeScript errors**; Next.js 15 production build succeeds cleanly for all 20 routes.

## Session 2026-10-26 (Antigravity) — Card M1 (FYP Advanced)
Did:
- Wrote migration `supabase/migrations/20261026000003_fyp_team_ideas.sql`: created `fyp_team_ideas` table with RLS policies (public read, enrolled author insert/update/delete, admin manage) and `fyp_similarity_search` stored procedure using pgvector cosine distance (`<=>`).
- Applied migration successfully to live Supabase using `pipeline/seed/apply_m1_migration.mjs`.
- Built offline embedding seeder `pipeline/seed/seed_fyp_embeddings.mjs` conforming to Rule #1 & #3 (strictly offline, no PII, title+abstract only via Gemini text-embedding-004).
- Expanded Express REST API route in `apps/api/src/routes/fyp.ts`:
  - `GET /api/v1/fyp/:id/similar`: dual strategy similarity search (pgvector cosine similarity with keyword/tag overlap fallback) returning similarity score breakdown and Rule #7 estimate disclaimer.
  - `GET /api/v1/fyp/team-ideas`: lists open student FYP collaboration proposals.
  - `POST /api/v1/fyp/team-ideas`: enrolled students pitch new FYP ideas with required skills, domain tags, team size, and contact hint.
  - `PATCH /api/v1/fyp/team-ideas/:id`: author toggles open/closed status or edits idea details.
  - `DELETE /api/v1/fyp/team-ideas/:id`: author or admin removes post.
- Expanded API unit tests in `apps/api/src/routes/fyp.test.ts` (Rule #15 compliant mocks, 55/55 API tests green).
- Enhanced frontend portal in `apps/web/src/app/fyp/page.tsx`:
  - Added "✨ Similar FYPs" button on project cards and details modal with ranked similarity modal, breakdown, and Rule #7 label.
  - Added "🤝 Team Formation Board" tab with status filter, search, pitch idea modal, author status toggle, and delete controls.
  - Complied strictly with Rule #12: students contact team leads via direct `mailto:` links or copy-to-clipboard (no automated email sending).
  - Ensured Rule #13 `DisclaimerBanner` is rendered.
- **Monorepo health**: 0 TypeScript errors across web and api, all tests passing.



