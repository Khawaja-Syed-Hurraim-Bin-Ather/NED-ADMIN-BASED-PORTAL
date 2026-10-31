import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deletionsRouter, getCoolingOffDays } from './deletions';
import { AdminSession } from '../middleware/admin-auth';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLiveTableUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});
const mockDeletionScheduleInsert = vi.fn();
const mockDeletionScheduleSelect = vi.fn();
const mockDeletionScheduleUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});
const mockRpcPurge = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'deletion_schedule') {
        const queryBuilder: any = {
          eq: vi.fn().mockImplementation(() => queryBuilder),
          gte: vi.fn().mockImplementation(() => queryBuilder),
          order: vi.fn().mockReturnValue({
            range: mockDeletionScheduleSelect,
          }),
          single: mockDeletionScheduleSelect,
        };
        return {
          select: vi.fn().mockReturnValue(queryBuilder),
          insert: mockDeletionScheduleInsert,
          update: mockDeletionScheduleUpdate,
        };
      }
      if (table === 'audit_log') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      // Any live table being soft-deleted or restored
      return {
        update: mockLiveTableUpdate,
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'rec-1', name: 'Dr. John' }, error: null }),
          }),
        }),
      };
    }),
    rpc: vi.fn((name: string, args: any) => mockRpcPurge(name, args)),
  },
}));

vi.mock('../middleware/admin-auth', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    requireAdminAuth: (req: any, _res: any, next: () => void) => {
      if (!req.adminUser) {
        req.adminUser = {
          adminId: 'chair-cis',
          email: 'chairman.cis@nedut.edu.pk',
          role: 'chairman',
          departmentId: 'dept-cis',
          allowedModules: [],
        } as AdminSession;
      }
      next();
    },
    requireStepUp: (req: any, res: any, next: () => void) => {
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
    adminId: 'chair-cis',
    email: 'chairman.cis@nedut.edu.pk',
    role: 'chairman',
    departmentId: 'dept-cis',
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
  const layer = deletionsRouter.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer || !layer.route) return undefined;
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1]?.handle;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Deletion Lifecycle & Cooling-Off (Card A10, Section 5, Section 14 Test 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Cooling-Off Duration Logic (Section 5)', () => {
    it('applies 7 days for career and chatbot content', () => {
      expect(getCoolingOffDays('career')).toBe(7);
      expect(getCoolingOffDays('chatbot_content')).toBe(7);
    });

    it('applies 14 days for fyp and professors', () => {
      expect(getCoolingOffDays('fyp')).toBe(14);
      expect(getCoolingOffDays('professors')).toBe(14);
    });

    it('applies 30 days for curriculum and 90 days for curriculum versions', () => {
      expect(getCoolingOffDays('curriculum')).toBe(30);
      expect(getCoolingOffDays('curriculum_version')).toBe(90);
    });
  });

  describe('2. Soft Deletion Scheduling', () => {
    it('schedules a soft deletion and immediately hides the item by setting deleted_at', async () => {
      mockDeletionScheduleInsert.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          single: vi.fn().mockResolvedValueOnce({
            data: {
              id: 'del-1',
              table_name: 'professors',
              record_id: '123e4567-e89b-12d3-a456-426614174000',
              state: 'cooling_off',
              cooling_off_days: 14,
            },
            error: null,
          }),
        }),
      });

      const { req, res } = createMockReqRes({
        method: 'POST',
        body: {
          tableName: 'professors',
          recordId: '123e4567-e89b-12d3-a456-426614174000',
          resource: 'professors',
          reason: 'Faculty member retired from university',
        },
      });

      const handler = getRouteHandler('/', 'post');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(201);
      expect(res.getData().deletion).toBeDefined();

      // Golden Rule: soft delete hides the item from students immediately
      expect(mockLiveTableUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      );
    });
  });

  describe('3. Restoration Before Purge', () => {
    it('restores a soft-deleted item by clearing deleted_at and marking state as restored', async () => {
      mockDeletionScheduleSelect.mockResolvedValueOnce({
        data: {
          id: 'del-1',
          table_name: 'professors',
          record_id: '123e4567-e89b-12d3-a456-426614174000',
          state: 'cooling_off',
          department_id: 'dept-cis',
        },
        error: null,
      });

      const { req, res } = createMockReqRes({
        method: 'POST',
        params: { id: 'del-1' },
      });

      const handler = getRouteHandler('/:id/restore', 'post');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().restored).toBe(true);

      // Verifies deleted_at was set back to null
      expect(mockLiveTableUpdate).toHaveBeenCalledWith({ deleted_at: null });
      expect(mockDeletionScheduleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'restored' })
      );
    });
  });

  describe('4. Final Purge Constraints (VC only, step-up, cooling-off elapsed, daily cap)', () => {
    it('rejects purge if cooling-off period has not elapsed', async () => {
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days left

      mockDeletionScheduleSelect.mockResolvedValueOnce({
        data: {
          id: 'del-1',
          table_name: 'professors',
          record_id: '123e4567-e89b-12d3-a456-426614174000',
          state: 'cooling_off',
          cooling_off_until: futureDate,
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
        params: { id: 'del-1' },
        headers: { 'x-admin-step-up-token': 'valid-step-up-token' },
      });

      const layer: any = deletionsRouter.stack.find(
        (l: any) => l.route?.path === '/:id/purge' && l.route?.methods?.post
      );
      const routeHandler = layer.route.stack[1].handle;

      await (routeHandler as any)(req, res);

      expect(res.getStatusCode()).toBe(400);
      expect(res.getData().error.code).toBe('COOLING_OFF_NOT_ELAPSED');
    });

    it('rejects purge if attempted by non-VC role', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // already elapsed

      mockDeletionScheduleSelect.mockResolvedValueOnce({
        data: {
          id: 'del-1',
          table_name: 'professors',
          record_id: '123e4567-e89b-12d3-a456-426614174000',
          state: 'cooling_off',
          cooling_off_until: pastDate,
        },
        error: null,
      });

      const chairmanSession: AdminSession = {
        adminId: 'chair-1',
        email: 'chairman.cis@nedut.edu.pk',
        role: 'chairman',
        departmentId: 'dept-cis',
        allowedModules: [],
      };

      const { req, res } = createMockReqRes({
        adminUser: chairmanSession,
        method: 'POST',
        params: { id: 'del-1' },
        headers: { 'x-admin-step-up-token': 'valid-step-up-token' },
      });

      const layer: any = deletionsRouter.stack.find(
        (l: any) => l.route?.path === '/:id/purge' && l.route?.methods?.post
      );
      const routeHandler = layer.route.stack[1].handle;

      await (routeHandler as any)(req, res);

      expect(res.getStatusCode()).toBe(403);
      expect(res.getData().error.code).toBe('FORBIDDEN');
    });

    it('executes purge when cooling-off has elapsed and caller is VC with step-up', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      mockDeletionScheduleSelect.mockResolvedValueOnce({
        data: {
          id: 'del-1',
          table_name: 'professors',
          record_id: '123e4567-e89b-12d3-a456-426614174000',
          state: 'cooling_off',
          cooling_off_until: pastDate,
          department_id: 'dept-cis',
          resource: 'professors',
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
        params: { id: 'del-1' },
        headers: { 'x-admin-step-up-token': 'valid-step-up-token' },
      });

      const layer: any = deletionsRouter.stack.find(
        (l: any) => l.route?.path === '/:id/purge' && l.route?.methods?.post
      );
      const routeHandler = layer.route.stack[1].handle;

      await (routeHandler as any)(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().purged).toBe(true);
      expect(mockDeletionScheduleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'purged' })
      );
    });
  });
});
