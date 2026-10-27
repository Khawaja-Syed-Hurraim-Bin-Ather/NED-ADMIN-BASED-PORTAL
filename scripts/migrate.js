#!/usr/bin/env node
/**
 * scripts/migrate.js
 * Runs SQL migration files against the Supabase PostgreSQL database using DATABASE_URL.
 * Tracks applied migrations in public._migrations table.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..');
const MASTER = path.join(ROOT, '.secrets', 'env.master');

if (!fs.existsSync(MASTER)) {
  console.error('❌ .secrets/env.master not found.');
  process.exit(1);
}

// Read DATABASE_URL safely
const lines = fs.readFileSync(MASTER, 'utf8').split('\n');
let databaseUrl = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.slice(trimmed.indexOf('=') + 1).split('#')[0].trim().replace(/^["']|["']$/g, '');
    break;
  }
}

if (!databaseUrl) {
  console.error('❌ DATABASE_URL missing from .secrets/env.master');
  process.exit(1);
}

const migrationsDir = path.join(ROOT, 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

async function getWorkingClient(connString) {
  let client = new Client({
    connectionString: connString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    return { client, url: connString };
  } catch (err) {
    if (err.message.includes('ENOTFOUND') && connString.includes('.supabase.co')) {
      console.log('⚠️ Direct IPv6 host unreachable via IPv4. Falling back to Supabase pooler (aws-0-ap-southeast-2.pooler.supabase.com:5432)...');
      const parsed = new URL(connString);
      const projectRef = parsed.hostname.split('.')[1] || 'hrzzxtjuiofivnytqldj';
      const user = parsed.username.includes('.') ? parsed.username : `${parsed.username}.${projectRef}`;
      const poolerClient = new Client({
        host: 'aws-0-ap-southeast-2.pooler.supabase.com',
        port: 5432,
        database: parsed.pathname.replace(/^\//, '') || 'postgres',
        user: user,
        password: decodeURIComponent(parsed.password),
        ssl: { rejectUnauthorized: false }
      });
      await poolerClient.connect();
      return { client: poolerClient, url: `postgresql://${user}:****@aws-0-ap-southeast-2.pooler.supabase.com:5432/${parsed.pathname.replace(/^\//, '')}` };
    }
    throw err;
  }
}

async function runMigrations() {
  let client;
  try {
    const res = await getWorkingClient(databaseUrl);
    client = res.client;
    console.log(`🔌 Connected successfully to ${res.url.slice(0, 30)}...`);


    // Ensure _migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Fetch applied migrations
    const appliedResult = await client.query('SELECT name FROM public._migrations;');
    const appliedSet = new Set(appliedResult.rows.map(r => r.name));

    // If _migrations is empty, check if base schema was already applied historically
    if (appliedSet.size === 0) {
      const tableCheck = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profiles';
      `);
      if (tableCheck.rows.length > 0) {
        console.log('ℹ️ Base schema detected as already existing in DB. Marking 20261024000000_init_schema.sql as applied.');
        await client.query('INSERT INTO public._migrations (name) VALUES ($1) ON CONFLICT DO NOTHING;', ['20261024000000_init_schema.sql']);
        appliedSet.add('20261024000000_init_schema.sql');

        // Check if seed data was applied
        const seedCheck = await client.query('SELECT count(*) FROM public.universities;');
        if (parseInt(seedCheck.rows[0].count, 10) > 0) {
          console.log('ℹ️ Seed data detected. Marking 20261024000001_seed_data.sql as applied.');
          await client.query('INSERT INTO public._migrations (name) VALUES ($1) ON CONFLICT DO NOTHING;', ['20261024000001_seed_data.sql']);
          appliedSet.add('20261024000001_seed_data.sql');
        }
      }
    }

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`⏭️  Skipping already applied: ${file}`);
        continue;
      }

      console.log(`\n📄 Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO public._migrations (name) VALUES ($1);', [file]);
        await client.query('COMMIT');
        console.log(`✅ ${file} applied successfully.`);
      } catch (migrationErr) {
        await client.query('ROLLBACK');
        throw migrationErr;
      }
    }

    console.log('\n🎉 All migrations are up to date!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();

