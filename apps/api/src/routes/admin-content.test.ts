import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminContentRouter, classifyImpact } from './admin-content';
import { AdminSession } from '../middleware/admin-auth';

// ── Supabase Mock Setup ───────────────────────────────────────────────────────

const mockChangeItemSingle = vi.fn().mockResolvedValue({
  data: { id: 'ci-1', change_set_id: 'cs-100', table_name: 'fyp_projects', record_id: 'fyp-1', op: 'update' },
  error: null,
});
const mockChangeItemInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: mockChangeItemSingle,
  }),
});

const mockChangeSetSingle = vi.fn().mockResolvedValue({
  data: { id: 'cs-100', status: 'draft', impact: 'minor', created_by: 'op-1', department_id: 'dept-cis' },
  error: null,
});
const mockLiveUpdate = vi.fn();
const mockLiveInsert = vi.fn();
const mockLiveDelete = vi.fn();

const mockLiveFypSingle = vi.fn().mockResolvedValue({
  data: {
    id: 'fyp-1',
    title: 'Autonomous Navigation Robot',
    abstract: 'Vision-based SLAM robot',
    year: 2024,
    supervisor: 'Dr. Maria',
    domain_tags: ['Robotics', 'AI'],
    tools: ['ROS', 'Python'],
    proposal_outcome: 'accepted',
    review_status: 'published',
  },
  error: null,
});

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'change_items') {
        return {
          insert: mockChangeItemInsert,
        };
      }
      if (table === 'change_sets') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockChangeSetSingle,
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockChangeSetSingle,
            }),
            single: mockChangeSetSingle,
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'fyp_projects') {
        const queryBuilder: any = {
          eq: vi.fn().mockImplementation((_col: string, _val: any) => ({
            ...queryBuilder,
            single: mockLiveFypSingle,
          })),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: [
              { id: 'fyp-1', title: 'Autonomous Navigation Robot', year: 2024, supervisor: 'Dr. Maria', review_status: 'extracted' }
            ],
            count: 1,
            error: null,
          }),
          single: mockLiveFypSingle,
        };
        return {
          select: vi.fn().mockReturnValue(queryBuilder),
          update: mockLiveUpdate,
          insert: mockLiveInsert,
          delete: mockLiveDelete,
        };
      }
      if (table === 'professors') {
        const queryBuilder: any = {
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({
            data: [
              { id: 'prof-1', name: 'Dr. Maria', designation: 'Associate Professor', department_id: 'dept-cis' }
            ],
            count: 1,
            error: null,
          }),
        };
        return {
          select: vi.fn().mockReturnValue(queryBuilder),
          update: mockLiveUpdate,
          insert: mockLiveInsert,
          delete: mockLiveDelete,
        };
      }
      const defaultBuilder: any = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      };
      return {
        select: vi.fn().mockReturnValue(defaultBuilder),
        update: mockLiveUpdate,
        insert: mockLiveInsert,
        delete: mockLiveDelete,
      };
    }),
  },
}));

// Mock admin auth middleware so we can control req.adminUser directly
vi.mock('../middleware/admin-auth', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    requireAdminAuth: (req: any, _res: any, next: () => void) => {
      // By default pass through; user is injected in tests
      if (!req.adminUser) {
        req.adminUser = {
          adminId: 'op-1',
          email: 'operator@nedut.edu.pk',
          role: 'operator',
          departmentId: 'dept-cis',
          allowedModules: ['fyp'],
        } as AdminSession;
      }
      next();
    },
  };
});

// ── Test Request/Response Helpers ─────────────────────────────────────────────

function createMockReqRes(options: {
  adminUser?: AdminSession;
  method?: string;
  url?: string;
  params?: Record<string, string>;
  query?: Record<string, any>;
  body?: Record<string, any>;
}) {
  const req: any = {
    method: options.method || 'GET',
    url: options.url || '/',
    params: options.params || {},
    query: options.query || {},
    body: options.body || {},
    adminUser: options.adminUser,
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
  const layer = adminContentRouter.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer || !layer.route) return undefined;
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1]?.handle;
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Admin Content Modules Router (Card A7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Operator Module Access Control (Section 3 & admin_permissions.json)', () => {
    it('allows operator to read a module included in allowed_modules', async () => {
      const operator: AdminSession = {
        adminId: 'op-1',
        email: 'operator@nedut.edu.pk',
        role: 'operator',
        departmentId: 'dept-cis',
        allowedModules: ['fyp'],
      };

      const { req, res } = createMockReqRes({
        adminUser: operator,
        params: { module: 'fyp' },
        query: { page: 1, pageSize: 25 },
      });

      const handler = getRouteHandler('/:module', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().data).toHaveLength(1);
      expect(res.getData().meta.module).toBe('fyp');
    });

    it('rejects operator attempting to access a module NOT in allowed_modules with 403', async () => {
      const operator: AdminSession = {
        adminId: 'op-1',
        email: 'operator@nedut.edu.pk',
        role: 'operator',
        departmentId: 'dept-cis',
        allowedModules: ['fyp'], // only fyp!
      };

      const { req, res } = createMockReqRes({
        adminUser: operator,
        params: { module: 'professors' },
        query: { page: 1, pageSize: 25 },
      });

      const handler = getRouteHandler('/:module', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(403);
      expect(res.getData().error.code).toBe('FORBIDDEN');
      expect(res.getData().error.message).toContain('allowed_modules');
    });

    it('allows Chairman to access any module within their own department', async () => {
      const chairman: AdminSession = {
        adminId: 'chair-cis',
        email: 'chairman.cis@nedut.edu.pk',
        role: 'chairman',
        departmentId: 'dept-cis',
        allowedModules: [],
      };

      const { req, res } = createMockReqRes({
        adminUser: chairman,
        params: { module: 'professors' },
        query: { page: 1, pageSize: 25 },
      });

      const handler = getRouteHandler('/:module', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);
      expect(res.getStatusCode()).toBe(200);
    });
  });

  describe('2. Live Table Immutability & Draft Generation (Golden Rule 1)', () => {
    it('creates a change_item and draft change_set without touching live table on draft update', async () => {
      const operator: AdminSession = {
        adminId: 'op-1',
        email: 'operator@nedut.edu.pk',
        role: 'operator',
        departmentId: 'dept-cis',
        allowedModules: ['fyp'],
      };

      const { req, res } = createMockReqRes({
        adminUser: operator,
        method: 'POST',
        params: { module: 'fyp' },
        body: {
          action: 'update',
          targetTable: 'fyp_projects',
          recordId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Update FYP Abstract',
          after: {
            title: 'Autonomous Navigation Robot v2',
            abstract: 'Updated SLAM algorithms for indoor quadrotors',
          },
        },
      });

      const handler = getRouteHandler('/:module/draft', 'post');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(201);
      expect(res.getData().changeItem).toBeDefined();

      // Golden Rule 1: live fyp_projects table was NEVER updated directly!
      expect(mockLiveUpdate).not.toHaveBeenCalled();
      expect(mockLiveInsert).not.toHaveBeenCalled();
      expect(mockLiveDelete).not.toHaveBeenCalled();

      // change_items table received the draft item
      expect(mockChangeItemInsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Pagination & Privacy Safeguards (Section 12)', () => {
    it('enforces maximum pagination limit of 100', async () => {
      const chairman: AdminSession = {
        adminId: 'chair-cis',
        email: 'chairman.cis@nedut.edu.pk',
        role: 'chairman',
        departmentId: 'dept-cis',
        allowedModules: [],
      };

      const { req, res } = createMockReqRes({
        adminUser: chairman,
        params: { module: 'fyp' },
        query: { page: 1, pageSize: 250 }, // exceeds 100!
      });

      const handler = getRouteHandler('/:module', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(400);
      expect(res.getData().error.code).toBe('VALIDATION_ERROR');
    });

    it('ensures zero student personal records or PII are exposed in content response', async () => {
      const chairman: AdminSession = {
        adminId: 'chair-cis',
        email: 'chairman.cis@nedut.edu.pk',
        role: 'chairman',
        departmentId: 'dept-cis',
        allowedModules: [],
      };

      const { req, res } = createMockReqRes({
        adminUser: chairman,
        params: { module: 'fyp' },
        query: { page: 1, pageSize: 25 },
      });

      const handler = getRouteHandler('/:module', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      const jsonStr = JSON.stringify(res.getData());
      // Verification: no student IDs, student emails, or grades
      expect(jsonStr).not.toMatch(/@student\.nedut\.edu\.pk/i);
      expect(jsonStr).not.toMatch(/student_id/i);
      expect(jsonStr).not.toMatch(/cgpa/i);
    });
  });

  describe('4. Impact Classification Logic (Section 2.3)', () => {
    it('classifies text updates as minor impact', () => {
      const impact = classifyImpact('update', 'fyp_projects', {
        abstract: 'New abstract description for the project',
      });
      expect(impact).toBe('minor');
    });

    it('classifies deletions as major impact', () => {
      const impact = classifyImpact('delete', 'fyp_projects', {});
      expect(impact).toBe('major');
    });
  });

  describe('5. Data Import Review Queue & Staging (Section 3 & Rule 2)', () => {
    it('allows operator with data_imports permission to query the unreviewed extraction queue', async () => {
      const operator: AdminSession = {
        adminId: 'op-1',
        email: 'operator@nedut.edu.pk',
        role: 'operator',
        departmentId: 'dept-cis',
        allowedModules: ['data_imports', 'imports'],
      };

      const { req, res } = createMockReqRes({
        adminUser: operator,
        query: { page: 1, pageSize: 25 },
      });

      const handler = getRouteHandler('/imports/queue', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(200);
      expect(res.getData().queue).toBeDefined();
    });

    it('stages an extracted record into a draft change item for Chairman review', async () => {
      const operator: AdminSession = {
        adminId: 'op-1',
        email: 'operator@nedut.edu.pk',
        role: 'operator',
        departmentId: 'dept-cis',
        allowedModules: ['data_imports', 'imports'],
      };

      const { req, res } = createMockReqRes({
        adminUser: operator,
        method: 'POST',
        params: { id: 'fyp-1' },
        body: {
          title: 'Autonomous Navigation Robot (Corrected Title)',
          domain_tags: ['Robotics', 'Autonomous Systems'],
          proposal_outcome: 'accepted',
          review_note: 'Verified supervisor and tags',
        },
      });

      const handler = getRouteHandler('/imports/:id/stage', 'post');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(201);
      expect(res.getData().changeItem).toBeDefined();
      expect(mockLiveUpdate).not.toHaveBeenCalled(); // Golden Rule 1: live row untouched
    });
  });
});
