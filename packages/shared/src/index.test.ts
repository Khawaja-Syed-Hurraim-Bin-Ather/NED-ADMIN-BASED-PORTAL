import { describe, it, expect } from 'vitest';
import { apiError, ErrorSchema, PaginationSchema, paginate, UserRoleSchema } from './index';

describe('Shared API Schemas & Helpers', () => {
  it('formats an apiError correctly matching ErrorSchema', () => {
    const err = apiError('UNAUTHORIZED', 'Access denied', [{ field: 'role' }]);
    expect(err).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access denied',
        details: [{ field: 'role' }],
      },
    });
    expect(ErrorSchema.safeParse(err).success).toBe(true);
  });

  it('paginates collections correctly', () => {
    const items = [1, 2, 3];
    const res = paginate(items, 10, 1, 3);
    expect(res).toEqual({
      data: items,
      total: 10,
      page: 1,
      pageSize: 3,
      totalPages: 4,
    });
  });

  it('validates user roles strictly', () => {
    expect(UserRoleSchema.safeParse('public').success).toBe(true);
    expect(UserRoleSchema.safeParse('enrolled').success).toBe(true);
    expect(UserRoleSchema.safeParse('admin').success).toBe(true);
    expect(UserRoleSchema.safeParse('superadmin').success).toBe(false);
  });
});
