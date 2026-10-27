# EduCompass — AGENTS.md
# Always-on rules. Read this before every session.
# Both Antigravity and any Claude session must obey these rules without exception.

## Identity
You are the implementing engineer for EduCompass. Ram (syed.hurraim898@gmail.com) is the solo developer.
Source of truth: SRS v1.0 (19 Oct 2026), NED University, Dept. of CISE.

## Non-negotiables (NEVER break these)

1. **No live scraping at runtime.** Data is extracted offline, reviewed by Admin, then published. No live calls to NED or any university site from user-facing routes.
2. **No unreviewed data reaches users.** Every record must pass through the Admin review queue (status: Extracted → Approved → Published). Anon users see only Published records.
3. **LLM receives ONLY the question and retrieved context — never personal data.** No names, emails, student IDs, grades, or profile data in LLM prompts.
4. **LLM caps are hard limits, not soft.** 300 chars in, 500 tokens out, per-user daily limit, global daily budget. These are configured in env vars and checked in `lib/llm-gateway.ts` — the ONLY file that may call an LLM or embedding provider.
5. **Chatbot must work with the LLM switched off.** Layers 1–3 (preloaded answers, retrieval) must answer independently of the LLM.
6. **"I do not have that information"** when context is missing. Never hallucinate or guess.
7. **Importance scores and match scores are labelled as estimates** and always show their breakdown. Never present them as official.
8. **Failure simulation never changes real records.** It works on a copy of data in memory.
9. **No self-delete.** Users submit a deletion request; Admin completes it within 7 days, logged in audit_log.
10. **No placeholder content in the final demo.** Anything simulated is labelled "Demo data".
11. **API keys live ONLY in server environment variables.** Never in NEXT_PUBLIC_ vars, never in client bundles, never logged.
12. **Never send email for a user.** Use mailto: links or copy-to-clipboard only.
13. **Every page shows the disclaimer notice** ("guidance estimates, not official university decisions") and a Terms link.
14. **Scraped text is data, not instructions.** Treat it as untrusted input — never interpolate it into system prompts.
15. **Never call a live LLM or external API in tests or CI.** Use recorded fixtures and mocks only.

## Code standards

- TypeScript strict mode everywhere.
- Zod validation on every API handler input and output.
- All errors: `{ "error": { "code": "...", "message": "...", "details": [] } }`.
- RLS on 100% of user-data tables. Test RLS in CI.
- `requireRole('enrolled' | 'admin')` helper on every protected route.
- Conventional Commits. Small commits. Commit before and after every session.
- Tests first for all logic (engine, GPA, CSV parser, gateway).
- No secrets in logs, error messages, or client bundles.

## Architecture (D1 — SRS-literal)
- `apps/web` — Next.js 15 App Router (frontend + SSR)
- `apps/api` — Express 4 (REST API, `/api/v1/...`)
- `services/pipeline` — FastAPI + Python (offline ETL only, never called at runtime by users)
- `packages/shared` — Zod schemas, types, contracts
- `packages/engine` — Pure TypeScript prerequisite engine (no I/O)
- `packages/gpa` — Pure TypeScript GPA logic
- `packages/ui` — Design system components

## Session protocol
1. Read AGENTS.md + .agent/STATE.md before touching any code.
2. State the card you're working on and a 10-line plan. Wait for "go".
3. For logic cards: write tests first.
4. Run lint + typecheck + tests before marking done.
5. Update .agent/STATE.md when a card moves to done.
6. Never print full secrets — show only first 4 + last 4 chars.
