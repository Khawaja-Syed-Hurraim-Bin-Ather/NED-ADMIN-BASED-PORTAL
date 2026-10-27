# EduCompass — Data Permission & Licensing Record
Last updated: 2026-10-25 | Updated by: Ram (via session Q&A)

## 1. FYDP Lists (5 PDFs)

| File | Source | Permission granted |
|---|---|---|
| FYP 2022.pdf | NED University, Dept. of CISE | Yes — Ram (owner/researcher) |
| SOP FYDP list-2022.pdf | NED University, Dept. of CISE | Yes — Ram |
| SOP FYDP list-2023.pdf | NED University, Dept. of CISE | Yes — Ram |
| SOP FYDP list-2024.pdf | NED University, Dept. of CISE | Yes — Ram |
| SOP FYDP list-2025.pdf | NED University, Dept. of CISE | Yes — Ram |

**Permitted uses:**
- Parse and extract project-level data (title, supervisor, year, outcome, companies, domain tags, team size).
- Store in the EduCompass Supabase database for student guidance purposes.
- Student names and roll numbers are NEVER stored; redacted at extraction time.
- No further redistribution of the raw PDFs.

**Permission authority:** Ram (syed.hurraim898@gmail.com), solo developer, NED University researcher.

---

## 2. Roadmap PDFs (9 PDFs)

| File | Source | Licence |
|---|---|---|
| computer-science.pdf | roadmap.sh | Open source — free to use |
| data-engineer.pdf | roadmap.sh | Open source — free to use |
| ai-engineer.pdf | roadmap.sh | Open source — free to use |
| backend.pdf | roadmap.sh | Open source — free to use |
| cyber-security.pdf | roadmap.sh | Open source — free to use |
| devops.pdf | roadmap.sh | Open source — free to use |
| frontend.pdf | roadmap.sh | Open source — free to use |
| qa.pdf | roadmap.sh | Open source — free to use |
| system-design.pdf | roadmap.sh | Open source — free to use |

**Source:** https://roadmap.sh — community-driven, open-source roadmaps (CC BY-SA 4.0 / MIT).

**Permitted uses:**
- Extract structure, topics, and steps as reference material.
- Rewrite steps in our own words for our roadmap_steps table.
- Attribute to roadmap.sh in the `source` field of every roadmap_steps row.
- Must link back to roadmap.sh in the UI where roadmap content is shown.

**Decision D confirmed (2026-10-25):** All roadmap PDFs are free and open source. Steps are rewritten in our own words and attributed to roadmap.sh. No licence issue.

---

## 3. Course Dependency Chart (ned_cse_course_chart.json)

| File | Source |
|---|---|
| ned_cse_course_chart.json | NED University, Dept. of CISE — official academic chart |

- Used as-is for layout and course code reference.
- Prerequisite arrows must be verified against the Scheme of Studies before being published.
- Shown in the EduCompass Prerequisite Explorer as an academic guide, not a binding document.

---

## 4. Decision Record (Decisions B–F from Playbook v2)

| Decision | Resolution | Date |
|---|---|---|
| B: Written permission for FYDP files | Granted by Ram. See Section 1 above. | 2026-10-25 |
| C: data-engineer.pdf placement | Inside Data Science and Back-End tracks — not a 13th track. | 2026-10-25 |
| D: Roadmap PDF licences | All are roadmap.sh open-source. Free to use with attribution. | 2026-10-25 |
| E: What each FYDP list represents | Default = **accepted**. If a status column exists: follow it (accepted/rejected). If no status column and nothing shown = accepted. Never infer rejection unless explicitly stated. | 2026-10-25 |
| F: Which programs are covered | **CSE (Computer Systems Engineering), CS, and SE (Software Engineering) only.** These are all computing-related programs. Other engineering departments (Mechanical, Civil, Electrical) are out-of-scope. Mixed lists get a per-record relevance check. | 2026-10-25 |
