'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';
import { Badge } from '@educompass/ui';

interface BatchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BatchMapping {
  batch: string;
  schemeName: string;
  schemeStatus: 'published' | 'draft' | 'archived';
  studentsCount: number;
}

const INITIAL_BATCHES: BatchMapping[] = [
  { batch: '2022', schemeName: 'Scheme 2022', schemeStatus: 'published', studentsCount: 165 },
  { batch: '2023', schemeName: 'Scheme 2022', schemeStatus: 'published', studentsCount: 172 },
  { batch: '2024', schemeName: 'Scheme 2022', schemeStatus: 'published', studentsCount: 180 },
  { batch: '2025', schemeName: 'Scheme 2022', schemeStatus: 'published', studentsCount: 185 },
  { batch: '2026', schemeName: 'Scheme 2026 (Draft)', schemeStatus: 'draft', studentsCount: 0 },
];

const AVAILABLE_SCHEMES = [
  'Scheme 2022',
  'Scheme 2026 (Draft)',
  'Scheme 2027 (Draft)',
];

export function BatchManagerModal({ isOpen, onClose }: BatchManagerModalProps) {
  const { saveDraftItem, activeRole } = useEditMode();

  const [batches, setBatches] = useState<BatchMapping[]>(INITIAL_BATCHES);
  const [newBatchYear, setNewBatchYear] = useState('2027');
  const [newBatchScheme, setNewBatchScheme] = useState('Scheme 2026 (Draft)');
  const [isAdding, setIsAdding] = useState(false);
  const [stagedNotice, setStagedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOperator = activeRole === 'operator';

  const handleReassignScheme = async (batchYear: string, targetScheme: string) => {
    if (isOperator) return;

    setBatches((prev) =>
      prev.map((b) =>
        b.batch === batchYear
          ? {
              ...b,
              schemeName: targetScheme,
              schemeStatus: targetScheme.includes('Draft') ? 'draft' : 'published',
            }
          : b
      )
    );

    await saveDraftItem(
      'curriculum',
      'batch_schemes',
      `batch-${batchYear}`,
      { batch: batchYear, scheme_name: targetScheme },
      'update',
      `Reassign Batch ${batchYear} to ${targetScheme}`
    );

    setStagedNotice(`Staged reassignment of Batch ${batchYear} to ${targetScheme} in pending changes.`);
    setTimeout(() => setStagedNotice(null), 4000);
  };

  const handleAddNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchYear.trim() || isOperator) return;

    const newEntry: BatchMapping = {
      batch: newBatchYear.trim(),
      schemeName: newBatchScheme,
      schemeStatus: newBatchScheme.includes('Draft') ? 'draft' : 'published',
      studentsCount: 0,
    };

    setBatches((prev) => [...prev, newEntry]);
    setIsAdding(false);

    await saveDraftItem(
      'curriculum',
      'batch_schemes',
      `batch-${newBatchYear.trim()}`,
      { batch: newBatchYear.trim(), scheme_name: newBatchScheme },
      'insert',
      `Add Admission Batch ${newBatchYear.trim()} mapped to ${newBatchScheme}`
    );

    setStagedNotice(`Staged new Batch ${newBatchYear.trim()} mapped to ${newBatchScheme}.`);
    setTimeout(() => setStagedNotice(null), 4000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Batch to Scheme Mapping Console"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 24,
          color: 'var(--text)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🎓</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Admission Batches &amp; Schemes</h2>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Section 3.3 (FC-13): Map student admission years to official curriculum scheme versions.
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {stagedNotice && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              fontSize: 11,
              marginBottom: 14,
            }}
          >
            ✓ {stagedNotice}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'var(--page)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, color: 'var(--muted)' }}>
                  <th style={{ padding: '8px 12px' }}>Admission Batch</th>
                  <th style={{ padding: '8px 12px' }}>Assigned Curriculum Scheme</th>
                  <th style={{ padding: '8px 12px' }}>Scheme Status</th>
                  <th style={{ padding: '8px 12px' }}>Enrolled Students</th>
                  {!isOperator && <th style={{ padding: '8px 12px', textAlign: 'right' }}>Reassign</th>}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.batch} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      Batch {b.batch}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text)' }}>
                      {b.schemeName}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge
                        variant={b.schemeStatus === 'published' ? 'default' : 'outline'}
                        className="text-[10px] capitalize"
                      >
                        {b.schemeStatus}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>
                      {b.studentsCount > 0 ? `${b.studentsCount} students` : 'Incoming'}
                    </td>
                    {!isOperator && (
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <select
                          value={b.schemeName}
                          onChange={(e) => handleReassignScheme(b.batch, e.target.value)}
                          style={{
                            fontSize: 11,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                          }}
                        >
                          {AVAILABLE_SCHEMES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isOperator && (
            <div>
              {!isAdding ? (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    background: 'transparent',
                    border: '1px dashed var(--border)',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add New Admission Batch
                </button>
              ) : (
                <form
                  onSubmit={handleAddNewBatch}
                  style={{
                    padding: 14,
                    borderRadius: 8,
                    background: 'var(--page)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                      Batch Year:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2027"
                      value={newBatchYear}
                      onChange={(e) => setNewBatchYear(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: 12,
                        width: 100,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                      Assign Scheme:
                    </label>
                    <select
                      value={newBatchScheme}
                      onChange={(e) => setNewBatchScheme(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontSize: 12,
                      }}
                    >
                      {AVAILABLE_SCHEMES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                    <button
                      type="submit"
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'var(--primary)',
                        color: '#fff',
                        fontWeight: 600,
                        border: 'none',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Stage Batch
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--muted)',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
