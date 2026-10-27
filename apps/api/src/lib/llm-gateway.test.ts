import { describe, it, expect } from 'vitest';
import {
  sanitizePromptText,
  generateChatResponse,
  LLM_CONFIG,
  getEmbedding,
} from './llm-gateway';

describe('LLM Gateway (Rules #3, #4, #5, #14, #15)', () => {
  describe('PII Sanitizer (Rule #3)', () => {
    it('redacts email addresses', () => {
      const { clean, piiRemoved } = sanitizePromptText('My email is student123@neduet.edu.pk, help me');
      expect(piiRemoved).toBe(true);
      expect(clean).toContain('[EMAIL REDACTED]');
      expect(clean).not.toContain('student123@neduet.edu.pk');
    });

    it('redacts student roll numbers', () => {
      const { clean, piiRemoved } = sanitizePromptText('I am in CSE-042 and my roll is 21CS099');
      expect(piiRemoved).toBe(true);
      expect(clean).toContain('[STUDENT ID REDACTED]');
      expect(clean).not.toContain('21CS099');
    });

    it('passes clean academic queries without alteration', () => {
      const { clean, piiRemoved } = sanitizePromptText('What are the prerequisites for Database Management Systems?');
      expect(piiRemoved).toBe(false);
      expect(clean).toBe('What are the prerequisites for Database Management Systems?');
    });
  });

  describe('Hard Caps & Limits (Rule #4)', () => {
    it('enforces maximum input characters cap of 300', async () => {
      const longQuestion = 'A'.repeat(301);
      await expect(
        generateChatResponse({
          question: longQuestion,
          context: 'Some context',
        })
      ).rejects.toThrow('INPUT_TOO_LONG');
    });

    it('has configured limits conforming to SRS specifications', () => {
      expect(LLM_CONFIG.maxInputChars).toBe(300);
      expect(LLM_CONFIG.maxOutputTokens).toBe(500);
      expect(LLM_CONFIG.userDailyLimit).toBe(20);
      expect(LLM_CONFIG.globalDailyBudget).toBe(100);
    });
  });

  describe('Test Mocking (Rule #15)', () => {
    it('returns mock response in test environment without calling live APIs', async () => {
      const res = await generateChatResponse({
        question: 'What is the passing grade at NED?',
        context: 'The passing grade is D (1.0).',
      });

      expect(res.provider).toBe('mock');
      expect(res.answer).toContain('[MOCK_RESPONSE]');
      expect(res.tokensIn).toBeGreaterThan(0);
    });

    it('returns mock embedding vector in test environment', async () => {
      const embedding = await getEmbedding('Computer Science course query');
      expect(embedding).toHaveLength(768);
    });
  });
});
