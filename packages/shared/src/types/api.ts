import { z } from 'zod';

// ── Standard API response shapes ─────────────────────────────────

export const ErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }),
});

export type ApiError = z.infer<typeof ErrorSchema>;

export function apiError(
  code: string,
  message: string,
  details?: unknown[]
): ApiError {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

// ── Pagination ───────────────────────────────────────────────────
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ── User roles ───────────────────────────────────────────────────
export const UserRoleSchema = z.enum(['public', 'enrolled', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;
