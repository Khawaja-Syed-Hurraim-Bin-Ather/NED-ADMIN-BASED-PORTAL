import fs from 'fs';
import path from 'path';
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
console.log('Connected to PG!');

// 1. Update all FYP projects to 'published' and 'in_scope'
const fypUpdate = await client.query(`
  UPDATE public.fyp_projects
  SET review_status = 'published',
      relevance = 'in_scope'
`);
console.log(`Updated ${fypUpdate.rowCount} FYP projects to 'published' + 'in_scope'.`);

function toArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(/[;,]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// 2. Read professors from docs/data/professors/professors.json
const profsPath = path.join(process.cwd(), 'docs', 'data', 'professors', 'professors.json');
if (fs.existsSync(profsPath)) {
  let raw = fs.readFileSync(profsPath, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  const profs = (data.professors || []).filter(p => p && p.name);

  for (const p of profs) {
    const slug = p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await client.query(`
      INSERT INTO public.professors (
        name, slug, title, rank, department, qualification,
        research_areas, research_areas_source, domain_tags, area_tags,
        highlights, selected_publications, name_status, review_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        title = EXCLUDED.title,
        rank = EXCLUDED.rank,
        department = EXCLUDED.department,
        qualification = EXCLUDED.qualification,
        research_areas = EXCLUDED.research_areas,
        research_areas_source = EXCLUDED.research_areas_source,
        domain_tags = EXCLUDED.domain_tags,
        area_tags = EXCLUDED.area_tags,
        highlights = EXCLUDED.highlights,
        selected_publications = EXCLUDED.selected_publications,
        name_status = EXCLUDED.name_status,
        review_status = 'published'
    `, [
      p.name,
      slug,
      p.title || null,
      p.rank || null,
      p.department || 'Computer & Information Systems Engineering',
      p.qualification || null,
      toArray(p.research_areas),
      p.research_areas_source || 'stated',
      toArray(p.domain_tags),
      toArray(p.area_tags),
      p.highlights || null,
      toArray(p.selected_publications),
      p.name_status || 'confirmed',
      'published',
    ]);
  }
  console.log(`Upserted ${profs.length} professors into public.professors with status 'published'!`);
}

// Also ensure all existing professors in DB are marked published
await client.query("UPDATE public.professors SET review_status = 'published'");

// 3. Count final visible records
const profCount = await client.query("SELECT COUNT(*) FROM public.professors WHERE review_status = 'published'");
const fypCount = await client.query("SELECT COUNT(*) FROM public.fyp_projects WHERE review_status = 'published' AND relevance = 'in_scope'");

console.log(`✅ Published Professors: ${profCount.rows[0].count}`);
console.log(`✅ Published in_scope FYP Projects: ${fypCount.rows[0].count}`);

await client.end();
