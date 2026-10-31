# EduCompass — Admin Panel Schema Map
**Phase 0 · A1** | Produced: 2026-10-31 | Author: Antigravity agent  
**Status: Draft — awaiting Ram's approval before any migration is written.**

> **Golden rule:** This document is read-only output. No database changes have been made.

---

## 0. How this was produced

- Inspected all 8 migration files in `supabase/migrations/` (source of truth for DDL).
- Queried the live dev database via the PostgREST OpenAPI spec (`/rest/v1/`) to verify the real column list.
- Read the frontend routes (`apps/web/src/app/`) and API routes (`apps/api/src/routes/`) to identify which tables each module uses.
- Cross-referenced the spec (Section 7) and `admin_permissions.json`.

---

## 1. Current table inventory (34 tables + 4 views)

### 1.1 Student data tables — NO admin access; aggregate views only

| Table | Purpose | Student FK | Notes |
|---|---|---|---|
| `profiles` | One row per Supabase auth user. Stores role (`enrolled`\|`admin`), program, semester, interests. | `id → auth.users` | Must add `batch_id` in A2. |
| `academic_records` | Student course grades and status. | `user_id` | Admin panel must NEVER expose individual rows. |
| `fyp_shortlists` | Student FYP project bookmarks. | `user_id` | Student-personal only. |
| `roadmap_progress` | Per-user career topic completion. | `user_id` | Keyed `(user_id, track_slug, topic_key)` after migration 20261025000002. |
| `outreach_tracker` | Student → professor contact drafts. | `user_id` | Never surfaces in admin. |
| `student_custom_plans` | Student's 8-semester custom degree plan. | `user_id` | Read by engine; admin sees only schema. |
| `llm_usage` | Per-user LLM token consumption. | `user_id` | Admin sees aggregate totals only. |
| `deletion_requests` | Student account deletion requests (Rule 9). | `user_id` | Admin processes; never reads student records from it. |

### 1.2 Content tables — admin-editable via change sets

| Table | Module | Admin scope | Has `review_status`? | Needs `deleted_at`? |
|---|---|---|---|---|
| `fyp_projects` | FYP Portal | Chairman / Operator | YES (`extracted`→`published`) | YES |
| `professors` | Professor Directory | Chairman / Operator | YES | YES |
| `career_tracks` | Career Hub | Chairman / Operator | NO — needs adding | YES |
| `roadmap_steps` | Career Hub / Roadmaps | Chairman / Operator | YES | YES |
| `articles` | Career Hub | Chairman / Operator | YES | YES |
| `repositories` | Career Hub | Chairman / Operator | YES | YES |
| `chatbot_answers` | AI Chatbot | Chairman / Operator | NO — needs adding | YES |
| `chatbot_unanswered` | AI Chatbot (read-only) | VC / Chairman | N/A | N/A |

### 1.3 Curriculum tables — chairman-draft, VC-approve for major changes

| Table | Purpose | Status |
|---|---|---|
| `programs` | Degree programs (CSE, CS, SE) linked to university. Has `publication_status`. | Needs `department_id` |
| `courses` | All courses with semester, credits, category. Single-program scope today. | Needs `owner_department_id`, `deleted_at`; becomes `course_master` semantics in v2 |
| `prerequisite_rules` | Per-course rule trees (AND/OR/min_grade JSONB). | Needs `version_id` FK |
| `semester_plans` | Standard recommended semester sequence per program. | Will be superseded by `curriculum_courses`; keep for backward-compat |

**NEW tables needed (A2):** `departments`, `curriculum_versions`, `curriculum_courses`, `elective_groups`, `batches`, `course_equivalences`.

### 1.4 Admin workflow tables — ALL new in A2

`admin_users`, `admin_invitations`, `step_up_challenges`, `admin_login_events`, `change_sets`, `change_items`, `approval_requests`, `deletion_schedule`, `approval_policies`, `releases`, `publish_jobs`, `permission_overrides`.

### 1.5 Infrastructure / pipeline tables — read-only in admin

| Table | Purpose |
|---|---|
| `ingestion_files` | Files processed by the offline ETL pipeline |
| `ingestion_records` | Individual entity records extracted from a file |
| `dataset_versions` | ETL dataset snapshots |
| `sources` | Official source registrations |
| `kb_chunks` | Embedding chunks for chatbot retrieval |
| `audit_log` | **WARNING:** currently allows INSERT by admin role. A2 must revoke UPDATE/DELETE and add immutability trigger. |

### 1.6 Views — read-only aggregates (safe for admin analytics)

| View | Data returned |
|---|---|
| `v_fyp_company_counts` | Count of FYPs per company |
| `v_fyp_domain_year` | FYP counts by domain and year |
| `v_fyp_supervisor_load` | Count of FYPs per supervisor |
| `v_fyp_year_outcome` | FYP count by year and outcome |

---

## 2. Per-table column detail and admin changes needed

### `profiles`
```
id uuid PK → auth.users
email text
full_name text
role user_role enum ('public','enrolled','admin')  ← NOT used for admin sub-roles
university_id uuid
program_id uuid → programs
current_semester int
interests text[]
career_goal text
status text default 'active'
created_at / updated_at timestamptz
```
**A2 changes:**
- Add `batch_id uuid REFERENCES batches(id)` — resolves curriculum version for this student.
- `profiles.role='admin'` is kept for backward-compat with existing middleware until A5 replaces it.

### `programs`
```
id uuid PK | university_id uuid → universities | code text ('SE','CSE','CS')
name text | degree text | max_credits_per_semester int default 18
passing_grade text default 'D' | grade_scale jsonb | publication_status | created_at
```
**A2 changes:** Add `department_id uuid REFERENCES departments(id)`.

### `courses`
```
id uuid PK | program_id uuid → programs | code text ('CS-101')
code_normalized text | title text | credits int | semester int (1-8)
category text | publication_status | created_at
```
**A2 curriculum versioning strategy:**
1. Keep `courses` as-is for existing student queries (backward-compat).
2. Create `course_master` populated from `courses` (preserving same UUIDs so FKs don't break).
3. Create `curriculum_courses` `(version_id, course_id, semester, credits, category)` seeded from current data.
4. Update `prerequisite_rules` to add `version_id`.
5. Engine gets a new `buildProgram(versionId)` path in A3; old queries untouched until then.

### `prerequisite_rules`
```
id uuid PK | course_id uuid UNIQUE → courses | rule_tree jsonb | created_at
```
**A2 changes:**
- Add `version_id uuid REFERENCES curriculum_versions(id)`.
- UNIQUE constraint changes from `(course_id)` to `(version_id, course_id)`.
- Backfill: all existing rows get the first published version's id.

### `fyp_projects` (51 columns — key ones listed)
```
id, title, abstract, supervisor, year, tools[], tags[], status,
review_status, tsv, embedding, supervisor_id → professors,
natural_key, confidence, department (text), university (text)
```
**A2 changes:**
- Add `department_id uuid REFERENCES departments(id)`.
- Add `deleted_at timestamptz`, `delete_state text`, `updated_by uuid`, `updated_at timestamptz`.

### `professors`
```
id, university_id, name, department (text), research_areas[],
review_status, tsv, slug, title, rank, qualification,
domain_tags[], area_tags[], name_status, consent_note
```
**A2 changes:**
- Add `department_id uuid REFERENCES departments(id)` (replaces free-text `department` for scoping).
- Add `deleted_at`, `delete_state`, `updated_by`, `updated_at`.
- Keep `department text` as deprecated but non-null for existing data.

### `career_tracks`
```
id, title, slug, description, created_at
```
**A2 changes:**
- Add `department_id`, `review_status text default 'published'`.
- Add `deleted_at`, `delete_state`, `updated_by`, `updated_at`.

### `roadmap_steps`
```
id, track_slug, variant, stage, step_order, topic_key, title,
description, est_weeks, resources, related_courses[], review_status,
created_at, updated_at
```
**A2 changes:** Add `department_id`, `deleted_at`, `delete_state`, `updated_by`.

### `articles` / `repositories`
Both linked to `career_tracks`. **A2 changes:** Add `department_id`, `deleted_at`, `delete_state`, `updated_by`, `updated_at`.

### `chatbot_answers`
```
id, question_pattern, answer_text, category, confidence_threshold, created_at
```
**A2 changes:** Add `department_id`, `review_status`, `deleted_at`, `delete_state`, `updated_by`, `updated_at`.

### `audit_log` — CRITICAL
```
id uuid PK  ← spec says bigserial; see Q3
actor_id uuid → profiles
action text | target_table text | target_id uuid | details jsonb | created_at
```
**A2 changes (critical):**
- Add columns: `actor_role text`, `department_id uuid`, `resource text`, `record_id uuid`, `result text`, `ip_hash text`.
- Add immutability trigger: RAISE EXCEPTION on any UPDATE or DELETE.
- REVOKE UPDATE, DELETE on `audit_log` from `public, anon, authenticated`.

### `deletion_requests` (student self-deletion)
No structural change. This is separate from the new `deletion_schedule` admin workflow table.

---

## 3. New tables to create in A2

Full DDL is in the spec Sections 7.2–7.4. Summary:

| Table | Purpose |
|---|---|
| `departments` | CIS and future departments |
| `admin_users` | Separate from `profiles`; vc / chairman / operator roles |
| `admin_invitations` | Single-use, time-limited invite tokens |
| `step_up_challenges` | Fresh email code for destructive actions |
| `admin_login_events` | Auth event log (hashed IPs and emails) |
| `course_master` | Deduplicated shared course registry |
| `curriculum_versions` | Named, versioned curriculum snapshots |
| `curriculum_courses` | Course placement per version |
| `elective_groups` | Elective choice rules per version |
| `batches` | Admission year → curriculum version binding |
| `course_equivalences` | Old→new course mappings across versions |
| `change_sets` | Workflow: draft → submitted → approved → published |
| `change_items` | Individual before/after records within a change set |
| `approval_requests` | Approval message, code hash, routing |
| `deletion_schedule` | Content soft-delete lifecycle |
| `approval_policies` | Configurable routing rules |
| `releases` | Immutable snapshots of a published version |
| `publish_jobs` | Cascade job queue with status |

---

## 4. Curriculum version backfill plan (Section 7.6)

Run in A2 migration — all idempotent with IF NOT EXISTS / ON CONFLICT DO NOTHING.

1. Insert `departments` row for CIS.
2. `UPDATE programs SET department_id = <CIS_id>` for CSE, CS, SE.
3. `INSERT INTO course_master SELECT id, code, title, <CIS_id>, ... FROM courses` — preserves original UUIDs.
4. Insert one `curriculum_versions` row: `'Scheme 2022'`, revision 1, status `'published'`, for each program.
5. `INSERT INTO curriculum_courses (version_id, course_id, semester, credits, category) SELECT ... FROM courses`.
6. `UPDATE prerequisite_rules SET version_id = <version_id>` backfill.
7. Insert `batches` rows for years 2022–2025, all → Scheme 2022 version.
8. **Do NOT set `profiles.batch_id`** — leave NULL; student chooses on first login (spec Section 10). [See Q1]
9. Snapshot test: run `scripts/smoke-test.mjs` before and after; all 22 routes must match.

---

## 5. Frontend queries that must become version-aware (A3)

| Route / API | Current query | A3 change |
|---|---|---|
| `GET /api/v1/prereq/graph` | `SELECT * FROM courses WHERE program_id=…` | Resolve `version_id` from batch (or default), query `curriculum_courses JOIN course_master` |
| `POST /api/v1/prereq/evaluate` | Same | Same |
| `POST /api/v1/prereq/simulate-failure` | Same | Same |
| `GET /api/v1/planner/template` | `courses` + `semester_plans` | `curriculum_courses` for resolved version |
| `/explorer` page | engine `Program` built from `courses` | `buildProgram(versionId)` new engine path |
| `/planner` page | Same | Same |
| `/gpa` page | `programs.grade_scale`, `programs.passing_grade` | Resolve from `curriculum_versions` overrides |
| `/chat` chatbot | Hardcoded answers + `courses` | Add `batch` slot → `curriculum_version_id` in retrieval |

---

## 6. Existing admin role — migration path

Current state:
- `profiles.role enum('public','enrolled','admin')` — single flat `'admin'` role.
- `is_admin()` checks `profiles.role = 'admin'`.
- `requireRole('admin')` in Express checks Supabase JWT.

Target (A5):
- `admin_users` table holds vc / chairman / operator rows, separate from `profiles`.
- New DB helper `admin_role()` reads from `admin_users.role`.
- New Express helper `requireAdminRole('vc'|'chairman'|'operator')` added in A5 alongside existing `requireRole`.
- Old `is_admin()` and `requireRole('admin')` kept until A5 replaces them.

---

## 7. RLS: current state vs. target

### Current gaps
- No department scoping — all admins see all departments.
- No per-module operator restriction.
- `audit_log` has no immutability protection.
- All live content tables allow INSERT/UPDATE/DELETE from authenticated users (via `is_admin()`).

### Target (A2 + A5)
- New RLS helpers: `admin_role()`, `admin_department()`, `is_active_admin()`, `allowed_module(text)`.
- Live content tables: REVOKE INSERT, UPDATE, DELETE from `authenticated`. Only `apply_change_set` (security definer) may write.
- Admin sessions write only: `change_sets`, `change_items`, `approval_requests` (own + own department), draft curriculum rows.
- `audit_log`: immutability trigger + REVOKE UPDATE, DELETE.
- Student tables (`profiles`, `academic_records`, etc.): no admin SELECT policy for individual rows.

---

## 8. Modules ↔ tables matrix

| Admin Module | Tables read | Tables written (via change sets only) |
|---|---|---|
| FYP Records | `fyp_projects`, `v_fyp_*` views, `companies` | `fyp_projects`, `companies`, `fyp_company_interest` |
| Professor Directory | `professors`, `professor_supervised_projects` | Both |
| Career Hub | `career_tracks`, `roadmap_steps`, `articles`, `repositories`, `domain_track_map` | All 5 |
| Chatbot Content | `chatbot_answers`, `chatbot_unanswered` (read) | `chatbot_answers` |
| Chatbot Settings | `llm_usage` aggregate + env config | No DB writes |
| Curriculum | `programs`, `courses`, `prerequisite_rules`, versioning tables | Via `apply_change_set` only |
| Data Imports | `ingestion_files`, `ingestion_records` | `ingestion_records.status` transitions |
| Admin Accounts | `admin_users`, `admin_invitations` | Both |
| Student Deletion Requests | `deletion_requests` | `deletion_requests.status`, `profiles.status` via function |
| Audit Log | `audit_log` (paginated read-only) | Never |
| Analytics | Aggregate views / COUNT queries only | Never |

---

## 9. Open questions for Ram — must answer before A2

| # | Question | Recommended answer |
|---|---|---|
| Q1 | **Batch backfill:** leave `profiles.batch_id = NULL` (prompt on first login) or estimate from `current_semester`? | **Recommend: leave NULL.** First-login prompt is spec Section 10. |
| Q2 | **`courses` table continuity:** run `courses` and `curriculum_courses` in parallel (engine updated in A3), or migrate all queries in A2? | **Recommend: parallel.** Less risk; A3 updates the engine. |
| Q3 | **`audit_log.id`:** spec says `bigserial`; current schema uses `uuid`. Change PK type, or add a `seq bigint GENERATED ALWAYS AS IDENTITY` column for ordering while keeping `id uuid`? | **Recommend: add `seq` column.** No breaking change. |
| Q4 | **`roadmaps` table:** exists in init_schema but not exposed via PostgREST (replaced by `roadmap_steps`). Are there any live rows? If 0, archive in A2. | Need Ram to confirm: `SELECT count(*) FROM roadmaps`. |
| Q5 | **Admin bootstrap emails:** VC email is `cursor.pro.test124@gmail.com` (already in env). What is the CIS Chairman's test email? Set in `ADMIN_BOOTSTRAP_JSON` env var (never in source). | Ram to provide. |
| Q6 | **`semester_plans` table:** keep for A2 backward-compat, archive in A3? | **Recommend: keep in A2.** |
| Q7 | **`domain_track_map`:** add `id uuid PK` and `department_id`? | Yes — simple ALTER. Confirm. |
| Q8 | **Cooling-off days:** spec defaults are 7/14/30/90. Confirm or override. | Confirm defaults from `admin_permissions.json`: career/chatbot=7, fyp/professors=14, curriculum_item=30, curriculum_version=90. |

---

*End of schema_map.md — Phase 0 complete. No code changes made.*  
*Waiting for Ram's answers to Q1–Q8 and "go" before A2 (migrations) begins.*

