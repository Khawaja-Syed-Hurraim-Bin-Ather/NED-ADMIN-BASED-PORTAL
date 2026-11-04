'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useEditMode } from '../../context/EditModeContext';

interface UploadsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface UploadRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  status: 'received' | 'parsing' | 'staged' | 'rejected';
  rowCount?: number;
}

// PII columns to strip before staging (Rule 3 / Rule 119)
const PII_COLUMNS = [
  'student_name', 'name', 'roll_no', 'roll_number', 'student_id',
  'email', 'phone', 'contact', 'address', 'cnic',
];

function stripPiiColumns(rows: ParsedRow[]): { stripped: ParsedRow[]; removedKeys: string[] } {
  if (rows.length === 0) return { stripped: [], removedKeys: [] };
  const allKeys = Object.keys(rows[0]);
  const removedKeys = allKeys.filter((k) => PII_COLUMNS.includes(k.toLowerCase().trim()));
  const keepKeys = allKeys.filter((k) => !PII_COLUMNS.includes(k.toLowerCase().trim()));
  const stripped = rows.map((row) => {
    const clean: ParsedRow = {};
    keepKeys.forEach((k) => { clean[k] = row[k]; });
    return clean;
  });
  return { stripped, removedKeys };
}

// Very lightweight CSV parser (no external dep)
function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

// Demo recent uploads
const DEMO_UPLOADS: UploadRecord[] = [
  { id: 'ul-001', filename: 'fyp_projects_2022_2025.csv', uploadedAt: '2026-10-31 18:20', status: 'staged', rowCount: 68 },
  { id: 'ul-002', filename: 'course_catalog_scheme2026.xlsx', uploadedAt: '2026-10-30 14:05', status: 'received', rowCount: 141 },
  { id: 'ul-003', filename: 'professors_cis_oct2026.csv', uploadedAt: '2026-10-28 09:30', status: 'rejected' },
];

const STATUS_BADGE: Record<UploadRecord['status'], { label: string; color: string }> = {
  received: { label: 'Received', color: 'var(--info)' },
  parsing: { label: 'Parsing…', color: 'var(--warning)' },
  staged: { label: 'Staged', color: 'var(--success)' },
  rejected: { label: 'Rejected', color: 'var(--danger)' },
};

export function UploadsModal({ isOpen, onClose }: UploadsModalProps) {
  const { currentUser } = useEditMode();
  const [activeTab, setActiveTab] = useState<'import' | 'pipeline'>('import');

  // Lane A state
  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [removedPiiKeys, setRemovedPiiKeys] = useState<string[]>([]);
  const [filename, setFilename] = useState('');
  const [parseStage, setParseStage] = useState<'idle' | 'parsing' | 'preview' | 'staged'>('idle');
  const [stageError, setStageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lane B state
  const [recentUploads] = useState<UploadRecord[]>(DEMO_UPLOADS);

  const handleFile = useCallback((file: File) => {
    setStageError(null);
    const allowedTypes = [
      'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setStageError('Only CSV or Excel (.xlsx/.xls) files are accepted.');
      return;
    }
    setFilename(file.name);
    setParseStage('parsing');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCsv(text);
        const { stripped, removedKeys } = stripPiiColumns(rows);
        setParsedRows(stripped);
        setRemovedPiiKeys(removedKeys);
        setParseStage('preview');
      } catch {
        setStageError('Failed to parse the file. Ensure it is a valid CSV.');
        setParseStage('idle');
      }
    };
    reader.readAsText(file);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function confirmStage() {
    // In real implementation: POST to API with parsedRows as draft items
    setParseStage('staged');
  }

  function resetImport() {
    setParsedRows([]);
    setRemovedPiiKeys([]);
    setFilename('');
    setParseStage('idle');
    setStageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const developerEmail = 'dev@nedut.edu.pk';
  const mailtoLink = `mailto:${developerEmail}?subject=EduCompass%20Pipeline%20Data%20Submission&body=Please%20find%20attached%20the%20data%20file%20for%20processing.%0A%0AOperator%3A%20${encodeURIComponent(currentUser?.email ?? '')}%0ADate%3A%20${encodeURIComponent(new Date().toLocaleDateString())}`;

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Uploads & Imports"
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)', color: 'var(--text)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>📤 Uploads &amp; Imports</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Import data into draft staging or send files to the developer pipeline
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, padding: '2px 6px' }} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, padding: '0 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {(['import', 'pipeline'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 16px', fontSize: 12, fontWeight: activeTab === tab ? 600 : 400,
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: activeTab === tab ? 'var(--primary)' : 'var(--muted)',
                borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                transition: 'all 0.15s', marginBottom: -1,
              }}
            >
              {tab === 'import' ? 'Lane A: Import into Draft' : 'Lane B: Developer Pipeline'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flexGrow: 1 }}>
          {/* ── Lane A: Import into Draft ── */}
          {activeTab === 'import' && (
            <div>
              {parseStage === 'idle' && (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 10, padding: '40px 24px', textAlign: 'center',
                      cursor: 'pointer', transition: 'border-color 0.15s',
                      background: dragOver ? 'var(--primary-tint)' : 'var(--page)',
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>📁</div>
                    <p style={{ margin: '0 0 6px', fontWeight: 500, fontSize: 14 }}>
                      Drag &amp; drop a CSV or Excel file here
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                      or click to browse — accepts .csv, .xlsx, .xls
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      style={{ display: 'none' }}
                      onChange={handleInputChange}
                    />
                  </div>
                  {stageError && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 7, fontSize: 12, color: 'var(--danger)' }}>
                      {stageError}
                    </div>
                  )}
                  <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--page)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--muted)' }}>
                    <strong style={{ color: 'var(--text)' }}>Privacy notice:</strong> Student PII columns (name, roll number, email, CNIC, etc.) are automatically stripped before staging. Only structured academic data is accepted.
                  </div>
                </>
              )}

              {parseStage === 'parsing' && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>Parsing <strong>{filename}</strong>…</p>
                </div>
              )}

              {parseStage === 'preview' && parsedRows.length > 0 && (
                <>
                  <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>📄 {filename}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                        {parsedRows.length} rows parsed
                        {removedPiiKeys.length > 0 && (
                          <span style={{ color: 'var(--warning)', marginLeft: 8 }}>
                            · {removedPiiKeys.length} PII column(s) stripped: {removedPiiKeys.join(', ')}
                          </span>
                        )}
                      </p>
                    </div>
                    <button onClick={resetImport} style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
                      Clear
                    </button>
                  </div>

                  {/* Preview table */}
                  <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 14 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                      <thead>
                        <tr style={{ background: 'var(--page)' }}>
                          {Object.keys(parsedRows[0]).map((col) => (
                            <th key={col} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 8).map((row, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} style={{ padding: '5px 10px', color: 'var(--text)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 8 && (
                      <p style={{ margin: 0, padding: '6px 10px', fontSize: 11, color: 'var(--muted)', background: 'var(--page)' }}>
                        …and {parsedRows.length - 8} more rows
                      </p>
                    )}
                  </div>

                  <button
                    onClick={confirmStage}
                    style={{ padding: '9px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    ✅ Confirm &amp; Stage as Draft ({parsedRows.length} rows)
                  </button>
                </>
              )}

              {parseStage === 'preview' && parsedRows.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>
                  <p>No valid rows found in the file. Please check the format and try again.</p>
                  <button onClick={resetImport} style={{ marginTop: 8, padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>Try again</button>
                </div>
              )}

              {parseStage === 'staged' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: 14, color: 'var(--success)' }}>
                    {parsedRows.length} rows staged as draft change items
                  </p>
                  <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--muted)' }}>
                    They will appear in the Approvals Queue for review.
                  </p>
                  <button onClick={resetImport} style={{ padding: '7px 16px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>
                    Import another file
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Lane B: Developer Pipeline ── */}
          {activeTab === 'pipeline' && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  Recent uploads submitted to the developer extraction pipeline.
                </p>
                <a
                  href={mailtoLink}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', background: 'var(--primary)', color: '#fff',
                    borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 600,
                  }}
                >
                  📧 Notify Developer Team
                </a>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--warning)' }}>
                Note: Clicking &quot;Notify Developer Team&quot; opens your email client (mailto:). No email is sent automatically.
              </p>

              <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--page)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Filename</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Uploaded</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Rows</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUploads.map((ul) => {
                      const badge = STATUS_BADGE[ul.status];
                      return (
                        <tr key={ul.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: 'var(--text)' }}>{ul.filename}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{ul.uploadedAt}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{ul.rowCount ?? '—'}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${badge.color}20`, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
                Demo data — live pipeline records will appear here once connected to the extraction service.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
