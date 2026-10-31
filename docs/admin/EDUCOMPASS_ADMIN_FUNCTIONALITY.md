# EduCompass Admin (Edit Mode): Functionality Document

**For:** Ram, the project team, evaluators, and the agent (Claude Opus and Antigravity). **Generated:** 28 Oct 2026.
**Purpose:** the complete list of **what the admin side must do**, written as testable requirements. It is the "what" document. The design and build steps are in `EDUCOMPASS_ADMIN_PANEL_SPEC_v3_EDIT_MODE.md`, the rules for access are in `admin_permissions.json`, and the technical reference is `EDUCOMPASS_ADMIN_PANEL_SPEC.md` (v1).
**Format:** follows the project SRS style. Priority uses MoSCoW: **M** Must, **S** Should, **C** Could, **W** Won't in this version. IDs are `FA-01` and so on.

---

## 1. Summary

**One sentence:** the admin platform is the student platform with an **Edit mode**; signed-in admins change curriculum, syllabi, prerequisites, FYPs, professors, roadmaps, and chatbot answers on the same pages students see, upload files, and publish changes through an approval process, with a full history.

**Roles:** Data Operator, Department Chairman, Vice Chancellor, Developer (inbox only).
**Departments:** CIS now; more can be added with data only.

### 1.1 What the admin side does NOT do
- It never shows individual student records (grades, courses, CGPA); only totals.
- It never writes live data directly; changes go through draft, approval, and the publish function.
- It never deletes instantly, and nobody can export everything.
- It has no public admin signup.
- It never sends email on anyone's behalf (approval messages are copied and sent by the person).
- It never publishes AI-written text without approval.

---

## 2. Role summary (plain words)

| Function | Operator | Chairman | Vice Chancellor | Developer |
|---|---|---|---|---|
| Turn on Edit mode | Yes (allowed pages) | Yes | Yes | No |
| Edit curriculum, prerequisites, credits, schemes | No (can propose a course) | Yes, own department; **major changes need VC approval** | Yes, all departments | No |
| Edit syllabi | No (proposal) | Yes | Yes | No |
| Edit FYPs, FYP branches, professors, roadmaps, FAQs | Draft; needs approval | Yes, own department | Yes | No |
| Edit scheme rules (grades, credits, graduation rules) | No | Yes (major, needs VC) | Yes | No |
| Upload files (import or for developers) | Yes | Yes | Yes | See requests |
| Approve changes | No | Yes (operator work and own department) | Yes (everything, plus escalations) | No |
| Request removal | Yes | Yes | Yes | No |
| Confirm final removal | No | No | Yes, after the waiting period | No |
| Invite people | No | Operators | Chairmen and operators | No |
| Departments and chatbot settings | No | No | Yes | No |
| See history | Own requests | Own department | All (paginated) | No |
| Developer inbox | Own requests | Own department | All | All |

---

## 3. Functional requirements

### 3.1 Access and sign-in (FA)
| ID | Requirement | Pri |
|---|---|---|
| FA-01 | Admins sign in with email and password, then a one-time code sent to their email. There is no admin signup page | M |
| FA-02 | Only emails with an active admin account can receive a code; error messages never reveal whether an email exists | M |
| FA-03 | During testing, the first Vice Chancellor and the CIS Chairman come from a server-only configuration; the configuration is switched off in production | M |
| FA-04 | The Vice Chancellor invites chairmen; chairmen invite operators; an invitation works once, expires in 48 hours, and is tied to one email, role, department, and set of modules | M |
| FA-05 | An account locks for 15 minutes after 5 failed attempts; code requests are rate limited | M |
| FA-06 | Sessions end after 30 minutes idle or 8 hours total; a person can sign out everywhere | M |
| FA-07 | Sensitive actions (approve, publish, restore, removal, user changes, settings) ask for a fresh email code | M |
| FA-08 | Students use their normal login and never see Edit mode | M |
| FA-09 | Demo mode (off in production) offers a switch between real seeded demo accounts; permissions are still enforced on the server | S |
| FA-10 | Optional authenticator-app sign-in can be enabled later when an official email domain exists | C |

### 3.2 Edit mode (FE)
| ID | Requirement | Pri |
|---|---|---|
| FE-01 | A signed-in admin who can edit something sees an **Edit mode** switch in the header | M |
| FE-02 | In Edit mode every student page shows the same content plus edit controls; the rest of the page is unchanged | M |
| FE-03 | A banner states what is being edited ("Scheme 2026 (draft)") and that students cannot see it yet | M |
| FE-04 | A **View as student** toggle shows the live published site | M |
| FE-05 | Edits are saved automatically as **pending changes** and never change live data | M |
| FE-06 | The page in Edit mode shows live data plus the person's pending changes | M |
| FE-07 | Controls the person may not use appear locked with a tooltip naming the required role and how to ask | M |
| FE-08 | A **Pending (n)** button opens a drawer listing pending changes in plain sentences | M |
| FE-09 | The drawer has **Check** (validation) and a button that fits the role: **Submit for approval** or **Publish now** | M |
| FE-10 | A person can discard individual pending changes or all of them | M |
| FE-11 | If another person changed the same record meanwhile, the system warns and shows both versions before submit | S |
| FE-12 | Unsaved work survives a page reload and a lost connection | S |

### 3.3 Curriculum and the Prerequisite Explorer (FC)
| ID | Requirement | Pri |
|---|---|---|
| FC-01 | **Add a course** with a 4-step wizard: details, syllabus, prerequisites, review | M |
| FC-02 | **Edit a course**: code, title, credits, category, semester, elective group | M |
| FC-03 | **Move a course** between semesters by dragging on the chart | M |
| FC-04 | **Prerequisite builder**: "all of these" and "at least one of these" groups, minimum grade per course, shown in plain language | M |
| FC-05 | **Draw a line** between two courses on the chart to add a prerequisite (with confirmation) | S |
| FC-06 | **Archive a course** through a removal request (never instant) | M |
| FC-07 | **Elective groups**: create, rename, set how many to choose, add and remove members | M |
| FC-08 | **Chart layout**: positions are saved per scheme and match what students see | M |
| FC-09 | **Used by** panel shows which courses, careers, FAQs, and batches are affected before saving | M |
| FC-10 | **Live validation** (Section 5) runs while editing and before every submit | M |
| FC-11 | **Preview as student** opens the real student pages for the draft with a "Draft preview" banner | M |
| FC-12 | **New scheme from an old one** (clone), with a checklist of what remains to review | M |
| FC-13 | **Batches**: a table of admission year to scheme; every batch has exactly one scheme; old batches keep their old scheme | M |
| FC-14 | **Course equivalences** (same, replaced by, split, merged) between schemes | S |
| FC-15 | **Shared courses**: a change to a course owned by another department needs that department's chairman to approve | S |
| FC-16 | Each published scheme is a numbered **version** that cannot be edited; changes create a new draft | M |

### 3.4 Syllabus (FS)
| ID | Requirement | Pri |
|---|---|---|
| FS-01 | Each course in a scheme has a syllabus: description, learning outcomes, weekly topics, assessment items with percentages, books and references | M |
| FS-02 | Assessment percentages must add up to 100 | M |
| FS-03 | A PDF can be attached to a syllabus | S |
| FS-04 | Students see the syllabus in a **Syllabus tab** in the Explorer course panel | M |
| FS-05 | Syllabi can be imported from a CSV template | S |

### 3.5 Planner and degree guidance rules (FP)
| ID | Requirement | Pri |
|---|---|---|
| FP-01 | Chairman and VC can edit, per scheme: grade scale, passing grade, maximum credits per semester, and graduation rules (the degree predictor settings) | M |
| FP-02 | These edits count as major changes and need VC approval for chairmen | M |
| FP-03 | A **sandbox** lets an admin try the Planner with test inputs that exist only in their browser session | M |
| FP-04 | The sandbox never reads or stores student data | M |

### 3.6 FYPs and FYP branches (FY)
| ID | Requirement | Pri |
|---|---|---|
| FY-01 | Add, edit, and request removal of FYP records: title, year, supervisor, branch, tags, tools, outcome (accepted, rejected, unknown), companies that approached, team size | M |
| FY-02 | The form has **no field for student names or roll numbers** | M |
| FY-03 | **Branches** (categories): add, rename, hide, merge two branches, reorder | M |
| FY-04 | **Move projects** between branches, with a count preview before applying | M |
| FY-05 | Import FYP records from a spreadsheet template with a row-by-row preview | M |
| FY-06 | Tags use the controlled vocabulary; derived tags keep a "Derived" label until confirmed | S |

### 3.7 Professors (FR)
| ID | Requirement | Pri |
|---|---|---|
| FR-01 | Add and edit professor cards: name, title, rank, qualification, research interests, highlights, tags, supervised project titles | M |
| FR-02 | Contact routes are added only by an admin, after the professor agrees | M |
| FR-03 | A profile with a missing or unconfirmed name cannot be published | M |
| FR-04 | Import professors from a spreadsheet template | S |

### 3.8 Career Hub (FK)
| ID | Requirement | Pri |
|---|---|---|
| FK-01 | Edit track descriptions, roadmaps (6 to 12 months and 2 to 4 years), and stage plans | M |
| FK-02 | Add, edit, and **drag to reorder** roadmap steps; resources and related courses are editable | M |
| FK-03 | Each step keeps a stable topic key so students' saved progress is preserved | M |
| FK-04 | Add and edit articles and curated repositories, each with a source | M |
| FK-05 | Edit the domain-to-track map | S |

### 3.9 Assistant and FAQs (FQ)
| ID | Requirement | Pri |
|---|---|---|
| FQ-01 | Each stored answer has **Edit answer**; edits go through the same approval rules | M |
| FQ-02 | An **Unanswered questions** drawer lists questions the chatbot could not answer (no personal data) and lets the admin turn one into an FAQ | M |
| FQ-03 | Answers whose data changed show **Needs re-check** until confirmed | M |
| FQ-04 | Chatbot limits, thresholds, and provider order are editable by the Vice Chancellor only | M |
| FQ-05 | No answer is published without approval; no AI-written answer is published automatically | M |

### 3.10 Uploads and the developer inbox (FU)
| ID | Requirement | Pri |
|---|---|---|
| FU-01 | Drag and drop upload with a choice: **Import data myself** or **Send to the developers** | M |
| FU-02 | Allowed types: CSV, XLSX, PDF, PNG, JPG, DOCX; size limit per file (default 10 MB); the real file type is checked | M |
| FU-03 | Files are stored privately and opened only through short-lived links; every upload is logged | M |
| FU-04 | **Import path:** templates are downloadable; a preview shows the first rows with errors per row; the person can fix or skip rows; valid rows join the person's pending changes (never live) | M |
| FU-05 | Import targets: courses, prerequisites, syllabi, FYPs, professors, roadmap steps | M |
| FU-06 | **Developer path:** title, short note, type, and files create a request with status New, In progress, Needs info, Done, or Declined | M |
| FU-07 | Requests have a comment thread between the requester and developers | M |
| FU-08 | Developers see only the inbox; they can change status and comment; they cannot publish or read other data | M |
| FU-09 | An optional GitHub issue is created for each request | C |

### 3.11 Approvals (FV)
| ID | Requirement | Pri |
|---|---|---|
| FV-01 | Changes that need approval create a request routed to the right person (Operator to Chairman; Chairman's major curriculum changes and removals to the Vice Chancellor) | M |
| FV-02 | When an operator submits, a pop-up shows a **generated message** with the module, exact changes (names, before and after), reason, impact, approver and official email, and an expiry; a **Copy message** button copies it | M |
| FV-03 | The message is produced by a template from the changes, not by AI | M |
| FV-04 | The approver opens **Approvals**, sees each request in plain words, and can **Approve**, **Reject** with a note, or open the full comparison in Review mode | M |
| FV-05 | Approving needs a fresh email code; nobody can approve their own request | M |
| FV-06 | The request code is a lookup key only: single use, expires (default 72 hours), and a copied message grants no permission | M |
| FV-07 | Editing a submitted change voids the request; the author must resubmit | M |
| FV-08 | The requester sees the status (Waiting, Approved and live, Rejected with note, Expired) | M |
| FV-09 | If a department has no chairman, the Vice Chancellor acts for it | M |
| FV-10 | Operators can **withdraw** a pending request | S |

### 3.12 Publish, versions, and rollback (FL)
| ID | Requirement | Pri |
|---|---|---|
| FL-01 | Approval publishes the change in one all-or-nothing step | M |
| FL-02 | After publishing, an **Updating the site** panel shows each step with real progress: checked, saved, chart rebuilt, scores updated, search index refreshed, students notified | M |
| FL-03 | Published changes appear on the student site within 30 seconds, without a redeploy | M |
| FL-04 | Every publish creates a named **version** in History with who, when, and a summary | M |
| FL-05 | **Restore this version** re-publishes an earlier version (needs approval for chairmen) | M |
| FL-06 | Students on an affected batch see a dismissible notice about the update | S |
| FL-07 | A failed side step shows a warning and a retry button; it does not undo the publish | M |

### 3.13 Removal and waiting period (FD)
| ID | Requirement | Pri |
|---|---|---|
| FD-01 | Nothing is deleted instantly; a **request removal** action starts the process | M |
| FD-02 | After approval the item disappears from students but stays recoverable during a **waiting period** (default: career and chatbot content 7 days; FYPs and professors 14; curriculum items 30; whole schemes 90) | M |
| FD-03 | The waiting-period list shows each item, its date, and a **Restore** button | M |
| FD-04 | Only the Vice Chancellor can confirm final removal, after the waiting period, with a fresh code | M |
| FD-05 | Items that students' batches depend on can be archived but never removed | M |
| FD-06 | There is a daily cap on final removals and no bulk removal | M |
| FD-07 | A removed record leaves a minimal entry in the history | M |

### 3.14 People and settings (FM)
| ID | Requirement | Pri |
|---|---|---|
| FM-01 | Invite, suspend, and reactivate people within one's authority | M |
| FM-02 | Assign operators to specific modules (FYP, professors, career, FAQs, imports) | M |
| FM-03 | The Vice Chancellor can create a department with a short wizard and assign its chairman | M |
| FM-04 | Settings: major-change rules, waiting-period lengths, approval and invitation expiry, upload limits, course-proposal switch, Demo mode | S |
| FM-05 | A **security** page shows real recent sign-ins, failed attempts, and new devices (Vice Chancellor) | S |

### 3.15 Course proposals for operators (FO)
| ID | Requirement | Pri |
|---|---|---|
| FO-01 | Operators see a **Propose a course** button instead of curriculum editing | M |
| FO-02 | The form collects code, title, suggested credits, suggested syllabus, and suggested prerequisites | M |
| FO-03 | A chairman can **accept** a proposal into a draft in one click, edit it, or reject it with a note | M |
| FO-04 | The operator sees Accepted or Rejected with the note | M |
| FO-05 | The feature can be switched off in Settings | S |

### 3.16 History, notifications, and audit (FX)
| ID | Requirement | Pri |
|---|---|---|
| FX-01 | Every login, edit, submission, approval, rejection, publish, restore, removal, upload, and permission change is recorded with who, when, and what | M |
| FX-02 | The audit record cannot be changed or deleted by anyone | M |
| FX-03 | Operators see only their own history; chairmen their department's; the Vice Chancellor all, paginated | M |
| FX-04 | In-app notifications tell people when something waits for them or when their request is decided | M |
| FX-05 | Reading the audit record is itself recorded | S |

### 3.17 Student-side effects (FB)
| ID | Requirement | Pri |
|---|---|---|
| FB-01 | Students pick their batch once after signing in; planning always uses their own batch | M |
| FB-02 | Anyone can browse any batch through a searchable batch picker in read-only mode, with a "You are viewing Batch X" banner | M |
| FB-03 | The student Explorer shows the syllabus tab and the scheme's chart; FYP filters use the current branches | M |
| FB-04 | The batch choice is kept in the page address so it can be shared | S |

---

## 4. Use cases (main steps)

**UC-AD-01 Turn on Edit mode.** 1. Admin signs in with password and email code. 2. Header shows the Edit mode switch. 3. Admin turns it on. 4. Banner shows what is being edited. *Alternative:* no edit rights, so the switch is not shown.

**UC-AD-02 Add a new course (Chairman).** 1. Open the Prerequisite Explorer in Edit mode. 2. Press **+ Add course**. 3. Fill details, syllabus, prerequisites (builder). 4. Review; the system validates. 5. The course appears in the chart as a draft. 6. **Publish now** (minor) or **Submit for approval** (major, goes to the VC). *Alternative:* validation fails, so the system names the problem and does not allow publishing.

**UC-AD-03 Change prerequisites.** 1. Click a course; open **Prerequisites**. 2. Add or remove courses, choose all-of or any-of, set minimum grade. 3. The system checks loops and semester order live. 4. Save as pending; submit.

**UC-AD-04 Create Scheme 2026 and Batch 2026 (Chairman, then VC).** 1. **New scheme from this one**. 2. Edit courses, prerequisites, syllabi, credits. 3. Check; add Batch 2026 and pick the scheme. 4. Submit; the VC approves with a code. 5. The site updates; Batch 2022 is unchanged.

**UC-AD-05 Operator proposes a course.** 1. **Propose a course**; fill the form. 2. Submit; the chairman is notified. 3. The chairman accepts it into a draft. 4. The operator sees Accepted.

**UC-AD-06 Operator edits a roadmap step.** 1. Edit mode on Career Hub; edit the step. 2. Press **Submit for approval**. 3. A pop-up shows the generated message and the chairman's official email. 4. The operator copies and sends it. 5. The chairman approves in **Approvals** with a code. 6. The student page updates and the operator sees **Approved and live**.

**UC-AD-07 Approve or reject.** 1. Open **Approvals**; choose a request. 2. Read the plain summary or open Review mode. 3. **Approve** (enter code) or **Reject** (write a note).

**UC-AD-08 Import from a spreadsheet.** 1. **Uploads**, choose **Import data myself**, pick the type. 2. Upload; see the preview with errors. 3. Fix or skip rows. 4. **Add to my pending changes**. 5. Check and submit as usual.

**UC-AD-09 Send a file to the developers.** 1. **Uploads**, choose **Send to the developers**. 2. Add title, note, type, files. 3. The request appears in the inbox. 4. The developer sets the status and may ask a question. 5. The requester answers in the thread.

**UC-AD-10 Request removal and restore.** 1. **Request removal** on an item, with a reason. 2. After approval the item hides and enters the waiting period. 3. It can be restored until the date. 4. The VC confirms final removal after the date.

**UC-AD-11 Manage FYP branches.** 1. Open the FYP Portal; Edit mode; **Manage branches**. 2. Add, rename, hide, or merge. 3. Select projects, **Move to branch**; see the count. 4. Submit.

**UC-AD-12 Turn an unanswered question into an FAQ.** 1. Assistant page; Edit mode; **Unanswered questions**. 2. Choose a question; write the answer or accept a suggested intent. 3. Submit for approval.

**UC-AD-13 Roll back.** 1. **History**; choose a version. 2. **Restore this version**; approval if required. 3. The site updates; the rollback is logged.

**UC-AD-14 Invite a person.** 1. **People**; **Invite**. 2. Enter email, role, department, modules. 3. The invitee accepts, sets a password, and verifies the code.

**UC-AD-15 Try the Planner in the sandbox.** 1. Open the Planner in Edit mode; **Sandbox**. 2. Enter test courses. 3. Change a scheme rule in the drawer and see the effect. 4. Nothing is saved.

---

## 5. Validation rules (checked before any publish)

| ID | Rule | Message (plain language) |
|---|---|---|
| V01 | No prerequisite loops | "CS-325 and CS-326 depend on each other. Remove one link." |
| V02 | A prerequisite must be in an earlier semester (unless it is taken together) | "CS-325 needs CS-326, but CS-326 is in a later semester. Move one of them." |
| V03 | Every course has code, title, credits, semester | "Add credits for CS-4xx." |
| V04 | Course codes are unique within a scheme and written in the standard format | "CS-218 already exists in this scheme." |
| V05 | Credits are positive and a semester stays within the maximum | "Semester 5 has 23 credits; the limit is 21." |
| V06 | Elective choice count does not exceed the number of members | "Elective 1 asks for 3 choices but has 2 courses." |
| V07 | Syllabus assessment percentages add up to 100 | "Assessment adds up to 95. Adjust to 100." |
| V08 | Each batch has exactly one scheme | "Batch 2026 has no scheme." |
| V09 | A scheme with errors cannot be published | "Fix 2 problems before publishing." |
| V10 | Shared-course changes have the owning department's approval | "This course belongs to Mathematics. Their chairman must approve." |
| V11 | FYP year is within a valid range; no student-name or roll-number field exists | (not shown; fields do not exist) |
| V12 | File type and size are allowed and the real type matches | "This file type is not allowed." |
| V13 | Roadmap steps have unique keys and a continuous order | "Two steps share the same key." |
| V14 | Professors need a confirmed name before publishing | "Add a confirmed name first." |
| V15 | Stored chatbot answers carry a source label | "Choose where this answer comes from." |
| V16 | Items used by a batch or a student can be archived but not removed | "This course is used by Batch 2022. It can be archived but not removed." |

---

## 6. States (what the status words mean)

| Thing | States |
|---|---|
| Pending change | Saved (draft), Submitted, Approved and live, Rejected, Expired, Withdrawn |
| Scheme | Draft, In review, Published, Archived |
| Removal | Requested, Approved (waiting period), Ready for final removal, Removed, Restored, Rejected |
| Upload | Uploaded, Checked, Rejected, Imported |
| Developer request | New, In progress, Needs info, Done, Declined |
| Course proposal | New, Accepted, Rejected, Withdrawn |
| Account | Invited, Active, Suspended, Deactivated |

---

## 7. Quality requirements

| ID | Requirement | Pri |
|---|---|---|
| NF-01 | Every number and list in the admin side comes from the database; no hard-coded or sample data in code | M |
| NF-02 | Every menu item, tab, and button works or is not shown; empty lists show a message and the first action | M |
| NF-03 | No identifiers, section numbers, or technical terms appear in the interface | M |
| NF-04 | Edit mode on any page loads within 2 seconds on typical broadband; saving a pending change takes under 1 second | S |
| NF-05 | Published changes are visible to students within 30 seconds | M |
| NF-06 | The interface meets WCAG 2.1 AA and works at laptop and tablet widths | M |
| NF-07 | Lists are paginated (default 25, maximum 100) and there is no export of everything | M |
| NF-08 | All state-changing requests are protected against cross-site request forgery; every input is validated on the server | M |
| NF-09 | Roles are checked on the server for every request and by database access rules; the browser cannot set a role | M |
| NF-10 | A first-time operator can complete "edit a roadmap step and request approval" without help in under 5 minutes | S |
| NF-11 | Failures show a clear message and a way to retry; no work is lost | M |

---

## 8. Traceability to the build and the tests

| Area | Requirements | Build step (v3) | Acceptance scenarios (v2 Section 7 and v3) |
|---|---|---|---|
| Access and sign-in | FA-01 to FA-10 | E1, E8 | 10 |
| Edit mode foundation | FE-01 to FE-12 | E1 | 13, 14, 15 |
| Curriculum and syllabus | FC, FS | E2 | 1, 2, 8 |
| Planner rules and sandbox | FP | E5 | sandbox check |
| FYPs and branches | FY | E3 | 5 |
| Professors, Career, Assistant | FR, FK, FQ | E4 | 4 |
| Uploads and developer inbox | FU | E7 | 6, 7 |
| Approvals, publish, history | FV, FL | E6 | 3, 4 |
| Removal and waiting period | FD | E6 | 9 |
| People and settings | FM | E8 | 10 |
| Course proposals | FO | E2, E6 | 3 |
| Audit and notifications | FX | E6 | 4, 9, 10 |
| Student-side effects | FB | E8 | 8 |
| Quality | NF | E0, E9 | 11, 12 |
