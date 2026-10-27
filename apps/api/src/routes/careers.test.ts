import { describe, it, expect, vi } from 'vitest';
import { careersRouter } from './careers';

// Mock supabaseAdmin so no live DB is hit in CI (Rule #15)
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
    })),
  },
}));

describe('Careers Router (Card E2)', () => {
  it('exports careersRouter with registered routes', () => {
    expect(careersRouter).toBeDefined();
    expect(careersRouter.stack.length).toBeGreaterThan(0);
  });

  it('has GET / and GET /:slug handlers', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routes = careersRouter.stack.map((layer: any) =>
      layer.route ? `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}` : null
    ).filter(Boolean);
    expect(routes).toContain('GET /');
    expect(routes).toContain('GET /:slug');
  });
});
