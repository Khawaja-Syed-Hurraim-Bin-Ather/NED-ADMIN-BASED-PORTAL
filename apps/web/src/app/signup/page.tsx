'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [program, setProgram] = useState<'CSE' | 'CS' | 'SE'>('CSE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email || !password) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            program_code: program,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data?.session) {
        // Automatically signed in
        router.push('/dashboard');
        router.refresh();
      } else {
        // Confirmation email sent
        setSuccessMsg(
          'Registration successful! Please check your email inbox to confirm your account, then sign in.'
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected registration error.');
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
            Create your student account for degree planning and FYP discovery
          </p>
        </div>

        <Card variant="glass" className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>
              Join your peers in tracking academic progress and industry readiness.
            </CardDescription>
          </CardHeader>

          {successMsg ? (
            <CardContent className="space-y-4">
              <Alert variant="success" title="Verification email sent">
                {successMsg}
              </Alert>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Go to Sign In
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <Alert
                    variant="danger"
                    title="Registration failed"
                    onClose={() => setErrorMsg(null)}
                  >
                    {errorMsg}
                  </Alert>
                )}

                <Input
                  label="Full Name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Syed Hurraim"
                  autoFocus
                />

                <Input
                  label="University Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu.pk"
                  autoComplete="email"
                />

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-300">
                    Academic Program
                  </label>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value as 'CSE' | 'CS' | 'SE')}
                    className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  >
                    <option value="CSE">Computer Systems Engineering (CSE)</option>
                    <option value="CS">Computer Science (CS)</option>
                    <option value="SE">Software Engineering (SE)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    EduCompass covers computing fields only (Decision D10).
                  </p>
                </div>

                <Input
                  label="Password (min 8 characters)"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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
                  Create Account
                </Button>

                <p className="text-xs text-center text-slate-400">
                  Already registered?{' '}
                  <Link
                    href="/login"
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Sign in
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
