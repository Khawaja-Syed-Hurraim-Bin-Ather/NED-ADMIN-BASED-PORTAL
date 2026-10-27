/**
 * apply_m1_migration.mjs
 * Applies the FYP Advanced (Card M1) migration: fyp_team_ideas table.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');

const envPath = path.join(root, 'apps', 'api', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
}

if (!dbUrl) {
  console.error('❌ DATABASE_URL not found in apps/api/.env.local');
  process.exit(1);
}

const sqlPath = path.join(root, 'supabase', 'migrations', '20261026000003_fyp_team_ideas.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const { default: pg } = await import('pg');
const { Client } = pg;
const client = new Client({ connectionString: dbUrl });

try {
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL');
  await client.query(sql);
  console.log('✅ Migration 20261026000003_fyp_team_ideas.sql applied successfully');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
