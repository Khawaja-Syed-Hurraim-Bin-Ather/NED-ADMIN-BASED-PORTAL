import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env robustly
for (const envPath of [
  path.resolve(process.cwd(), 'apps/api/.env.local'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../../.env'),
]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

import cookieParser from 'cookie-parser';
import {
  authRateLimiter,
  chatRateLimiter,
  writeLimiter,
  readLimiter,
  requestSanitizer,
  securityLogger,
  corsOriginValidator,
  errorSanitizer,
} from './middleware/security';

const app = express();
const PORT = process.env.API_PORT || 4000;

// ── F6: Security middleware stack ────────────────────────────────────────
// 1. Helmet: sets many secure HTTP headers (X-DNS-Prefetch, X-XSS-Protection, etc.)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // CSP is set in Next.js next.config.js for the web app
  })
);

// 2. CORS: strict allow-list
app.use(
  cors({
    origin: corsOriginValidator,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // preflight cache 24h
  })
);

// 3. Request body size limit — 10kb prevents large payload DoS
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// 4. Request sanitizer — strip null bytes and control chars (Rule #14)
app.use(requestSanitizer);

// 5. Security event logger — no secrets ever logged (Rule #11)
app.use(securityLogger);

// ── Health check (not rate-limited) ─────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'educompass-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── Routers ──────────────────────────────────────────────────────────────
import { accountRouter } from './routes/account';
import { fypRouter } from './routes/fyp';
import { careersRouter } from './routes/careers';
import { adminRouter } from './routes/admin';
import { chatRouter } from './routes/chat';
import { prereqRouter } from './routes/prereq';
import { professorsRouter } from './routes/professors';
import { plannerRouter } from './routes/planner';
import { batchesRouter } from './routes/batches';
import { curriculumRouter } from './routes/curriculum';
import { adminAuthRouter, bootstrapAdminAccounts } from './routes/admin-auth';
import { workflowRouter } from './routes/workflow';
import { adminContentRouter } from './routes/admin-content';
import { adminCurriculumRouter } from './routes/admin-curriculum';
import { releasesJobsRouter } from './routes/releases-jobs';
import { deletionsRouter } from './routes/deletions';

// ── API v1 health (read limiter) ─────────────────────────────────────────
app.get('/api/v1/health', readLimiter, (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Auth routes — strictest rate limit
app.use('/api/v1/account', authRateLimiter, accountRouter);

// LLM/AI routes — chat-specific limiter
app.use('/api/v1/chat', chatRateLimiter, chatRouter);

// Admin — write limiter (protected by requireRole('admin') inside router)
app.use('/api/v1/admin/auth', authRateLimiter, adminAuthRouter);
app.use('/api/v1/admin/content', writeLimiter, adminContentRouter);
app.use('/api/v1/admin/curriculum', writeLimiter, adminCurriculumRouter);
app.use('/api/v1/admin/deletions', writeLimiter, deletionsRouter);
app.use('/api/v1/admin', writeLimiter, releasesJobsRouter);
app.use('/api/v1/admin', writeLimiter, workflowRouter);
app.use('/api/v1/admin', writeLimiter, adminRouter);

// Read-heavy routes — generous limiter
app.use('/api/v1/fyp', readLimiter, fypRouter);
app.use('/api/v1/careers', readLimiter, careersRouter);
app.use('/api/v1/prereq', readLimiter, prereqRouter);
app.use('/api/v1/professors', readLimiter, professorsRouter);
app.use('/api/v1/planner', readLimiter, plannerRouter);
app.use('/api/v1/batches', readLimiter, batchesRouter);
app.use('/api/v1/curriculum', readLimiter, curriculumRouter);

// ── 404 handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// ── F6: Centralised error sanitizer — strips stack traces in prod ─────────
app.use(errorSanitizer);

// ── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅  EduCompass API v1.0 running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(
    `   Security: helmet ✓ | CORS allow-list ✓ | rate-limits ✓ | sanitizer ✓`
  );

  // Bootstrap initial admin accounts (VC + Chairman)
  try {
    await bootstrapAdminAccounts();
  } catch (err) {
    console.error('Failed to bootstrap admin accounts:', err);
  }
});

export default app;
