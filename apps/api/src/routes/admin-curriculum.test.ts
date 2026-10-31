import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  adminCurriculumRouter,
  validateCurriculumDraft,
  CurriculumCourseInput,
  PrereqRuleInput,
} from './admin-curriculum';
import { AdminSession } from '../middleware/admin-auth';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockVersionSingle = vi.fn();
const mockVersionMaybeSingle = vi.fn().mockResolvedValue({ data: { revision: 1 }, error: null });
const mockVersionInsert = vi.fn();
const mockCoursesSelect = vi.fn();
const mockCoursesInsert = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'curriculum_versions') {
        const queryBuilder: any = {
          eq: vi.fn().mockImplementation(() => queryBuilder),
          order: vi.fn().mockImplementation(() => queryBuilder),
          limit: vi.fn().mockImplementation(() => queryBuilder),
          single: mockVersionSingle,
          maybeSingle: mockVersionMaybeSingle,
        };
        return {
          select: vi.fn().mockReturnValue(queryBuilder),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockVersionInsert,
            }),
          }),
        };
      }
      if (table === 'curriculum_courses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: mockCoursesSelect,
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'batches') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [{ id: 'b-2022', year: 2022, student_count: 140 }], error: null }),
            }),
          }),
        };
      }
      if (table === 'course_equivalences') {
        return {
          select: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ data: { id: 'eq-1' }, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
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
  const layer = adminCurriculumRouter.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer || !layer.route) return undefined;
  const handlers = layer.route.stack;
  return handlers[handlers.length - 1]?.handle;
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Curriculum Admin Module (Card A8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Role-Based Access Control (admin_permissions.json)', () => {
    it('blocks operators from accessing curriculum administration with 403', async () => {
      const operator: AdminSession = {
        adminId: 'op-1',
        email: 'operator@nedut.edu.pk',
        role: 'operator',
        departmentId: 'dept-cis',
        allowedModules: ['fyp', 'career'],
      };

      const { req, res } = createMockReqRes({
        adminUser: operator,
        params: { id: 'v-1' },
      });

      const handler = getRouteHandler('/versions/:id/impact', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(403);
      expect(res.getData().error.code).toBe('FORBIDDEN');
    });

    it('allows Chairman and VC to access curriculum management', async () => {
      const chairman: AdminSession = {
        adminId: 'chair-cis',
        email: 'chairman.cis@nedut.edu.pk',
        role: 'chairman',
        departmentId: 'dept-cis',
        allowedModules: [],
      };

      mockVersionSingle.mockResolvedValueOnce({
        data: {
          id: 'v-1',
          name: 'Scheme 2022',
          revision: 1,
          status: 'published',
          grade_scale: { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 },
          passing_grade: 'D',
          max_credits_per_semester: 21,
          department_id: 'dept-cis',
        },
        error: null,
      });

      mockCoursesSelect.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { req, res } = createMockReqRes({
        adminUser: chairman,
        params: { id: 'v-1' },
      });

      const handler = getRouteHandler('/versions/:id/impact', 'get');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(200);
    });
  });

  describe('2. Curriculum Validation Engine (Section 14 Test 5)', () => {
    it('catches circular prerequisite dependencies', () => {
      const courses: CurriculumCourseInput[] = [
        { courseId: 'c1', code: 'CS-101', semester: 1, credits: 3 },
        { courseId: 'c2', code: 'CS-102', semester: 2, credits: 3 },
      ];
      // Circular: CS-101 requires CS-102, and CS-102 requires CS-101
      const rules: PrereqRuleInput[] = [
        { courseId: 'c1', courseCode: 'CS-101', prereqCourseCode: 'CS-102' },
        { courseId: 'c2', courseCode: 'CS-102', prereqCourseCode: 'CS-101' },
      ];

      const result = validateCurriculumDraft({
        courses,
        rules,
        maxCreditsPerSemester: 21,
        gradeScale: { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 },
        passingGrade: 'D',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('catches backward prerequisites (prerequisite in later or same semester)', () => {
      const courses: CurriculumCourseInput[] = [
        { courseId: 'c1', code: 'CS-101', semester: 1, credits: 3 },
        { courseId: 'c2', code: 'CS-201', semester: 3, credits: 3 },
      ];
      // Backward: CS-101 (sem 1) requires CS-201 (sem 3)
      const rules: PrereqRuleInput[] = [
        { courseId: 'c1', courseCode: 'CS-101', prereqCourseCode: 'CS-201' },
      ];

      const result = validateCurriculumDraft({
        courses,
        rules,
        maxCreditsPerSemester: 21,
        gradeScale: { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 },
        passingGrade: 'D',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'BACKWARD_PREREQUISITE')).toBe(true);
    });

    it('catches semester credit overload exceeding maximum allowed limit', () => {
      const courses: CurriculumCourseInput[] = [
        { courseId: 'c1', code: 'CS-101', semester: 1, credits: 4 },
        { courseId: 'c2', code: 'CS-102', semester: 1, credits: 4 },
        { courseId: 'c3', code: 'CS-103', semester: 1, credits: 4 },
        { courseId: 'c4', code: 'CS-104', semester: 1, credits: 4 },
        { courseId: 'c5', code: 'CS-105', semester: 1, credits: 4 },
        { courseId: 'c6', code: 'CS-106', semester: 1, credits: 4 }, // 24 credits > 21
      ];

      const result = validateCurriculumDraft({
        courses,
        rules: [],
        maxCreditsPerSemester: 21,
        gradeScale: { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 },
        passingGrade: 'D',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CREDIT_LIMIT_EXCEEDED')).toBe(true);
    });

    it('validates clean, correctly ordered curriculum successfully', () => {
      const courses: CurriculumCourseInput[] = [
        { courseId: 'c1', code: 'CS-115', semester: 1, credits: 4 },
        { courseId: 'c2', code: 'CS-116', semester: 2, credits: 4 },
      ];
      const rules: PrereqRuleInput[] = [
        { courseId: 'c2', courseCode: 'CS-116', prereqCourseCode: 'CS-115' },
      ];

      const result = validateCurriculumDraft({
        courses,
        rules,
        maxCreditsPerSemester: 21,
        gradeScale: { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 },
        passingGrade: 'D',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('3. Scheme Cloning (Section 2.1)', () => {
    it('clones a published scheme into a new draft revision', async () => {
      const chairman: AdminSession = {
        adminId: 'chair-cis',
        email: 'chairman.cis@nedut.edu.pk',
        role: 'chairman',
        departmentId: 'dept-cis',
        allowedModules: [],
      };

      mockVersionSingle.mockResolvedValueOnce({
        data: {
          id: 'v-2022',
          program_id: 'prog-cse',
          name: 'Scheme 2022',
          revision: 1,
          grade_scale: { A: 4.0, D: 1.0, F: 0.0 },
          passing_grade: 'D',
          max_credits_per_semester: 21,
        },
        error: null,
      });

      mockCoursesSelect.mockResolvedValueOnce({
        data: [
          { course_id: 'c1', semester: 1, credits: 3, category: 'core_computing' },
        ],
        error: null,
      });

      mockVersionInsert.mockResolvedValueOnce({
        data: {
          id: 'v-2026',
          name: 'Scheme 2026',
          revision: 2,
          status: 'draft',
          based_on: 'v-2022',
        },
        error: null,
      });

      const { req, res } = createMockReqRes({
        adminUser: chairman,
        method: 'POST',
        params: { id: 'v-2022' },
        body: { name: 'Scheme 2026' },
      });

      const handler = getRouteHandler('/versions/:id/clone', 'post');
      expect(handler).toBeDefined();
      await handler(req, res);

      expect(res.getStatusCode()).toBe(201);
      expect(res.getData().newVersion.status).toBe('draft');
      expect(res.getData().newVersion.based_on).toBe('v-2022');
    });
  });
});
