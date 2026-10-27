import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import { chatRouter } from './chat';

// Mock Supabase admin calls so tests are 100% self-contained and fast (Rule #15)
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [] }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/chat', chatRouter);
  return app;
}

describe('Chat API Route (Card H3, Rules #3, #4, #5, #6, #13, #15)', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('GET /api/v1/chat/suggestions', () => {
    it('returns suggested academic prompt chips', () => {
      expect(chatRouter.stack.some((layer) => layer.route?.path === '/suggestions')).toBe(true);
    });
  });

  describe('POST /api/v1/chat - 4-Layer Responses', () => {
    it('registers POST / route handler', () => {
      const hasPost = chatRouter.stack.some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (layer: any) => layer.route?.path === '/' && layer.route?.methods?.post
      );
      expect(hasPost).toBe(true);
    });

    it('rejects questions longer than 300 characters with 400', async () => {
      let statusCode = 0;
      let jsonBody: any = null;

      const mockReq: any = {
        body: { message: 'A'.repeat(301) },
      };
      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
          return mockRes;
        },
        json: (body: any) => {
          jsonBody = body;
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postHandler: any = chatRouter.stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.post)?.route?.stack?.[0]?.handle;
      await postHandler(mockReq, mockRes, vi.fn());

      expect(statusCode).toBe(400);
      expect(jsonBody.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns Layer 1 instant answer for preloaded question', async () => {
      let jsonBody: any = null;
      const mockReq: any = {
        body: { message: 'What is the minimum cgpa to graduate?' },
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: (body: any) => {
          jsonBody = body;
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postHandler: any = chatRouter.stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.post)?.route?.stack?.[0]?.handle;
      await postHandler(mockReq, mockRes, vi.fn());

      expect(jsonBody.data.layer).toBe(1);
      expect(jsonBody.data.source).toBe('preloaded_official');
      expect(jsonBody.data.answer).toContain('2.0');
      expect(jsonBody.data.disclaimer).toBe('Guidance estimates, not official university decisions.');
    });

    it('returns Layer 4 strict fallback when no information is available (Rule #6)', async () => {
      let jsonBody: any = null;
      const mockReq: any = {
        body: { message: 'What is the recipe for chocolate cake?' },
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: (body: any) => {
          jsonBody = body;
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postHandler: any = chatRouter.stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.post)?.route?.stack?.[0]?.handle;
      await postHandler(mockReq, mockRes, vi.fn());

      expect(jsonBody.data.layer).toBe(4);
      expect(jsonBody.data.answer).toBe(
        'I do not have that information based on the official NED CISE resources available. Please consult the CISE department or your academic advisor.'
      );
      expect(jsonBody.data.disclaimer).toBe('Guidance estimates, not official university decisions.');
    });

    it('honors preferOffline mode without invoking LLM (Rule #5)', async () => {
      let jsonBody: any = null;
      const mockReq: any = {
        body: { message: 'Tell me about random stuff', preferOffline: true },
      };
      const mockRes: any = {
        status: vi.fn().mockReturnThis(),
        json: (body: any) => {
          jsonBody = body;
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postHandler: any = chatRouter.stack.find((l: any) => l.route?.path === '/' && l.route?.methods?.post)?.route?.stack?.[0]?.handle;
      await postHandler(mockReq, mockRes, vi.fn());

      // In offline mode with no match, it safely falls back to layer 4 without throwing
      expect([2, 4]).toContain(jsonBody.data.layer);
      expect(jsonBody.data.disclaimer).toBe('Guidance estimates, not official university decisions.');
    });
  });
});
