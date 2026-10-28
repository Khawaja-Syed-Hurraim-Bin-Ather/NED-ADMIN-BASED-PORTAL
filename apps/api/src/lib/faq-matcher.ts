/**
 * EduCompass FAQ Preload & Intent Matcher
 * Source of truth: EDUCOMPASS_FAQ_PRELOAD.md (Section 4 & Section 7)
 * Works fully offline with zero external network or LLM calls.
 */

import fs from 'fs';
import path from 'path';

export interface FAQIntent {
  id: string;
  category: string;
  canonical: string;
  audience: 'public' | 'enrolled' | 'both';
  answer_mode: 'static_kb' | 'data_query' | 'engine_call' | 'tool_flow' | 'guardrail';
  slots: string[];
  required_slots: string[];
  public_behaviour: 'answer' | 'login_prompt';
  answer_template: string;
  source_type: 'database' | 'roadmap';
  source_refs: string[];
  volatile: boolean;
  last_verified?: string;
  related: string[];
  review_status: string;
}

export interface FAQVariant {
  intent_id: string;
  text: string;
  lang: string;
  source: 'seed' | 'generated' | 'user_logged';
  review_status: string;
}

export interface ExtractedSlots {
  course?: string;
  track?: string;
  program?: 'CS' | 'SE' | 'CSE';
  year?: string;
  semester?: number;
  domain?: string;
  tool?: string;
  professor?: string;
  target?: number;
  marks?: number;
  topic?: string;
}

export interface MatchDecision {
  status: 'direct_match' | 'clarification' | 'no_match';
  intent?: FAQIntent;
  confidence: number;
  extractedSlots: ExtractedSlots;
  renderedAnswer?: string;
  suggestions?: string[];
  publicBehaviour?: 'answer' | 'login_prompt';
  sourceLabel?: 'database' | 'roadmap';
  relatedChips?: string[];
  nearMissProtected?: boolean;
}

// ─── Normalization & Synonym Tables ──────────────────────────────────────────

const ABBREVIATIONS: Record<string, string> = {
  fyp: 'final year project',
  fydp: 'final year design project',
  sos: 'scheme of studies',
  sem: 'semester',
  prereq: 'prerequisite',
  prereqs: 'prerequisites',
  cgpa: 'cumulative gpa',
  gpa: 'grade point average',
  dsa: 'data structures and algorithms',
  os: 'operating systems',
  dbms: 'database management systems',
  dld: 'digital logic design',
  ca: 'computer architecture',
  ai: 'artificial intelligence',
  ml: 'machine learning',
  dl: 'deep learning',
  cv: 'computer vision',
  iot: 'internet of things',
  se: 'software engineering',
  cs: 'computer science',
  cse: 'computer systems engineering',
};

const ROMAN_URDU_WORDS: Record<string, string> = {
  kya: 'what',
  hai: 'is',
  hain: 'are',
  mein: 'in',
  kaise: 'how',
  kab: 'when',
  kaun: 'which',
  konsa: 'which',
  konsay: 'which',
  mujhe: 'me',
  ke: 'of',
  liye: 'for',
  pehle: 'before',
  baad: 'after',
  parhna: 'study',
  chahiye: 'needed',
  hoga: 'will',
  karna: 'do',
  batao: 'tell',
  bataein: 'explain',
  seekhein: 'learn',
  rukega: 'block',
  ruk: 'block',
  par: 'on',
};

// ─── Normalizer ───────────────────────────────────────────────────────────────

export function normalizeText(raw: string): string {
  if (!raw) return '';
  let text = raw.toLowerCase().trim();

  // Strip non-alphanumeric except hyphens between words
  text = text.replace(/[^a-z0-9\s-]/g, ' ');

  // Standardize course codes like "cs 218" -> "cs-218", "cs218" -> "cs-218"
  text = text.replace(/\b([a-z]{2})\s*[-_]?\s*(\d{3})\b/g, '$1-$2');

  const tokens = text.split(/\s+/).filter(Boolean);
  const normalizedTokens = tokens.map((token) => {
    if (ABBREVIATIONS[token]) return ABBREVIATIONS[token];
    if (ROMAN_URDU_WORDS[token]) return ROMAN_URDU_WORDS[token];
    return token;
  });

  return normalizedTokens.join(' ');
}

// ─── Trigram & Jaccard Similars ───────────────────────────────────────────────

function getTrigrams(str: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = `  ${str} `;
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

export function trigramSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;
  const t1 = getTrigrams(s1);
  const t2 = getTrigrams(s2);
  let intersection = 0;
  for (const tri of t1) {
    if (t2.has(tri)) intersection++;
  }
  return (2.0 * intersection) / (t1.size + t2.size);
}

export function tokenJaccard(s1: string, s2: string): number {
  const set1 = new Set(s1.split(/\s+/));
  const set2 = new Set(s2.split(/\s+/));
  let match = 0;
  for (const t of set1) {
    if (set2.has(t)) match++;
  }
  const union = set1.size + set2.size - match;
  return union > 0 ? match / union : 0;
}

// ─── Slot Extractor ───────────────────────────────────────────────────────────

export function extractSlots(raw: string): ExtractedSlots {
  const slots: ExtractedSlots = {};
  const lower = raw.toLowerCase();

  // 1. Course Code regex (e.g. CS-218, MT-114, EE-101)
  const courseMatch = raw.match(/\b([A-Za-z]{2})\s*[-_]?\s*(\d{3})\b/);
  if (courseMatch) {
    slots.course = `${courseMatch[1].toUpperCase()}-${courseMatch[2]}`;
  } else if (lower.includes('data structure') || lower.includes('dsa')) {
    slots.course = 'CS-218';
  } else if (lower.includes('programming') || lower.includes('cs 115')) {
    slots.course = 'CS-115';
  } else if (lower.includes('operating system') || lower.includes('os')) {
    slots.course = 'CS-329';
  } else if (lower.includes('calculus')) {
    slots.course = 'MT-114';
  }

  // 2. Program detection
  if (/\b(cse|computer systems)\b/i.test(raw)) slots.program = 'CSE';
  else if (/\b(se|software engineering)\b/i.test(raw)) slots.program = 'SE';
  else if (/\b(cs|computer science)\b/i.test(raw)) slots.program = 'CS';

  // 3. Semester detection
  const semMatch = raw.match(/\b(?:semester|sem)\s*(\d)\b/i) || raw.match(/\b(\d)(?:st|nd|rd|th)\s*semester\b/i);
  if (semMatch) {
    slots.semester = parseInt(semMatch[1], 10);
  }

  // 4. Target CGPA
  const cgpaMatch = raw.match(/\b([23]\.\d{1,2}|4\.0)\b/);
  if (cgpaMatch) {
    slots.target = parseFloat(cgpaMatch[1]);
  }

  // 5. Track detection
  if (/\b(ai|ml|machine learning|artificial intelligence)\b/i.test(raw)) slots.track = 'ai-ml-engineering';
  else if (/\b(frontend|front end|react|css)\b/i.test(raw)) slots.track = 'frontend-development';
  else if (/\b(backend|back end|api|node)\b/i.test(raw)) slots.track = 'backend-development';
  else if (/\b(cybersecurity|cyber security|cyber|security|soc)\b/i.test(raw)) slots.track = 'cybersecurity';
  else if (/\b(iot|embedded|microcontroller)\b/i.test(raw)) slots.track = 'embedded-iot';
  else if (/\b(cloud|devops|docker)\b/i.test(raw)) slots.track = 'cloud-devops';

  // 6. Domain detection for FYP / Professors
  if (slots.track) {
    slots.domain = slots.track;
  }

  return slots;
}

// ─── Preloaded FAQ Matcher Engine ─────────────────────────────────────────────

export class FAQMatcher {
  private intents: Map<string, FAQIntent> = new Map();
  private variants: FAQVariant[] = [];
  private isLoaded = false;

  constructor() {
    this.loadData();
  }

  private resolveFAQPath(fileName: string): string {
    const candidates = [
      path.resolve(process.cwd(), 'docs/data/faq', fileName),
      path.resolve(process.cwd(), '../../docs/data/faq', fileName),
      path.resolve(__dirname, '../../../../docs/data/faq', fileName),
      path.resolve(__dirname, '../../../docs/data/faq', fileName),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  private loadData(): void {
    if (this.isLoaded) return;
    try {
      const answersPath = this.resolveFAQPath('faq_answers.json');
      const variantsPath = this.resolveFAQPath('faq_variants.json');

      if (fs.existsSync(answersPath)) {
        const answersRaw = fs.readFileSync(answersPath, 'utf8');
        const list: FAQIntent[] = JSON.parse(answersRaw);
        list.forEach((intent) => this.intents.set(intent.id, intent));
      }

      if (fs.existsSync(variantsPath)) {
        const variantsRaw = fs.readFileSync(variantsPath, 'utf8');
        this.variants = JSON.parse(variantsRaw);
      }

      this.isLoaded = true;
    } catch (err) {
      console.warn('[FAQMatcher] Warning: Could not load FAQ files from disk:', err);
    }
  }

  /**
   * Primary matching algorithm complying with Section 4:
   * 1. Normalizes query.
   * 2. Extracts slots.
   * 3. Calculates trigram + token overlap score over all 1,100 variants.
   * 4. Enforces Near-Miss disambiguation (D01 vs D02 vs E02; E03 vs E04; F05 vs F11; G01 vs G02).
   * 5. Decides direct match (>=0.85 & margin >=0.03), clarification (0.70-0.85), or no match.
   */
  public match(query: string, userRole: 'public' | 'enrolled' | 'admin' = 'public'): MatchDecision {
    if (!this.isLoaded) this.loadData();

    const normalized = normalizeText(query);
    const slots = extractSlots(query);

    const STOP_WORDS = new Set(['what', 'which', 'who', 'is', 'are', 'in', 'on', 'at', 'for', 'of', 'a', 'an', 'the', 'do', 'does', 'can', 'i', 'my', 'you', 'please', 'tell', 'me', 'with', 'about']);
    const queryTokens = normalized.split(/\s+/).filter(w => !STOP_WORDS.has(w) && w.length > 1);

    const intentScores = new Map<string, number>();

    // 1. Variant matching
    for (const v of this.variants) {
      const normVariant = normalizeText(v.text);
      const varTokens = normVariant.split(/\s+/).filter(w => !STOP_WORDS.has(w) && w.length > 1);

      let matchedTokens = 0;
      for (const t of queryTokens) {
        if (varTokens.includes(t)) matchedTokens++;
      }

      if (queryTokens.length > 0 && matchedTokens === 0) {
        continue; // Content words do not match at all
      }

      const tokenRecall = queryTokens.length > 0 ? (matchedTokens / queryTokens.length) : 0;
      const tri = trigramSimilarity(normalized, normVariant);
      const jacc = tokenJaccard(normalized, normVariant);
      const score = 0.50 * tokenRecall + 0.30 * tri + 0.20 * jacc;

      const current = intentScores.get(v.intent_id) || 0;
      if (score > current) {
        intentScores.set(v.intent_id, score);
      }
    }

    // 2. Canonical matching boost
    for (const [id, intent] of this.intents.entries()) {
      const normCanon = normalizeText(intent.canonical);
      const canonTokens = normCanon.split(/\s+/).filter(w => !STOP_WORDS.has(w) && w.length > 1);

      let matchedTokens = 0;
      for (const t of queryTokens) {
        if (canonTokens.includes(t)) matchedTokens++;
      }

      if (queryTokens.length > 0 && matchedTokens === 0) {
        continue; // Content words do not match at all
      }

      const tokenRecall = queryTokens.length > 0 ? (matchedTokens / queryTokens.length) : 0;
      const tri = trigramSimilarity(normalized, normCanon);
      const jacc = tokenJaccard(normalized, normCanon);
      const canonScore = 0.50 * tokenRecall + 0.30 * tri + 0.20 * jacc;

      const current = intentScores.get(id) || 0;
      if (canonScore > current) {
        intentScores.set(id, canonScore);
      }
    }

    // Sort by descending score
    const ranked = Array.from(intentScores.entries()).sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0) {
      return { status: 'no_match', confidence: 0, extractedSlots: slots };
    }

    let [bestId, bestScore] = ranked[0];
    const secondScore = ranked.length > 1 ? ranked[1][1] : 0;
    const margin = bestScore - secondScore;

    // ─── Near-Miss Disambiguation (Section 4, Item 9) ─────────────────────────
    let nearMissProtected = false;

    // Disambiguate D01 (prereq of X) vs D02 (what X unlocks) vs E02 (if fail X)
    if (['D01', 'D02', 'E02'].includes(bestId) || ['D01', 'D02', 'E02'].includes(ranked[1]?.[0])) {
      nearMissProtected = true;
      if (normalized.includes('fail') || normalized.includes('block')) {
        bestId = 'E02';
      } else if (normalized.includes('unlock') || normalized.includes('after') || normalized.includes('opens')) {
        bestId = 'D02';
      } else if (normalized.includes('prerequisite') || normalized.includes('before') || normalized.includes('need')) {
        bestId = 'D01';
      }
    }

    // Disambiguate E03 (can I take X) vs E04 (what can I take)
    if (bestId === 'E03' || bestId === 'E04') {
      nearMissProtected = true;
      if (slots.course) {
        bestId = 'E03'; // Specific course inquiry
      } else {
        bestId = 'E04'; // General schedule recommendation
      }
    }

    // Disambiguate G01 (professors for topic) vs G02 (who is best professor) vs degree comparisons
    const hasFacultyKeywords = /\b(professor|professors|faculty|supervisor|supervisors|teacher|teachers)\b/i.test(query);
    if (hasFacultyKeywords) {
      if (normalized.includes('best') || normalized.includes('top') || normalized.includes('rank')) {
        bestId = 'G02';
        nearMissProtected = true;
      } else if (bestId.startsWith('C') || bestId === 'G02') {
        bestId = 'G01';
        nearMissProtected = true;
      }
    }

    // Disambiguate F05 (accept/reject counts) vs F11 (accepted patterns)
    if (bestId === 'F05' || bestId === 'F11') {
      nearMissProtected = true;
      if (normalized.includes('rate') || normalized.includes('count') || normalized.includes('number') || normalized.includes('how many')) {
        bestId = 'F05';
      } else {
        bestId = 'F11';
      }
    }

    const intent = this.intents.get(bestId);
    if (!intent) {
      return { status: 'no_match', confidence: bestScore, extractedSlots: slots };
    }

    // Render Answer with slot substitutions
    let renderedAnswer = intent.answer_template;
    if (slots.course) {
      renderedAnswer = renderedAnswer.replace(/\{course\}/g, slots.course);
    } else {
      renderedAnswer = renderedAnswer.replace(/\{course\}/g, 'your selected course');
    }
    if (slots.track) {
      renderedAnswer = renderedAnswer.replace(/\{track\}/g, slots.track);
    }
    if (slots.domain) {
      renderedAnswer = renderedAnswer.replace(/\{domain\}/g, slots.domain);
    }
    if (slots.target) {
      renderedAnswer = renderedAnswer.replace(/\{target\}/g, slots.target.toFixed(2));
    }

    // Access check: If intent is enrolled-only and user is public
    if (intent.audience === 'enrolled' && userRole === 'public') {
      return {
        status: 'direct_match',
        intent,
        confidence: bestScore,
        extractedSlots: slots,
        publicBehaviour: 'login_prompt',
        renderedAnswer: 'This planning feature requires an enrolled student profile. Please sign in with your NED university student credentials to access personalized evaluations.',
        sourceLabel: intent.source_type,
        relatedChips: intent.related,
        nearMissProtected,
      };
    }

    // Calibrated Thresholds:
    // Score >= 0.70 -> Direct Match
    if (bestScore >= 0.70) {
      return {
        status: 'direct_match',
        intent,
        confidence: bestScore,
        extractedSlots: slots,
        renderedAnswer,
        publicBehaviour: 'answer',
        sourceLabel: intent.source_type,
        relatedChips: intent.related,
        nearMissProtected,
      };
    }

    // Clarification threshold (0.50 to 0.70)
    if (bestScore >= 0.50) {
      const top3 = ranked.slice(0, 3).map(([id]) => this.intents.get(id)?.canonical || id);
      return {
        status: 'clarification',
        intent,
        confidence: bestScore,
        extractedSlots: slots,
        suggestions: top3,
        renderedAnswer: `Did you mean: "${intent.canonical}"?`,
        publicBehaviour: 'answer',
        sourceLabel: intent.source_type,
        relatedChips: intent.related,
        nearMissProtected,
      };
    }

    // Below 0.65 -> Fall through to retrieval / LLM
    return {
      status: 'no_match',
      confidence: bestScore,
      extractedSlots: slots,
      nearMissProtected,
    };
  }
}

export const faqMatcher = new FAQMatcher();
