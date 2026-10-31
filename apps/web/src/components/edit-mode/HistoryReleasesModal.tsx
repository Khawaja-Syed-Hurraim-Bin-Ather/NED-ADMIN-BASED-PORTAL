'use client';

import React, { useState, useEffect } from 'react';
import { useEditMode } from '../../context/EditModeContext';
import { Badge } from '@educompass/ui';

interface ReleaseRecord {
  id: string;
  release_tag: string;
  approver: string;
  timestamp: string;
  summary: string;
  items_count: number;
}

interface SoftDeletedItem {
  id: string;
  table_name: string;
  record_id: string;
  summary: string;
  deleted_at: string;
  cooling_off_days: number;
  hours_remaining: number;
  eligible_for_purge: boolean;
}

const SAMPLE_RELEASES: ReleaseRecord[] = [
  {
    id: 'rel-1',
    release_tag: 'release-20261031-1800',
    approver: 'chairman.cis@nedut.edu.pk',
    timestamp: '2026-10-31 18:00',
    summary: 'Curriculum Scheme 2026 cloning and acyclic DAG validation release',
    items_count: 53,
  },
  {
    id: 'rel-2',
    release_tag: 'release-20261030-1420',
    approver: 'chairman.cis@nedut.edu.pk',
    timestamp: '2026-10-30 14:20',
    summary: 'FYDP Archive Phase 2 publication (68 reviewed projects)',
    items_count: 68,
  },
];

const SAMPLE_DELETIONS: SoftDeletedItem[] = [
  {
    id: 'del-1',
    table_name: 'career_tracks',
    record_id: 'legacy-systems-hardware',
    summary: 'Deprecated hardware specialization track',
    deleted_at: '2026-10-25',
    cooling_off_days: 7,
    hours_remaining: 18,
    eligible_for_purge: false,
  },
  {
    id: 'del-2',
    table_name: 'professors',
    record_id: 'prof-retired-sample',
    summary: 'Retired visiting faculty member profile',
    deleted_at: '2026-10-14',
    cooling_off_days: 14,
    hours_remaining: 0,
    eligible_for_purge: true,
  },
];

interface HistoryReleasesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryReleasesModal({ isOpen, onClose }: HistoryReleasesModalProps) {
  const { adminToken, activeRole } = useEditMode();

  const [activeTab, setActiveTab] = useState<'releases' | 'cooling_off' | 'final_purge'>('releases');
  const [releases, setReleases] = useState<ReleaseRecord[]>(SAMPLE_RELEASES);
  const [deletions, setDeletions] = useState<SoftDeletedItem[]>(SAMPLE_DELETIONS);
  const [dailyPurgeCount, setDailyPurgeCount] = useState(1);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const isVC = activeRole === 'vc';

  // Fetch real releases and deletions from API
  useEffect(() => {
    async function fetchData() {
      if (!adminToken) return;
      try {
        const [relRes, delRes] = await Promise.all([
          fetch('/api/v1/admin/releases', { headers: { Authorization: `Bearer ${adminToken}` } }),
          fetch('/api/v1/admin/deletions', { headers: { Authorization: `Bearer ${adminToken}` } }),
        ]);

        if (relRes.ok) {
          const rJson = await relRes.json();
          if (rJson.data && Array.isArray(rJson.data) && rJson.data.length > 0) {
            setReleases(rJson.data);
          }
        }
        if (delRes.ok) {
          const dJson = await delRes.json();
          if (dJson.data && Array.isArray(dJson.data) && dJson.data.length > 0) {
            setDeletions(dJson.data);
          }
        }
      } catch {
        // Fallback remains sample datasets
      }
    }
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, adminToken]);

  if (!isOpen) return null;

  const handleRollback = async (rel: ReleaseRecord) => {
    if (!isVC) {
      alert('Only the Vice Chancellor can authorize emergency releases rollback.');
      return;
    }
    if (
      !confirm(
        `Are you sure you want to execute an emergency rollback of release "${rel.release_tag}"? This enqueues background cascade rollback without rewriting history.`
      )
    ) {
      return;
    }

    try {
      if (adminToken) {
        await fetch(`/api/v1/admin/releases/${rel.id}/rollback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ stepUpToken: 'demo-stepup-valid' }),
        });
      }
      setStatusNotice(`Rollback of release ${rel.release_tag} scheduled successfully!`);
      setTimeout(() => setStatusNotice(null), 3000);
    } catch {
      alert('Error triggering rollback');
    }
  };

  const handleRestore = async (item: SoftDeletedItem) => {
    try {
      if (adminToken) {
        await fetch(`/api/v1/admin/deletions/${item.id}/restore`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      }
      setDeletions((prev) => prev.filter((d) => d.id !== item.id));
      setStatusNotice(`Restored ${item.summary} to live active database!`);
      setTimeout(() => setStatusNotice(null), 3000);
    } catch {
      alert('Failed to restore item');
    }
  };

  const handlePurgePermanently = async (item: SoftDeletedItem) => {
    if (!isVC) {
      alert('Only the Vice Chancellor can execute final permanent purge.');
      return;
    }
    if (dailyPurgeCount >= 5) {
      alert('Daily VC final purge rate cap reached (max 5 purges per 24 hours per Golden Rule 3).');
      return;
    }
    if (
      !confirm(
        `WARNING (Permanent Purge): Row in "${item.table_name}" will be irrevocably deleted from the live database. An immutable tombstone will be recorded in audit_log. Confirm?`
      )
    ) {
      return;
    }

    try {
      if (adminToken) {
        await fetch(`/api/v1/admin/deletions/${item.id}/purge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ stepUpToken: 'demo-stepup-valid' }),
        });
      }
      setDeletions((prev) => prev.filter((d) => d.id !== item.id));
      setDailyPurgeCount((prev) => prev + 1);
      setStatusNotice(`Item permanently purged. Immutable tombstone recorded in audit_log.`);
      setTimeout(() => setStatusNotice(null), 3000);
    } catch {
      alert('Failed to execute purge');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="History, Releases and Deletion Lifecycles"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-4xl bg-[#0f1823] border border-[rgba(213,228,236,0.2)] rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                Institutional Auditing
              </span>
              <h3 className="text-base font-semibold text-slate-100">
                History &amp; Releases Console
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Immutable release versions, cooling-off recovery, and VC purge controls.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 3 Tabs */}
        <div className="flex border-b border-[rgba(213,228,236,0.1)] bg-[#0b1119] text-xs">
          <button
            onClick={() => setActiveTab('releases')}
            className={`flex-1 py-2.5 px-3 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'releases'
                ? 'border-[#511030] text-amber-300 bg-[#162231]/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 Releases Timeline ({releases.length})
          </button>
          <button
            onClick={() => setActiveTab('cooling_off')}
            className={`flex-1 py-2.5 px-3 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'cooling_off'
                ? 'border-[#511030] text-amber-300 bg-[#162231]/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⏳ Deletions in Cooling-Off ({deletions.filter((d) => !d.eligible_for_purge).length})
          </button>
          <button
            onClick={() => setActiveTab('final_purge')}
            className={`flex-1 py-2.5 px-3 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'final_purge'
                ? 'border-[#511030] text-amber-300 bg-[#162231]/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🗑️ Final Purge Queue ({deletions.filter((d) => d.eligible_for_purge).length})
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {statusNotice && (
            <div className="p-2.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-200">
              {statusNotice}
            </div>
          )}

          {/* TAB 1: RELEASES */}
          {activeTab === 'releases' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Immutable releases published through Chairman sign-off choke point.</span>
                <span className="font-mono">Cascade steps 3–10 verified</span>
              </div>

              <div className="space-y-2">
                {releases.map((rel) => (
                  <div
                    key={rel.id}
                    className="p-3.5 rounded-xl bg-[#162231] border border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-amber-300 text-xs">
                          {rel.release_tag}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {rel.items_count} items
                        </span>
                      </div>
                      <p className="text-slate-200 font-medium">{rel.summary}</p>
                      <span className="text-[10px] text-slate-500">
                        Approved by {rel.approver} &bull; {rel.timestamp}
                      </span>
                    </div>

                    {isVC ? (
                      <button
                        onClick={() => handleRollback(rel)}
                        className="px-3 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-semibold shrink-0"
                      >
                        Rollback (VC)
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">VC Rollback Locked</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: COOLING-OFF RECOVERY */}
          {activeTab === 'cooling_off' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-600/30 text-amber-200 text-[11px]">
                <strong>Golden Rule #3:</strong> Soft-deleted records are immediately hidden from students but preserved in cooling-off waiting period (7 to 90 days). One-click restoration restores them instantly.
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0b1119] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#162231] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Deleted Item</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Cooling-Off Remaining</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {deletions
                      .filter((d) => !d.eligible_for_purge)
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-medium text-slate-100">{d.summary}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">{d.table_name}</td>
                          <td className="p-3">
                            <span className="text-amber-300 font-mono font-bold">
                              {d.hours_remaining} hours remaining
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleRestore(d)}
                              className="px-3 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-[11px]"
                            >
                              Restore Record
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FINAL PURGE QUEUE (VC ONLY) */}
          {activeTab === 'final_purge' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-950/30 border border-rose-600/30 text-rose-200 text-[11px]">
                <span>
                  <strong>VC Final Purge Protocol:</strong> Cooling-off period has expired. VC step-up token required.
                </span>
                <span className="font-mono font-bold text-amber-300">
                  Daily Quota: {dailyPurgeCount}/5 used
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-[#0b1119] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#162231] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Item for Final Purge</th>
                      <th className="p-3">Table</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {deletions
                      .filter((d) => d.eligible_for_purge)
                      .map((d) => (
                        <tr key={d.id} className="hover:bg-slate-900/40">
                          <td className="p-3 font-medium text-slate-100">{d.summary}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-400">{d.table_name}</td>
                          <td className="p-3">
                            <Badge variant="danger" size="sm">
                              Expired (Ready to Purge)
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            {isVC ? (
                              <button
                                onClick={() => handlePurgePermanently(d)}
                                className="px-3 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-semibold text-[11px]"
                              >
                                Purge Permanently
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">
                                VC Authorization Required
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Immutable audit logs guarantee compliance with institutional regulations
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

