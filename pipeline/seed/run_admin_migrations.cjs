/**
 * Run admin panel migrations (A2) via node-postgres.
 * CommonJS so it works in any Node version without ESM import issues.
 */
'use strict';
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
const SECRETS = path.join(ROOT, '.secrets/env.master');

// Parse env.master
const env = {};
for (const line of fs.readFileSync(SECRETS, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx !== -1) env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
}

const DB_URL = env['DATABASE_URL'];
if (!DB_URL) { console.error('DATABASE_URL missing'); process.exit(1); }

const MIGRATIONS = [
  '20261031000001_admin_schema.sql',
  '20261031000002_admin_workflow.sql',
  '20261031000003_admin_backfill.sql',
];

async function query(client, sql, label) {
  try {
    await client.query(sql);
    console.log('  ✅', label);
  } catch (e) {
    console.error('  ❌', label, '—', e.message.split('\n')[0]);
    throw e;
  }
}

async function runSnapshot(client) {
  try {
    const { rows } = await client.query('SELECT * FROM public.v_snapshot_check LIMIT 1');
    return rows[0] || null;
  } catch (_) {
    return null; // view not yet created
  }
}

async function main() {
  console.log('🚀  EduCompass A2 — Admin Migrations');
  console.log('   DB:', DB_URL.replace(/:\/\/.*@/, '://***@'));

  // Snapshot before
  const snapClient = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await snapClient.connect();
  const before = await runSnapshot(snapClient);
  await snapClient.end();
  if (before) console.log('\n📸  Before:', JSON.stringify(before));

  // Apply each migration in its own client connection
  for (const m of MIGRATIONS) {
    const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations', m), 'utf8');
    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    console.log('\n🔧  Applying', m, '...');
    await query(client, sql, m);
    await client.end();
  }

  // Snapshot after
  const snapClient2 = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await snapClient2.connect();
  const after = await runSnapshot(snapClient2);
  await snapClient2.end();

  if (after) {
    console.log('\n📸  After:', JSON.stringify(after));
    if (before) {
      let ok = true;
      for (const [k, v] of Object.entries(before)) {
        const a = after[k];
        if (String(a) !== String(v)) {
          console.error(`  ⚠️  ${k}: ${v} → ${a}`);
          ok = false;
        }
      }
      console.log(ok ? '✅  All student counts unchanged.' : '❌  Count mismatch!');
      if (!ok) process.exit(1);
    }
  }

  console.log('\n🎉  A2 complete.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

