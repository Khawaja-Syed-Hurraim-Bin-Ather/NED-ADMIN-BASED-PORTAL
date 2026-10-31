#!/usr/bin/env node
/**
 * EduCompass Admin Panel — A2 Migration Runner
 * Applies migrations 20261031000001, 20261031000002, 20261031000003
 * to the dev Supabase database in order.
 *
 * Usage: node pipeline/seed/apply_admin_migrations.mjs
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

// Load env
const envLines = readFileSync(path.join(ROOT, '.secrets/env.master'), 'utf8')
  .split('\n')
  .filter(l => l.trim() && !l.startsWith('#'));

const env = {};
for (const line of envLines) {
  const idx = line.indexOf('=');
  if (idx !== -1) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const MIGRATIONS = [
  '20261031000001_admin_schema.sql',
  '20261031000002_admin_workflow.sql',
  '20261031000003_admin_backfill.sql',
];

// ─── Snapshot (before) ────────────────────────────────────────────────────────
async function snapshot(label) {
  const { data, error } = await supabase.from('v_snapshot_check').select('*').single();
  if (error && label === 'before') {
    // View doesn't exist yet before migration 3 — that's fine
    console.log(`[${label}] snapshot view not yet available (expected before migration 3)`);
    return null;
  }
  if (error) throw new Error(`Snapshot ${label} failed: ${error.message}`);
  console.log(`\n[${label}] Snapshot:`, JSON.stringify(data, null, 2));
  return data;
}

// ─── Run SQL via REST (PostgREST rpc is limited; use pg via db URL) ───────────
// We use the Supabase REST API with service role for DDL — but PostgREST doesn't
// support DDL. Instead we use node-postgres directly via DATABASE_URL.
import pg from 'pg';
const { Client } = pg;

async function runMigration(filename) {
  const sql = readFileSync(
    path.join(ROOT, 'supabase/migrations', filename),
    'utf8'
  );

  const dbUrl = env['DATABASE_URL'];
  if (!dbUrl) throw new Error('DATABASE_URL not set in env.master');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  console.log(`\n🔧  Applying ${filename} ...`);
  try {
    await client.query(sql);
    console.log(`✅  ${filename} applied successfully.`);
  } catch (err) {
    console.error(`❌  ${filename} failed:`, err.message);
    throw err;
  } finally {
    await client.end();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀  EduCompass A2 — Admin Panel Migration Runner');
  console.log(`    Target: ${supabaseUrl}`);

  // Before snapshot (v_snapshot_check doesn't exist yet, so skip gracefully)
  const before = await snapshot('before').catch(() => null);

  for (const migration of MIGRATIONS) {
    await runMigration(migration);
  }

  // After snapshot
  const after = await snapshot('after');

  if (before && after) {
    console.log('\n📊  Comparing snapshots...');
    let clean = true;
    for (const [key, val] of Object.entries(before)) {
      if (after[key] !== val) {
        console.error(`  ❌  ${key}: was ${val}, now ${after[key]} — student data may have changed!`);
        clean = false;
      }
    }
    if (clean) {
      console.log('  ✅  All student-visible record counts are unchanged.');
    } else {
      console.error('  ⚠️   Record count mismatch — investigate before proceeding.');
      process.exit(1);
    }
  }

  console.log('\n🎉  A2 complete. All admin schema migrations applied successfully.');
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});

