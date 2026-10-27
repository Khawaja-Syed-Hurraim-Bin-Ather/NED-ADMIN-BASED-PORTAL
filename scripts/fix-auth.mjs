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

const fnOwner = await client.query(`
  SELECT p.proname, r.rolname 
  FROM pg_proc p 
  JOIN pg_roles r ON p.proowner = r.oid 
  WHERE p.proname = 'handle_new_user'
`);
console.log('Function owner:', fnOwner.rows);

const tblOwner = await client.query(`
  SELECT tablename, tableowner 
  FROM pg_tables 
  WHERE tablename = 'profiles'
`);
console.log('Table owner:', tblOwner.rows);

// Let's add an INSERT policy on public.profiles:
await client.query(`
  CREATE POLICY "Enable insert for authenticated and service role" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (true);
`);
console.log('Added INSERT policy on profiles!');

// Let's also ensure handle_new_user has search_path set and security definer
await client.query(`
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      CASE
        WHEN new.email = 'cursor.pro.test124@gmail.com' OR new.email = 'syed.hurraim898@gmail.com' THEN 'admin'::user_role
        ELSE 'enrolled'::user_role
      END
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
  END;
  $$;
`);
console.log('Updated handle_new_user function!');

await client.end();
