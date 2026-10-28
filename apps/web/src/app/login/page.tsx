'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const callbackError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    callbackError ? 'Authentication failed or session expired. Please sign in again.' : null
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data?.user) {
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected sign in error.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="login-split-page">
      {/* ── Left: Form on a plain surface ── */}
      <div className="login-form-side">
        <div className="login-form-container">
          {/* Logo centered above the form (height 72px) */}
          <div className="login-logo-wrap">
            <Link href="/" aria-label="EduCompass home">
              <img
                src="/assets/brand/ned-logo.png"
                alt="NED University of Engineering & Technology, Karachi"
                className="login-logo-img"
              />
            </Link>
          </div>

          <div className="login-header">
            <h1>Sign in to EduCompass</h1>
            <p>NED University of Engineering &amp; Technology, CISE Department</p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(192, 57, 43, 0.08)',
                border: '1px solid #C0392B',
                color: '#C0392B',
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label
                htmlFor="email-input"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 6,
                  color: 'var(--text)',
                }}
              >
                University email or roll number
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@cloud.neduet.edu.pk"
                autoComplete="email"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label
                  htmlFor="password-input"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text)',
                  }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: 12,
                    color: 'var(--primary)',
                    textDecoration: 'none',
                  }}
                >
                  Forgot password
                </Link>
              </div>
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="button button-primary"
              style={{
                width: '100%',
                marginTop: 8,
                padding: '10px 16px',
                fontSize: 14,
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  style={{
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Create one now
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* ── Right: Solid maroon panel with logo and motto ── */}
      <div className="login-panel-side">
        <div className="login-panel-content">
          <img
            src="/assets/brand/ned-logo.png"
            alt="NED University of Engineering & Technology"
            className="login-panel-logo"
          />
          <h2 className="login-panel-text">Your degree, planned with clarity.</h2>
          <p className="login-panel-sub">
            Department of Computer &amp; Information Systems Engineering
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--page)', color: 'var(--muted)', fontSize: 14 }}>
          Loading sign in...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
