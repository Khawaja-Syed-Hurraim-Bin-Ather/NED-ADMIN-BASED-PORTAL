# EduCompass Admin v3 Audit Report (Card E0)

**Date:** 2026-10-31  
**Author:** Solo Developer / Implementing Engineer (Ram)  
**Reference Documents:**  
- `docs/admin/EDUCOMPASS_ADMIN_PANEL_SPEC_v3_EDIT_MODE.md` (v3 Spec — Primary Screen Architecture)
- `docs/admin/EDUCOMPASS_ADMIN_FUNCTIONALITY.md` (Functional Requirements `FA`, `FE`, `FC`, `FS`, `FP`, `FY`, `FR`, `FK`, `FQ`, `FU`, `FV`, `FL`, `FD`, `FM`)
- `docs/admin/admin_permissions.json` (Governance & Authorization Matrix)
- `docs/admin/EDUCOMPASS_ADMIN_PANEL_SPEC.md` (v1 Technical Baseline)

---

## 1. Executive Summary

In adherence to **v3 Section 1**, the central architectural paradigm of EduCompass is:  
**The admin platform is the student platform.**  
Signed-in administrators navigate the identical pages that students navigate (Prerequisite Explorer, FYP Portal, Professors, Career Hub, Assistant, and Planner). With one header toggle—**Edit Mode**—those exact surfaces become directly editable.

### Core Audit Verdict:
1. **Strong Reusable Foundation:** Cards A0 through A13 built a hardened backend governance engine (`change_sets`, `change_items`, deterministic diffs, validation engine, cooling-off deletion schedule, publish cascade, and dynamic RBAC). **0% of this backend needs to be thrown away**; it serves as the exact persistence engine required by `saveDraftItem(resource, recordId, patch)`.
2. **Elimination of the Disconnected Admin Screen:** The existing monolithic dashboard at `apps/web/src/app/admin/page.tsx` with role tabs (`operator`, `chairman`, `vc`) will be decoupled. The student pages will host the inline edit controls, while administrative functions (Approvals, Uploads, History, People, Settings) become focused, lightweight modal views or pages in the **Admin Menu** per v3 Section 4.
3. **Mock Data Elimination:** Currently, two student pages (`/explorer` and `/careers`) rely on in-file static arrays (`CURRICULUM_COURSES`, `CAREER_TRACKS`) rather than querying the published PostgreSQL tables. These must be switched to live database queries.

---

## 2. Student Pages & Component Inventory (Mode Prop Suitability)

| Route & File | Current Purpose & Data Source | Mode Transition (`view` vs `edit`) | Reusable Components | Missing Edit Controls |
| :--- | :--- | :--- | :--- | :--- |
| **`/explorer`**<br>[`apps/web/src/app/explorer/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/explorer/page.tsx) | Prerequisite DAG flowchart using `@xyflow/react`. Uses in-file `CURRICULUM_COURSES` array. | **The Curriculum Studio in Edit Mode.**<br>In `view`: pan, zoom, click course for syllabus/prereq info.<br>In `edit`: courses draggable between semesters, connect handles to add prereqs, click course opens `<EditDrawer>`. | `CourseNodeCard`, Bezier dependency edges, category badge styles. | 1. Node drag-and-drop between semester columns.<br>2. Prerequisite edge connection handler.<br>3. `+ Add Course` 4-step wizard.<br>4. Course Edit Drawer (Details, Syllabus, Prerequisites, Used by).<br>5. Live acyclic DAG validation overlay. |
| **`/fyp`**<br>[`apps/web/src/app/fyp/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/fyp/page.tsx) | Final Year Project repository. Queries live `fyp_projects` table via Supabase client. | In `view`: search, filter, view details, similar projects modal.<br>In `edit`: pencil icons on project cards, inline editable fields, `+ Add Project` button, `Manage Branches` drawer. | Project card grid, status badges, details modal, tag rendering. | 1. Inline `<Editable>` title, supervisor, tools, outcome.<br>2. `+ Add Project` drawer (strictly zero student name fields — Rule 119).<br>3. `Manage Branches` drawer (add, rename, hide, merge branches).<br>4. Spreadsheet import modal. |
| **`/professors`**<br>[`apps/web/src/app/professors/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/professors/page.tsx) | Faculty directory & research match. Queries `/api/v1/professors`. | In `view`: cards with research areas, tags, match score.<br>In `edit`: pencil icons on cards, `+ Add Professor` button, `<EditDrawer>` for qualification, interests, highlights. | Professor card, tag pills, match score breakdown modal. | 1. `<Editable>` on qualification, interests, highlights, tags.<br>2. `+ Add Professor` drawer with name confirmation guard.<br>3. Removal request button with cooling-off notice. |
| **`/careers`**<br>[`apps/web/src/app/careers/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/careers/page.tsx) | Career roadmaps & tracks. Uses in-file `CAREER_TRACKS` static array. | In `view`: roadmap stages, recommended courses.<br>In `edit`: edit track descriptions, drag-to-reorder roadmap steps, edit resource links. | Track cards, stage roadmap pills, skill tags. | 1. Switch from static array to live `career_tracks` and `roadmap_steps` queries.<br>2. Drag-to-reorder roadmap steps.<br>3. Add/edit curated articles and repositories. |
| **`/chat`**<br>[`apps/web/src/app/chat/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/chat/page.tsx) | Grounded 4-layer chatbot. Queries `/api/v1/chat`. | In `view`: student conversation with official rule citations.<br>In `edit`: **"Edit answer"** pencil on verified answers, **"Unanswered Questions"** drawer, "Needs re-check" badges. | Chat message feed, layer citation pills, suggestion chips. | 1. "Edit answer" action staging changes into `change_items`.<br>2. Unanswered questions drawer converting zero-PII queries to verified FAQs.<br>3. Staleness / Needs re-check indicators. |
| **`/planner`**<br>[`apps/web/src/app/planner/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/planner/page.tsx) | Student degree schedule planner. Queries `/api/v1/planner/template`. | In `view`: student custom schedule planner.<br>In `edit`: **Scheme Rules Drawer** (grade scale, passing grade, max credits, graduation rules) + **In-Memory Sandbox**. | 8-semester schedule grid, course pills, credit counter, prerequisite validation warnings. | 1. Scheme Rules side drawer (Chairman/VC only).<br>2. Sandbox mode indicator guaranteeing zero student record access (Section 5.4). |
| **Shared Header**<br>[`apps/web/src/components/PageHeader.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/components/PageHeader.tsx) | Site navigation breadcrumbs, brand, and batch selector. | In `view`: student batch selector, light/dark theme toggle.<br>In `edit`: **Edit Mode Switch**, **Draft Banner** with "View as Student" toggle, **Pending (n)** drawer button, **Admin Menu** dropdown. | NED brand logo, breadcrumb layout, theme switch, `BatchPicker`. | 1. Unified header controls defined in v3 Section 2.1.<br>2. Draft mode alert banner.<br>3. Pending changes slide-out drawer (`<PendingDrawer>`).<br>4. Admin menu (Approvals, Uploads, History, People, Settings). |

---

## 3. Existing Admin Backend Assets (Directly Reusable)

The backend implemented in Cards A0–A13 aligns with v3 requirements:

1. **`change_sets` & `change_items` Choke Point:**  
   [`apps/api/src/routes/workflow.ts`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/api/src/routes/workflow.ts) provides the atomic staging mechanism. Every edit in Edit Mode will call `POST /api/v1/admin/content/:module/draft`, creating/updating a draft item under the admin's active change set. **Golden Rule 1 is preserved.**
2. **Deterministic Diff Engine:**  
   [`apps/api/src/lib/diff-message-generator.ts`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/api/src/lib/diff-message-generator.ts) formats draft items into plain-language change statements for `<PendingDrawer>` and the copyable approval pop-up.
3. **Curriculum DAG Validation Engine:**  
   [`apps/api/src/routes/admin-curriculum.ts`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/api/src/routes/admin-curriculum.ts) (`validateCurriculumDraft`) detects cycles, backward prerequisites, and credit hour limit overloads. This runs live whenever an admin edits courses in `/explorer`.
4. **Publish Cascade & VC Rollback:**  
   [`apps/api/src/lib/publish-cascade.ts`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/api/src/lib/publish-cascade.ts) runs steps 3 to 10 (rebuild graph, update scores, refresh chatbot embeddings, student notices).
5. **Deletion Lifecycle & Waiting Periods:**  
   [`apps/api/src/routes/deletions.ts`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/api/src/routes/deletions.ts) enforces the 7 to 90-day cooling-off schedule, instant soft-hiding, restoration, and VC-only purge quota (5/day).
6. **Permissions Matrix:**  
   [`apps/api/src/lib/admin-permissions.ts`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/api/src/lib/admin-permissions.ts) enforces the dynamic matrix from `admin_permissions.json`.

---

## 4. Mock Data Sources & Static Fallbacks Audit

| # | File Path | Line(s) | Current Mock / Static Code | Problem Under v3 | Proposed Fix |
| :---: | :--- | :---: | :--- | :--- | :--- |
| **M1** | [`apps/web/src/app/explorer/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/explorer/page.tsx) | 52–109 | `const CURRICULUM_COURSES: CourseData[] = [...]` | Hardcoded in-file static course array. Edits in Edit Mode cannot overlay or persist onto hardcoded code constants. | Fetch published courses from `GET /api/v1/curriculum?batch=${batchKey}`. In Edit Mode, overlay active `change_items`. |
| **M2** | [`apps/web/src/app/careers/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/careers/page.tsx) | 36–100 | `const CAREER_TRACKS: CareerTrack[] = [...]` | Hardcoded in-file static tracks array. Stored database table `career_tracks` is bypassed. | Fetch tracks from `GET /api/v1/careers`. In Edit Mode, overlay active `change_items`. |
| **M3** | [`apps/web/src/app/admin/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/admin/page.tsx) | 163–212 | Mock fallbacks: `cs-demo-1`, `app-demo-1`, `del-demo-1`, `rel-1` | If API fetch fails or is disconnected, hardcoded mock records appear with fake names and IDs. | Remove mock fallbacks. Display proper empty state or clear error message adhering to Rule 10 ("No placeholder content"). |
| **M4** | [`apps/web/src/app/dashboard/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/dashboard/page.tsx) | 163–170 | Fallback student profile: `ayesha.khan@cloud.neduet.edu.pk` | Hardcoded fallback when unauthenticated. | Use session context; in Demo Mode, bind explicitly to active seeded persona. |

---

## 5. Dead Controls & Unlinked Actions Audit

| # | File Path | Control / Element | Issue Description | Proposed Fix |
| :---: | :--- | :--- | :--- | :--- |
| **D1** | [`apps/web/src/app/explorer/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/explorer/page.tsx) | Modal "Mark Completed" / "Mark Failed" buttons | Mutates in-memory `Set<string>` only; state is wiped on page refresh and has no link to real student planner or failure simulation. | In view mode: save to student planner or local session. In Edit mode: replace modal with `<EditDrawer>` containing tabs: Details, Syllabus, Prerequisites, Used by. |
| **D2** | [`apps/web/src/app/admin/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/admin/page.tsx) | "Content Entry" module tiles | Clicking "New Course", "New FYP", "New Professor" displays an informational banner but does not open an authoring form. | Under v3, delete separate content entry tiles. The student pages (`/explorer`, `/fyp`, `/professors`, `/careers`) will host the native `+ Add` wizards. |
| **D3** | [`apps/web/src/app/admin/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/admin/page.tsx) | Operator Accounts tab | Shows static list; the "+ Invite Operator" button is unlinked. | Move user management to the **People** page in Admin Menu with working 48-hour single-use invitation modal. |
| **D4** | [`apps/web/src/app/fyp/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/fyp/page.tsx) | Shortlist bookmark button | Toggles local state `shortlistedIds`; does not persist to database when logged in. | Connect bookmark action to student profile shortlist API. |

---

## 6. Jargon Strings & Raw Identifiers Audit

| # | File Path | Raw String / Jargon | Issue | Plain-Language Replacement (v3 SRS Standard) |
| :---: | :--- | :--- | :--- | :--- |
| **J1** | [`apps/web/src/app/admin/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/admin/page.tsx) | `DAG Acyclic Integrity`, `Graph DFS Depth` | Graph theory jargon shown to Chairman and VC. | *"Prerequisite Dependency Chain: Verified Acyclic (No circular requirements found)"* |
| **J2** | [`apps/web/src/app/admin/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/admin/page.tsx) | Raw IDs: `cs-demo-1`, `app-demo-1`, `del-demo-1`, `prof-99` | Developer mock slugs exposed in badges. | Human-readable public references: `CIS-2026-001`, `Removal: Dr. Shahid (Faculty)`, `Draft: Scheme 2026 Revision`. |
| **J3** | [`apps/api/src/routes/health-report.ts`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/api/src/routes/health-report.ts) | Raw UUIDs: `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | Raw database UUIDs rendered in UI tables. | Display department code and name: *"Computer & Information Systems Engineering (CISE)"*. |
| **J4** | [`apps/web/src/app/admin/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/admin/page.tsx) | `apply_change_set() Choke Point` | Technical database function name displayed in user banner. | *"Institutional Verification Gateway: All changes staged and reviewed before publishing."* |

---

## 7. Role-Switcher & Demo Mode Transition

### Current Implementation:
[`apps/web/src/app/admin/page.tsx`](file:///c:/Users/syedh/.gemini/antigravity/scratch/educompass/apps/web/src/app/admin/page.tsx) displays three prominent buttons in the top governance bar:  
`[ Data Operator ]` | `[ Department Chairman (CIS) ]` | `[ Vice Chancellor ]`.

### v3 Spec Mandate (Section 5.5):
> *"What this removes from earlier designs: The separate 'Governance Console', 'Curriculum Studio' page, and the role chips. Role switching exists only in **Demo mode** (v2 Section 10), which signs in as a real seeded account."*

### Proposed Refactoring:
1. **Remove Public Role Chips from Main Navigation:** Normal users and logged-in admins see only their authenticated session.
2. **Implement Dedicated Demo Mode Drawer:**
   - Activated via a discrete `[ 🧪 Demo Mode ]` control in the Admin Menu or footer when `ADMIN_DEMO_MODE=true` in development.
   - Signs into real seeded database accounts via `/api/v1/admin/auth/demo-session`:
     - **Operator:** `operator.demo@nedut.edu.pk` (allowed modules: FYP, Professors, Careers, Chatbot).
     - **Chairman:** `chairman.cis@nedut.edu.pk` (CIS department oversight, curriculum approvals).
     - **Vice Chancellor:** `cursor.pro.test124@gmail.com` (university-wide authority, purge, emergency rollback).
3. **Persist Active Mode in Global Context:** `EditModeContext` provides `isEditMode`, `userRole`, `activeScheme`, and `workingSet` to all components without page reloads.

---

## 8. Proposed Architecture for Step E1 (Foundation)

```mermaid
flowchart TD
    subgraph Client ["Client Layer (apps/web)"]
        H["Unified Header (PageHeader)"]
        TOGGLE["Edit Mode Switch [ (o) ]"]
        BANNER["Draft Alert Banner + View as Student Toggle"]
        DRAWER["Pending Changes Drawer (n)"]
        EDITABLE["<Editable> / <EditableList> / <EditDrawer>"]
        LOCK["<LockedHint requiredRole>"]
    end

    subgraph State ["Global State (useEditMode)"]
        CTX["EditModeContext"]
        ROLE["Active Admin Role & Permissions (can())"]
        SCHEME["Active Working Scheme (e.g. Scheme 2026)"]
        DRAFT["Working Set (Pending Change Items)"]
    end

    subgraph Backend ["API Layer (apps/api)"]
        DRAFT_EP["POST /api/v1/admin/content/:module/draft (saveDraftItem)"]
        OVERLAY["GET /api/v1/:resource?overlay=draft (Live + Pending)"]
        PERM["can(role, resource, action, context) via admin_permissions.json"]
    end

    H --> TOGGLE
    TOGGLE --> CTX
    CTX --> BANNER
    CTX --> DRAWER
    CTX --> EDITABLE
    CTX --> LOCK
    
    EDITABLE -->|saveDraftItem()| DRAFT_EP
    DRAFT_EP -->|Stages in change_items| DRAFT
    DRAFT --> OVERLAY
    ROLE --> PERM
```

### Key Shared Components to Build in Step E1:
1. `EditModeProvider` & `useEditMode()`: Global context managing `editModeEnabled`, `viewAsStudent`, `activeRole`, `activeScheme`, and `pendingChangesCount`.
2. `<Editable resource="..." recordId="..." field="..." />`: In `view` mode, renders clean text/content; in `edit` mode, displays inline editable input with blur auto-save calling `saveDraftItem()`.
3. `<EditDrawer resource="..." recordId="..." />`: Slide-out panel for detailed edits (e.g. course 4-tab editor, syllabus topics, professor highlights).
4. `<LockedHint requiredRole="..." />`: Clean lock icon with tooltip explaining who has permission (e.g. *"Only the Chairman can change this. Send a request."*).
5. `<PendingBar>` & `<PendingDrawer>`: Slide-out drawer listing pending changes in plain sentences, with **Check** (live validation) and role-tailored submission button (**Submit for approval** vs **Publish now**).

---

## 9. Implementation Roadmap (Steps E0 to E9)

| Step | Milestone | Scope & Acceptance Criteria |
| :---: | :--- | :--- |
| **E0** | **Audit current build** *(Current Card)* | Inspect all pages, identify mocks, dead controls, jargon, role-switcher. Write `docs/admin/audit.md`. |
| **E1** | **Edit Mode Foundation** | `EditModeContext`, header switch, draft banner, "View as student" toggle, `saveDraftItem` server action, `can()` helper, `<PendingDrawer>`, `<LockedHint>`. |
| **E2** | **Prerequisite Explorer Edit** | Interactive course drag between semesters, prerequisite line drawing on canvas, course `<EditDrawer>` (Details, Syllabus, Prerequisites, Used by), 4-step `+ Add Course` wizard, live acyclic validation. |
| **E3** | **FYP Portal Edit & Branches** | Inline project editing, `+ Add Project` wizard (zero student PII fields), `Manage Branches` drawer (add, rename, hide, merge, move projects), spreadsheet importer. |
| **E4** | **Professors, Careers & Chatbot Edit** | Professor card editing & `+ Add Professor`; Career Hub track editing, drag-and-drop roadmap step reordering; Assistant answer editing and Unanswered Questions FAQ converter. |
| **E5** | **Planner Scheme Rules & Sandbox** | Scheme rules drawer (grade scale, passing grade, max credits, graduation rules); in-memory degree planning sandbox without reading student records. |
| **E6** | **Approvals, Review Mode & History** | Plain-language Approvals page, copyable approval pop-up, side-by-side Review Mode overlay, atomic publish cascade execution, immutable History & cooling-off waiting period queue. |
| **E7** | **Uploads & Developer Inbox** | Drag-and-drop file upload with dual paths: "Import data myself" (row-by-row validation) and "Send to the developers" (inbox with comment thread and status tracking). |
| **E8** | **Schemes, Batches, People & Settings** | Scheme cloning wizard, Batch-to-Scheme mapping table, Admin People invitation manager (single-use 48h tokens), and VC Settings panel. |
| **E9** | **Hardening & End-to-End Verification** | WCAG AA accessibility, loading/empty states, comprehensive test suite verifying Scenarios 1–15, 0 TypeScript errors, clean production build. |

---

## 10. Conclusion & Next Step

The current codebase contains all the backend building blocks needed for v3. The transition requires:
1. Replacing static in-file data in `/explorer` and `/careers` with live database queries.
2. Wrapping student components in `<Editable>` and adding the side `<EditDrawer>` panels.
3. Adding the unified Edit Mode header switch and `<PendingDrawer>`.
4. Relocating auxiliary management tools (Approvals, Uploads, History, People, Settings) into the streamlined Admin Menu.

**Awaiting Ram's review and sign-off on `docs/admin/audit.md` before proceeding to Step E1.**
