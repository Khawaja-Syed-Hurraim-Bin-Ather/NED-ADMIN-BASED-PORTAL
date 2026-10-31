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

const chart = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/data/ned_cse_course_chart.json'), 'utf8'));
const client = new Client({ connectionString: env['DATABASE_URL'], ssl: { rejectUnauthorized: false } });

async function seedAll() {
  await client.connect();
  const cseRes = await client.query("SELECT id FROM programs WHERE code = 'CSE'");
  const cseProgramId = cseRes.rows[0].id;
  const cseCvRes = await client.query("SELECT id FROM curriculum_versions WHERE program_id = $1 AND name = 'Scheme 2022'", [cseProgramId]);
  const cseVersionId = cseCvRes.rows[0].id;
  const deptRes = await client.query("SELECT id FROM departments WHERE code = 'CIS'");
  const cisDeptId = deptRes.rows[0].id;

  console.log('Seeding 53 courses for CSE Scheme 2022...');
  let courseCount = 0;
  for (const node of chart.nodes) {
    const codeNorm = node.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cmRes = await client.query(
      `INSERT INTO course_master (code, code_normalized, title, owner_department_id, credits_theory, credits_practical, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       ON CONFLICT (code) DO UPDATE
       SET title = EXCLUDED.title, credits_theory = EXCLUDED.credits_theory, credits_practical = EXCLUDED.credits_practical
       RETURNING id;`,
      [node.code, codeNorm, node.title, cisDeptId, node.theory_credits || 0, node.practical_credits || 0]
    );
    const cmId = cmRes.rows[0].id;

    await client.query(
      `INSERT INTO curriculum_courses (version_id, course_id, semester, credits, category, slot)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (version_id, course_id) DO UPDATE
       SET semester = EXCLUDED.semester, credits = EXCLUDED.credits, category = EXCLUDED.category, slot = EXCLUDED.slot;`,
      [cseVersionId, cmId, node.semester, node.credits, node.category, JSON.stringify(node.slot || {})]
    );
    courseCount++;
  }

  // Also seed prerequisite rules for CSE Scheme 2022 from chart.edges
  console.log('Seeding prerequisite rules from edges...');
  let edgeCount = 0;
  if (Array.isArray(chart.edges)) {
    for (const edge of chart.edges) {
      // Find target course in course_master
      const targetRes = await client.query("SELECT id FROM course_master WHERE code = $1", [edge.target]);
      if (targetRes.rows.length === 0) continue;
      const targetId = targetRes.rows[0].id;

      const ruleTree = {
        type: 'course',
        courseCode: edge.source,
        minGrade: 'D',
        description: `Requires ${edge.source}`
      };

      await client.query(
        `INSERT INTO prerequisite_rules (course_id, version_id, rule_tree)
         VALUES ($1, $2, $3)
         ON CONFLICT (version_id, course_id) DO UPDATE
         SET rule_tree = EXCLUDED.rule_tree;`,
        [targetId, cseVersionId, JSON.stringify(ruleTree)]
      );
      edgeCount++;
    }
  }

  console.log(`✅ Seeded ${courseCount} courses and ${edgeCount} prerequisite rules into CSE Scheme 2022!`);
  await client.end();
}

seedAll().catch(e => {
  console.error('FAIL:', e.message);
  client.end();
  process.exit(1);
});
