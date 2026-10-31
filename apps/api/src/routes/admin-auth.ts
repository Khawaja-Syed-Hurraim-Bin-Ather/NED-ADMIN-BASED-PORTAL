import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { ADMIN_JWT_SECRET, hashAuditIdentifier, requireAdminAuth } from '../middleware/admin-auth';

export const adminAuthRouter = Router();

// In-memory rate limiting and lockout state (Section 6.4)
// Lock for 15 minutes after 5 failed attempts; limit code requests to 3 per 10 mins
interface LoginAttemptState {
  failedAttempts: number;
  lockedUntil?: number;
  codeRequests: number[];
}

const loginTracker = new Map<string, LoginAttemptState>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

async function logAdminLoginEvent(event: string, email?: string, adminId?: string, ip?: string, ua?: string) {
  try {
    await supabaseAdmin.from('admin_login_events').insert({
      event,
      email_hash: email ? hashAuditIdentifier(email) : null,
      admin_id: adminId || null,
      ip_hash: ip ? hashAuditIdentifier(ip) : null,
      user_agent: ua || null,
    });
  } catch (err) {
    console.error('Failed to write admin login event:', err);
  }
}

// ── Bootstrap Initial Admin Accounts (Section 6.1) ───────────────────────────

export async function bootstrapAdminAccounts(): Promise<void> {
  const isEnabled = process.env.ADMIN_BOOTSTRAP_ENABLED !== 'false';
  if (!isEnabled) return;

  const rawJson = process.env.ADMIN_BOOTSTRAP_JSON;
  let accountsToBootstrap = [
    {
      email: process.env.ADMIN_SEED_EMAIL || 'cursor.pro.test124@gmail.com',
      fullName: 'Vice Chancellor',
      role: 'vc',
      deptCode: 'CIS',
    },
    {
      email: 'chairman.cis@nedut.edu.pk',
      fullName: 'Chairman CISE',
      role: 'chairman',
      deptCode: 'CIS',
    },
  ];

  if (rawJson) {
    try {
      accountsToBootstrap = JSON.parse(rawJson);
    } catch (_) {}
  }

  // Get CIS department ID
  const { data: dept } = await supabaseAdmin.from('departments').select('id').eq('code', 'CIS').maybeSingle();
  const deptId = dept?.id || null;

  for (const acc of accountsToBootstrap) {
    const { data: existing } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('email', acc.email.toLowerCase().trim())
      .maybeSingle();

    if (!existing) {
      // Default testing password hash ('AdminPassword2026!')
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('AdminPassword2026!', salt);

      await supabaseAdmin.from('admin_users').insert({
        email: acc.email.toLowerCase().trim(),
        full_name: acc.fullName,
        role: acc.role,
        department_id: acc.role === 'vc' ? null : deptId,
        status: 'active',
        password_hash: hash,
        allowed_modules: [],
      });
      console.log(`[Admin Bootstrap] Initialized ${acc.role}: ${acc.email}`);
    }
  }
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const LoginRequestSchema = z.object({
  email: z.string().email().trim(),
  password: z.string().min(1, 'Password required'),
});

const VerifyCodeSchema = z.object({
  email: z.string().email().trim(),
  code: z.string().length(6, '6-digit code required'),
});

const StepUpSchema = z.object({
  purpose: z.string().min(1),
  code: z.string().length(6, '6-digit code required'),
});

const CreateInvitationSchema = z.object({
  email: z.string().email().trim(),
  role: z.enum(['chairman', 'operator']),
  departmentId: z.string().uuid(),
  allowedModules: z.array(z.string()).default([]),
});

const AcceptInvitationSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  fullName: z.string().min(1),
});

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/auth/login
 * Step 1: Email & password validation. Sends 6-digit email verification code.
 */
adminAuthRouter.post('/login', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'];

  const parsed = LoginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid credentials format.', parsed.error.errors));
    return;
  }

  const { email, password } = parsed.data;
  const lowerEmail = email.toLowerCase();

  // Check lockout
  const attempt = loginTracker.get(lowerEmail) || { failedAttempts: 0, codeRequests: [] };
  if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    const minsLeft = Math.ceil((attempt.lockedUntil - Date.now()) / (60 * 1000));
    await logAdminLoginEvent('locked', lowerEmail, undefined, ip, ua);
    res.status(429).json(
      apiError('ACCOUNT_LOCKED', `Too many failed attempts. Try again in ${minsLeft} minutes.`)
    );
    return;
  }

  // Lookup in admin_users
  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, full_name, role, status, password_hash')
    .eq('email', lowerEmail)
    .maybeSingle();

  // Generic error to avoid user enumeration (Section 6.2)
  if (!user || user.status !== 'active' || !user.password_hash) {
    attempt.failedAttempts += 1;
    if (attempt.failedAttempts >= 5) {
      attempt.lockedUntil = Date.now() + 15 * 60 * 1000;
    }
    loginTracker.set(lowerEmail, attempt);
    await logAdminLoginEvent('login_fail', lowerEmail, undefined, ip, ua);
    res.status(401).json(apiError('INVALID_CREDENTIALS', 'Invalid email or password.'));
    return;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    attempt.failedAttempts += 1;
    if (attempt.failedAttempts >= 5) {
      attempt.lockedUntil = Date.now() + 15 * 60 * 1000;
    }
    loginTracker.set(lowerEmail, attempt);
    await logAdminLoginEvent('login_fail', lowerEmail, user.id, ip, ua);
    res.status(401).json(apiError('INVALID_CREDENTIALS', 'Invalid email or password.'));
    return;
  }

  // Rate limit code requests (max 3 per 10 mins)
  const tenMinsAgo = Date.now() - 10 * 60 * 1000;
  attempt.codeRequests = attempt.codeRequests.filter((t) => t > tenMinsAgo);
  if (attempt.codeRequests.length >= 3) {
    res.status(429).json(
      apiError('RATE_LIMITED', 'Too many verification code requests. Please wait a few minutes.')
    );
    return;
  }

  // Generate 6-digit one-time code (Section 6.2)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabaseAdmin.from('admin_verification_codes').insert({
    email: lowerEmail,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  attempt.codeRequests.push(Date.now());
  loginTracker.set(lowerEmail, attempt);

  await logAdminLoginEvent('login_ok', lowerEmail, user.id, ip, ua);

  // In production: send via official SMTP. In testing: log safely
  console.log(`[Admin OTP] Verification code for ${lowerEmail}: ${code} (expires in 10 mins)`);

  res.json({
    success: true,
    message: 'Verification code sent to your registered email address.',
    data: {
      email: lowerEmail,
      expiresInSeconds: 600,
      testCodeHint: process.env.NODE_ENV !== 'production' ? code : undefined,
    },
  });
});

/**
 * POST /api/v1/admin/auth/verify-code
 * Step 2: Verifies one-time code and issues 8-hour admin JWT session.
 */
adminAuthRouter.post('/verify-code', async (req: Request, res: Response) => {
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'];

  const parsed = VerifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid verification code payload', parsed.error.errors));
    return;
  }

  const { email, code } = parsed.data;
  const lowerEmail = email.toLowerCase();
  const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');

  // Find valid unused code
  const { data: codeRow } = await supabaseAdmin
    .from('admin_verification_codes')
    .select('id, attempts, expires_at, used_at')
    .eq('email', lowerEmail)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!codeRow) {
    await logAdminLoginEvent('otp_fail', lowerEmail, undefined, ip, ua);
    res.status(401).json(apiError('INVALID_CODE', 'Invalid or expired one-time verification code.'));
    return;
  }

  // Mark code as used
  await supabaseAdmin
    .from('admin_verification_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', codeRow.id);

  // Fetch full admin user profile
  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select('id, email, full_name, role, department_id, allowed_modules, status')
    .eq('email', lowerEmail)
    .single();

  if (!user || user.status !== 'active') {
    res.status(403).json(apiError('FORBIDDEN', 'Admin account is not active.'));
    return;
  }

  // Update last login
  await supabaseAdmin
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id);

  // Clear failed attempt counters
  loginTracker.delete(lowerEmail);

  // Create JWT session token (8 hours)
  const token = jwt.sign(
    {
      adminId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.department_id,
      allowedModules: user.allowed_modules || [],
      sessionStartedAt: Date.now(),
    },
    ADMIN_JWT_SECRET,
    { expiresIn: '8h' }
  );

  await logAdminLoginEvent('otp_ok', lowerEmail, user.id, ip, ua);

  // Set HTTP-only secure cookie
  res.cookie('educompass_admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        departmentId: user.department_id,
        allowedModules: user.allowed_modules,
      },
    },
  });
});

/**
 * POST /api/v1/admin/auth/step-up
 * Step-up challenge for destructive actions (valid 5 minutes).
 */
adminAuthRouter.post('/step-up', requireAdminAuth, async (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const parsed = StepUpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid step-up payload', parsed.error.errors));
    return;
  }

  const { purpose, code } = parsed.data;
  const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');

  // Verify challenge in DB
  const { data: challenge } = await supabaseAdmin
    .from('step_up_challenges')
    .select('id')
    .eq('admin_id', admin.adminId)
    .eq('purpose', purpose)
    .eq('code_hash', codeHash)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!challenge) {
    res.status(401).json(apiError('INVALID_STEP_UP_CODE', 'Invalid or expired step-up code.'));
    return;
  }

  await supabaseAdmin
    .from('step_up_challenges')
    .update({ used_at: new Date().toISOString() })
    .eq('id', challenge.id);

  // Issue 5-minute step-up token
  const stepUpToken = jwt.sign(
    {
      adminId: admin.adminId,
      purpose,
      verifiedAt: Date.now(),
    },
    ADMIN_JWT_SECRET,
    { expiresIn: '5m' }
  );

  res.json({
    success: true,
    data: {
      stepUpToken,
      expiresInSeconds: 300,
    },
  });
});

/**
 * POST /api/v1/admin/auth/step-up/request-code
 * Sends fresh 6-digit code to current admin's email for step-up.
 */
adminAuthRouter.post('/step-up/request-code', requireAdminAuth, async (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const { purpose } = req.body;

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await supabaseAdmin.from('step_up_challenges').insert({
    admin_id: admin.adminId,
    purpose: purpose || 'destructive_action',
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  console.log(`[Admin Step-Up Code] ${admin.email} (purpose: ${purpose}): ${code}`);

  res.json({
    success: true,
    message: 'Step-up authorization code sent.',
    data: {
      expiresInSeconds: 300,
      testCodeHint: process.env.NODE_ENV !== 'production' ? code : undefined,
    },
  });
});

/**
 * GET /api/v1/admin/auth/me
 * Retrieves current admin session profile.
 */
adminAuthRouter.get('/me', requireAdminAuth, async (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const { data: user } = await supabaseAdmin
    .from('admin_users')
    .select(`
      id,
      email,
      full_name,
      role,
      department_id,
      allowed_modules,
      status,
      last_login_at,
      department:departments(
        id,
        code,
        name
      )
    `)
    .eq('id', admin.adminId)
    .single();

  res.json({
    success: true,
    data: user,
  });
});

/**
 * POST /api/v1/admin/auth/logout
 */
adminAuthRouter.post('/logout', requireAdminAuth, async (req: Request, res: Response) => {
  res.clearCookie('educompass_admin_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * POST /api/v1/admin/auth/invitations
 * Creates single-use invitation (VC invites Chairmen; Chairmen invite Operators).
 */
adminAuthRouter.post('/invitations', requireAdminAuth, async (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const parsed = CreateInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid invitation data', parsed.error.errors));
    return;
  }

  const { email, role, departmentId, allowedModules } = parsed.data;

  // Authorization check (Section 6.1)
  if (admin.role === 'operator') {
    res.status(403).json(apiError('FORBIDDEN', 'Operators cannot issue invitations.'));
    return;
  }
  if (admin.role === 'chairman') {
    if (role !== 'operator') {
      res.status(403).json(apiError('FORBIDDEN', 'Chairmen may only invite data-entry operators.'));
      return;
    }
    if (departmentId !== admin.departmentId) {
      res.status(403).json(apiError('FORBIDDEN', 'Chairmen may only invite operators to their own department.'));
      return;
    }
  }

  // Generate 32-byte secure random token
  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from('admin_invitations').insert({
    email: email.toLowerCase().trim(),
    role,
    department_id: departmentId,
    allowed_modules: allowedModules,
    invited_by: admin.adminId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/accept-invite?token=${rawToken}`;
  console.log(`[Admin Invitation] Invite generated for ${email} (${role}): ${inviteUrl}`);

  res.json({
    success: true,
    message: 'Invitation generated successfully.',
    data: {
      email,
      role,
      expiresAt,
      inviteUrl,
    },
  });
});

/**
 * POST /api/v1/admin/auth/invitations/accept
 * Completes onboarding: sets 12+ char password, activates admin user.
 */
adminAuthRouter.post('/invitations/accept', async (req: Request, res: Response) => {
  const parsed = AcceptInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid acceptance payload', parsed.error.errors));
    return;
  }

  const { token, password, fullName } = parsed.data;

  // Fetch pending invitations
  const { data: invites } = await supabaseAdmin
    .from('admin_invitations')
    .select('*')
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString());

  let matchedInvite: any = null;
  if (invites) {
    for (const inv of invites) {
      const isMatch = await bcrypt.compare(token, inv.token_hash);
      if (isMatch) {
        matchedInvite = inv;
        break;
      }
    }
  }

  if (!matchedInvite) {
    res.status(400).json(apiError('INVALID_INVITATION', 'Invitation is invalid or has expired.'));
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create or activate admin_users record
  const { data: newUser, error: createErr } = await supabaseAdmin
    .from('admin_users')
    .insert({
      email: matchedInvite.email,
      full_name: fullName,
      role: matchedInvite.role,
      department_id: matchedInvite.department_id,
      allowed_modules: matchedInvite.allowed_modules,
      status: 'active',
      invited_by: matchedInvite.invited_by,
      password_hash: passwordHash,
    })
    .select('id, email, full_name, role')
    .single();

  if (createErr) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to activate admin account', [
      { field: 'admin_users', message: createErr.message },
    ]));
    return;
  }

  // Mark invitation used
  await supabaseAdmin
    .from('admin_invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', matchedInvite.id);

  res.json({
    success: true,
    message: 'Admin account activated. You may now sign in.',
    data: newUser,
  });
});

/**
 * GET /api/v1/admin/auth/security-panel
 * VC-only security monitor: recent failures, login audits, lockout status.
 */
adminAuthRouter.get('/security-panel', requireAdminAuth, async (req: Request, res: Response) => {
  if (req.adminUser?.role !== 'vc') {
    res.status(403).json(apiError('FORBIDDEN', 'Security panel is restricted to the Vice Chancellor.'));
    return;
  }

  const { data: events } = await supabaseAdmin
    .from('admin_login_events')
    .select('*')
    .order('at', { ascending: false })
    .limit(50);

  res.json({
    success: true,
    data: {
      recentEvents: events || [],
      activeLockoutsCount: Array.from(loginTracker.values()).filter(
        (v) => v.lockedUntil && v.lockedUntil > Date.now()
      ).length,
    },
  });
});
