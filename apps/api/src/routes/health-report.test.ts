import { describe, it, expect, vi, beforeEach } from 'vitest';
import { healthReportRouter, calculateDataHealth } from './health-report';
import { AdminSession } from '../middleware/admin-auth';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSupabaseCount = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      const queryBuilder: any = {
        select: vi.fn().mockImplementation(() => queryBuilder),
        eq: vi.fn().mockImplementation(() => queryBuilder),
        is: vi.fn().mockImplementation(() => queryBuilder),
        or: vi.fn().mockImplementation(() => queryBuilder),
        then: (resolve: any) => resolve({ count: mockSupabaseCount(table) || 0, data: [], error: null }),
      };
      return queryBuilder;
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
          adminId: 'chair-cis',
          email: 'chairman.cis@nedut.edu.pk',
          role: 'chairman',
          departmentId: 'dept-cis',
          allowedModules: [],
        } as AdminSession;
      }
      next();
    },
  };
});

function createMockReqRes(options: {
  adminUser?: AdminSession;
  method?: string;
  url?: string;
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
  const layer = healthReportRouter.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer || !layer.route) return undefined;
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1]?.handle;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Data Health & Audit Report (Card A11, Section 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Health Metrics Calculation Logic', () => {
    it('reports healthy status when there are zero broken prereqs and minimal unreviewed items', () => {
      const report = calculateDataHealth({
        unreviewedFypCount: 2,
        coursesWithoutCredits: 0,
        coolingOffCount: 1,
        brokenPrereqCount: 0,
      });

      expect(report.overallStatus).toBe('healthy');
      expect(report.issues).toHaveLength(0);
    });

    it('flags warning status when broken prerequisites are detected', () => {
      const report = calculateDataHealth({
        unreviewedFypCount: 0,
        coursesWithoutCredits: 0,
        coolingOffCount: 0,
        brokenPrereqCount: 3,
      });

      expect(report.overallStatus).toBe('warning');
      expect(report.issues.some((i) => i.code === 'BROKEN_PREREQUISITES')).toBe(true);
    });
  });

  describe('2. Health Report Endpoint', () => {
    it('returns structured institutional data health metrics', async () => {
      mockSupabaseCount.mockImplementation((table: string) => {
        if (table === 'fyp_projects') return 12; // 12 unreviewed
        if (table === 'course_master') return 0;
        if (table === 'deletion_schedule') return 3;
        return 0;
      });

      const { req, res } = createMockReqRes({});
      const handler = getRouteHandler('/report', 'get');
      expect(handler).toBeDefined();

      await handler(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().metrics).toBeDefined();
      expect(res.getData().metrics.unreviewedFypCount).toBe(12);
      expect(res.getData().overallStatus).toBe('healthy');
    });
  });
});
