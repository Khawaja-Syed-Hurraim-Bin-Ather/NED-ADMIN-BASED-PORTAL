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

const policies = await client.query("SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'profiles'");
console.log('Policies on profiles:');
policies.rows.forEach(p => console.log(' -', p.policyname, '| cmd:', p.cmd, '| check:', p.with_check));

// Also check existing users in auth.users
const users = await client.query("SELECT id, email, confirmed_at, created_at FROM auth.users");
console.log('Users in auth.users:', users.rows.length);
users.rows.forEach(u => console.log(' -', u.email, 'confirmed:', u.confirmed_at));

await client.end();
