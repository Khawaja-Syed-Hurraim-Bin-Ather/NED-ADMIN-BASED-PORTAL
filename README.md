## What is EduCompass?

EduCompass is a Next.js + Express + Python web platform for NED University CS/SE/CSE students.

## Project layout

```
apps/web/          Next.js 15 (frontend, port 3000)
apps/api/          Express 4  (REST API, port 4000)
services/pipeline/ FastAPI + Python (offline ETL, port 8000)
packages/shared/   Zod schemas, shared TypeScript types
packages/engine/   Prerequisite engine (pure TS, no I/O)
packages/gpa/      GPA/CGPA logic (pure TS)
packages/ui/       Design system components
supabase/          SQL migrations
scripts/           sync-env, seed, warmup
.agent/STATE.md    Card status and decisions
AGENTS.md          Always-on rules (read this first)
```

## Running locally

```bash
# 1. Sync secrets
node scripts/sync-env.js

# 2. Start everything
pnpm dev           # starts web (3000) + api (4000) in parallel

# 3. Python pipeline (only needed for data extraction)
cd services/pipeline
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Key commands

```bash
pnpm lint          # lint all packages
pnpm typecheck     # type-check all packages
pnpm test          # run all unit tests
pnpm dev:web       # Next.js only
pnpm dev:api       # Express API only
```

## Secrets

Never put secrets in code. Always use `.secrets/env.master` → `node scripts/sync-env.js`.
See AGENTS.md for the full rules.
