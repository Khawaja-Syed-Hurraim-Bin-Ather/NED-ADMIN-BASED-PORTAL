import { describe, it, expect, vi } from 'vitest';
import { prereqRouter } from './prereq';

describe('Prerequisite API Router (Card H1, Rules #7, #8, #13, #15)', () => {
  it('registers all required prerequisite endpoints', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routes = prereqRouter.stack.map((layer: any) =>
      layer.route ? `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}` : ''
    ).filter(Boolean);

    expect(routes).toContain('GET /graph');
    expect(routes).toContain('POST /evaluate');
    expect(routes).toContain('POST /simulate-failure');
    expect(routes).toContain('GET /importance/:code');
    expect(routes).toContain('GET /critical-path');
  });

  it('GET /graph returns curriculum with verified acyclic DAG', async () => {
    let jsonBody: any = null;
    const mockReq: any = {};
    const mockRes: any = {
      json: (body: any) => {
        jsonBody = body;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler: any = prereqRouter.stack.find((l: any) => l.route?.path === '/graph')?.route?.stack?.[0]?.handle;
    await handler(mockReq, mockRes);

    expect(jsonBody.data.isValidDAG).toBe(true);
    expect(jsonBody.data.courses.length).toBeGreaterThan(30);
    expect(jsonBody.data.disclaimer).toBe('Guidance estimates, not official university decisions.');
  });

  it('POST /evaluate returns course eligibility based on completed prerequisites', async () => {
    let jsonBody: any = null;
    const mockReq: any = {
      body: {
        completedCourses: [
          { code: 'CS-115', grade: 'A', creditHours: 4 },
          { code: 'CS-116', grade: 'B', creditHours: 4 },
        ],
        currentSemester: 3,
      },
    };
    const mockRes: any = {
      status: vi.fn().mockReturnThis(),
      json: (body: any) => {
        jsonBody = body;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler: any = prereqRouter.stack.find((l: any) => l.route?.path === '/evaluate')?.route?.stack?.[0]?.handle;
    await handler(mockReq, mockRes);

    expect(jsonBody.data.evaluations).toBeDefined();

    // CS-218 requires CS-116 which is completed -> eligible
    const cs218 = jsonBody.data.evaluations.find((e: any) => e.code === 'CS-218');
    expect(cs218.isEligible).toBe(true);

    // CS-115 is already completed
    const cs115 = jsonBody.data.evaluations.find((e: any) => e.code === 'CS-115');
    expect(cs115.isCompleted).toBe(true);
  });

  it('POST /simulate-failure returns in-memory simulation cascade (Rule #8)', async () => {
    let jsonBody: any = null;
    const mockReq: any = {
      body: {
        failedCourseCodes: ['CS-115'],
        completedCourses: [],
        currentSemester: 1,
      },
    };
    const mockRes: any = {
      status: vi.fn().mockReturnThis(),
      json: (body: any) => {
        jsonBody = body;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler: any = prereqRouter.stack.find((l: any) => l.route?.path === '/simulate-failure')?.route?.stack?.[0]?.handle;
    await handler(mockReq, mockRes);

    expect(jsonBody.data.simulationResults).toHaveLength(1);
    const sim = jsonBody.data.simulationResults[0];

    expect(sim.simulationLabel).toBe('Simulation (in-memory estimate)');
    expect(sim.blockedDirectly).toContain('CS-116');
    expect(sim.blockedDownstreamCascade).toContain('CS-218');
    expect(sim.delayedCredits).toBeGreaterThan(0);
  });

  it('GET /importance/:code returns score with breakdown labeled as Estimate (Rule #7)', async () => {
    let jsonBody: any = null;
    const mockReq: any = {
      params: { code: 'CS-115' },
    };
    const mockRes: any = {
      status: vi.fn().mockReturnThis(),
      json: (body: any) => {
        jsonBody = body;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler: any = prereqRouter.stack.find((l: any) => l.route?.path === '/importance/:code')?.route?.stack?.[0]?.handle;
    await handler(mockReq, mockRes);

    expect(jsonBody.data.code).toBe('CS-115');
    expect(jsonBody.data.label).toBe('Estimate');
    expect(jsonBody.data.breakdown.directUnlocks).toBeDefined();
    expect(jsonBody.data.breakdown.downstreamReach).toBeDefined();
    expect(jsonBody.data.breakdown.creditWeight).toBeDefined();
    expect(jsonBody.data.breakdown.earlinessWeight).toBeDefined();
  });
});
