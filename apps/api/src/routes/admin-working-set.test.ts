import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Router, Request, Response } from 'express';
import { adminContentRouter } from './admin-content';
import { supabaseAdmin } from '../lib/supabase';

// Helper to simulate router execution in tests
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

function mockReq(user: any, body: any = {}, params: any = {}, query: any = {}): Partial<Request> {
  return {
    adminUser: user,
    body,
    params,
    query,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('Edit Mode Working Set & saveDraftItem API (Card E1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Blocks operator from directly editing curriculum in working set (FA, FC)', async () => {
    const handler = getRouteHandler(adminContentRouter, '/working-set/item', 'post');
    const req = mockReq(
      { adminId: 'op-1', email: 'op@nedut.edu.pk', role: 'operator', allowedModules: ['fyp'] },
      {
        resource: 'curriculum',
        tableName: 'curriculum_courses',
        recordId: '11111111-1111-1111-1111-111111111111',
        patch: { title: 'Hacked Course' },
      }
    );
    const res = mockRes();

    await handler(req as Request, res as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    const json = res.json.mock.calls[0][0];
    expect(json.error.code).toBe('FORBIDDEN');
    expect(json.error.message).toContain('Operators may not edit curriculum directly');
  });

  it('2. Blocks operator from editing a module they are not assigned to (FA, FE)', async () => {
    const handler = getRouteHandler(adminContentRouter, '/working-set/item', 'post');
    const req = mockReq(
      { adminId: 'op-1', email: 'op@nedut.edu.pk', role: 'operator', allowedModules: ['fyp'] },
      {
        resource: 'professors',
        tableName: 'professors',
        recordId: '22222222-2222-2222-2222-222222222222',
        patch: { name: 'Dr. Unassigned' },
      }
    );
    const res = mockRes();

    await handler(req as Request, res as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    const json = res.json.mock.calls[0][0];
    expect(json.error.code).toBe('FORBIDDEN');
    expect(json.error.message).toContain('not entitled to edit module');
  });

  it('3. Successfully stages a draft patch in the working change set without writing live tables (FE-05)', async () => {
    const handler = getRouteHandler(adminContentRouter, '/working-set/item', 'post');

    // Mock supabaseAdmin responses
    vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
      if (table === 'change_sets') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: 'cs-work-1', title: 'Active Draft', impact: 'minor' },
                    }),
                  }),
                }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'change_items') {
        return {
          select: () => ({
            eq: () => ({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [] }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'item-1',
                  change_set_id: 'cs-work-1',
                  table_name: 'professors',
                  record_id: 'prof-1',
                  op: 'update',
                  after: { highlights: 'Updated research award' },
                },
              }),
            }),
          }),
        } as any;
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'prof-1', name: 'Dr. Tariq', highlights: 'Old' },
            }),
          }),
        }),
      } as any;
    });

    const req = mockReq(
      { adminId: 'cm-1', email: 'chairman@nedut.edu.pk', role: 'chairman', departmentId: 'dept-cis' },
      {
        resource: 'professors',
        tableName: 'professors',
        recordId: 'prof-1',
        op: 'update',
        patch: { highlights: 'Updated research award' },
      }
    );
    const res = mockRes();

    await handler(req as Request, res as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    const json = res.json.mock.calls[0][0];
    expect(json.success).toBe(true);
    expect(json.changeSetId).toBe('cs-work-1');
    expect(json.item.after.highlights).toBe('Updated research award');
  });

  it('4. Returns the caller active working set with pending items (FE-08)', async () => {
    const handler = getRouteHandler(adminContentRouter, '/working-set', 'get');

    vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
      if (table === 'change_sets') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { id: 'cs-work-1', resource: 'fyp', title: 'Draft FYP updates' },
                    }),
                  }),
                }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'change_items') {
        return {
          select: () => ({
            eq: () => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'i1', table_name: 'fyp_projects', op: 'update', after: { title: 'Autonomous Drone' } },
                  { id: 'i2', table_name: 'fyp_projects', op: 'insert', after: { title: 'Medical AI' } },
                ],
              }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const req = mockReq({ adminId: 'cm-1', role: 'chairman' });
    const res = mockRes();

    await handler(req as Request, res as Response, vi.fn());

    expect(res.json).toHaveBeenCalled();
    const json = res.json.mock.calls[0][0];
    expect(json.changeSet.id).toBe('cs-work-1');
    expect(json.pendingCount).toBe(2);
    expect(json.items[0].after.title).toBe('Autonomous Drone');
  });

  it('5. Successfully deletes a single item from the working set (FE-10)', async () => {
    const handler = getRouteHandler(adminContentRouter, '/working-set/items/:itemId', 'delete');

    vi.spyOn(supabaseAdmin, 'from').mockImplementation((table: string) => {
      if (table === 'change_items') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'item-1', change_set_id: 'cs-1' } }),
              head: false,
            }),
          }),
          delete: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        } as any;
      }
      if (table === 'change_sets') {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'cs-1', created_by: 'cm-1', status: 'draft' } }),
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const req = mockReq({ adminId: 'cm-1', role: 'chairman' }, {}, { itemId: 'item-1' });
    const res = mockRes();

    await handler(req as Request, res as Response, vi.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
