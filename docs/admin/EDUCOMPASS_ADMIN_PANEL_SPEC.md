# EduCompass Admin Panel: Specification and Build Guide

**For:** Claude Opus and Antigravity (the agent), working for Ram.
**Generated:** 26 Oct 2026. **Companion file:** `admin_permissions.json` (the role and permission matrix; use it to drive code and tests). Put both in `docs/admin/`.
**Context:** the eight student-facing modules and the 21 tables already work. This spec adds an admin layer that can change the curriculum, prerequisites, and all content, **without code changes**, for several departments, with several kinds of admins, and with an approval trail. The platform will be pitched to the university as a replacement for an outdated portal, so governance, auditability, and ease of use matter as much as features.

> **Golden rules.**
> 1. **Never write to live tables directly from an admin session.** Admins edit drafts and change sets; only one server-side publish function applies approved changes.
> 2. **No admin can read individual student records** (grades, courses, CGPA). Admins see counts and aggregates only.
> 3. **Deleting is slow on purpose:** request, approval, cooling-off period, final confirmation. Nothing disappears instantly, not even for the Vice Chancellor.
> 4. **No public admin signup.** Admins exist only through the bootstrap list (testing phase) or single-use invitations.
> 5. **Never print or commit a secret.** Never put real passwords or real emails in the repo.
> 6. **Inspect before you build.** Read the real database and frontend code first (Phase 0). Do not assume table or column names.

---

## 1. Decisions already made (and defaults for the rest)

| Topic | Decision |
|---|---|
| Top role | **Vice Chancellor (VC)**; there is no "vice chairman". Sees and can act on everything, but with limits (Section 12) |
| Department role | **Chairman**, scoped to one department. Only the CIS chairman exists today |
| Entry role | **Data-entry operator**, scoped to one department and a few assigned modules |
| Departments | **CIS now; the design supports many.** Adding a department is data only (VC wizard), no code |
| Old batches | **Keep their old curriculum**, always |
| Batch selection (students) | **Hybrid** (Section 10): logged-in students pick their batch once and see it by default; everyone can browse any batch with a search picker |
| Operators | **Cannot change anything live.** They prepare drafts in a few modules; every change needs approval. They have no access to curriculum, prerequisites, credit hours, course outlines, grading rules, or the degree predictor |
| Approval | A pop-up generates a ready-to-copy message with the exact module and changes, naming the approver and their official email. The approver approves inside the panel with a one-time code |
| Authentication | **No authenticator app.** Email and password plus an **email one-time code**, with an allowlist and short sessions (Section 6) |
| Accounts now | **Hard-coded test emails** for the VC and the CIS chairman (from a server-only config). Replace with invitations when the official domain (nedut.edu.pk) is live |
| Deletion | Soft delete only, with a **cooling-off period** and final confirmation (Section 5) |
| Reading data | Paginated and capped; **no "export everything"** for any role (Section 12) |
| Technical owner (Ram) | Handles infrastructure through the Supabase and Vercel dashboards; **no hidden super-admin role in the app** |

**Defaults Ram can change in settings (not code):** which curriculum changes count as *major*; cooling-off days; approval routing; operator module assignments; session lengths.

---

## 2. Core ideas

### 2.1 Curriculum versions and revisions (your "multiple course profiles")
- A **program** (for example BE Computer Systems Engineering) belongs to a **department** and has many **curriculum versions** ("Scheme 2022", "Scheme 2026").
- A version holds its own course placement (semester, credits, category), elective groups, prerequisites, chart layout, grade scale, passing grade, maximum credits per semester, and graduation rules (the degree predictor).
- **Courses are shared records** (`course_master`). Versions link to them with their own semester and credits, so a course can appear in several versions.
- A **published version is immutable.** Editing creates a new **revision** (draft) based on it; publishing switches the active revision atomically. Old revisions are kept for rollback.
- A **batch** (admission year) points to one curriculum version. Old batches keep theirs.
- **Course equivalences** record how old courses map to new ones (same, replaced by, split, merged), so migrations and comparisons are possible without touching student records by hand.
- **Current state:** today there is one profile. Phase 1 backfills it as the first version and attaches all existing students to it.

### 2.2 Draft, review, publish (the single choke point)
```
Operator/Chairman edits draft  ->  validation  ->  approval request  ->  approver approves
      ->  publish function (one transaction)  ->  cascade jobs  ->  live
```
- **Live tables are read-only to admin sessions** (enforced by row-level security and grants). The publish function (server side, security definer) is the only writer.
- Content modules store drafts as **change sets** (a list of before and after items). Curriculum drafts are rows under a draft revision.

### 2.3 Impact tiers
Every change set is classified from its diff:
- **Minor:** text edits, descriptions, titles, roadmap text, FAQ text, resource links, tags, professor profile text.
- **Major:** prerequisites, credits, semester placement, adding or removing a course in a version, elective rules, grade scale, passing grade, maximum credits, graduation rules, batch-to-version mapping, any deletion, any rollback, any new version.
- A policy table decides who may publish each tier (defaults in Section 3). Keep the classification rules in data so Ram can change them.

### 2.4 Shared courses
Many courses (mathematics, humanities) belong to other departments. `course_master.owner_department_id` says who owns the course. A change to a shared course that another department's chairman owns needs that chairman's approval, not just the editing department's.

---

## 3. Roles and permissions
The full matrix is in **`admin_permissions.json`**. Generate the permission checks and the test suite from that file so code and rules cannot drift apart.

| Area | Vice Chancellor | Chairman (own department) | Operator (own department, assigned modules) |
|---|---|---|---|
| Curriculum, prerequisites, credits, outlines, grading, degree predictor, batches | Everything; approves and publishes major changes | Drafts; **publishes minor changes**; major changes **need VC approval** | **No access** |
| FYP records, outcomes, companies | Everything | Everything in own department; approves operator work | **Draft only**, needs approval |
| Professors | Everything | Same as above | **Draft only**, needs approval |
| Career Hub (tracks, roadmaps, articles, repos) | Everything | Same as above | **Draft only**, needs approval |
| Chatbot content (FAQs, preloaded answers, promoted questions) | Everything | Same as above | **Draft only**, needs approval |
| Chatbot settings (caps, thresholds, provider chain) | Everything | None | None |
| Data imports (uploads, review queue) | Everything | Approves reviewed records | Prepare and edit records; cannot approve |
| Admin accounts | Manages chairmen and operators | Manages operators of own department | None |
| Student deletion requests | Processes | Processes for own department | None |
| Departments | Create and edit | None | None |
| Delete | Approves and confirms final purge | Requests (curriculum: needs VC) and approves operator content deletions | **Requests only** |
| History and audit | All, paginated | Own department | **Own submissions only** |
| Rollback | Yes | Request, needs VC | None |

**Rules that always hold**
- Hide controls a role cannot use, and on disabled controls show **"Why can't I do this?"**: the required role and how to ask for it.
- A user never approves their own request.
- If a department has no active chairman, the VC acts for it.
- Operators can only see the modules assigned to them (`allowed_modules`).

---

## 4. Approval workflow

### 4.1 Flow
1. The operator edits a draft and presses **Save and request approval** (or tries to delete).
2. A pop-up explains in plain language: *"This change needs approval before students can see it."* It shows the **generated message** (below), a **Copy message** button, the approver's name and **official email**, an expiry time, and a status link.
3. The operator copies the message and emails or messages the approver. (The system never sends this email itself.)
4. The approver logs in, opens **Approvals**, and opens the request (by the link, or by pasting the **request code**). They review the diff and press **Approve** or **Reject** (with a note). Approval needs a fresh **email one-time code** (step-up).
5. On approval the publish function runs, the cascade starts (Section 8), and the operator sees **Approved and live**. On rejection the operator sees the note and can edit and resubmit.

### 4.2 Routing (defaults)
| Requester | Action | Approver |
|---|---|---|
| Operator | Any content change or deletion | Their department's chairman |
| Chairman | Major curriculum change, curriculum deletion, rollback | Vice Chancellor |
| Chairman | Minor curriculum change, any content change | No approval needed (audited) |
| VC | Anything | No second approver, but deletions still use the cooling-off period and step-up |

If the chairman is unavailable, the VC can approve operator requests.

### 4.3 The generated message (deterministic template, no AI needed)
```
APPROVAL REQUEST CIS-2026-0042
To: <Approver name>, <Chairman | Vice Chancellor>, <official email>
From: <Requester name>, <Role>, Department of <Department>
Module: <Module name> > <Section>
Action: <Edit N records | Add N records | Delete N records>

Exact changes:
1. <Record name>: "<old value>" -> "<new value>"
2. ...

Reason given: <requester note>
Impact: <Minor | Major>, <who it affects, for example "visible to all students">
Expires: <date and time>

To approve: log in to the EduCompass admin panel, open Approvals, and enter code <CODE>.
This message does not give anyone permission by itself.
```
- The diff-to-sentence generator lists every change item with names, not IDs. Cap at 20 lines and say "and N more, see the panel".
- For a Chairman escalating to the VC, the first line of the pop-up says: *"Contact the Vice Chancellor at <official email>."*

### 4.4 Security of the approval code
- The code is a **lookup key only**. Store only its hash. It is single-use and expires (default 72 hours).
- The server checks **who is approving** (role, department, not the requester), the request state, expiry, and a fresh email code. A copied message or code grants no power.
- Editing a draft after submission **invalidates** the request; resubmit.
- Everything (created, viewed, approved, rejected, expired) is audit-logged.

---

## 5. Deletion lifecycle
```
Requested -> Approved -> Cooling-off (item hidden from students, recoverable) -> Ready to purge -> Purged
                 \-> Rejected     \-> Restored (any time before purge)
```
- **Soft delete first:** the item disappears from the student site at approval, but stays in the database.
- **Cooling-off defaults:** career and chatbot content 7 days; FYP and professor records 14 days; curriculum items 30 days; a whole curriculum version 90 days (and only VC); departments cannot be deleted, only archived.
- **Final purge** is VC-only, only after the cooling-off period, only with a fresh email code, and only one item or small batch at a time (cap per day; no bulk purge).
- **Protected items:** a course, version, or batch referenced by any student record or batch can only be **archived**, never purged. Audit entries are never purged.
- A purged record leaves a **tombstone** (id, type, who, when) in the audit log.
- Student account deletion (SEC-07) keeps its own rule: processed within 7 days of the Admin action, and logged.

---

## 6. Authentication and security

### 6.1 Accounts
- **No signup page for admins.** Nothing links to the admin login from the public site; host it on its own path or subdomain with its own cookie.
- **Testing phase:** a server-only config (`ADMIN_BOOTSTRAP_ENABLED=true` and `ADMIN_BOOTSTRAP_JSON` listing role, department, and email for the test VC and the CIS chairman) creates the first `admin_users` rows on startup. **Never hard-code emails in source files.** Set `ADMIN_BOOTSTRAP_ENABLED=false` in production.
- **Normal operation:** VC invites chairmen; chairmen invite operators. An invitation is **single-use, expires in 48 hours, tied to one email, role, department, and set of modules**. Only the invited email can accept it.
- Accepting an invitation: set a password (12 or more characters, breached-password check), then verify the email code.

### 6.2 Login
1. Email and password (generic error for any failure; never reveal whether the email exists).
2. **Email one-time code** (6 digits, valid 10 minutes, 5 attempts, one use).
3. Session starts. Only emails present in `admin_users` with status `active` can receive a code.

### 6.3 Step-up (fresh code within the last 5 minutes)
Required for: approve or reject, publish, delete or restore, purge, rollback, user and role management, changing settings.

### 6.4 Sessions and limits
- Idle timeout 30 minutes; absolute limit 8 hours; session list with "sign out everywhere".
- Lock for 15 minutes after 5 failed attempts; limit code requests (for example 3 per 10 minutes per email).
- Secure, HTTP-only, SameSite-strict cookies; CSRF protection on every state change; strict security headers and CSP; HTTPS only.
- **Log** every login, failure, denied action, step-up, and permission change; show a **security panel** to the VC (recent failures, new devices). Hash IP addresses in the log.
- Backups of the database run regularly; test a restore.

### 6.5 Honest limitations
- **Email codes are weaker than authenticator apps** because the email account is the weak point. The allowlist, short sessions, step-up, immutable audit log, and "operators can only draft" design limit the damage of a stolen account. When the official email domain exists, add an optional authenticator-app toggle (off by default).
- **Check email delivery:** the free default email service in Supabase is limited and meant for testing. Verify current limits in the docs and plan a custom SMTP provider before real use.

### 6.6 Database-level enforcement (defence in depth)
- Roles live in `admin_users`, read by the server and by RLS helper functions. Nothing in the browser can set a role.
- RLS policies and grants: no admin role can insert, update, or delete live tables. Operators can only write their own draft rows. The `audit_log` table has **no update or delete** (revoke and trigger).
- Department scoping on every query (`department_id = my_department()`), except for the VC.

---

## 7. Database design

### 7.1 Phase 0: map the real schema first (mandatory)
Using the Supabase MCP on the **dev project, read-only**, and the frontend code, produce `docs/admin/schema_map.md`:
- Every one of the 21 tables: purpose, columns, foreign keys, which module uses it, which tables hold content versus student data.
- For each content table: which columns the new design adds (`department_id`, `status`, `deleted_at`, `delete_state`, `updated_by`, `updated_at`).
- How the existing single curriculum maps into `curriculum_versions`, `curriculum_courses`, and `prerequisite_rules`, and what the backfill will do.
- Which queries in the frontend must become **version-aware** (`curriculum_version_id` resolved from the batch).
Show this to Ram and wait for approval. The SQL below is the **target design**; adapt names to the real schema and write migrations as files in `supabase/migrations/`.

### 7.2 People and access
```sql
create table departments (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- 'CIS'
  name text not null,
  status text default 'active' check (status in ('active','archived')),
  created_at timestamptz default now()
);

create table admin_users (
  id uuid primary key references auth.users(id) on delete restrict,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('vc','chairman','operator')),
  department_id uuid references departments(id),
  allowed_modules text[] default '{}',  -- for operators
  status text default 'invited' check (status in ('invited','active','suspended','deactivated')),
  invited_by uuid references admin_users(id),
  last_login_at timestamptz,
  created_at timestamptz default now(),
  constraint dept_required check (role = 'vc' or department_id is not null)
);

create table admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('chairman','operator')),
  department_id uuid not null references departments(id),
  allowed_modules text[] default '{}',
  invited_by uuid not null references admin_users(id),
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table step_up_challenges (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id),
  purpose text not null,
  code_hash text not null,
  attempts int default 0,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table admin_login_events (
  id bigserial primary key,
  at timestamptz default now(),
  email_hash text,
  admin_id uuid,
  event text,                           -- login_ok, login_fail, otp_fail, locked, step_up_ok ...
  ip_hash text,
  user_agent text
);
```

### 7.3 Curriculum (versioned)
```sql
-- programs(id, department_id, code, name, degree_type) probably exists: add department_id if missing.

create table course_master (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,            -- normalised 'CS-218'
  title text not null,
  owner_department_id uuid not null references departments(id),
  description text,
  status text default 'active',
  deleted_at timestamptz
);

create table curriculum_versions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,             -- references programs(id)
  name text not null,                   -- 'Scheme 2026'
  revision int not null default 1,
  status text not null default 'draft'
    check (status in ('draft','in_review','published','archived')),
  based_on uuid references curriculum_versions(id),
  grade_scale jsonb,
  passing_grade text,
  max_credits_per_semester int,
  graduation_rules jsonb,               -- degree predictor settings
  chart_layout jsonb,
  release_id uuid,
  published_at timestamptz,
  created_by uuid, created_at timestamptz default now(),
  unique (program_id, name, revision)
);

create table curriculum_courses (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references curriculum_versions(id) on delete cascade,
  course_id uuid not null references course_master(id),
  semester int not null check (semester between 1 and 12),
  credits numeric(3,1),
  category text,
  elective_group_id uuid,
  slot jsonb,                           -- {col, band, row} chart position
  unique (version_id, course_id)
);

create table elective_groups (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references curriculum_versions(id) on delete cascade,
  name text not null, choose_count int default 1
);

-- prerequisite_rules exists: add version_id (backfill), keep the rule_tree jsonb (AND, OR, min grade).
-- alter table prerequisite_rules add column version_id uuid references curriculum_versions(id);

create table batches (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null,
  admission_year int not null,
  label text not null,                  -- 'Batch 2022'
  curriculum_version_id uuid not null references curriculum_versions(id),
  status text default 'active',
  unique (program_id, admission_year)
);
-- alter table profiles add column batch_id uuid references batches(id);

create table course_equivalences (
  id uuid primary key default gen_random_uuid(),
  from_version_id uuid references curriculum_versions(id),
  from_course_id uuid references course_master(id),
  to_version_id uuid references curriculum_versions(id),
  to_course_id uuid references course_master(id),
  relation text check (relation in ('same','replaced_by','split','merged'))
);
```

### 7.4 Workflow, releases, audit
```sql
create table change_sets (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id),
  resource text not null,               -- 'fyp','professors','career','chatbot_content','curriculum', ...
  title text not null,
  status text default 'draft' check (status in
    ('draft','submitted','approved','rejected','published','cancelled','expired')),
  impact text check (impact in ('minor','major')),
  created_by uuid not null references admin_users(id),
  submitted_at timestamptz, decided_by uuid, decided_at timestamptz, decision_note text,
  release_id uuid, created_at timestamptz default now()
);

create table change_items (
  id uuid primary key default gen_random_uuid(),
  change_set_id uuid not null references change_sets(id) on delete cascade,
  table_name text not null, record_id uuid,
  op text check (op in ('insert','update','delete','archive')),
  before jsonb, after jsonb
);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  public_ref text unique not null,      -- 'CIS-2026-0042'
  change_set_id uuid not null references change_sets(id),
  requested_by uuid not null references admin_users(id),
  approver_role text not null check (approver_role in ('chairman','vc')),
  approver_id uuid references admin_users(id),
  message_text text not null,           -- the generated message
  code_hash text not null,
  status text default 'pending' check (status in ('pending','approved','rejected','expired','cancelled')),
  expires_at timestamptz not null, decided_at timestamptz
);

create table deletion_schedule (
  id uuid primary key default gen_random_uuid(),
  table_name text not null, record_id uuid not null,
  requested_by uuid not null, approved_by uuid,
  state text default 'requested' check (state in
    ('requested','approved','cooling_off','ready_to_purge','purged','restored','rejected')),
  cooling_off_until timestamptz, reason text,
  purged_by uuid, purged_at timestamptz
);

create table approval_policies (
  resource text, impact text, action text,
  approver_role text,                   -- null = no approval needed
  primary key (resource, impact, action)
);

create table releases (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null,             -- 'cis-scheme2026-r1'
  department_id uuid, program_id uuid, notes text,
  created_by uuid, created_at timestamptz default now(), rolled_back_at timestamptz
);

create table publish_jobs (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references releases(id),
  step text not null,                   -- see Section 8
  status text default 'queued' check (status in ('queued','running','done','failed','skipped')),
  detail jsonb, started_at timestamptz, finished_at timestamptz
);

create table audit_log (
  id bigserial primary key,
  at timestamptz default now(),
  actor_id uuid, actor_role text, department_id uuid,
  action text not null, resource text, record_id uuid,
  result text, details jsonb, ip_hash text
);
revoke update, delete on audit_log from public, anon, authenticated;
-- plus a trigger that raises an exception on update or delete.

create table permission_overrides (  -- optional: per-operator module assignment history
  admin_id uuid, module text, granted_by uuid, granted_at timestamptz default now()
);
```

### 7.5 Policies and functions (outline for the agent to implement)
- Helper functions (`security definer`, stable): `admin_role()`, `admin_department()`, `is_active_admin()`, `allowed_module(text)`.
- Grants: revoke insert, update, delete on **all live content tables** from `authenticated`; admin sessions may only write `change_sets`, `change_items`, `approval_requests` (their own, in their department), and draft curriculum rows.
- `apply_change_set(change_set_id uuid)` (security definer): verifies approval and impact policy, applies all items in **one transaction**, writes the release row, enqueues jobs, audit-logs. It is the **only** writer to live tables.
- `purge_scheduled(deletion_id uuid)` (security definer): checks cooling-off, references, VC role, and step-up.
- Student tables (`profiles`, `academic_records`, `roadmap_progress`, shortlists): **no admin policy at all**. Admin views of students come only from aggregate views (counts).

### 7.6 Backfill (Phase 1)
1. Create the CIS department and the first `programs` link.
2. Create `curriculum_versions` "Scheme <current>" (revision 1, published) from the existing single profile; move courses to `course_master` and `curriculum_courses`; add `version_id` to prerequisite rules.
3. Create `batches` for the existing students' admission years pointing to that version; set `profiles.batch_id`.
4. Add `department_id`, `status`, `deleted_at` to content tables and backfill CIS.
5. Verify: the student site shows exactly what it showed before (snapshot test).

---

## 8. Publish cascade (everything the project needs when the curriculum or content changes)
Run as queued, **idempotent** jobs, visible in the admin dashboard with a status per step. Live data is switched atomically first; side jobs follow, and a failed side job shows a warning but does not undo the publish.

| # | Step | What it does |
|---|---|---|
| 0 | **Validate (before publishing)** | No prerequisite cycles; every prerequisite is in an earlier semester (unless corequisite); no orphan courses; credits within limits; elective groups valid; shared-course owner approvals present; every course has code, title, credits |
| 1 | Snapshot | Create the release tag and an immutable JSON snapshot of the version |
| 2 | Apply | `apply_change_set` in one transaction |
| 3 | Rebuild graph | Regenerate the prerequisite graph and chart layout for the version |
| 4 | Recompute scores | Importance scores and breakdowns for the version (estimates) |
| 5 | Read models and caches | Refresh any denormalised tables; revalidate Next.js pages and tags |
| 6 | Chatbot index | Re-embed only changed content (by content hash); respect the free-tier quota with a queue and daily cap |
| 7 | FAQ staleness | Mark FAQ intents whose `source_refs` touch changed tables as needing re-verification; template-driven answers update by themselves |
| 8 | Career links | Re-check `career_tracks` course links against the version; list broken ones |
| 9 | Student notice | Show a dismissible banner to students on that batch: "Your curriculum was updated on <date>" with a change summary |
| 10 | Health report | Post the results to the dashboard |

**Rollback:** re-point the active revision to the previous release (with VC approval for chairman requests) and re-run steps 3 to 10. Never edit history.

---

## 9. How an admin reaches the eight modules

| Student module | Admin section | Who edits | Notes |
|---|---|---|---|
| 1 Accounts and access | Admin accounts; Student deletion requests | VC, chairman (own department) | No student record is ever shown |
| 2 FYP Portal | FYP records, outcomes, companies, tags | Operator drafts; chairman approves | Student names never exist; no per-supervisor outcome rates |
| 3 Professor Directory | Professors and tags | Operator drafts; chairman approves | Derived research areas are labelled |
| 4 Student Guidance (Planner, GPA, degree predictor) | Curriculum settings: grade scale, passing grade, credit limits, graduation rules | Chairman drafts; VC approves major changes | Operators have no access |
| 5 Prerequisite Explorer | Curriculum: courses, prerequisites, chart layout, electives | Chairman; VC approves major changes | Chart editor with drag and drop |
| 6 Career Hub | Tracks, roadmaps, steps, articles, repositories, domain-to-track map | Operator drafts; chairman approves | Progress keys (`topic_key`) stay stable |
| 7 AI Chatbot | FAQ and preloaded answers, promoted questions; settings | Operator drafts content; VC owns settings | See `EDUCOMPASS_FAQ_PRELOAD.md` |
| 8 Admin and Data Console | Imports, review queue, releases, audit | Chairman and VC | Operators can edit records and mark them ready |

**Edit in place:** an authorised admin browsing the normal student pages sees an **"Edit this"** button that opens the matching admin form (drafts only). **Preview as student:** every draft can be previewed on the real student pages for a chosen batch before submission.

### Scenario: a new batch arrives with a shifted course outline
1. Chairman opens **Curriculum > Clone scheme**, chooses "Scheme 2022", names the new one "Scheme 2026". A draft revision is created.
2. Edits courses, semesters, credits, electives, and prerequisites in guided forms. Optionally **imports** a new Scheme of Studies PDF or CSV: the extraction pipeline proposes records, which appear as draft changes to review.
3. Drags courses on the **chart editor** (auto-layout suggestion first). Sets grade scale, passing grade, and credit limits for the version.
4. Maps renamed or moved courses in **Equivalences**.
5. Presses **Validate**: sees errors and warnings in plain language, plus an **impact preview** (courses added, removed, moved; prerequisites changed; chatbot answers and career links affected).
6. Creates the **Batch 2026** row and attaches it to Scheme 2026.
7. Submits. Because it is major, the pop-up gives the message for the **Vice Chancellor**. The VC reviews the diff, approves with a step-up code, and the cascade runs.
8. New students see Scheme 2026's chart, eligibility rules, and degree predictor; Batch 2022 students still see Scheme 2022. The chatbot answers new questions about the new scheme from refreshed data.

---

## 10. Student-side batch selection (hybrid)
**Why hybrid:** it works for logged-in students (personalised), for visitors and parents (no login), and for the pitch (anyone can browse any batch).
- **Logged-in students:** at first login a short, friendly step asks "Which batch are you in?" (program and admission year, with search). It is saved as `profiles.batch_id`, pre-selected everywhere, and editable in the profile. Changes are limited (for example once per semester) and logged.
- **Planner, eligibility, backlog, and degree predictor always use the student's own batch.** They cannot be switched to another batch.
- **Everyone (including visitors):** a **batch picker** in the header with search ("2022", "Scheme 2026", "CSE"), defaulting to the **latest published scheme**. Choosing a batch changes the Prerequisite chart, course lists, and FAQ answers to that scheme in **read-only** mode, with a banner: *"You are viewing Batch 2022 (Scheme 2022)."* The choice is remembered in the browser and in the URL (`?batch=2022-cse`) so it can be shared.
- **Resolution order:** URL parameter, then the logged-in student's batch, then the remembered choice, then the latest published version.
- **Chatbot:** add a `batch` slot; answers use the resolved version.
- **Optional:** a "Compare schemes" view showing differences between two versions, using the same diff engine as the admin panel.
- **API:** `GET /api/v1/batches?program=&q=`; `GET /api/v1/curriculum/{versionId}`; the engine's `Program` object is built from a version.

---

## 11. Admin experience (easy, explanatory, safe)
**Layout:** a left menu built from the user's role; a top bar with role, department, notifications (approval results), and the **security and help** menu.

**Dashboards**
- **Operator:** *My tasks*, *My drafts*, *My requests and their status*, guided forms for the assigned modules, a "How to" panel.
- **Chairman:** department overview (batches, versions, content counts), **Approvals queue**, **Data health** (courses without credits, broken links, stale chatbot answers, professors without tags), team and operator management, department audit.
- **VC:** university overview (departments, escalations, releases, deletion schedule), security panel, department setup wizard, settings.

**Explanatory design (apply everywhere)**
- Every page opens with a short **"What is this?"** panel and an example. Fields have plain-language help ("Credits: how many credit hours this course counts for").
- Never show raw IDs; show names. Use dropdowns and search, not free text, for references.
- **Wizards** for big jobs: New Scheme, New Batch, Add Department, Import from PDF.
- **Impact preview and diff** before every submit. **Validation messages** say what is wrong and how to fix it.
- **Undo and restore** during the cooling-off period; a visible "Pending deletion" state.
- **"Why can't I do this?"** on every locked control.
- Searchable, filterable tables with pagination; keyboard accessible; works on a laptop screen first, tablet second.
- A read-only **Data map** page that explains each module's data in plain language (no raw table dumps).
- Use the project's design system (`packages/ui`); consistent states for empty, loading, and error.

**Operator guardrails:** operators never see history, other operators' drafts, student data, or the audit log beyond their own submissions.

---

## 12. Privacy and read limits
- **No individual student data** in any admin screen, export, log, or message. Student statistics are aggregates with small-number suppression (hide groups smaller than 5).
- **Pagination everywhere** (default 25, maximum 100). **No "export all"** for any role. Exports are limited to a defined report (for example, one curriculum version or one change set) and are logged.
- Rate limit admin reads; log bulk-looking behaviour (many pages quickly) and show it to the VC.
- The VC can see all departments, but through lists, search, and drill-down, never as one dump.
- Audit-log reading is itself logged.

---

## 13. API surface (admin; all under `/api/v1/admin`, all server-checked)
`POST /auth/login`, `/auth/verify-code`, `/auth/step-up`, `/auth/logout`; `GET /me`; `POST /invitations`, `POST /invitations/accept`; `GET|POST /change-sets`, `POST /change-sets/{id}/validate`, `/submit`, `/cancel`; `GET /approvals`, `POST /approvals/{id}/approve`, `/reject`; `GET|POST /curriculum/versions`, `POST /curriculum/versions/{id}/clone`, `/validate`, `/publish`; `GET|POST /batches`; `GET|POST /equivalences`; `POST /deletions` (request), `/deletions/{id}/restore`, `/purge`; `GET /releases`, `POST /releases/{id}/rollback`; `GET /jobs`; `GET /audit` (paginated); `GET /health`; content endpoints per module (`/fyp`, `/professors`, `/career`, `/chatbot`), each creating change items rather than writing live rows.

---

## 14. Tests (generate the first group from `admin_permissions.json`)
1. **Permission matrix:** for every role, resource, and action, expect allow, deny, or approval exactly as the matrix says (API and UI).
2. **Row-level security:** operators cannot write live tables; a chairman cannot touch another department; admins cannot read any student row; audit log update and delete fail.
3. **Approval flow:** the code is single-use; expired codes fail; self-approval fails; wrong role fails; a copied message alone does nothing; editing after submission voids the request; step-up is required; every step is audit-logged.
4. **Deletion lifecycle:** soft delete hides the item from students; purge before the cooling-off date fails; referenced items cannot be purged; restore works; purge limits enforced.
5. **Curriculum validation:** cycles, later-semester prerequisites, credit overflow, orphans, missing shared-course approval, and an invalid grade scale are all caught.
6. **Publish and rollback:** apply is atomic; jobs are idempotent; rollback restores the previous release; old batches still see their old scheme.
7. **Batch resolution:** URL, profile, remembered choice, and default order; planner locked to own batch; read-only banner when browsing another batch.
8. **Authentication:** no admin signup route; allowlist only; invitation single use and expiry; code expiry and attempts; lockout; generic errors (no user enumeration); idle and absolute timeouts; step-up required where listed.
9. **Privacy:** no student data in any admin response (scan); no export-all; page-size cap; rate limits.
10. **Backfill:** the student site before and after the migration is identical (snapshot).
11. **Usability:** three operators and one chairman each complete a task (edit a roadmap step, request a deletion, approve a request, clone a scheme) without help; fix what confuses them.
12. **Security scan:** ZAP baseline, dependency audit, secret scan; no secrets in the client bundle.

---

## 15. Execution plan (tick as you go)
- [ ] **A0** Put the spec files in `docs/admin/`. Decide the defaults in Section 16. *(Ram)*
- [ ] **A1 Phase 0:** inspect the dev database and the frontend; write `schema_map.md`; Ram approves.
- [ ] **A2 Migrations:** people and access tables, curriculum versioning, workflow, audit, policies; backfill (Section 7.6); snapshot test passes.
- [ ] **A3 Student side:** make queries version-aware; batch picker and first-login batch step; banner; chatbot `batch` slot.
- [ ] **A4 Auth:** bootstrap config (test emails from env), email-code login, sessions, lockout, step-up, invitations, security panel.
- [ ] **A5 Permissions:** load `admin_permissions.json`; server checks; RLS and grants; hide and explain controls; permission-matrix tests.
- [ ] **A6 Change sets and approvals:** drafts, diff-to-message generator, approval pop-up, approvals queue, `apply_change_set`.
- [ ] **A7 Content modules:** FYP, professors, career, chatbot content, imports (operator drafts, chairman approval).
- [ ] **A8 Curriculum admin:** clone scheme, course and prerequisite forms, elective groups, chart editor, equivalences, validation, impact preview, batches.
- [ ] **A9 Publish cascade:** the jobs in Section 8 with status panel and rollback.
- [ ] **A10 Deletion lifecycle:** request, approval, cooling-off, restore, purge.
- [ ] **A11 Dashboards and help:** three dashboards, data health, data map, wizards, in-app help.
- [ ] **A12 Hardening and tests:** full test plan (Section 14), security scan, usability session, documentation (admin handbook, ADR for the new roles, SRS note that the single Admin role became three roles).
- [ ] **A13 Demo script** for the university pitch: new batch scenario, approval pop-up, deletion cooling-off, audit trail.

---

## 16. Decisions for Ram (defaults in brackets)
1. Which changes are **major**? (prerequisites, credits, semester placement, adding or removing courses, grade scale, passing grade, max credits, graduation rules, batch mapping, deletions, rollbacks)
2. Does a **new scheme** need VC approval, or only the chairman? (VC)
3. **Cooling-off days** (7, 14, 30, 90) and the purge cap per day (5).
4. **Approval code expiry** (72 hours) and invitation expiry (48 hours).
5. **Email delivery** for login codes: which SMTP provider, and the sender address.
6. **Test emails** for the VC and the CIS chairman: set in the server-only bootstrap config.
7. **Shared courses:** require the owning department's chairman to approve changes? (yes)
8. **Operator module assignment:** which of FYP, professors, career, chatbot content, imports does each operator get? (assigned by the chairman)
9. **Batch change limit** for students (once per semester).
10. **Audit-log retention** (at least 1 year; the SRS minimum is 90 days).

---

## 17. Prompts for the agent

### 17.1 Phase 0
```
Read AGENTS.md and docs/admin/EDUCOMPASS_ADMIN_PANEL_SPEC.md and admin_permissions.json.
Do A1 only: inspect the dev database (read-only) and the frontend code, then write docs/admin/schema_map.md as described in Section 7.1.
Do not change anything. Show me the map and your list of assumptions and questions, and wait for my approval.
```

### 17.2 Migrations and backfill
```
Do A2: write migration files for Section 7 adapted to the real schema, plus the backfill in 7.6.
Run them on the dev database only. Prove with a before/after snapshot test that the student site is unchanged.
```

### 17.3 Auth and permissions
```
Do A4 and A5. Use the bootstrap config for the test VC and CIS chairman emails (read from server-only env, never in source).
Implement email-code login, sessions, lockout, step-up, and invitations. Generate the permission checks and tests from admin_permissions.json.
Show me the test results.
```

### 17.4 Change sets, approvals, curriculum
```
Do A6 to A9 in order, one at a time, showing me the screens and tests after each.
Remember: admin sessions never write live tables; only apply_change_set does. The approval message is generated from the diff by a template.
```

### 17.5 Review
```
Review the branch against Section 14 and the golden rules at the top of the spec. Report only; do not change code.
Pay special attention to: any admin path that writes a live table, any student data in an admin response, any secret in the repo or client bundle.
```
