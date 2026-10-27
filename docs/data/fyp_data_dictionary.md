# EduCompass FYP Data Dictionary — v2
# Playbook ref: Section 6.11
# Source of truth: `supabase/migrations/20261025000001_fyp_v2_schema.sql`
# Every field in the `fyp_projects` table is described here.

## fyp_projects (public.fyp_projects)

| Field | Type | Nullable | Source | Description |
|---|---|---|---|---|
| `id` | UUID | No | DB | Auto-generated primary key. |
| `schema_version` | text | No | Pipeline | Always `fyp.v2` for records extracted from the FYDP lists. |
| `title` | text | No | PDF | Cleaned project title. |
| `raw_title` | text | Yes | PDF | Original title before cleaning (for review). |
| `abstract` | text | Yes | PDF | Abstract, if provided by the file. Never written by the agent. |
| `year` | int | No | File name / header | Year of the FYDP list (e.g. 2024). Cross-checked between file name and page header. |
| `proposal_outcome` | text | No | Section 6.5 | `accepted`, `rejected`, or `unknown`. Set from the evidence in the file; never assumed. |
| `outcome_reason` | text | Yes | PDF | The file's own stated reason, if present. |
| `outcome_evidence` | text | Yes | Section 6.5 | How the outcome was determined: `heading`, `status_column`, `row_colour`, `tick_mark`, `ram_decision`, or `none`. |
| `supervisor` | text | Yes | PDF | Normalised supervisor name (e.g. "Ahmed Raza"). |
| `supervisor_title` | text | Yes | PDF | Title only (Dr., Mr., Ms., Engr.). |
| `supervisor_id` | UUID | Yes | Pipeline | FK → `professors.id`. Set after the professors pass is complete. |
| `co_supervisor` | text | Yes | PDF | Normalised co-supervisor name, if present. |
| `program` | text | Yes | PDF | As stated in the file (CS, SE, CSE, etc.). |
| `department` | text | Yes | PDF | Department name as stated. |
| `university` | text | No | Pipeline | Always `NED University of Engineering & Technology`. |
| `team_size` | int | Yes | PDF | Number of team members only — no names. |
| `domain_tags` | text[] | No | Section 6.7 | Controlled vocabulary tags derived from title. See `pipeline/vocab/domains.json`. |
| `tags_source` | text | No | Pipeline | Always `derived`. Shown in the interface as "Estimate". |
| `tools` | text[] | No | Section 6.7 | Tool names that appear verbatim in the title or text. See `pipeline/vocab/tools.json`. |
| `tags` | text[] | No | Legacy | Old freeform tags. Kept for backward compatibility; new records use `domain_tags`. |
| `status` | text | No | Pipeline | `completed`, `ongoing`, or `unknown`. |
| `relevance` | text | No | Section 6.4 | `in_scope`, `uncertain`, or `out_of_scope`. |
| `relevance_reason` | text[] | No | Section 6.4 | Signals that produced the score, e.g. `["department:cs", "domain:ai-ml"]`. |
| `source_file` | text | Yes | Pipeline | Original PDF file name, e.g. `SOP FYDP list-2024.pdf`. |
| `source_page` | int | Yes | Pipeline | Page number in the source PDF where this record was found. |
| `raw_text_redacted` | text | Yes | Pipeline | Row text as extracted, with all personal names replaced by `[REDACTED]`. For review. |
| `extracted_at` | timestamptz | Yes | Pipeline | UTC timestamp when the record was extracted. |
| `confidence` | float | Yes | Pipeline | Confidence score 0–1. Below 0.7 → Flagged. |
| `natural_key` | text | Yes | Pipeline | SHA-1 of `normalise(title)|year|normalise(supervisor)`. Used for idempotent loads. |
| `review_status` | review_status | No | Pipeline | Lifecycle: `extracted` → `flagged` → `approved` / `rejected` → `published`. |
| `tsv` | tsvector | — | DB trigger | Full-text search index. Updated automatically on INSERT/UPDATE. |
| `embedding` | vector(768) | Yes | Indexing step | Embedding for chatbot semantic search. Set during Step X21. |
| `created_at` | timestamptz | No | DB | Record creation time. |

---

## companies (public.companies)

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `name` | text | Display name (original capitalisation, no suffixes). |
| `name_normalised` | text | Lowercase, hyphenated slug used for deduplication. |
| `aliases` | text[] | Known spelling variants. Managed via `pipeline/vocab/company_aliases.json`. |
| `source` | text | Where this company was first seen (e.g. `SOP FYDP list-2023.pdf`). |
| `created_at` | timestamptz | Record creation time. |

---

## fyp_company_interest (public.fyp_company_interest)

| Field | Type | Description |
|---|---|---|
| `project_id` | UUID | FK → `fyp_projects.id`. |
| `company_id` | UUID | FK → `companies.id`. |
| `interest_type` | text | `approached`, `sponsored`, `collaborated`, or `unknown`. Use `approached` unless the file explicitly states otherwise. |
| `raw_text` | text | Original wording from the source file (for review). |

---

## professors (public.professors) — fields added in v2

| Field | Type | Description |
|---|---|---|
| `title` | text | Academic title: Dr., Mr., Ms., Engr. |
| `is_simulated` | boolean | Always `false` for records seeded from FYDP lists. |
| `research_areas` | text[] | Top 3 domain tags from the professor's in-scope projects. Labelled `derived`. |

---

## roadmap_steps (public.roadmap_steps) — v2 design

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `track_slug` | text | Career track identifier, e.g. `ai-ml-engineering`. |
| `variant` | text | `6-12-months` or `2-4-years`. |
| `stage` | text | `first-year`, `second-year`, `third-year`, or `final-year`. |
| `step_order` | int | Ordering within (track, variant). |
| `topic_key` | text | Stable slug, e.g. `sql-basics`. Never changes when title is rewritten. |
| `title` | text | Step title in our own words. |
| `description` | text | 1–2 sentence description. |
| `est_weeks` | int | Estimated weeks. If from the agent, `proposed_by = 'agent'`; Ram reviews. |
| `resources` | JSONB | Array of `{ title, url, type }`. |
| `related_courses` | text[] | Course codes from the chart (e.g. `["CS-324", "CS-323"]`). |
| `source` | text | Attribution to the source roadmap PDF. |
| `proposed_by` | text | `agent` or `human`. |
| `review_status` | text | Lifecycle: Extracted → Approved → Published. |

---

## roadmap_progress (public.roadmap_progress)

| Field | Type | Description |
|---|---|---|
| `user_id` | UUID | FK → `auth.users.id`. |
| `track_slug` | text | Career track. |
| `topic_key` | text | Matches `roadmap_steps.topic_key`. Keyed this way so progress survives variant switches. |
| `status` | text | `todo`, `doing`, or `done`. |
| `completed_at` | timestamptz | Set when status becomes `done`. |
| `updated_at` | timestamptz | Auto-updated by trigger. |

> **Privacy note:** `roadmap_progress` is personal data. It must be deleted (or cascade-deleted) when a user's account is deleted. See SEC-07.

---

## domain_track_map (public.domain_track_map)

| Field | Type | Description |
|---|---|---|
| `domain` | text | Domain tag from `pipeline/vocab/domains.json`. |
| `track_slug` | text | Career track slug from `career_tracks`. |

Used by the chatbot plan card to find FYP examples for a chosen track, and by Career Hub to show "past FYPs in this field". Ram reviews the seed data.

---

## Analytics Views

| View | Purpose |
|---|---|
| `v_fyp_year_outcome` | Projects per year grouped by outcome. Used for Chart 1 and 2. |
| `v_fyp_domain_year` | Projects per year grouped by domain tag. Used for Chart 3. |
| `v_fyp_company_counts` | Company interest counts per year. Used for Chart 4. |
| `v_fyp_supervisor_load` | Supervisor project counts per year. Used for Chart 6. |

All views use `security_invoker = true` and filter for `review_status = 'published' AND relevance = 'in_scope'`.

> **Test requirement:** every chart total must equal a direct `COUNT(*)` on the table with the same filter. See Playbook Section 8.2.
