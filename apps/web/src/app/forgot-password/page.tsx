'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Button,
  Alert,
} from '@educompass/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccessMsg(
        'Password reset instructions have been sent to your email if an account exists.'
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected error.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-[85vh] px-4 py-12 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-white">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/30">
              EC
            </span>
            EduCompass
          </Link>
          <p className="text-xs text-slate-400 mt-2">
            Recover your student account access
          </p>
        </div>

        <Card variant="glass" className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              We will send you a secure link to reset your account credentials.
            </CardDescription>
          </CardHeader>

          {successMsg ? (
            <CardContent className="space-y-4">
              <Alert variant="success" title="Check your inbox">
                {successMsg}
              </Alert>
              <Link href="/login" className="block w-full">
                <Button variant="outline" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleReset}>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <Alert
                    variant="danger"
                    title="Request failed"
                    onClose={() => setErrorMsg(null)}
                  >
                    {errorMsg}
                  </Alert>
                )}

                <Input
                  label="Registered Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu.pk"
                  autoComplete="email"
                  autoFocus
                />
              </CardContent>

              <CardFooter className="flex-col gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full"
                >
                  Send Reset Link
                </Button>

                <p className="text-xs text-center text-slate-400">
                  Remember your password?{' '}
                  <Link
                    href="/login"
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Back to sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
