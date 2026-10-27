#!/usr/bin/env node
/**
 * scripts/export-data.js
 * Exports database contents to JSON/CSV for backup/audit (SRS NFR-31).
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..');
const MASTER = path.join(ROOT, '.secrets', 'env.master');

const lines = fs.readFileSync(MASTER, 'utf8').split('\n');
let databaseUrl = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.split('=')[1].split('#')[0].trim();
    break;
  }
}

async function exportData() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  const outDir = path.join(ROOT, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(outDir, { recursive: true });

  try {
    await client.connect();
    const tables = ['universities', 'programs', 'courses', 'prerequisite_rules', 'career_tracks', 'chatbot_answers'];

    for (const table of tables) {
      const res = await client.query(`SELECT * FROM public.${table}`);
      fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(res.rows, null, 2));
      console.log(`✅ Exported ${res.rows.length} rows from ${table}`);
    }

    console.log(`\n🎉 Data backup complete in: ${outDir}`);
  } catch (err) {
    console.error('Export error:', err.message);
  } finally {
    await client.end();
  }
}

exportData();
