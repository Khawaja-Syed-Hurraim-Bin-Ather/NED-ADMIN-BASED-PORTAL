import { describe, it, expect, vi } from 'vitest';
import { plannerRouter } from './planner';

// ─── Mock Supabase admin client (Rule #15 — no live DB in tests) ─────────────

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'mock-plan-id',
          user_id: 'mock-user-id',
          plan_name: 'My Degree Plan',
          target_graduation_term: 'Spring 2028',
          slots: [],
          notes: 'Test notes',
          is_valid: true,
          total_planned_credits: 136,
          updated_at: new Date().toISOString(),
        },
        error: null,
      }),
    })),
  },
}));

vi.mock('../middleware/auth', () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

describe('Planner API Router (Card M3, Rules #7, #8, #13, #15)', () => {
  it('exports plannerRouter as an Express Router instance', () => {
    expect(plannerRouter).toBeDefined();
    expect(typeof plannerRouter).toBe('function');
  });

  it('registers GET /template route handler', () => {
    const hasGetTemplate = plannerRouter.stack.some(
      (layer: any) => layer.route?.path === '/template' && layer.route?.methods?.get
    );
    expect(hasGetTemplate).toBe(true);
  });

  it('registers POST /validate route handler for schedule validation', () => {
    const hasPostValidate = plannerRouter.stack.some(
      (layer: any) => layer.route?.path === '/validate' && layer.route?.methods?.post
    );
    expect(hasPostValidate).toBe(true);
  });

  it('registers GET /my-plan route handler for student saved plan', () => {
    const hasGetMyPlan = plannerRouter.stack.some(
      (layer: any) => layer.route?.path === '/my-plan' && layer.route?.methods?.get
    );
    expect(hasGetMyPlan).toBe(true);
  });

  it('registers PUT /my-plan route handler for saving custom plan', () => {
    const hasPutMyPlan = plannerRouter.stack.some(
      (layer: any) => layer.route?.path === '/my-plan' && layer.route?.methods?.put
    );
    expect(hasPutMyPlan).toBe(true);
  });

  it('has all 4 required planner endpoints mounted', () => {
    const paths = plannerRouter.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

    expect(paths).toContain('GET /template');
    expect(paths).toContain('POST /validate');
    expect(paths).toContain('GET /my-plan');
    expect(paths).toContain('PUT /my-plan');
  });
});
