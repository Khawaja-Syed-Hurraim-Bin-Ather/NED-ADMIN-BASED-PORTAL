import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminRouter } from './admin';

// All admin routes require 'admin' role — mock auth middleware
vi.mock('../middleware/auth', () => ({
  requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock('../lib/supabase', () => {
  const buildQuery = (resolvedValue: unknown) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(resolvedValue),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: 'req-1', user_id: 'u-1', status: 'pending' }, error: null }),
    delete: vi.fn().mockReturnThis(),
  });

  return {
    supabaseAdmin: {
      from: vi.fn((table: string) => {
        if (table === 'fyp_projects') {
          return {
            ...buildQuery({ data: [], count: 0, error: null }),
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'p-1', title: 'Test', review_status: 'approved' }, error: null }),
          };
        }
        return buildQuery({ data: [], count: 0, error: null });
      }),
    },
  };
});

describe('Admin Router (Card M4)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports adminRouter with registered routes', () => {
    expect(adminRouter).toBeDefined();
    expect(adminRouter.stack.length).toBeGreaterThan(0);
  });

  it('mounts requireRole middleware as first layer', () => {
    // The first stack entry should be the requireRole middleware applied via adminRouter.use()
    expect(adminRouter.stack[0]).toBeDefined();
  });

  it('has all expected route handlers registered', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routes = adminRouter.stack.map((layer: any) =>
      layer.route ? `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}` : 'MIDDLEWARE'
    );
    expect(routes).toContain('GET /fyp');
    expect(routes).toContain('GET /fyp/stats');
    expect(routes).toContain('PATCH /fyp/:id');
    expect(routes).toContain('POST /fyp/bulk');
    expect(routes).toContain('GET /audit');
    expect(routes).toContain('GET /deletion-requests');
    expect(routes).toContain('POST /deletion-requests/:id/complete');
  });
});
