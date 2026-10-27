'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Modal,
} from '@educompass/ui';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

  const [userId, setUserId] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [semester, setSemester] = useState(1);
  const [careerGoal, setCareerGoal] = useState('');
  const [interests, setInterests] = useState('');

  // Deletion request state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name ?? '');
        setSemester(profile.current_semester ?? 1);
        setCareerGoal(profile.career_goal ?? '');
        setInterests((profile.interests ?? []).join(', '));
      }

      // Check existing deletion request
      const { data: delReq } = await supabase
        .from('deletion_requests')
        .select('status, requested_at')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (delReq && delReq.status === 'pending') {
        setDeleteStatus('pending');
      }

      setLoading(false);
    }
    loadData();
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setFeedback(null);
      const supabase = createClient();

      const interestsArray = interests
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          current_semester: semester,
          career_goal: careerGoal.trim() || null,
          interests: interestsArray,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        setFeedback({ type: 'danger', message: error.message });
      } else {
        setFeedback({
          type: 'success',
          message: 'Academic profile preferences updated successfully.',
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'danger',
        message: err instanceof Error ? err.message : 'Failed to update profile.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitDeletion() {
    try {
      setIsSubmittingDelete(true);
      const supabase = createClient();

      const { error } = await supabase.from('deletion_requests').insert({
        user_id: userId,
        reason: deleteReason.trim() || 'User requested account closure',
        status: 'pending',
      });

      if (error) {
        setFeedback({ type: 'danger', message: error.message });
      } else {
        setDeleteStatus('pending');
        setIsDeleteModalOpen(false);
        setFeedback({
          type: 'success',
          message:
            'Deletion request submitted. Per university data governance, an administrator will process and complete your request within 7 business days.',
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'danger',
        message: err instanceof Error ? err.message : 'Error submitting request.',
      });
    } finally {
      setIsSubmittingDelete(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <p className="text-sm text-slate-400">Loading settings...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Account &amp; Academic Settings
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage your preferences and data privacy
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              &larr; Back to Dashboard
            </Button>
          </Link>
        </div>

        {feedback && (
          <Alert
            variant={feedback.type}
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        )}

        {/* Profile Card */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Academic Preferences</CardTitle>
            <CardDescription>
              Personalize recommendations for FYP matching and course prerequisites.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSaveProfile}>
            <CardContent className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <Input
                label="University Email"
                type="email"
                disabled
                value={email}
                helperText="Email is bound to your university authentication."
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-300">
                  Current Semester
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-900/80 border border-slate-800 px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Career Goal / Target Role"
                type="text"
                value={careerGoal}
                onChange={(e) => setCareerGoal(e.target.value)}
                placeholder="e.g. Embedded AI Engineer, Fullstack Architect, Data Scientist"
              />

              <Input
                label="Technical Interests (comma-separated)"
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. computer vision, robotics, rust, distributed systems"
              />
            </CardContent>

            <CardFooter>
              <Button type="submit" variant="primary" size="md" isLoading={saving}>
                Save Preferences
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Data Privacy & Account Deletion */}
        <Card variant="default" className="border-rose-950/60 bg-rose-950/10">
          <CardHeader>
            <CardTitle className="text-rose-300">Data Governance &amp; Account Deletion</CardTitle>
            <CardDescription className="text-rose-200/70">
              Per Non-negotiable Rule #9 (SRS SEC-07), immediate self-deletion is disabled to preserve institutional audit trails. Users submit an official deletion request which an administrator processes within 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deleteStatus === 'pending' ? (
              <Alert variant="warning" title="Deletion request in progress">
                You have an active deletion request pending review by the administrator. All personal references will be permanently purged upon completion.
              </Alert>
            ) : (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                Request Account Deletion
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Deletion Request Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Request Account Deletion"
          description="Institutional data retention protocol (SRS SEC-07)"
        >
          <div className="space-y-4 text-sm text-slate-300">
            <p>
              Submitting this request will flag your account for removal. An administrator will review and purge your profile and associated academic data within 7 days.
            </p>
            <Input
              label="Reason for account deletion (optional)"
              placeholder="e.g. Graduated, transferred, or privacy request"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isSubmittingDelete}
                onClick={handleSubmitDeletion}
              >
                Submit Deletion Request
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </main>
  );
}
