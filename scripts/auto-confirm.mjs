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

// Auto confirm all existing users
await client.query("UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL");
console.log('Confirmed all unconfirmed users in auth.users!');

// Create trigger on auth.users to auto-confirm new signups in dev if needed
await client.query(`
  CREATE OR REPLACE FUNCTION public.auto_confirm_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    NEW.email_confirmed_at = coalesce(NEW.email_confirmed_at, now());
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
  CREATE TRIGGER on_auth_user_before_insert
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_user();
`);
console.log('Added auto-confirm trigger for dev!');

await client.end();
