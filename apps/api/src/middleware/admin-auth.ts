import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { AdminRole, Resource, Action, checkPermission } from '../lib/admin-permissions';

export const ADMIN_JWT_SECRET = process.env.NEXTAUTH_SECRET || 'educompass-admin-secret-2026';

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: AdminRole;
  departmentId: string | null;
  allowedModules: string[];
  sessionStartedAt: number;
}

export interface AdminSession {
  adminId: string;
  email: string;
  role: AdminRole;
  departmentId: string | null;
  allowedModules: string[];
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminSession;
    }
  }
}

/**
 * Validates the admin session token from header or cookie.
 */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if ((req as any).cookies?.['educompass_admin_token']) {
    token = (req as any).cookies['educompass_admin_token'];
  }

  if (!token) {
    res.status(401).json(apiError('UNAUTHORIZED', 'Admin session token required.'));
    return;
  }

  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;

    // Check 8-hour absolute timeout (Section 6.4)
    const now = Date.now();
    if (now - payload.sessionStartedAt > 8 * 60 * 60 * 1000) {
      res.status(401).json(apiError('SESSION_EXPIRED', 'Session absolute timeout reached (8 hours). Please sign in again.'));
      return;
    }

    req.adminUser = {
      adminId: payload.adminId,
      email: payload.email,
      role: payload.role,
      departmentId: payload.departmentId,
      allowedModules: payload.allowedModules || [],
    };

    next();
  } catch (err) {
    res.status(401).json(apiError('UNAUTHORIZED', 'Invalid or expired admin session token.'));
  }
}

/**
 * Helper to enforce permission matrix dynamically.
 */
export function requireAdminPermission(resource: Resource, action: Action) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.adminUser) {
      res.status(401).json(apiError('UNAUTHORIZED', 'Admin authentication required.'));
      return;
    }

    const { role, departmentId, allowedModules } = req.adminUser;
    const targetDept = (req.query.departmentId || req.body?.departmentId) as string | undefined;

    const check = checkPermission(resource, action, {
      role,
      userDepartmentId: departmentId,
      targetDepartmentId: targetDept,
      allowedModules,
      impact: req.body?.impact || 'minor',
    });

    if (!check.allowed) {
      res.status(403).json(
        apiError('FORBIDDEN', check.reason || 'Permission denied by institutional governance matrix.', [
          { field: resource, message: `Role: ${role}, Action: ${action}, Decision: ${check.decision}` },
        ])
      );
      return;
    }

    next();
  };
}

/**
 * Step-Up verification check: ensures a fresh verification code was verified in last 5 minutes.
 */
export async function requireStepUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.adminUser) {
    res.status(401).json(apiError('UNAUTHORIZED', 'Admin session required.'));
    return;
  }

  const stepUpHeader = req.headers['x-admin-step-up-token'] as string;
  if (!stepUpHeader) {
    res.status(403).json(
      apiError('STEP_UP_REQUIRED', 'Step-up verification required. Please verify fresh one-time code to proceed.')
    );
    return;
  }

  try {
    const payload = jwt.verify(stepUpHeader, ADMIN_JWT_SECRET) as { adminId: string; purpose: string; verifiedAt: number };
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - payload.verifiedAt > fiveMinutes || payload.adminId !== req.adminUser.adminId) {
      res.status(403).json(
        apiError('STEP_UP_EXPIRED', 'Step-up verification token expired (valid 5 minutes).')
      );
      return;
    }
    next();
  } catch (_) {
    res.status(403).json(apiError('STEP_UP_INVALID', 'Invalid step-up verification token.'));
  }
}

/**
 * Helper to hash email/IP for secure audit logging (Section 6.4).
 */
export function hashAuditIdentifier(val: string): string {
  return crypto.createHash('sha256').update(val.toLowerCase().trim()).digest('hex');
}
