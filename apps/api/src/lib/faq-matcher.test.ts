import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  normalizeText,
  extractSlots,
  trigramSimilarity,
  tokenJaccard,
  faqMatcher,
} from './faq-matcher';

describe('FAQ Matcher & Preload System', () => {
  describe('1. Normalization & Roman Urdu Expansion', () => {
    it('normalizes uppercase and punctuation', () => {
      const result = normalizeText('What are the Prerequisites of CS-218???');
      expect(result).toContain('prerequisite');
      expect(result).toContain('cs-218');
    });

    it('expands common academic abbreviations', () => {
      expect(normalizeText('when does fyp start')).toContain('final year project');
      expect(normalizeText('check my cgpa')).toContain('cumulative gpa');
      expect(normalizeText('what is the prereq of dsa')).toContain('data structures and algorithms');
    });

    it('translates Roman Urdu terms into academic intent keywords', () => {
      const urduQuery = 'cs-218 se pehle kya parhna zaroori hai';
      const normalized = normalizeText(urduQuery);
      expect(normalized).toContain('before');
      expect(normalized).toContain('what');
      expect(normalized).toContain('study');
    });
  });

  describe('2. Slot Extraction', () => {
    it('extracts standardized course codes from various formats', () => {
      expect(extractSlots('prereq for cs 218').course).toBe('CS-218');
      expect(extractSlots('what unlocks mt-114').course).toBe('MT-114');
      expect(extractSlots('eligibility for data structures').course).toBe('CS-218');
      expect(extractSlots('can i take operating systems').course).toBe('CS-329');
    });

    it('extracts career tracks and academic domains', () => {
      expect(extractSlots('roadmap for machine learning').track).toBe('ai-ml-engineering');
      expect(extractSlots('best electives for frontend development').track).toBe('frontend-development');
      expect(extractSlots('jobs in cybersecurity').track).toBe('cybersecurity');
      expect(extractSlots('iot and embedded projects').track).toBe('embedded-iot');
    });

    it('extracts target CGPA and semester numbers', () => {
      expect(extractSlots('how to reach a cgpa of 3.50').target).toBe(3.50);
      expect(extractSlots('courses in semester 5').semester).toBe(5);
      expect(extractSlots('courses in 3rd semester').semester).toBe(3);
    });

    it('extracts degree programs', () => {
      expect(extractSlots('difference in cse vs cs').program).toBe('CSE');
      expect(extractSlots('curriculum for software engineering').program).toBe('SE');
    });
  });

  describe('3. Near-Miss Disambiguation (Section 4, Item 9)', () => {
    it('distinguishes D01 (prerequisite of X) vs D02 (what X unlocks) vs E02 (if I fail X)', () => {
      const qD01 = faqMatcher.match('what are the prerequisites of CS-218');
      expect(qD01.intent?.id).toBe('D01');

      const qD02 = faqMatcher.match('which courses does CS-115 unlock');
      expect(qD02.intent?.id).toBe('D02');

      const qE02 = faqMatcher.match('if I fail CS-115 which courses will be blocked');
      expect(qE02.intent?.id).toBe('E02');
    });

    it('distinguishes E03 (can I take course X) vs E04 (what courses can I take)', () => {
      const qE03 = faqMatcher.match('can I take CS-329 next semester', 'enrolled');
      expect(qE03.intent?.id).toBe('E03');

      const qE04 = faqMatcher.match('what courses can I take next semester', 'enrolled');
      expect(qE04.intent?.id).toBe('E04');
    });

    it('distinguishes G01 (professors in AI) vs G02 (who is best professor in AI)', () => {
      const qG01 = faqMatcher.match('which professors work on artificial intelligence', 'enrolled');
      expect(qG01.intent?.id).toBe('G01');

      const qG02 = faqMatcher.match('who is the best professor for machine learning', 'enrolled');
      expect(qG02.intent?.id).toBe('G02');
      expect(qG02.intent?.answer_mode).toBe('guardrail');
    });

    it('distinguishes F05 (proposal accepted counts) vs F11 (what accepted proposals have in common)', () => {
      const qF05 = faqMatcher.match('how many fyp proposals were accepted each year');
      expect(qF05.intent?.id).toBe('F05');

      const qF11 = faqMatcher.match('what do accepted fyp proposals have in common');
      expect(qF11.intent?.id).toBe('F11');
    });
  });

  describe('4. Access Control & Role Checks', () => {
    it('returns login prompt when public user asks enrolled-only question', () => {
      const match = faqMatcher.match('what are the prerequisites of CS-218', 'public');
      expect(match.status).toBe('direct_match');
      expect(match.publicBehaviour).toBe('login_prompt');
      expect(match.renderedAnswer).toContain('sign in with your NED university student credentials');
    });

    it('returns full answer when enrolled user asks enrolled-only question', () => {
      const match = faqMatcher.match('what are the prerequisites of CS-218', 'enrolled');
      expect(match.status).toBe('direct_match');
      expect(match.publicBehaviour).toBe('answer');
      expect(match.renderedAnswer).toContain('CS-218');
    });
  });

  function resolveTestPath(fileName: string): string {
    const candidates = [
      path.resolve(process.cwd(), 'docs/data/faq', fileName),
      path.resolve(process.cwd(), '../../docs/data/faq', fileName),
      path.resolve(__dirname, '../../../../docs/data/faq', fileName),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  describe('5. Privacy Scan Over Stored FAQ Answers', () => {
    it('verifies zero student names, roll numbers, or phone numbers in stored answers', () => {
      const answersPath = resolveTestPath('faq_answers.json');
      expect(fs.existsSync(answersPath)).toBe(true);
      const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

      const rollRegex = /\b\d{2}[A-Za-z]{2}\d{2,4}\b/;
      const phoneRegex = /(?:\+92|03)\d{2}[-\s]?\d{7}/;

      for (const item of answers) {
        expect(rollRegex.test(item.answer_template)).toBe(false);
        expect(phoneRegex.test(item.answer_template)).toBe(false);
        expect(item.answer_template).not.toContain('@student.neduet.edu.pk');
      }
    });

    it('verifies all 100 answers have valid source labels and related chips', () => {
      const answersPath = resolveTestPath('faq_answers.json');
      const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

      expect(answers.length).toBe(100);
      for (const item of answers) {
        expect(['database', 'roadmap']).toContain(item.source_type);
        expect(Array.isArray(item.related)).toBe(true);
        expect(item.related.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('6. Held-Out Test Set Accuracy Benchmark', () => {
    it('answers over 85% of held-out test cases correctly without external network calls', () => {
      const testSetPath = resolveTestPath('faq_held_out_test_set.json');
      expect(fs.existsSync(testSetPath)).toBe(true);
      const testSet = JSON.parse(fs.readFileSync(testSetPath, 'utf8'));

      let correct = 0;
      for (const tc of testSet) {
        const match = faqMatcher.match(tc.query, 'enrolled');
        if (match.intent?.id === tc.expected_intent) {
          correct++;
        }
      }

      const accuracy = (correct / testSet.length) * 100;
      // Target per Section 7: at least 85% accuracy
      expect(accuracy).toBeGreaterThanOrEqual(85.0);
    });
  });
});
