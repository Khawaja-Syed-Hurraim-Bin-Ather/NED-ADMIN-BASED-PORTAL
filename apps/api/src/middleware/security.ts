/**
 * security.ts — F6 Security Hardening Middleware
 *
 * Provides:
 * 1. Per-route rate limiters (strict for auth, generous for read)
 * 2. Request sanitizer (strips null bytes, oversized fields)
 * 3. Security event logger (never logs secrets — Rule #11)
 * 4. CORS origin validator
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { apiError } from '@educompass/shared';

// ─── 1. Tiered Rate Limiters ─────────────────────────────────────────────────

/**
 * Auth routes: very strict — 10 attempts per 15 minutes per IP.
 * Prevents brute-force on login / signup.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please wait 15 minutes.',
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * LLM/Chat routes: aligned with SRS NFR-08 daily cap.
 * 30 requests per 15 min per IP — prevents prompt-spam.
 */
export const chatRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'AI request rate limit reached. Please try again shortly.',
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Mutating routes (POST/PUT/PATCH/DELETE): moderate throttle.
 * 60 requests per 15 min per IP.
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many write requests. Please slow down.',
    },
  },
  skip: (req) => req.method === 'GET' || process.env.NODE_ENV === 'test',
});

/**
 * Read routes: generous — 200 requests per 15 min per IP.
 */
export const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment.',
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// ─── 2. Request Sanitizer ────────────────────────────────────────────────────

/**
 * Recursively removes null bytes and truncates string fields to 10,000 chars.
 * Protects against null-byte injection and oversized payload DoS.
 * Rule #14: Scraped text is data, not instructions — sanitize before it touches handlers.
 */
function sanitizeValue(val: unknown, depth = 0): unknown {
  if (depth > 5) return val; // prevent infinite recursion on deeply nested objects
  if (typeof val === 'string') {
    return val
      .replace(/\0/g, '') // null bytes
      .replace(/[\u0000-\u001F\u007F]/g, (ch) =>
        ['\n', '\r', '\t'].includes(ch) ? ch : ''
      ) // control chars (keep newline/tab)
      .slice(0, 10_000); // hard length cap
  }
  if (Array.isArray(val)) {
    return val.slice(0, 100).map((v) => sanitizeValue(v, depth + 1));
  }
  if (val && typeof val === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (k.length > 100) continue; // skip suspiciously long keys
      sanitized[k] = sanitizeValue(v, depth + 1);
    }
    return sanitized;
  }
  return val;
}

export function requestSanitizer(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body) as Record<string, unknown>;
  }
  next();
}

// ─── 3. Security Event Logger ────────────────────────────────────────────────

/**
 * Logs security-relevant events without leaking secrets.
 * Rule #11: Never log secrets. We log only IP, method, path, status code pattern.
 */
export function securityLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const { method, path: reqPath, ip } = req;
    const status = res.statusCode;
    const ms = Date.now() - start;

    // Log only suspicious patterns (auth failures, rate limits, server errors)
    if (status === 401 || status === 403 || status === 429 || status >= 500) {
      console.warn(
        `[SECURITY] ${new Date().toISOString()} ${method} ${reqPath} -> ${status} (${ms}ms) IP:${ip ?? 'unknown'}`
      );
    }
  });

  next();
}

// ─── 4. CORS Origin Validator ────────────────────────────────────────────────

const ALLOWED_ORIGINS = (() => {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const extras = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.NEXT_PUBLIC_SITE_URL
      ? [process.env.NEXT_PUBLIC_SITE_URL]
      : []),
    ...extras,
  ]);
})();

export function corsOriginValidator(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
): void {
  if (!origin) {
    // Server-to-server or curl — allow in dev, block in prod
    if (process.env.NODE_ENV === 'production') {
      callback(new Error('CORS: No origin header in production requests'));
    } else {
      callback(null, true);
    }
    return;
  }

  if (ALLOWED_ORIGINS.has(origin)) {
    callback(null, true);
  } else {
    console.warn(`[CORS] Rejected origin: ${origin}`);
    callback(new Error(`CORS: Origin '${origin}' is not allowed`));
  }
}

// ─── 5. No-PII Response Guard ─────────────────────────────────────────────────

/**
 * Strips server-side internals from error responses before they reach clients.
 * Ensures stack traces and DB error details never leak (Rule #11).
 */
export function errorSanitizer(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const isDev = process.env.NODE_ENV !== 'production';

  console.error('[API Error]', err.message);

  res.status(status).json(
    apiError(
      status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST',
      isDev ? err.message : 'An unexpected error occurred',
      []
    )
  );
}
