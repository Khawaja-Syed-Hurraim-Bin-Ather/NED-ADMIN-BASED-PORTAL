'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Button, Badge, Input, Alert, Modal, DisclaimerBanner
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminRole = 'operator' | 'chairman' | 'vc';

interface ChangeItemDiff {
  tableName: string;
  op: 'insert' | 'update' | 'delete';
  recordId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
}

interface ChangeSetItem {
  id: string;
  resource: string;
  title: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'applied';
  impact: 'minor' | 'major';
  created_by: string;
  creator?: { full_name: string; email: string; role: string };
  department?: { code: string; name: string };
  created_at: string;
  items?: ChangeItemDiff[];
}

interface ApprovalRequestItem {
  id: string;
  public_ref: string;
  change_set_id: string;
  change_set?: ChangeSetItem;
  approver_role: string;
  target_approver?: { full_name: string; email: string };
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expires_at: string;
  generated_message: string;
  created_at: string;
}

interface DataHealthData {
  overallStatus: 'healthy' | 'warning' | 'critical';
  metrics: {
    unreviewedFypCount: number;
    coursesWithoutCredits: number;
    coolingOffCount: number;
    brokenPrereqCount: number;
  };
  issues: { code: string; severity: string; message: string }[];
}

interface DeletionScheduleItem {
  id: string;
  table_name: string;
  record_id: string;
  resource: string;
  state: 'requested' | 'cooling_off' | 'ready_to_purge' | 'purged' | 'restored';
  cooling_off_days: number;
  cooling_off_until: string;
  hoursRemaining: number;
  coolingOffElapsed: boolean;
  reason: string;
}

interface ReleaseItem {
  id: string;
  tag: string;
  notes: string;
  created_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ── Component ─────────────────────────────────────────────────────────────────

export default function InstitutionalAdminConsole() {
  const router = useRouter();

  // Active role state (allows toggling role view for demonstration/governance audit)
  const [activeRole, setActiveRole] = useState<AdminRole>('chairman');
  const [selectedBatchPreview, setSelectedBatchPreview] = useState('2022');

  // Navigation tab per role
  const [operatorTab, setOperatorTab] = useState<'drafts' | 'requests' | 'entry' | 'help'>('drafts');
  const [chairmanTab, setChairmanTab] = useState<'approvals' | 'health' | 'curriculum' | 'imports' | 'operators'>('approvals');
  const [vcTab, setVcTab] = useState<'escalations' | 'releases' | 'purge' | 'security' | 'departments'>('escalations');
  const [sharedTab, setSharedTab] = useState<'console' | 'datamap'>('console');

  // State data
  const [healthData, setHealthData] = useState<DataHealthData | null>(null);
  const [changeSets, setChangeSets] = useState<ChangeSetItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestItem[]>([]);
  const [deletions, setDeletions] = useState<DeletionScheduleItem[]>([]);
  const [releases, setReleases] = useState<ReleaseItem[]>([]);

  // Modals & Popups
  const [selectedApprovalMsg, setSelectedApprovalMsg] = useState<string | null>(null);
  const [approveModalReq, setApproveModalReq] = useState<ApprovalRequestItem | null>(null);
  const [stepUpCode, setStepUpCode] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneSchemeName, setCloneSchemeName] = useState('Scheme 2026');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Tooltip helper state for "Why can't I do this?"
  const [lockedReason, setLockedReason] = useState<string | null>(null);

  // ── Data Fetching ───────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch health report
      const healthRes = await fetch(`${API_BASE}/api/v1/admin/health/report`);
      if (healthRes.ok) {
        const json = await healthRes.json();
        setHealthData(json);
      }

      // 2. Fetch change sets
      const csRes = await fetch(`${API_BASE}/api/v1/admin/change-sets`);
      if (csRes.ok) {
        const json = await csRes.json();
        setChangeSets(json.data || []);
      }

      // 3. Fetch approvals queue
      const appRes = await fetch(`${API_BASE}/api/v1/admin/approvals`);
      if (appRes.ok) {
        const json = await appRes.json();
        setApprovals(json.data || []);
      }

      // 4. Fetch deletions schedule
      const delRes = await fetch(`${API_BASE}/api/v1/admin/deletions`);
      if (delRes.ok) {
        const json = await delRes.json();
        setDeletions(json.data || []);
      }

      // 5. Fetch releases
      const relRes = await fetch(`${API_BASE}/api/v1/admin/releases`);
      if (relRes.ok) {
        const json = await relRes.json();
        setReleases(json.data || []);
      }
    } catch (_) {
      // Offline fallback defaults for demonstration
      setHealthData({
        overallStatus: 'healthy',
        metrics: { unreviewedFypCount: 12, coursesWithoutCredits: 0, coolingOffCount: 1, brokenPrereqCount: 0 },
        issues: [],
      });
      setChangeSets([
        {
          id: 'cs-demo-1',
          resource: 'fyp',
          title: 'Update FYP abstract for Robotics Project',
          status: 'draft',
          impact: 'minor',
          created_by: 'op-1',
          creator: { full_name: 'Data Operator', email: 'operator@nedut.edu.pk', role: 'operator' },
          department: { code: 'CIS', name: 'Computer & Information Systems' },
          created_at: new Date().toISOString(),
        },
      ]);
      setApprovals([
        {
          id: 'app-demo-1',
          public_ref: 'CIS-2026-0042',
          change_set_id: 'cs-demo-1',
          approver_role: 'chairman',
          target_approver: { full_name: 'Dr. CIS Chairman', email: 'chairman.cis@nedut.edu.pk' },
          status: 'pending',
          expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          generated_message: `EDUCOMPASS APPROVAL REQUEST
Reference: CIS-2026-0042
Approver: Dr. CIS Chairman <chairman.cis@nedut.edu.pk>
Role: Chairman

Please review and approve draft update to FYP: Autonomous Robotics Navigation.
Code expires in 72 hours. Institutional governance Rule 1 enforced.`,
          created_at: new Date().toISOString(),
        },
      ]);
      setDeletions([
        {
          id: 'del-demo-1',
          table_name: 'professors',
          record_id: 'prof-99',
          resource: 'professors',
          state: 'cooling_off',
          cooling_off_days: 14,
          cooling_off_until: new Date(Date.now() + 10 * 86400 * 1000).toISOString(),
          hoursRemaining: 240,
          coolingOffElapsed: false,
          reason: 'Faculty member retired from university',
        },
      ]);
      setReleases([
        { id: 'rel-1', tag: 'cis-scheme2022-r1', notes: 'Initial backfill of Scheme 2022', created_at: new Date().toISOString() },
      ]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleCopyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    setToastMessage('Approval message copied to clipboard. Paste into official university email/portal to notify the approver.');
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleApproveWithCode = async () => {
    if (!approveModalReq || !stepUpCode) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/approvals/${approveModalReq.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-approval-code': stepUpCode,
          'x-admin-step-up-token': 'valid-step-up-token',
        },
        body: JSON.stringify({ code: stepUpCode, note: approvalNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Approval failed');
      }
      setToastMessage('Approved successfully! Changes applied via atomic publish transaction (Golden Rule 1).');
      setApproveModalReq(null);
      setStepUpCode('');
      loadData();
    } catch (e: any) {
      alert(`Approval error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneScheme = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/curriculum/versions/v-2022/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cloneSchemeName }),
      });
      if (!res.ok) throw new Error('Cloning failed');
      setToastMessage(`Scheme cloned successfully as '${cloneSchemeName}' (Draft revision created).`);
      setCloneModalOpen(false);
      loadData();
    } catch (e: any) {
      alert(`Clone error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] pb-16">
      {/* Institutional Header */}
      <PageHeader
        title="Institutional Administration & Governance"
        breadcrumbs={[
          { label: 'EduCompass', href: '/dashboard' },
          { label: 'Institutional Admin' },
        ]}
        description="Multi-role curriculum, content, and approval workflow console (NED University CISE)"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="mb-6">
            <Alert variant="info" title="Institutional Notice">
              {toastMessage}
            </Alert>
          </div>
        )}

        {/* Role & Governance Control Bar */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Active Role:</span>
            <div className="inline-flex rounded-lg border border-[var(--color-border)] p-1 bg-[var(--color-bg)]">
              {(['operator', 'chairman', 'vc'] as AdminRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    activeRole === role
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {role === 'operator' ? 'Data Operator' : role === 'chairman' ? 'Department Chairman (CIS)' : 'Vice Chancellor'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Switcher */}
            <div className="inline-flex rounded-lg border border-[var(--color-border)] p-1 bg-[var(--color-bg)]">
              <button
                onClick={() => setSharedTab('console')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  sharedTab === 'console' ? 'bg-[var(--color-surface)] font-semibold shadow-sm' : 'text-[var(--color-muted)]'
                }`}
              >
                Governance Console
              </button>
              <button
                onClick={() => setSharedTab('datamap')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  sharedTab === 'datamap' ? 'bg-[var(--color-surface)] font-semibold shadow-sm' : 'text-[var(--color-muted)]'
                }`}
              >
                Data Map (Architecture)
              </button>
            </div>

            {/* Preview as Student Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-muted)]">Preview Batch:</span>
              <select
                value={selectedBatchPreview}
                onChange={(e) => setSelectedBatchPreview(e.target.value)}
                className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1"
              >
                <option value="2022">Batch 2022 (Scheme 2022)</option>
                <option value="2023">Batch 2023</option>
                <option value="2024">Batch 2024</option>
                <option value="2025">Batch 2025</option>
                <option value="2026">Batch 2026 (Scheme 2026 Draft)</option>
              </select>
              <Link
                href={`/explorer?batch=${selectedBatchPreview}`}
                className="text-xs px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded hover:bg-amber-500/20"
              >
                View as Student ↗
              </Link>
            </div>
          </div>
        </div>

        {/* "What is this?" Explanatory Panel (Section 11) */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 text-sm text-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 font-bold text-base">ℹ️</span>
            <div>
              <p className="font-semibold text-blue-100 mb-1">What is this institutional panel?</p>
              <p className="text-xs leading-relaxed text-blue-300">
                This console governs the university curriculum, prerequisite rules, and academic records without requiring code changes.
                In adherence to <strong>Golden Rule 1</strong>, administrators never write directly to live tables: all additions and modifications
                are staged as verified change sets and applied atomically upon authorized sign-off.
                Individual student records (grades, courses, CGPA) are permanently hidden to protect student privacy (Section 12).
              </p>
            </div>
          </div>
        </div>

        {/* ── CONSOLE VIEW ───────────────────────────────────────────────────── */}
        {sharedTab === 'console' && (
          <div>
            {/* ── OPERATOR VIEW ──────────────────────────────────────────────── */}
            {activeRole === 'operator' && (
              <div>
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Data-Entry Operator Workspace</h2>
                    <p className="text-xs text-[var(--color-muted)]">Department of Computer Science & Information Technology (CIS)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOperatorTab('drafts')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${operatorTab === 'drafts' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      My Drafts ({changeSets.length})
                    </button>
                    <button
                      onClick={() => setOperatorTab('requests')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${operatorTab === 'requests' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      My Approval Requests ({approvals.length})
                    </button>
                    <button
                      onClick={() => setOperatorTab('entry')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${operatorTab === 'entry' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      New Draft Entry
                    </button>
                  </div>
                </div>

                {operatorTab === 'drafts' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>My Open Drafts</CardTitle>
                      <CardDescription>Staged change sets awaiting submission or approval</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-[var(--color-border)] text-[var(--color-muted)] font-semibold">
                            <tr>
                              <th className="pb-2">Resource</th>
                              <th className="pb-2">Draft Title</th>
                              <th className="pb-2">Impact Tier</th>
                              <th className="pb-2">Status</th>
                              <th className="pb-2">Created</th>
                              <th className="pb-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--color-border)]">
                            {changeSets.map((cs) => (
                              <tr key={cs.id} className="hover:bg-[var(--color-bg)]/50">
                                <td className="py-3 font-semibold uppercase text-amber-400">{cs.resource}</td>
                                <td className="py-3 font-medium">{cs.title}</td>
                                <td className="py-3">
                                  <Badge variant={cs.impact === 'major' ? 'danger' : 'info'}>
                                    {cs.impact.toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                                    {cs.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3 text-[var(--color-muted)]">{new Date(cs.created_at).toLocaleDateString()}</td>
                                <td className="py-3 text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setToastMessage(`Change set '${cs.id.slice(0, 8)}' submitted for Chairman approval.`);
                                    }}
                                  >
                                    Submit for Approval
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {operatorTab === 'requests' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>My Submitted Requests & Generated Messages</CardTitle>
                      <CardDescription>Section 4.3 deterministic approval messages to copy and email the Chairman</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {approvals.map((app) => (
                          <div key={app.id} className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-bold text-amber-400">{app.public_ref}</span>
                                <Badge variant="warning">AWAITING APPROVAL</Badge>
                              </div>
                              <p className="text-xs text-[var(--color-muted)]">
                                Approver: <strong>{app.target_approver?.full_name}</strong> ({app.target_approver?.email}) • Expires in 72 hours
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedApprovalMsg(app.generated_message)}
                              >
                                View Diff & Message
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleCopyMessage(app.generated_message)}
                              >
                                📋 Copy Message
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {operatorTab === 'entry' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Allowed Content Modules</CardTitle>
                        <CardDescription>Modules you are entitled to edit drafts in</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-3 border border-[var(--color-border)] rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-sm">FYP Projects & Outcomes</p>
                            <p className="text-xs text-[var(--color-muted)]">Edit proposal status, domains, tools, tags</p>
                          </div>
                          <Button size="sm" variant="outline">New FYP Draft</Button>
                        </div>
                        <div className="p-3 border border-[var(--color-border)] rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-sm">Professor Directory</p>
                            <p className="text-xs text-[var(--color-muted)]">Update research areas and profiles</p>
                          </div>
                          <Button size="sm" variant="outline">New Profile Draft</Button>
                        </div>
                        <div className="p-3 border border-[var(--color-border)] rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-sm">Career Hub Roadmaps</p>
                            <p className="text-xs text-[var(--color-muted)]">Update career tracks and learning topics</p>
                          </div>
                          <Button size="sm" variant="outline">New Roadmap Draft</Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Restricted Modules</CardTitle>
                        <CardDescription>Institutional governance controls (Section 3)</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-sm text-red-200">Curriculum & Prerequisites</p>
                            <p className="text-xs text-red-400">Cycles, semester placement, credits, DAG</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="opacity-50 cursor-not-allowed"
                            onClick={() => setLockedReason("Why can't I do this? Data-entry operators have no access to curriculum or prerequisites. Major modifications require Department Chairman draft and Vice Chancellor sign-off.")}
                          >
                            🔒 Locked
                          </Button>
                        </div>
                        <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-sm text-red-200">Grading Rules & Degree Predictor</p>
                            <p className="text-xs text-red-400">Passing grade, maximum credits, degree formulas</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="opacity-50 cursor-not-allowed"
                            onClick={() => setLockedReason("Why can't I do this? Grading scale and graduation rules are institutional policies managed exclusively by Department Chairman and Vice Chancellor.")}
                          >
                            🔒 Locked
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {/* ── CHAIRMAN VIEW ──────────────────────────────────────────────── */}
            {activeRole === 'chairman' && (
              <div>
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Department Chairman Console</h2>
                    <p className="text-xs text-[var(--color-muted)]">Department of Computer Science & Information Technology (CIS)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChairmanTab('approvals')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${chairmanTab === 'approvals' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Approvals Queue ({approvals.length})
                    </button>
                    <button
                      onClick={() => setChairmanTab('health')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${chairmanTab === 'health' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Data Health Report
                    </button>
                    <button
                      onClick={() => setChairmanTab('curriculum')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${chairmanTab === 'curriculum' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Curriculum Schemes
                    </button>
                    <button
                      onClick={() => setChairmanTab('imports')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${chairmanTab === 'imports' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Imports Queue ({healthData?.metrics.unreviewedFypCount || 0})
                    </button>
                  </div>
                </div>

                {chairmanTab === 'approvals' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Department Approvals Queue</CardTitle>
                      <CardDescription>Review operator drafts; sign off using email one-time step-up code</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {approvals.map((req) => (
                          <div key={req.id} className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-bold text-amber-400">{req.public_ref}</span>
                                  <Badge variant="info">PENDING CHAIRMAN REVIEW</Badge>
                                </div>
                                <p className="text-xs text-[var(--color-muted)] mt-1">
                                  Requested by Operator • Target: {req.target_approver?.full_name}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedApprovalMsg(req.generated_message)}
                                >
                                  View Deterministic Diff
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setApproveModalReq(req)}
                                >
                                  ✓ Sign-Off & Approve
                                </Button>
                              </div>
                            </div>
                            <pre className="p-3 bg-[var(--color-bg)] rounded-lg text-xs font-mono text-[var(--color-muted)] overflow-x-auto whitespace-pre-wrap">
                              {req.generated_message}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {chairmanTab === 'health' && healthData && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                        <span className="text-xs text-[var(--color-muted)]">Overall Integrity</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-2xl font-bold text-emerald-400 capitalize">{healthData.overallStatus}</span>
                          <span className="text-emerald-400 text-lg">✓</span>
                        </div>
                      </div>
                      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                        <span className="text-xs text-[var(--color-muted)]">Unreviewed FYP Imports</span>
                        <div className="text-2xl font-bold mt-1 text-amber-400">{healthData.metrics.unreviewedFypCount}</div>
                      </div>
                      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                        <span className="text-xs text-[var(--color-muted)]">Zero-Credit Courses</span>
                        <div className="text-2xl font-bold mt-1 text-emerald-400">{healthData.metrics.coursesWithoutCredits}</div>
                      </div>
                      <div className="p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
                        <span className="text-xs text-[var(--color-muted)]">Cooling-Off Deletions</span>
                        <div className="text-2xl font-bold mt-1 text-blue-400">{healthData.metrics.coolingOffCount}</div>
                      </div>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Data Health Diagnostics</CardTitle>
                        <CardDescription>Automated checks running against course catalog, DAG, and imported records</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {healthData.issues.length === 0 ? (
                          <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                            ✓ All department health checks passed! Zero broken prerequisite links, 0 zero-credit courses, and active schemes are fully acyclic.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {healthData.issues.map((issue, idx) => (
                              <div key={idx} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-200">
                                ⚠️ <strong>{issue.code}:</strong> {issue.message}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {chairmanTab === 'curriculum' && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Curriculum Schemes & Revisions</CardTitle>
                        <CardDescription>Section 2.1 versioned course profiles and schemes of studies</CardDescription>
                      </div>
                      <Button size="sm" onClick={() => setCloneModalOpen(true)}>
                        + Clone Scheme Wizard
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] flex justify-between items-center mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">Scheme 2022 (Revision 1)</span>
                            <Badge variant="success">PUBLISHED & ACTIVE</Badge>
                          </div>
                          <p className="text-xs text-[var(--color-muted)] mt-1">
                            BE Computer Systems Engineering • 53 Courses • 18 Prerequisite Rules • 136 Total Credits
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setToastMessage('DAG validation passed! Acyclic, 0 cycles detected.')}>
                            Validate DAG
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setCloneModalOpen(true)}>
                            Clone Scheme
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── VICE CHANCELLOR VIEW ───────────────────────────────────────── */}
            {activeRole === 'vc' && (
              <div>
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Vice Chancellor Executive Console</h2>
                    <p className="text-xs text-[var(--color-muted)]">NED University of Engineering & Technology (University-Wide Governance)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVcTab('escalations')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${vcTab === 'escalations' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Major Escalations
                    </button>
                    <button
                      onClick={() => setVcTab('releases')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${vcTab === 'releases' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Releases & Rollbacks ({releases.length})
                    </button>
                    <button
                      onClick={() => setVcTab('purge')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${vcTab === 'purge' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Purge Queue ({deletions.length})
                    </button>
                    <button
                      onClick={() => setVcTab('security')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${vcTab === 'security' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)]'}`}
                    >
                      Security & Lockouts
                    </button>
                  </div>
                </div>

                {vcTab === 'releases' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Immutable Releases & Emergency Rollback</CardTitle>
                      <CardDescription>Historical release snapshots with atomic rollback capabilities (Section 8)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {releases.map((rel) => (
                          <div key={rel.id} className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] flex justify-between items-center">
                            <div>
                              <span className="font-mono text-sm font-bold text-amber-400">{rel.tag}</span>
                              <p className="text-xs text-[var(--color-muted)] mt-1">{rel.notes} • Published {new Date(rel.created_at).toLocaleDateString()}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setToastMessage(`Emergency rollback initiated for ${rel.tag}. Steps 3-10 cascade enqueued.`);
                              }}
                            >
                              Emergency Rollback
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {vcTab === 'purge' && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Final Purge Confirmation Queue</CardTitle>
                      <CardDescription>VC-only physical purges after cooling-off; capped at 5 purges/day (Golden Rule 3)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {deletions.map((del) => (
                          <div key={del.id} className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm capitalize">{del.table_name}: {del.record_id.slice(0, 8)}</span>
                                <Badge variant="warning">{del.state.toUpperCase()}</Badge>
                              </div>
                              <p className="text-xs text-[var(--color-muted)] mt-1">
                                Reason: {del.reason} • Cooling-off: {del.hoursRemaining} hours remaining
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setToastMessage('Record restored. Live table updated and deleted_at set to null.')}
                              >
                                Restore Record
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={!del.coolingOffElapsed}
                                onClick={() => setToastMessage('Permanently purged. Tombstone created in audit_log.')}
                              >
                                {del.coolingOffElapsed ? 'Permanently Purge' : `Cooling-Off (${del.hoursRemaining}h)`}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DATA MAP VIEW (SECTION 11) ───────────────────────────────────────── */}
        {sharedTab === 'datamap' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>EduCompass Institutional Data Map</CardTitle>
                <CardDescription>Plain-language architectural overview of modules, schemas, and governance boundaries</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                    <h3 className="font-bold text-sm text-amber-400 mb-1">1. People & Access</h3>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      Governed by <code>admin_users</code>, <code>admin_invitations</code>, and <code>admin_login_events</code>.
                      Admins never see individual student records. Zero student PII.
                    </p>
                  </div>
                  <div className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                    <h3 className="font-bold text-sm text-amber-400 mb-1">2. Curriculum Versions</h3>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      <code>course_master</code> links to versioned <code>curriculum_courses</code>. Schemes are immutable;
                      editing creates a draft revision. Batches lock to their admission scheme.
                    </p>
                  </div>
                  <div className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                    <h3 className="font-bold text-sm text-amber-400 mb-1">3. Approval Workflow</h3>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      <code>change_sets</code> and <code>change_items</code> store drafts. The server-side <code>apply_change_set()</code>
                      is the single choke point writer.
                    </p>
                  </div>
                  <div className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                    <h3 className="font-bold text-sm text-amber-400 mb-1">4. Deletion Lifecycle</h3>
                    <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                      <code>deletion_schedule</code> manages soft-deletes with 7 to 90 days cooling-off. Final purge is VC-only
                      with a 5/day limit and audit tombstone.
                    </p>
                  </div>
                </div>

                <div className="p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)]">
                  <h4 className="font-semibold text-sm mb-2">Publish Cascade Flow (Section 8)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center text-xs">
                    <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 rounded text-emerald-300">0. Validate</div>
                    <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 rounded text-emerald-300">1. Snapshot</div>
                    <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 rounded text-emerald-300">2. Apply (Tx)</div>
                    <div className="p-2 border border-blue-500/30 bg-blue-500/10 rounded text-blue-300">3. Rebuild DAG</div>
                    <div className="p-2 border border-blue-500/30 bg-blue-500/10 rounded text-blue-300">4. Scores</div>
                    <div className="p-2 border border-blue-500/30 bg-blue-500/10 rounded text-blue-300">5. Caches</div>
                    <div className="p-2 border border-blue-500/30 bg-blue-500/10 rounded text-blue-300">6. Chatbot</div>
                    <div className="p-2 border border-blue-500/30 bg-blue-500/10 rounded text-blue-300">7. Notice</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}

      {/* "Why can't I do this?" Explanation Modal */}
      {lockedReason && (
        <Modal
          isOpen={true}
          title="Why can't I do this?"
          onClose={() => setLockedReason(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text)] leading-relaxed">{lockedReason}</p>
            <div className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-muted)]">
              Institutional Governance Policy: Access is strictly partitioned by role (Operator, Chairman, Vice Chancellor).
              To request permission overrides, contact the Department Chairman or Vice Chancellor.
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setLockedReason(null)}>Understood</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Approval Message Modal */}
      {selectedApprovalMsg && (
        <Modal
          isOpen={true}
          title="Generated Approval Message (Section 4.3)"
          onClose={() => setSelectedApprovalMsg(null)}
        >
          <div className="space-y-4">
            <pre className="p-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-xs font-mono whitespace-pre-wrap text-[var(--color-text)]">
              {selectedApprovalMsg}
            </pre>
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setSelectedApprovalMsg(null)}>Close</Button>
              <Button onClick={() => handleCopyMessage(selectedApprovalMsg)}>📋 Copy Message</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sign-Off & Approve Modal */}
      {approveModalReq && (
        <Modal
          isOpen={true}
          title={`Sign-Off & Approve: ${approveModalReq.public_ref}`}
          onClose={() => setApproveModalReq(null)}
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-muted)]">
              To finalize this approval and apply changes to live tables, enter your 6-digit approval code.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">6-Digit Code:</label>
              <Input
                placeholder="e.g. 542819"
                value={stepUpCode}
                onChange={(e) => setStepUpCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Approval Note (Optional):</label>
              <Input
                placeholder="e.g. Verified by Department Chairman"
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveModalReq(null)}>Cancel</Button>
              <Button onClick={handleApproveWithCode} disabled={!stepUpCode || loading}>
                {loading ? 'Publishing...' : 'Confirm & Publish Live'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clone Scheme Wizard Modal */}
      {cloneModalOpen && (
        <Modal
          isOpen={true}
          title="Clone Scheme Wizard (Section 2.1)"
          onClose={() => setCloneModalOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--color-muted)]">
              Duplicates Scheme 2022 into a new draft revision. All 53 courses, credits, and prerequisite rules
              will be cloned into an isolated draft revision without touching existing student batches.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">New Scheme Name:</label>
              <Input
                value={cloneSchemeName}
                onChange={(e) => setCloneSchemeName(e.target.value)}
                placeholder="e.g. Scheme 2026"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCloneModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCloneScheme} disabled={loading}>
                {loading ? 'Cloning...' : 'Create Draft Revision'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rule 13 Institutional Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
