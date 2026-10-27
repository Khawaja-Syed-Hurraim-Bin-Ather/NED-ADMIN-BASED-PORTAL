import { Request, Response, NextFunction } from 'express';
import { apiError, UserRole } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts Bearer token, validates with Supabase Auth,
 * and fetches the role from public.profiles.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(
      apiError('UNAUTHORIZED', 'Authentication token missing or invalid')
    );
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      res.status(401).json(
        apiError('UNAUTHORIZED', 'Invalid or expired authentication session')
      );
      return;
    }

    const userId = authData.user.id;
    const email = authData.user.email ?? '';

    // Fetch profile role from public.profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      res.status(500).json(
        apiError('INTERNAL_ERROR', 'Failed to retrieve user profile data')
      );
      return;
    }

    const role: UserRole = profile?.role ?? 'enrolled';

    req.user = {
      id: userId,
      email,
      role,
    };

    next();
  } catch (err: unknown) {
    res.status(500).json(
      apiError(
        'INTERNAL_ERROR',
        err instanceof Error ? err.message : 'Authentication verification error'
      )
    );
  }
}

/**
 * Higher-order middleware enforcing role access: requireRole('enrolled' | 'admin')
 * Per AGENTS.md rule: requireRole('enrolled' | 'admin') helper on every protected route.
 */
export function requireRole(...allowedRoles: Array<'enrolled' | 'admin'>) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Ensure authenticated first
    if (!req.user) {
      await authenticate(req, res, () => {
        if (!req.user) return;
        verifyRole();
      });
    } else {
      verifyRole();
    }

    function verifyRole() {
      if (!req.user) return;

      // Admin has full access to enrolled routes as well
      const hasPermission =
        allowedRoles.includes(req.user.role as 'enrolled' | 'admin') ||
        req.user.role === 'admin';

      if (!hasPermission) {
        res.status(403).json(
          apiError(
            'FORBIDDEN',
            `Access denied. Requires one of the following roles: [${allowedRoles.join(
              ', '
            )}]`
          )
        );
        return;
      }

      next();
    }
  };
}
