#!/usr/bin/env node
/**
 * sync-env.js
 * Reads .secrets/env.master and writes the correct subset to each service's .env.local
 * Run: node scripts/sync-env.js
 * NEVER puts SUPABASE_SERVICE_ROLE_KEY or DATABASE_URL into NEXT_PUBLIC_ variables.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MASTER = path.join(ROOT, '.secrets', 'env.master');

if (!fs.existsSync(MASTER)) {
  console.error('❌  .secrets/env.master not found. Create it first.');
  process.exit(1);
}

// Parse the master file
const lines = fs.readFileSync(MASTER, 'utf8').split('\n');
const env = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).split('#')[0].trim(); // strip inline comments
  env[key] = val;
}

// Safety check — no server-only key in NEXT_PUBLIC_
const serverOnly = ['SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'XAI_API_KEY'];
for (const key of serverOnly) {
  if (key.startsWith('NEXT_PUBLIC_')) {
    console.error(`❌ SECURITY: ${key} must never be NEXT_PUBLIC_`);
    process.exit(1);
  }
}

function writeEnv(dest, keys) {
  const lines = keys
    .filter(k => env[k] !== undefined)
    .map(k => `${k}=${env[k]}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, lines.join('\n') + '\n');
  console.log(`✅  Written: ${path.relative(ROOT, dest)}`);
}

// ── apps/web/.env.local ──────────────────────────────────────────
writeEnv(path.join(ROOT, 'apps', 'web', '.env.local'), [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'ADMIN_SEED_EMAIL',
  'LLM_PROVIDER',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'XAI_API_KEY',
  'LLM_PROVIDER_FALLBACK',
  'LLM_MODEL',
  'LLM_MODEL_FALLBACK',
  'EMBEDDING_PROVIDER',
  'EMBEDDING_MODEL',
  'EMBEDDING_DIM',
  'LLM_MAX_INPUT_CHARS',
  'LLM_MAX_OUTPUT_TOKENS',
  'LLM_USER_DAILY_LIMIT',
  'LLM_GLOBAL_DAILY_BUDGET',
  'IMPORTANCE_WEIGHTS',
  'API_PORT',
]);

// ── apps/api/.env.local ──────────────────────────────────────────
writeEnv(path.join(ROOT, 'apps', 'api', '.env.local'), [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'ADMIN_SEED_EMAIL',
  'LLM_PROVIDER',
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'XAI_API_KEY',
  'LLM_PROVIDER_FALLBACK',
  'LLM_MODEL',
  'LLM_MODEL_FALLBACK',
  'EMBEDDING_PROVIDER',
  'EMBEDDING_MODEL',
  'EMBEDDING_DIM',
  'LLM_MAX_INPUT_CHARS',
  'LLM_MAX_OUTPUT_TOKENS',
  'LLM_USER_DAILY_LIMIT',
  'LLM_GLOBAL_DAILY_BUDGET',
  'IMPORTANCE_WEIGHTS',
  'API_PORT',
]);

// ── services/pipeline/.env ───────────────────────────────────────
writeEnv(path.join(ROOT, 'services', 'pipeline', '.env'), [
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'GEMINI_API_KEY',
  'EMBEDDING_PROVIDER',
  'EMBEDDING_MODEL',
  'EMBEDDING_DIM',
  'PIPELINE_PORT',
]);

console.log('\n🎉  All .env files synced from .secrets/env.master');
console.log('⚠️   These files are gitignored — never commit them.');
