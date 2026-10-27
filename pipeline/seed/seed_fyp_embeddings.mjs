/**
 * seed_fyp_embeddings.mjs
 * Card M1: Reads FYP records with no embedding, generates via Gemini text-embedding-004,
 * and upserts back into fyp_projects.embedding column.
 * 
 * Rules:
 * - Only title + abstract are embedded (no PII — Rule #3)
 * - Batched with 200ms delay per request to avoid quota exhaustion
 * - Run once offline; never called at runtime by users (Rule #1)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

// ── Load env variables ────────────────────────────────────────────
const envPath = path.join(root, 'apps', 'api', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key?.trim()) env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
}

const SUPABASE_URL = env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = env.GEMINI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-004';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !GEMINI_KEY) {
  console.error('❌ Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY in apps/api/.env.local');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getEmbedding(text) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_KEY}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text: text.slice(0, 500) }] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return data.embedding?.values || null;
}

async function supabaseFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(opts.headers || {}),
    },
  });
  return res;
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Fetching FYP records with no embedding...');

  // Fetch published records with no embedding
  const listRes = await supabaseFetch(
    `/fyp_projects?select=id,title,abstract&embedding=is.null&review_status=eq.published`,
    { method: 'GET', headers: { Prefer: 'return=representation' } }
  );

  const records = await listRes.json();

  if (!Array.isArray(records) || records.length === 0) {
    console.log('✅ No records without embeddings found. Run after publishing some FYP records.');
    return;
  }

  console.log(`📦 Found ${records.length} records to embed.`);

  let success = 0;
  let failed = 0;

  for (const record of records) {
    const text = [record.title, record.abstract].filter(Boolean).join(' — ').trim();
    if (!text) {
      console.warn(`⚠️ Skipping ${record.id}: empty text`);
      continue;
    }

    try {
      const embedding = await getEmbedding(text);
      if (!embedding) {
        failed++;
        continue;
      }

      const patchRes = await supabaseFetch(`/fyp_projects?id=eq.${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ embedding: `[${embedding.join(',')}]` }),
      });

      if (patchRes.ok) {
        success++;
        console.log(`✅ [${success}/${records.length}] Embedded: ${record.title?.slice(0, 60)}`);
      } else {
        const err = await patchRes.text();
        console.error(`❌ Failed to patch ${record.id}: ${err}`);
        failed++;
      }
    } catch (err) {
      console.error(`❌ Error embedding ${record.id}: ${err.message}`);
      failed++;
    }

    await sleep(200); // Rate limiting
  }

  console.log(`\n✅ Done. Embedded: ${success}, Failed: ${failed} / ${records.length} total.`);
}

main();
