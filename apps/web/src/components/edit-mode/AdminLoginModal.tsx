'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditMode } from '../../context/EditModeContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEMO_ACCOUNTS = [
  { label: 'Vice Chancellor', email: 'cursor.pro.test124@gmail.com' },
  { label: 'Department Chairman', email: 'chairman.cis@nedut.edu.pk' },
  { label: 'Data Operator', email: 'operator@nedut.edu.pk' },
] as const;

export function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const { loginAdmin, verifyAdminOtp } = useEditMode();

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpHint, setOtpHint] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('credentials');
      setEmail('');
      setPassword('');
      setOtp('');
      setOtpHint(undefined);
      setError(null);
      setLoading(false);
      setTimeout(() => emailRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRef.current?.focus(), 80);
    }
  }, [step]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await loginAdmin({ email: email.trim(), password });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Login failed. Check your credentials.');
      return;
    }
    setOtpHint(result.otpHint);
    setStep('otp');
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await verifyAdminOtp(email.trim(), otp.trim());
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'Invalid or expired code.');
      return;
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Institutional Admin Login"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
          color: 'var(--text)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              EduCompass Admin
            </p>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
              {step === 'credentials' ? '🔐 Institutional Login' : '📱 Verify Identity'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: 18,
              lineHeight: 1,
              padding: '2px 6px',
            }}
            aria-label="Close login modal"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Credentials */}
        {step === 'credentials' && (
          <>
            {/* Quick-fill demo buttons */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Demo accounts (auto-fill)
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => { setEmail(acc.email); setError(null); }}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: email === acc.email ? 'var(--primary-tint)' : 'var(--page)',
                      color: email === acc.email ? 'var(--primary)' : 'var(--muted)',
                      cursor: 'pointer',
                      fontWeight: email === acc.email ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCredentialsSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label htmlFor="admin-email" style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 5, color: 'var(--text)' }}>
                  Institutional Email
                </label>
                <input
                  id="admin-email"
                  ref={emailRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@nedut.edu.pk"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--page)',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="admin-password" style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 5, color: 'var(--text)' }}>
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--page)',
                    color: 'var(--text)',
                    fontSize: 13,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 7, fontSize: 12, color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Signing in…' : 'Continue →'}
              </button>
            </form>

            <p style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
              Only authorised NED institutional accounts may sign in.
            </p>
          </>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
              A one-time code was sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Enter it below to complete sign-in.
            </p>

            {otpHint && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(255,174,7,0.1)', border: '1px solid rgba(255,174,7,0.35)', borderRadius: 7, fontSize: 12, color: 'var(--warning)' }}>
                <strong>Dev hint:</strong> Your OTP is <code style={{ fontFamily: 'monospace', letterSpacing: '0.1em' }}>{otpHint}</code>
              </div>
            )}

            <form onSubmit={handleOtpSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="admin-otp" style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 5, color: 'var(--text)' }}>
                  6-digit Verification Code
                </label>
                <input
                  id="admin-otp"
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--page)',
                    color: 'var(--text)',
                    fontSize: 20,
                    letterSpacing: '0.4em',
                    textAlign: 'center',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              {error && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 7, fontSize: 12, color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                style={{
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer',
                  opacity: (loading || otp.length !== 6) ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('credentials'); setError(null); setOtp(''); }}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '7px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                ← Back to credentials
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
