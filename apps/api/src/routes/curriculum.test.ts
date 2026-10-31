import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router, Request, Response } from 'express';
import { curriculumRouter } from './curriculum';

function getRouteHandler(router: Router, path: string, method: string) {
  const stack = (router as any).stack;
  for (const layer of stack) {
    if (layer.route && layer.route.path === path && layer.route.methods[method.toLowerCase()]) {
      const routeStack = layer.route.stack;
      return routeStack[routeStack.length - 1].handle;
    }
  }
  throw new Error(`Handler not found for ${method.toUpperCase()} ${path}`);
}

function mockReq(query: any = {}, params: any = {}): Partial<Request> {
  return {
    query,
    params,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'b-2022',
              admission_year: 2022,
              curriculum_version: {
                id: 'v-2018',
                name: 'BE CSE 2018 Onwards',
                revision: 'v1.0',
                status: 'published',
                max_credits_per_semester: 21,
                passing_grade: 'D',
              },
            },
            error: null,
          }),
        })),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
  },
}));

describe('Curriculum Public Router (Card E2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET / returns full curriculum course list with prerequisites', async () => {
    const handler = getRouteHandler(curriculumRouter, '/', 'get');
    const req = mockReq({ batch: '2022', program: 'CSE' });
    const res = mockRes();

    await handler(req as Request, res as Response, () => {});

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data.courses)).toBe(true);
    expect(responseData.data.courses.length).toBeGreaterThanOrEqual(30);

    const progCourse = responseData.data.courses.find((c: any) => c.code === 'CS-115');
    expect(progCourse).toBeDefined();
    expect(progCourse.title).toContain('Computer Programming');
    expect(progCourse.credits).toBe(4);

    const oopCourse = responseData.data.courses.find((c: any) => c.code === 'CS-116');
    expect(oopCourse).toBeDefined();
    expect(oopCourse.prereqs).toContain('CS-115');
  });

  it('resolves batch information from database or fallback', async () => {
    const handler = getRouteHandler(curriculumRouter, '/', 'get');
    const req = mockReq({ batch: '2022' });
    const res = mockRes();

    await handler(req as Request, res as Response, () => {});

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.data.version).toBeDefined();
    expect(responseData.data.version.batch).toBe(2022);
  });
});
