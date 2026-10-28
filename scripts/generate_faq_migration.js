const fs = require('fs');
const path = require('path');

const answers = JSON.parse(fs.readFileSync(path.resolve('docs/data/faq/faq_answers.json'), 'utf8'));
const variants = JSON.parse(fs.readFileSync(path.resolve('docs/data/faq/faq_variants.json'), 'utf8'));

let sql = `-- ============================================================================
-- EduCompass FAQ Preload & Intent Classification System
-- Reference: EDUCOMPASS_FAQ_PRELOAD.md (Section 5)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.faq_intents (
  id TEXT PRIMARY KEY,
  category TEXT,
  canonical_question TEXT NOT NULL,
  audience TEXT CHECK (audience IN ('public', 'enrolled', 'both')),
  answer_mode TEXT CHECK (answer_mode IN ('static_kb', 'data_query', 'engine_call', 'tool_flow', 'guardrail')),
  slots TEXT[] DEFAULT '{}',
  required_slots TEXT[] DEFAULT '{}',
  public_behaviour TEXT DEFAULT 'answer' CHECK (public_behaviour IN ('answer', 'login_prompt')),
  answer_template TEXT,
  query_spec JSONB DEFAULT '{}'::jsonb,
  source_type TEXT DEFAULT 'database' CHECK (source_type IN ('database', 'roadmap')),
  source_refs JSONB DEFAULT '[]'::jsonb,
  volatile BOOLEAN DEFAULT false,
  last_verified DATE,
  related TEXT[] DEFAULT '{}',
  answerability TEXT DEFAULT 'unknown' CHECK (answerability IN ('answerable', 'partial', 'blocked', 'unknown')),
  review_status TEXT DEFAULT 'Published',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faq_variants (
  id BIGSERIAL PRIMARY KEY,
  intent_id TEXT REFERENCES public.faq_intents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  lang TEXT DEFAULT 'en',
  source TEXT CHECK (source IN ('seed', 'generated', 'user_logged')),
  review_status TEXT DEFAULT 'Published',
  embedding vector(768),
  UNIQUE (intent_id, text)
);

-- RLS: Public read for Published records only (Rule #2)
ALTER TABLE public.faq_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_variants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public read published faq_intents" ON public.faq_intents
    FOR SELECT TO public USING (review_status = 'Published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read published faq_variants" ON public.faq_variants
    FOR SELECT TO public USING (review_status = 'Published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed all 100 intents
`;

for (const a of answers) {
  const esc = (s) => (s ? s.replace(/'/g, "''") : '');
  const slotsArr = `ARRAY[${a.slots.map(s => `'${esc(s)}'`).join(',')}]::text[]`;
  const reqSlotsArr = `ARRAY[${a.required_slots.map(s => `'${esc(s)}'`).join(',')}]::text[]`;
  const relatedArr = `ARRAY[${a.related.map(s => `'${esc(s)}'`).join(',')}]::text[]`;
  const sourceRefsJson = JSON.stringify(a.source_refs || []).replace(/'/g, "''");

  sql += `INSERT INTO public.faq_intents (id, category, canonical_question, audience, answer_mode, slots, required_slots, public_behaviour, answer_template, source_type, source_refs, volatile, last_verified, related, review_status)
VALUES ('${esc(a.id)}', '${esc(a.category)}', '${esc(a.canonical)}', '${esc(a.audience)}', '${esc(a.answer_mode)}', ${slotsArr}, ${reqSlotsArr}, '${esc(a.public_behaviour)}', '${esc(a.answer_template)}', '${esc(a.source_type)}', '${sourceRefsJson}'::jsonb, ${a.volatile ? 'true' : 'false'}, '${a.last_verified || '2026-10-28'}', ${relatedArr}, 'Published')
ON CONFLICT (id) DO UPDATE SET
  answer_template = EXCLUDED.answer_template,
  source_type = EXCLUDED.source_type,
  updated_at = NOW();\n`;
}

// Seed variants in batches
sql += `\n-- Seed variants\n`;
for (const v of variants) {
  const escText = v.text.replace(/'/g, "''");
  sql += `INSERT INTO public.faq_variants (intent_id, text, lang, source, review_status)
VALUES ('${v.intent_id}', '${escText}', '${v.lang || 'en'}', '${v.source || 'generated'}', 'Published')
ON CONFLICT (intent_id, text) DO NOTHING;\n`;
}

fs.writeFileSync(path.resolve('supabase/migrations/20261028000001_faq_preload_system.sql'), sql, 'utf8');
console.log('Migration generated at supabase/migrations/20261028000001_faq_preload_system.sql');
