# EduCompass University Leadership Pitch & Live Demo Script

**Institutional Presentation & Live Walkthrough Guide**  
**Target Audience:** Vice Chancellor, Dean of ECE, Department Chairmen, and CISE Faculty  
**Presenter:** Solo Developer / Implementing Engineer (Ram)  
**System URL:** `http://localhost:3000/admin` (API: `http://localhost:4000`)  
**Companion Documents:** `EDUCOMPASS_ADMIN_PANEL_SPEC.md`, `admin_permissions.json`, `ADMIN_HANDBOOK.md`

---

## 1. Executive Summary & Pitch Narrative

### The Problem at NED University Today
- **Static, disconnected PDFs:** Students navigate degree requirements across 40-page syllabi PDFs and fragmented portal tables, frequently resulting in prerequisite confusion and delayed graduation.
- **Risky, unversioned database changes:** Legacy portals lack change sets or rollback mechanisms; an inadvertent database edit affects all past and current batches simultaneously.
- **Lack of Governance & Privacy:** Traditional administrative accounts often possess unrestricted access to student records, violating institutional data governance and privacy best practices.

### The EduCompass Solution
EduCompass is a unified academic governance and degree planning ecosystem built specifically for NED University of Engineering & Technology. It pairs an autonomous student prerequisite engine with an institutional administrative console governed by 5 non-negotiable Golden Rules:
1. **Never write to live tables directly:** All updates are staged drafts, reviewed, and published in single atomic transactions.
2. **Zero student grade visibility:** Admins see counts and aggregates only; individual student transcripts are mathematically unexposed.
3. **Slow, recoverable deletions:** A mandatory cooling-off period (7 to 90 days) protects against accidental loss.
4. **No public admin signup:** Managed allowlists and single-use 48-hour invitations only.
5. **Immutable audit trail:** Database-enforced triggers prevent tampering with historical records.

---

## 2. Live Demo Schedule (12 Minutes)

```
[00:00 - 02:00] Act 1: The New Batch Arrival & Scheme Cloning
[02:00 - 05:30] Act 2: The Approval Choke Point & Section 4.3 Deterministic Diff
[05:30 - 08:30] Act 3: The Deletion Lifecycle & Cooling-Off Recovery
[08:30 - 11:00] Act 4: Institutional Privacy, Data Health & Immutable Audit
[11:00 - 12:00] Conclusion & Leadership Q&A
```

---

## 3. Act-by-Act Walkthrough & Talking Points

### Act 1: The New Batch Arrival Scenario (2 Minutes)
*Demonstrates curriculum versioning, scheme cloning, and hybrid student batch isolation.*

1. **Open the Admin Console:** Navigate to `http://localhost:3000/admin`.
2. **Select Role:** Click **Department Chairman (CIS)** in the top governance bar.
3. **Navigate to Curriculum Schemes:**
   - Click the **Curriculum Schemes** tab.
   - Point to the active published scheme: *"Scheme 2022 (Revision 1) — 53 Courses, 18 Prerequisite Rules, 136 Total Credits."*
4. **Click "+ Clone Scheme Wizard":**
   - In the modal, name the new version **"Scheme 2026"**.
   - Click **Create Draft Revision**.
5. **Talking Points:**
   > *"Notice what just happened in under 2 seconds: the system duplicated our entire curriculum—all 53 courses, credit distributions, and prerequisite rules—into an isolated Draft Revision. Enrolled students in Batches 2022, 2023, 2024, and 2025 are completely unaffected and continue seeing their own official Scheme 2022."*
6. **Verify DAG Integrity:**
   - Click **Validate DAG**.
   - Highlight the result: *"0 Cycles Detected, Fully Acyclic DAG."*
7. **Preview as Student:**
   - In the top bar, change **Preview Batch** to **Batch 2026** and click **View as Student ↗**.
   - Show how the student portal dynamically adapts to the selected batch while displaying the read-only notice banner.

---

### Act 2: The Approval Choke Point & Governance Diff (3.5 Minutes)
*Demonstrates Golden Rule 1, operator draft limitations, and Section 4.3 deterministic email messaging.*

1. **Switch Role to Data-Entry Operator:**
   - Click **Data Operator** in the top bar.
2. **Demonstrate Role Guardrails:**
   - Open **New Draft Entry**.
   - Under **Restricted Modules**, show the locked controls for *Curriculum & Prerequisites* and *Grading Rules*.
   - Click **🔒 Locked** on Curriculum to trigger the **"Why can't I do this?"** modal:
     > *"Operators have no access to curriculum or grading rules. Major modifications require Department Chairman draft and Vice Chancellor sign-off."*
3. **Stage an FYP Draft Update:**
   - Select **My Drafts** -> Click **Submit for Approval** on the staged FYP draft.
4. **Show Deterministic Approval Popup (Section 4.3):**
   - Open **My Approval Requests** and click **View Diff & Message**.
   - Showcase the generated plain-language approval message:
     ```
     EDUCOMPASS APPROVAL REQUEST
     Reference: CIS-2026-0042
     Approver: Dr. CIS Chairman <chairman.cis@nedut.edu.pk>
     Role: Chairman
     ...
     ```
   - Click **📋 Copy Message** and demonstrate the clipboard notification:
     > *"The system never sends unsolicited emails on behalf of a user. The operator simply copies this verified institutional message and sends it to the Chairman via official university email."*
5. **Approve as Chairman:**
   - Switch back to **Department Chairman**.
   - Under **Approvals Queue**, find `CIS-2026-0042`.
   - Click **✓ Sign-Off & Approve**.
   - In the modal, enter the 6-digit one-time code (e.g. `542819`) and click **Confirm & Publish Live**.
   - Highlight: *"Changes are applied in a single atomic database transaction via `apply_change_set()`. Steps 3 to 10 of the publish cascade are now running in the background."*

---

### Act 3: Deletion Lifecycle & Cooling-Off Recovery (3 Minutes)
*Demonstrates Golden Rule 3 (deleting is slow on purpose), soft deletion, and VC-only purge rate limits.*

1. **Soft Delete Demonstration:**
   - In Chairman view, navigate to content and demonstrate soft-deleting a retired faculty member or duplicate FYP record.
   - Explain: *"The item is immediately hidden from the student portal (`deleted_at = NOW()`), but remains in our secure `deletion_schedule` table."*
2. **Cooling-Off Timers:**
   - Switch role to **Vice Chancellor**.
   - Open the **Purge Queue** tab.
   - Point to the countdown timer: *"Cooling-off: 240 hours remaining."*
   - Notice the **Permanently Purge** button is disabled until the cooling-off period has fully elapsed.
3. **One-Click Restoration:**
   - Click **Restore Record**.
   - Show how `deleted_at` is cleared back to `null` and the item is recovered without any loss of historical references.
4. **VC Final Purge & Quota:**
   - Explain the 5 purges/day cap:
     > *"Even the Vice Chancellor cannot execute bulk physical deletions. The system enforces a hard limit of 5 purges per 24 hours, and every purge leaves an immutable tombstone in our audit log."*

---

### Act 4: Privacy, Data Health & The Immutable Audit Trail (2.5 Minutes)
*Demonstrates Golden Rule 2 (zero student PII), automated data health diagnostics, and audit trigger immutability.*

1. **Zero Student Records Exposed:**
   - Navigate through all admin views and point out:
     > *"Notice that across all admin screens, there is not a single student transcript, student ID, personal email, or CGPA visible. All student metrics are strictly aggregated, and any cohort smaller than 5 is automatically suppressed to `<5` for privacy."*
2. **Department Data Health Report:**
   - In Chairman view, open **Data Health Report**.
   - Show the 4 automated diagnostic cards:
     - Overall Integrity: **Healthy ✓**
     - Unreviewed FYP Imports: **12**
     - Zero-Credit Courses: **0**
     - Cooling-Off Deletions: **1**
   - Point out that any broken prerequisite references are detected before students ever see them.
3. **The Data Map:**
   - Click **Data Map (Architecture)**.
   - Walk leadership through the plain-language visualizer showing the relationship between departments, programs, schemes, and batches.

---

## 4. Anticipated Leadership Questions & Answers

**Q1: How difficult is it to onboard another department, such as Electrical or Mechanical Engineering?**  
> **Answer:** *"Zero code changes required. The Vice Chancellor simply adds the department in the admin console. The new department chairman can immediately clone a standard engineering scheme or import their syllabi via our offline pipeline. The entire platform is multi-department ready today."*

**Q2: What happens if an administrator's credentials are compromised?**  
> **Answer:** *"EduCompass uses defense-in-depth: short 8-hour sessions, an automatic 15-minute lockout after 5 failed attempts, and sensitive actions (approving changes, rollbacks, and purges) mandate a fresh 6-digit email step-up verification code valid for only 5 minutes. Furthermore, no admin session has direct write access to live database tables."*

**Q3: How does the AI chatbot behave if the curriculum changes mid-year?**  
> **Answer:** *"Step 6 and Step 7 of our Publish Cascade automatically audit all chatbot intents. Any FAQ intent touching updated courses is flagged for re-verification, and preloaded regulations answer directly from verified department records without LLM latency or hallucination risks."*

**Q4: Can an admin accidentally wipe out university records?**  
> **Answer:** *"No. Deletions pass through a 7 to 90-day cooling-off period and can be restored at any point. Purging requires Vice Chancellor step-up authorization, is capped at 5 records per day, and core curriculum items referenced by enrolled students can only be archived, never purged."*

