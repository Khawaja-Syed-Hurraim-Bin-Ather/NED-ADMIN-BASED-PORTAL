# EduCompass Admin v3: The Same Platform, With an Edit Mode

**For:** Claude Opus and Antigravity (the agent), working for Ram. **Generated:** 28 Oct 2026.
**Precedence:** v3 **replaces the screen design in v2 (Sections 2 to 4)**. Everything else in v2 still applies: the golden rules, data additions, acceptance scenarios, glossary, tools list, and the pitch ideas. v1 remains the technical reference for approvals, deletion waiting periods, login security, and the publish steps. Where files disagree, **v3 wins over v2, and v2 wins over v1**. `admin_permissions.json` (v2) still defines who may do what.

---

## 1. The idea in one sentence
**The admin platform is the student platform.** An admin sees exactly the pages students see (Prerequisite Explorer, FYP Portal, Professors, Career Hub, Assistant, Planner), and with one switch, **Edit mode**, those same pages become editable. No separate dashboard to learn.

Why this is better:
- It is the **extended version of the main program**, as intended, so there is little new UI to build or explain.
- What the admin edits is **exactly what students will see**, so mistakes are obvious.
- The data is **real by construction**, because the pages already read the real database.
- It pitches itself: "Open the site. Press Edit. Change it."

---

## 2. What the admin sees

### 2.1 The header (same as students, plus three things)
```
EduCompass | Home  FYP Portal  Professors  Planner  Prerequisites  Career Hub  Assistant
                         Batch/Scheme: [Scheme 2026 v]   [ Edit mode  (o) ]   Pending (3)   Admin v
```
1. **Edit mode switch** (appears only for signed-in admins who can edit something).
2. **Pending (n):** opens a side drawer with this person's unsaved and unsubmitted changes, with the **Check** and **Submit** (or **Publish now**) buttons.
3. **Admin menu:** Approvals, Uploads, History, People, Settings (items depend on role).

### 2.2 What changes when Edit mode is on
- A slim banner appears: *"You are editing Scheme 2026 (draft). Students cannot see these changes yet."* with a **View as student** toggle that shows the live site, so the admin can compare.
- Editable things get a small **pencil** on hover, or are directly editable (text fields, drag handles). Things the person is not allowed to change show a **lock** with a tooltip: *"Only the Chairman can change this. Send a request."*
- A **"+ Add"** button appears where adding makes sense (a course, a project, a professor, a roadmap step).
- Changes are **saved automatically as pending changes**, never live. The page shows the draft version (live data plus the person's pending changes).

### 2.3 Who sees what (same pages, different controls)
| Role | Edit mode controls |
|---|---|
| **Operator** | Only on allowed content pages (FYP, Professors, Career, FAQ answers). Curriculum pages stay read-only, with a **"Propose a course"** button instead of editing |
| **Chairman** | Everything in their department, including the Prerequisite chart and scheme rules |
| **Vice Chancellor** | Everything in every department, plus department and settings pages |
| **Developer** | No edit mode; only the developer inbox in the Admin menu |

---

## 3. Page by page: Edit mode overlay

| Student page | In Edit mode the admin can... | Details |
|---|---|---|
| **Prerequisite Explorer** (this is the curriculum editor) | Drag courses between semesters; **click a course** and an **edit drawer** opens with tabs **Details, Syllabus, Prerequisites, Used by**; **draw a line** between courses to add a prerequisite; **+ Add course** (4-step wizard); archive a course; **New scheme from this one**; set which batches use the scheme | The chart is the same chart students see. The **prerequisite builder** and **syllabus form** are in v2 Sections 4.2 and 4.3 (use them inside the drawer). Validation runs live and in plain words |
| **Planner and degree guidance** | **Scheme rules** drawer: grade scale, passing grade, maximum credits, graduation rules (Chairman and VC only). Everything else on the page works normally | **Sandbox:** admins can try the Planner with test inputs that live only in their browser session, so they see how a rule change affects a student **without ever reading student data** |
| **FYP Portal** | Edit a project in its detail view or inline in the list; **+ Add project**; **Manage branches** drawer (add, rename, hide, merge, move projects); **Import from a spreadsheet** | No field for student names exists. Outcome and companies are editable fields |
| **Professors** | Edit a professor card (qualification, interests, highlights, tags); **+ Add professor** | Derived interests keep their "Derived" label until the admin confirms them |
| **Career Hub** | Edit track text; add, edit, and **drag to reorder** roadmap steps; edit resources; add articles and repositories | Step identifiers stay stable so students' saved progress is kept |
| **Assistant (chatbot)** | Each answer has **Edit answer**; an **Unanswered questions** drawer lets the admin turn a question into an FAQ; **Needs re-check** badges show answers whose data changed | Chatbot limits and thresholds are VC-only (Settings) |
| **Home / Terms** | Nothing (not content) | |

The same **Edit drawer** pattern is used everywhere: a side panel with the fields, a **Save draft** button (also automatic), and, for anything that deletes, a **Request removal** button instead of an instant delete.

---

## 4. The Admin menu (the only extra pages)
Small, simple pages that sit outside the student pages:

| Page | What it is | Who |
|---|---|---|
| **Approvals** | Cards in plain words: what changed, before and after, **Approve** or **Reject** (asks for the email code). Operators see **My requests** and their status | Chairman, VC; Operator (own) |
| **Uploads** | Drag and drop. Two paths: **Import data myself** (preview, errors, add to my pending changes) or **Send to the developers** (inbox with status and comments). Details in v2 Section 4.5 | All three roles; Developer sees the inbox |
| **History** | Published versions with who, when, and a summary; **Restore this version**; the **waiting period** list for removals with **Restore** | Chairman, VC; Operator (own) |
| **People** | Invite people, assign modules, suspend | Chairman (operators), VC (all) |
| **Settings** | Departments, chatbot limits, security events, Demo mode | VC |

**Pending changes drawer and Check:** lists what changed in plain sentences, runs the same validation as publishing, and shows the button that fits the role: **Submit for approval** (operators and major changes) or **Publish now** (chairman, minor changes). Operators who submit get the **approval pop-up** with the generated, copyable message (v1 Section 4, v2 Section 4.6).

---

## 5. How to build it (one codebase, no separate admin app)

### 5.1 Components
- Each existing page component gets a `mode` of `view` or `edit`, from a single `useEditMode()` context.
- Wrap editable things in a few shared components:
  - `<Editable resource field recordId>`: shows text in view mode; an input in edit mode.
  - `<EditableList resource>`: adds the **+ Add** button, drag reorder, and row menu.
  - `<EditDrawer resource recordId>`: the side panel for richer records.
  - `<LockedHint requiredRole>`: the lock and tooltip.
  - `<PendingBar>` and `<PendingDrawer>`.
- Views and edit controls use the **same design system** (`packages/ui`) so it feels like one product.

### 5.2 Data flow
- **Read in edit mode:** the server returns *published data plus the signed-in person's pending changes* (an overlay), so the page shows the draft. **View as student** returns published data only.
- **Write:** every edit calls one server action, `saveDraftItem(resource, recordId, patch)`, which stores a **pending change item** in the person's working set (one open working set per person and department). **Nothing writes live tables** (v1 golden rule).
- **Approver review:** opening an approval shows the submitted changes overlaid on the live pages ("Review mode"), with an **Approve** bar.
- **Publish:** the same publish function and steps as v1 Section 8, then on-demand page refresh so students see the change in seconds.

### 5.3 Permissions
- One helper, `can(role, resource, action, context)`, built from `admin_permissions.json`, is used by the interface (to show, lock, or hide controls) **and** by every server action (to enforce). The browser never decides permission.
- Edit mode is available only after **admin login** (email and password plus email code, v1 Section 6). Students have their normal login and never see the switch.

### 5.4 Privacy
- Admin pages never show a student's records. The Planner sandbox uses inputs typed in the admin's own browser session and stores nothing.
- Dashboards show totals only, never individual rows.

### 5.5 What this removes from earlier designs
- The separate "Governance Console", "Curriculum Studio" page, and the role chips. The **Prerequisite Explorer in Edit mode is the curriculum studio.**
- Role switching exists only in **Demo mode** (v2 Section 10), which signs in as a real seeded account.

---

## 6. Build order (replaces v2 Section 8)
| Step | Build | Done when |
|---|---|---|
| **E0** | **Audit the current build:** find what already works, what is fake or empty, and which parts can be reused as edit components; list every mock source and dead control | `audit.md` with paths and a fix list; Ram approves |
| **E1** | **Edit mode foundation:** the switch, banner, **View as student** toggle, working set and overlay read, `saveDraftItem`, `can()`, Pending bar and drawer, lock hints | Toggle works for each role; a test edit appears only in the draft and not on the student view |
| **E2** | **Prerequisite Explorer edit:** drag, edit drawer (Details, Syllabus, Prerequisites, Used by), prerequisite builder, **+ Add course** wizard, live validation | Scenarios 1 and 2 pass |
| **E3** | **FYP Portal edit and branches** (inline edit, add, manage branches, import) | Scenario 5 passes |
| **E4** | **Professors, Career Hub, and Assistant edit** | Scenario 4 passes for each |
| **E5** | **Planner scheme rules and sandbox** | A rule change shows its effect in the sandbox without student data |
| **E6** | **Approvals, approval pop-up, Review mode, publish, History, waiting periods** | Scenarios 3, 4, and 9 pass |
| **E7** | **Uploads** (import path, developer path, inbox) | Scenarios 6 and 7 pass |
| **E8** | **Schemes and batches** (clone scheme, batch table, batch picker link) and **People and Settings** | Scenarios 8 and 10 pass |
| **E9** | Accessibility, empty and loading states, in-app help, full tests, pitch rehearsal | All scenarios and the checks below pass |

**Acceptance scenarios:** use the 12 scenarios in v2 Section 7, plus these three:
- **13. Same pages:** for each student page, Edit mode (with no pending changes) shows the same content as the student view; only the controls differ.
- **14. View as student:** it matches what a logged-out visitor sees on the live site, character for character.
- **15. No second app:** there is no admin-only copy of any page's data; a data change made in Edit mode and published is the **only** way the student page changes.

---

## 7. Pitch in one line and one demo
"This is the student site. Press **Edit** and the university can change the curriculum, projects, professors, and roadmaps itself, with approvals and a full history, and no developer."
Demo: open the **Prerequisite Explorer**, switch Edit mode on, add a course with a prerequisite, switch **View as student** to show nothing changed yet, submit, approve as the Chairman, and show the student page updated.

---

## 8. Prompts for the agent

### 8.1 Audit (E0)
```
Read AGENTS.md, docs/admin/EDUCOMPASS_ADMIN_PANEL_SPEC_v3_EDIT_MODE.md, then v2 and v1 (v3 wins on screens).
Do E0 only. Inspect the running app and the code: which student pages and components exist, which can take a mode prop,
what admin code already exists, and every mock data source, dead control, jargon string, and role-switcher shown outside Demo mode.
Write docs/admin/audit.md with file paths and a proposed fix for each. Do not change code. Wait for my approval.
```

### 8.2 Build a step
```
Do step <E1..E9> from the v3 spec. Reuse the existing student components; add the edit layer instead of building new pages.
Use only real data. Show the result in the browser, run the scenarios for this step, and report pass or fail with evidence.
```

### 8.3 Review
```
Review the branch against v3 and the golden rules. Report only; do not change code.
Check: edit mode shows the same data as the student view, no write to a live table outside the publish function,
no student data in any admin response, no mock data, no dead control, no jargon or raw ID, can() used on both UI and server.
```
