'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Button, Badge, Input, Alert, Modal,
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewStatus = 'extracted' | 'approved' | 'published' | 'rejected';

interface FypRecord {
  id: string;
  title: string;
  year: number;
  supervisor: string;
  domain_tags: string[];
  proposal_outcome: 'accepted' | 'rejected' | 'unknown';
  review_status: ReviewStatus;
  source_file: string;
  created_at: string;
  review_note: string | null;
}

interface Stats { extracted: number; approved: number; published: number; rejected: number }

interface AuditEntry {
  id: string;
  actor_id: string;
  action: string;
  target_table: string;
  target_ids: string[];
  meta: Record<string, unknown>;
  created_at: string;
}

interface DeletionRequest {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
  status: string;
}

const STATUS_COLORS: Record<ReviewStatus, string> = {
  extracted: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  approved:  'bg-blue-500/15 text-blue-300 border-blue-500/30',
  published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected:  'bg-red-500/15 text-red-300 border-red-500/30',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminConsolePage() {
  const router = useRouter();

  // Auth guard
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Review queue state
  const [tab, setTab] = useState<'queue' | 'audit' | 'deletions'>('queue');
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>('extracted');
  const [records, setRecords] = useState<FypRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ extracted: 0, approved: 0, published: 0, rejected: 0 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Edit modal
  const [editRecord, setEditRecord] = useState<FypRecord | null>(null);
  const [editNote, setEditNote] = useState('');

  // Audit log
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  // Deletion requests
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

  // ── Auth check ───────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { router.push('/dashboard'); return; }

      setIsAdmin(true);
      setAuthChecked(true);
    }
    checkAuth();
  }, [router]);

  // ── Data fetchers ─────────────────────────────────────────────────
  async function getAuthHeader(): Promise<Record<string, string>> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  const fetchStats = useCallback(async () => {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/v1/admin/fyp/stats`, { headers });
    if (res.ok) {
      const json = await res.json();
      setStats(json.data);
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(
        `${API_BASE}/api/v1/admin/fyp?status=${statusFilter}&page=${page}&pageSize=25`,
        { headers }
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setRecords(json.data ?? []);
      setTotalCount(json.meta?.total ?? 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  const fetchAudit = useCallback(async () => {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/v1/admin/audit?pageSize=30`, { headers });
    if (res.ok) {
      const json = await res.json();
      setAuditEntries(json.data ?? []);
    }
  }, []);

  const fetchDeletions = useCallback(async () => {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE}/api/v1/admin/deletion-requests`, { headers });
    if (res.ok) {
      const json = await res.json();
      setDeletionRequests(json.data ?? []);
    }
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    fetchStats();
    if (tab === 'queue') fetchRecords();
    if (tab === 'audit') fetchAudit();
    if (tab === 'deletions') fetchDeletions();
  }, [authChecked, tab, fetchStats, fetchRecords, fetchAudit, fetchDeletions]);

  useEffect(() => {
    if (authChecked && tab === 'queue') fetchRecords();
  }, [statusFilter, page, authChecked, tab, fetchRecords]);

  // ── Bulk actions ─────────────────────────────────────────────────
  async function bulkAction(action: 'approve' | 'publish' | 'reject' | 'reset', note?: string) {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
      const res = await fetch(`${API_BASE}/api/v1/admin/fyp/bulk`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: Array.from(selected), action, note }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const json = await res.json();
      setSuccessMsg(`${json.data.updated} record(s) ${json.data.newStatus}.`);
      setSelected(new Set());
      await fetchStats();
      await fetchRecords();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk action failed');
    } finally {
      setLoading(false);
    }
  }

  // ── Deletion request ─────────────────────────────────────────────
  async function completeDeletion(reqId: string) {
    if (!confirm('This will permanently delete the user\'s data. Proceed?')) return;
    const headers = { ...(await getAuthHeader()), 'Content-Type': 'application/json' };
    const res = await fetch(`${API_BASE}/api/v1/admin/deletion-requests/${reqId}/complete`, {
      method: 'POST', headers,
    });
    if (res.ok) {
      setSuccessMsg('User data deleted. Request marked complete.');
      await fetchDeletions();
    }
  }

  // ── Toggle selection ─────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  }

  // ── Auth loading state ───────────────────────────────────────────
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Verifying admin access…
        </div>
      </main>
    );
  }

  if (!isAdmin) return null;

  const totalPages = Math.ceil(totalCount / 25);

  return (
    <div className="inner-page">
      <PageHeader
        title="Admin Console & Review Queue"
        breadcrumbs={[{ label: 'Admin Console' }]}
        badge="Rule 2 Enforced"
        description="Offline ETL ingestion queue, peer review approval pipeline, audit logs, and user data requests."
        accent="var(--coral)"
      />

      <main className="inner-page-body space-y-6">

        {/* Alerts */}
        {error && <Alert variant="danger" onClose={() => setError(null)}>{error}</Alert>}
        {successMsg && <Alert variant="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['extracted', 'approved', 'published', 'rejected'] as ReviewStatus[]).map((s) => (
            <button
              key={s}
              id={`stats-${s}`}
              onClick={() => { setStatusFilter(s); setTab('queue'); setPage(1); setSelected(new Set()); }}
              className={`rounded-xl border p-4 text-left transition-all hover:scale-[1.02] ${
                tab === 'queue' && statusFilter === s
                  ? STATUS_COLORS[s] + ' scale-[1.02]'
                  : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-600'
              }`}
            >
              <p className="text-2xl font-bold text-white">{stats[s]}</p>
              <p className="text-xs capitalize mt-0.5 text-slate-400">{s}</p>
            </button>
          ))}
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/50 p-1 w-fit">
          {(['queue', 'audit', 'deletions'] as const).map((t) => (
            <button
              key={t}
              id={`admin-tab-${t}`}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all capitalize ${
                tab === t
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'queue' ? 'Review Queue' : t === 'audit' ? 'Audit Log' : 'Deletion Requests'}
              {t === 'deletions' && deletionRequests.length > 0 && (
                <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                  {deletionRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── REVIEW QUEUE TAB ─────────────────────────────────────── */}
        {tab === 'queue' && (
          <Card variant="glass">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>FYP Review Queue — {statusFilter}</CardTitle>
                  <CardDescription>{totalCount} records · Page {page}/{Math.max(1, totalPages)}</CardDescription>
                </div>
                {selected.size > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-slate-400 self-center">{selected.size} selected</span>
                    {statusFilter === 'extracted' && (
                      <Button id="bulk-approve" size="sm" variant="primary" onClick={() => bulkAction('approve')} disabled={loading}>
                        ✓ Approve
                      </Button>
                    )}
                    {statusFilter === 'approved' && (
                      <Button id="bulk-publish" size="sm" variant="primary" onClick={() => bulkAction('publish')} disabled={loading}>
                        🚀 Publish
                      </Button>
                    )}
                    <Button id="bulk-reject" size="sm" variant="secondary" onClick={() => bulkAction('reject')} disabled={loading}>
                      ✗ Reject
                    </Button>
                    <Button id="bulk-reset" size="sm" variant="outline" onClick={() => bulkAction('reset')} disabled={loading}>
                      ↺ Reset
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-slate-500 text-sm gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading records…
                </div>
              ) : records.length === 0 ? (
                <p className="text-center py-12 text-slate-500 text-sm">No records with status &quot;{statusFilter}&quot;.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left">
                        <th className="pb-2 pr-4 w-8">
                          <input
                            type="checkbox"
                            checked={selected.size === records.length && records.length > 0}
                            onChange={toggleAll}
                            className="rounded border-slate-600 bg-slate-800"
                            aria-label="Select all"
                          />
                        </th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Year</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Supervisor</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Domain</th>
                        <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                        <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {records.map((rec) => (
                        <tr key={rec.id} className={`group transition-colors hover:bg-slate-800/30 ${selected.has(rec.id) ? 'bg-indigo-900/10' : ''}`}>
                          <td className="py-3 pr-4">
                            <input
                              type="checkbox"
                              checked={selected.has(rec.id)}
                              onChange={() => toggleSelect(rec.id)}
                              className="rounded border-slate-600 bg-slate-800"
                              aria-label={`Select ${rec.title}`}
                            />
                          </td>
                          <td className="py-3 pr-4 max-w-xs">
                            <p className="font-medium text-slate-200 truncate" title={rec.title}>{rec.title}</p>
                            {rec.review_note && (
                              <p className="text-[10px] text-amber-400 mt-0.5 truncate">📝 {rec.review_note}</p>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-slate-400">{rec.year}</td>
                          <td className="py-3 pr-4 text-slate-300 max-w-[120px] truncate">{rec.supervisor}</td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {(rec.domain_tags ?? []).slice(0, 2).map((tag) => (
                                <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{tag}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[rec.review_status]}`}>
                              {rec.review_status}
                            </span>
                          </td>
                          <td className="py-3">
                            <Button
                              id={`edit-${rec.id}`}
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditRecord(rec); setEditNote(rec.review_note ?? ''); }}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    ← Prev
                  </Button>
                  <span className="text-xs text-slate-400">Page {page} / {totalPages}</span>
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── AUDIT LOG TAB ─────────────────────────────────────────── */}
        {tab === 'audit' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>All admin actions are recorded here with actor ID and timestamp.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditEntries.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-sm">No audit entries yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-indigo-300">{entry.action}</span>
                        <span className="text-slate-500 ml-2">on {entry.target_table}</span>
                        {entry.target_ids?.length > 0 && (
                          <span className="text-slate-600 ml-1">({entry.target_ids.length} record{entry.target_ids.length > 1 ? 's' : ''})</span>
                        )}
                      </div>
                      <div className="shrink-0 text-slate-500">
                        {new Date(entry.created_at).toLocaleString('en-PK')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── DELETION REQUESTS TAB ─────────────────────────────────── */}
        {tab === 'deletions' && (
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Pending Deletion Requests</CardTitle>
              <CardDescription>Process within 7 days per Rule #9. This permanently deletes user data.</CardDescription>
            </CardHeader>
            <CardContent>
              {deletionRequests.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-sm">No pending deletion requests. ✓</p>
              ) : (
                <div className="space-y-3">
                  {deletionRequests.map((req) => (
                    <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                      <div className="text-sm">
                        <p className="font-mono text-xs text-slate-400 mb-1">Request ID: {req.id.slice(0, 8)}…</p>
                        <p className="text-slate-300">{req.reason || 'No reason provided.'}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Submitted: {new Date(req.created_at).toLocaleString('en-PK')}
                        </p>
                      </div>
                      <Button
                        id={`del-complete-${req.id}`}
                        size="sm"
                        variant="danger"
                        onClick={() => completeDeletion(req.id)}
                      >
                        Complete Deletion
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* Edit Record Modal */}
      <Modal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        title={`Edit Record`}
        description={editRecord?.title}
      >
        {editRecord && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1 text-xs text-slate-400">Review Note</p>
              <Input
                id="edit-review-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Optional note for this record…"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                id="quick-approve"
                size="sm"
                variant="primary"
                onClick={async () => {
                  await bulkAction('approve');
                  setEditRecord(null);
                }}
                disabled={loading}
              >
                ✓ Approve
              </Button>
              <Button
                id="quick-publish"
                size="sm"
                variant="primary"
                onClick={async () => {
                  setSelected(new Set([editRecord.id]));
                  await bulkAction('publish');
                  setEditRecord(null);
                }}
                disabled={loading}
              >
                🚀 Publish
              </Button>
              <Button
                id="quick-reject"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  setSelected(new Set([editRecord.id]));
                  await bulkAction('reject', editNote);
                  setEditRecord(null);
                }}
                disabled={loading}
              >
                ✗ Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditRecord(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
      </main>
    </div>
  );
}
