'use strict';
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
const SECRETS = path.join(ROOT, '.secrets/env.master');

const env = {};
for (const line of fs.readFileSync(SECRETS, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx !== -1) env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
}

const verifiedRules = [
  { target: 'CS-116', source: 'CS-115' },
  { target: 'CS-218', source: 'CS-116' },
  { target: 'CS-220', source: 'EE-120' },
  { target: 'CS-221', source: 'CS-220' },
  { target: 'CS-222', source: 'CS-218' },
  { target: 'CS-215', source: 'EE-120' },
  { target: 'CS-328', source: 'CS-221' },
  { target: 'CS-326', source: 'CS-218' },
  { target: 'CS-327', source: 'CS-114' },
  { target: 'CS-323', source: 'CS-218' },
  { target: 'CS-301', source: 'CS-221' },
  { target: 'CS-329', source: 'CS-218' },
  { target: 'CS-324', source: 'CS-323' },
  { target: 'CS-419', source: 'CS-215' },
  { target: 'CS-431', source: 'CS-220' },
  { target: 'CS-433', source: 'CS-327' },
  { target: 'CS-432', source: 'CS-329' },
  { target: 'CS-406', source: 'CS-218' },
];

async function seedPrereqs() {
  const client = new Client({ connectionString: env['DATABASE_URL'], ssl: { rejectUnauthorized: false } });
  await client.connect();

  const cseRes = await client.query("SELECT id FROM programs WHERE code = 'CSE'");
  const cseProgramId = cseRes.rows[0].id;
  const cseCvRes = await client.query("SELECT id FROM curriculum_versions WHERE program_id = $1 AND name = 'Scheme 2022'", [cseProgramId]);
  const cseVersionId = cseCvRes.rows[0].id;

  console.log(`Seeding verified prerequisites for CSE Scheme 2022 (${cseVersionId})...`);
  let count = 0;
  for (const r of verifiedRules) {
    const targetRes = await client.query("SELECT id FROM course_master WHERE code = $1", [r.target]);
    if (targetRes.rows.length === 0) continue;
    const targetId = targetRes.rows[0].id;

    const ruleTree = {
      type: 'course',
      courseCode: r.source,
      minGrade: 'D',
      description: `Requires ${r.source}`
    };

    await client.query(
      `INSERT INTO prerequisite_rules (course_id, version_id, rule_tree)
       VALUES ($1, $2, $3)
       ON CONFLICT (version_id, course_id) DO UPDATE
       SET rule_tree = EXCLUDED.rule_tree;`,
      [targetId, cseVersionId, JSON.stringify(ruleTree)]
    );
    count++;
  }
  console.log(`✅ Seeded ${count} prerequisite rules into CSE Scheme 2022!`);
  await client.end();
}

seedPrereqs().catch(e => {
  console.error('FAIL:', e.message);
  process.exit(1);
});

