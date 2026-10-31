# EduCompass Institutional Admin Handbook

**Institutional Governance, Operational Procedures & Disaster Recovery Guide**  
*NED University of Engineering & Technology — Department of Computer Science & Information Technology (CISE)*  
*Source of Truth: SRS v1.0, `EDUCOMPASS_ADMIN_PANEL_SPEC.md`, `admin_permissions.json`*

---

## 1. Core Principles & Golden Rules

1. **Golden Rule 1: Never write to live tables directly from an admin session.**  
   All content additions, edits, and deletions are staged as verified `change_items` under a `change_set`. Only the server-side, security-definer function `apply_change_set()` applies approved changes in a single atomic transaction.

2. **Golden Rule 2: Zero Individual Student Records.**  
   No admin—regardless of rank, including the Vice Chancellor—can ever view or export individual student transcripts, course grades, student IDs, or cumulative CGPAs. Admin screens and reports surface counts and aggregates only. Groups smaller than 5 are suppressed to `<5`.

3. **Golden Rule 3: Deleting is Slow on Purpose.**  
   Nothing disappears instantly. Every deletion passes through a mandatory cooling-off period (7 to 90 days) during which the item is hidden from students but fully recoverable. Final physical purge requires Vice Chancellor authorization, fresh email step-up verification, and is rate-limited to 5 purges per day.

4. **Golden Rule 4: No Public Admin Signup.**  
   Admin accounts exist only through the bootstrap configuration (development) or single-use, 48-hour email invitations issued by authorized personnel.

5. **Golden Rule 5: Immutable Audit Logging.**  
   Every admin login, step-up challenge, draft modification, approval, rejection, and purge writes to an append-only `audit_log` protected by database triggers that reject `UPDATE` or `DELETE` operations.

---

## 2. Institutional Roles & Permission Hierarchy

| Capability | Data-Entry Operator | Department Chairman | Vice Chancellor |
|---|---|---|---|
| **Scope** | Own Department, assigned modules only | Own Department (CIS) | University-wide (all departments) |
| **Curriculum & Prerequisites** | 🔒 No access | Drafts, publishes minor changes; major needs VC | Approves & publishes all major changes |
| **Grading Rules & Degree Predictor**| 🔒 No access | Drafts; major needs VC | Full authority |
| **FYP Records & Outcomes** | Draft only (needs Chairman approval) | Approves & publishes operator drafts | University-wide oversight |
| **Professor Profiles** | Draft only (needs Chairman approval) | Approves & publishes operator drafts | University-wide oversight |
| **Career Hub Roadmaps** | Draft only (needs Chairman approval) | Approves & publishes operator drafts | University-wide oversight |
| **AI Chatbot Content** | Drafts FAQs & preloaded intents | Approves & publishes | University-wide oversight |
| **AI Chatbot System Caps** | 🔒 No access | 🔒 No access | Configures tokens, caps, & models |
| **Data Imports & Review Queue** | Prepares & edits extracted records | Approves reviewed records | Full authority |
| **User Administration** | 🔒 No access | Invites & manages operators | Invites chairmen; manages all admins |
| **Rollback & Restore** | 🔒 No access | Requests rollback (needs VC); restores items in cooling-off | Executes emergency rollback; restores items |
| **Physical Purge** | 🔒 No access | 🔒 No access | Executes final purge (5/day cap) |

---

## 3. Standard Operating Procedures (SOPs)

### SOP 1: Submitting a Content Draft (Operator)
1. Navigate to **Admin Console > Content Modules** and select your assigned module (e.g. FYP, Professors, Career).
2. Prepare your changes. Click **Save and Request Approval**.
3. A popup will generate a ready-to-copy, deterministic approval message (Section 4.3) containing the reference ID (e.g. `CIS-2026-0042`), diff summary, approver name, and official email.
4. Click **Copy Message** and send it to your Department Chairman via official university email.

### SOP 2: Approving a Change Set (Chairman / VC)
1. Open **Admin Console > Approvals Queue**.
2. Locate the request using the reference code. Inspect the before-and-after diff.
3. Click **Sign-Off & Approve**.
4. Enter your 6-digit email one-time code (step-up challenge valid for 5 minutes).
5. Click **Confirm & Publish Live**. The `apply_change_set()` function switches the live data atomically and starts the background cascade runner (steps 3 to 10).

### SOP 3: Creating a New Curriculum Scheme (New Batch Arrival)
1. Open **Admin Console > Curriculum Schemes**.
2. Click **Clone Scheme Wizard**. Choose the base scheme (e.g. "Scheme 2022") and specify the new name (e.g. "Scheme 2026").
3. The system clones all 53 courses, credit assignments, and 18 prerequisite rules into an isolated **Draft Revision**. Existing batches remain untouched.
4. Adjust course placements, prerequisites, and elective groups as needed.
5. Click **Validate DAG**. Ensure 0 dependency cycles and 0 backward prerequisites are detected.
6. Submit for Vice Chancellor sign-off.

### SOP 4: Deleting Content & Cooling-Off Recovery
1. Select the record to remove and click **Request Deletion**.
2. The item is immediately hidden from the student portal (`deleted_at = NOW()`).
3. The item enters the `deletion_schedule` with a cooling-off timer:
   - Career & Chatbot: **7 days**
   - FYP & Professors: **14 days**
   - Curriculum Items: **30 days**
   - Schemes: **90 days**
4. **To Restore:** Open **Purge Queue** before the cooling-off date and click **Restore Record**. `deleted_at` is cleared and the item returns to active student view.
5. **To Purge:** After the cooling-off date has elapsed, the Vice Chancellor verifies step-up credentials and confirms permanent physical removal (subject to the 5 purges/day cap).

---

## 4. Publish Cascade & Background Runner

When a curriculum or content change set is published, the system executes 10 idempotent cascade steps:
- **Step 0 (Validate):** DAG cycle checks, backward prerequisite verification, credit limit enforcement.
- **Step 1 (Snapshot):** Creates an immutable JSON release snapshot in `releases`.
- **Step 2 (Apply):** Atomic live table transaction via `apply_change_set()`.
- **Step 3 (Rebuild Graph):** Reconstructs the prerequisite DAG and course placement cache.
- **Step 4 (Recompute Scores):** Calculates course importance estimates.
- **Step 5 (Refresh Caches):** Clears edge and API response caches.
- **Step 6 (Reembed Chatbot):** Hashes content; re-embeds modified records respecting daily budget caps.
- **Step 7 (FAQ Staleness):** Audits preloaded FAQ intents against modified entities.
- **Step 8 (Career Links):** Re-checks career track prerequisite requirements against active catalog.
- **Step 9 (Student Notice):** Posts dismissible update notice for enrolled students of that batch.
- **Step 10 (Health Report):** Logs completed cascade status to the admin dashboard.

---

## 5. Emergency Rollback Procedures (Disaster Recovery)

If an unintended curriculum or prerequisite error goes live:
1. The Vice Chancellor navigates to **Admin Console > Releases & Rollbacks**.
2. Locate the previous known-good release tag (e.g. `cis-scheme2022-r1`).
3. Click **Emergency Rollback**. Enter the mandatory justification reason.
4. Provide a fresh email step-up verification code.
5. The system creates a new immutable release tagged `rollback-<target>-<id>`, points active batches back to the previous snapshot, and immediately enqueues cascade steps 3 to 10. Historical audit records are never rewritten.
