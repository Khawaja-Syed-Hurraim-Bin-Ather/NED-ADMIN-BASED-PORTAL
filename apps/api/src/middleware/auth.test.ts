import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole } from './auth';

// Mock supabaseAdmin
vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Auth Middleware — requireRole', () => {
  it('returns 401 UNAUTHORIZED when Authorization header is missing', async () => {
    const req = {
      headers: {},
    } as unknown as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    const middleware = requireRole('enrolled');
    await middleware(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing or invalid',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows access when user has enrolled role and role enrolled is required', async () => {
    const req = {
      headers: { authorization: 'Bearer dummy-token' },
      user: {
        id: 'user-123',
        email: 'student@university.edu.pk',
        role: 'enrolled',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = requireRole('enrolled');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 403 FORBIDDEN when user has enrolled role but admin role is required', async () => {
    const req = {
      headers: { authorization: 'Bearer dummy-token' },
      user: {
        id: 'user-123',
        email: 'student@university.edu.pk',
        role: 'enrolled',
      },
    } as unknown as Request;

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const res = {
      status: statusMock,
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    const middleware = requireRole('admin');
    await middleware(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Requires one of the following roles: [admin]',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows admin access even when route only specifies enrolled role', async () => {
    const req = {
      headers: { authorization: 'Bearer dummy-token' },
      user: {
        id: 'admin-123',
        email: 'admin@university.edu.pk',
        role: 'admin',
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = requireRole('enrolled');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
