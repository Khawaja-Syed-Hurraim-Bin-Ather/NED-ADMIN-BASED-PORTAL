import fs from 'fs';
import pg from 'pg';
const { Client } = pg;

const envContent = fs.readFileSync('apps/api/.env.local', 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
}

const client = new Client({ connectionString: dbUrl });
await client.connect();

const policies = await client.query("SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'fyp_projects'");
console.log('Policies on fyp_projects:');
policies.rows.forEach(p => console.log(' -', p.policyname, '| roles:', p.roles, '| qual:', p.qual));

const profPolicies = await client.query("SELECT policyname, roles, cmd, qual FROM pg_policies WHERE tablename = 'professors'");
console.log('Policies on professors:');
profPolicies.rows.forEach(p => console.log(' -', p.policyname, '| roles:', p.roles, '| qual:', p.qual));

await client.end();
