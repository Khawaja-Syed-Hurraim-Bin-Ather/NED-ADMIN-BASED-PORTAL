import { describe, it, expect, vi, beforeEach } from 'vitest';
import { releasesJobsRouter } from './releases-jobs';
import { AdminSession } from '../middleware/admin-auth';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockReleaseSingle = vi.fn();
const mockReleasesSelect = vi.fn();
const mockJobsSelect = vi.fn();
const mockJobSingle = vi.fn();
const mockJobUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'releases') {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: mockReleasesSelect,
            }),
            eq: vi.fn().mockReturnValue({
              single: mockReleaseSingle,
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'rel-rollback-1', tag: 'rollback-cis-v1', notes: 'Rollback to cis-v1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'publish_jobs') {
        const queryBuilder: any = {
          eq: vi.fn().mockImplementation(() => queryBuilder),
          order: vi.fn().mockReturnValue({
            range: mockJobsSelect,
          }),
          single: mockJobSingle,
        };
        return {
          select: vi.fn().mockReturnValue(queryBuilder),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: mockJobUpdate,
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));

vi.mock('../middleware/admin-auth', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    requireAdminAuth: (req: any, _res: any, next: () => void) => {
      if (!req.adminUser) {
        req.adminUser = {
          adminId: 'vc-1',
          email: 'vc@nedut.edu.pk',
          role: 'vc',
          departmentId: null,
          allowedModules: [],
        } as AdminSession;
      }
      next();
    },
    requireStepUp: (req: any, res: any, next: () => void) => {
      // Step-up verification header check
      if (req.headers['x-admin-step-up-token'] === 'valid-step-up-token') {
        return next();
      }
      res.status(403).json({ error: { code: 'STEP_UP_REQUIRED', message: 'Step-up required' } });
    },
  };
});

function createMockReqRes(options: {
  adminUser?: AdminSession;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, any>;
  body?: Record<string, any>;
}) {
  const defaultAdminUser: AdminSession = {
    adminId: 'vc-1',
    email: 'vc@nedut.edu.pk',
    role: 'vc',
    departmentId: null,
    allowedModules: [],
  };

  const req: any = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    adminUser: options.adminUser || defaultAdminUser,
  };

  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

function getRouteHandler(path: string, method: string): any {
  const layer = releasesJobsRouter.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer || !layer.route) return undefined;
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1]?.handle;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Releases & Publish Jobs Router (Card A9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Releases Listing & Inspection', () => {
    it('returns paginated releases for admin dashboard', async () => {
      mockReleasesSelect.mockResolvedValueOnce({
        data: [
          { id: 'rel-1', tag: 'cis-scheme2022-r1', created_at: new Date().toISOString() },
        ],
        count: 1,
        error: null,
      });

      const { req, res } = createMockReqRes({
        query: { page: 1, pageSize: 25 },
      });

      const handler = getRouteHandler('/releases', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().data).toHaveLength(1);
    });
  });

  describe('2. Rollback Execution (Section 8 & Section 14 Test 6)', () => {
    it('blocks rollback if step-up verification is missing', async () => {
      const { req, res } = createMockReqRes({
        method: 'POST',
        params: { id: 'rel-1' },
        headers: {}, // no step-up token!
      });

      // The step-up check is a route middleware
      const layer: any = releasesJobsRouter.stack.find(
        (l: any) => l.route?.path === '/releases/:id/rollback' && l.route?.methods?.post
      );
      expect(layer).toBeDefined();
      const stepUpMiddleware = layer.route.stack[0].handle;

      let calledNext = false;
      await (stepUpMiddleware as any)(req, res, () => { calledNext = true; });

      expect(res.getStatusCode()).toBe(403);
      expect(calledNext).toBe(false);
    });

    it('executes rollback and enqueues cascade jobs 3-10 when VC presents valid step-up', async () => {
      mockReleaseSingle.mockResolvedValueOnce({
        data: {
          id: 'rel-1',
          tag: 'cis-scheme2022-r2',
          department_id: 'dept-cis',
          snapshot: { courses: ['CS-115'] },
        },
        error: null,
      });

      const vcSession: AdminSession = {
        adminId: 'vc-1',
        email: 'vc@nedut.edu.pk',
        role: 'vc',
        departmentId: null,
        allowedModules: [],
      };

      const { req, res } = createMockReqRes({
        adminUser: vcSession,
        method: 'POST',
        params: { id: 'rel-1' },
        headers: { 'x-admin-step-up-token': 'valid-step-up-token' },
        body: { reason: 'Emergency rollback due to prerequisite error' },
      });

      const layer: any = releasesJobsRouter.stack.find(
        (l: any) => l.route?.path === '/releases/:id/rollback' && l.route?.methods?.post
      );
      const routeHandler = layer.route.stack[1].handle;

      await (routeHandler as any)(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().rollbackRelease).toBeDefined();
      expect(res.getData().enqueuedJobsCount).toBe(8); // steps 3 through 10
    });
  });

  describe('3. Jobs Queue Monitoring & Retries', () => {
    it('lists jobs in the cascade queue with status filter', async () => {
      mockJobsSelect.mockResolvedValueOnce({
        data: [
          { id: 'j-1', release_id: 'rel-1', step: 'rebuild_graph', status: 'done' },
          { id: 'j-2', release_id: 'rel-1', step: 'recompute_scores', status: 'queued' },
        ],
        count: 2,
        error: null,
      });

      const { req, res } = createMockReqRes({
        query: { page: 1, pageSize: 25 },
      });

      const handler = getRouteHandler('/jobs', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().data).toHaveLength(2);
    });
  });
});
