import { describe, it, expect, vi } from 'vitest';
import { fypRouter } from './fyp';

// ─── Mock Supabase (Rule #15 — no live DB) ────────────────────────────────────

const sampleFyp = {
  id: 'fyp-001',
  title: 'Autonomous Drone Surveillance with Edge AI',
  abstract: 'A drone system using YOLO for real-time object detection at the edge.',
  year: 2024,
  supervisor: 'Dr. Ali',
  domain_tags: ['robotics-embedded', 'ai-ml'],
  proposal_outcome: 'accepted',
  embedding: null,
};

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'fyp_projects') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          contains: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [sampleFyp], count: 1, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: sampleFyp, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [sampleFyp], error: null }),
          insert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: sampleFyp, error: null }),
        };
      }
      if (table === 'fyp_team_ideas') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: 'idea-001', title: 'NLP Team', is_open: true },
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        };
      }
      if (table === 'fyp_shortlists') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    }),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock('../lib/llm-gateway', () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.01)),
}));

vi.mock('../middleware/auth', () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('FYP Router (Cards E5 + M1)', () => {
  it('exports fypRouter as an Express Router', () => {
    expect(fypRouter).toBeDefined();
    expect(typeof fypRouter).toBe('function');
    expect(fypRouter.stack.length).toBeGreaterThan(0);
  });

  it('registers GET / route for project listing', () => {
    const hasGet = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/' && layer.route?.methods?.get
    );
    expect(hasGet).toBe(true);
  });

  it('registers GET /team-ideas route for team board', () => {
    const hasTeamGet = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/team-ideas' && layer.route?.methods?.get
    );
    expect(hasTeamGet).toBe(true);
  });

  it('registers POST /team-ideas route for creating a team idea', () => {
    const hasTeamPost = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/team-ideas' && layer.route?.methods?.post
    );
    expect(hasTeamPost).toBe(true);
  });

  it('registers PATCH /team-ideas/:id route for editing a team idea', () => {
    const hasTeamPatch = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/team-ideas/:id' && layer.route?.methods?.patch
    );
    expect(hasTeamPatch).toBe(true);
  });

  it('registers DELETE /team-ideas/:id route for removing a team idea', () => {
    const hasTeamDelete = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/team-ideas/:id' && layer.route?.methods?.delete
    );
    expect(hasTeamDelete).toBe(true);
  });

  it('registers GET /:id/similar route for similarity search', () => {
    const hasSimilar = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/:id/similar' && layer.route?.methods?.get
    );
    expect(hasSimilar).toBe(true);
  });

  it('registers GET /:id route for individual project detail', () => {
    const hasDetail = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/:id' && layer.route?.methods?.get
    );
    expect(hasDetail).toBe(true);
  });

  it('registers GET /user/shortlist route for user shortlists', () => {
    const hasShortlist = fypRouter.stack.some(
      (layer: any) => layer.route?.path === '/user/shortlist' && layer.route?.methods?.get
    );
    expect(hasShortlist).toBe(true);
  });
});
