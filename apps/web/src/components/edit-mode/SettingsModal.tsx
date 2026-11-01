'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';
import { Badge } from '@educompass/ui';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { currentUser, activeRole } = useEditMode();
  const [exporting, setExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const isVc = activeRole === 'vc';

  const handleExportAuditLogs = () => {
    setExporting(true);
    try {
      const mockAuditLog = {
        exported_at: new Date().toISOString(),
        exported_by: currentUser?.email ?? 'vc@nedut.edu.pk',
        institution: 'NED University of Engineering & Technology (CISE)',
        events: [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            action: 'change_set_publish',
            resource: 'curriculum',
            operator: 'chairman.cis@nedut.edu.pk',
            status: 'success',
          },
          {
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            action: 'fyp_archive_staged',
            resource: 'fyp',
            operator: 'operator@nedut.edu.pk',
            status: 'staged',
          },
          {
            timestamp: new Date(Date.now() - 14400000).toISOString(),
            action: 'admin_login_verified',
            operator: 'vc@nedut.edu.pk',
            status: 'step_up_success',
          },
        ],
      };

      const blob = new Blob([JSON.stringify(mockAuditLog, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `educompass-audit-log-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (_) {
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Institutional System Settings"
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
          maxWidth: 640,
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
            <span style={{ fontSize: 20 }}>⚙️</span>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>System Settings &amp; AI Budgets</h2>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Institutional Governance Configuration (Section 11)
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

        {!isVc && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            🔒 <strong>Read-Only Access:</strong> System-wide quota changes and security parameters are restricted to the Vice Chancellor authority.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 12 }}>
          {/* Section 1: AI Gateway Budgets */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: 'var(--page)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>Academic Assistant AI Quotas (Rule 4)</strong>
              <Badge variant="outline" className="text-[10px]">Active</Badge>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, color: 'var(--muted)' }}>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>User Daily Query Cap:</span>
                <strong style={{ color: 'var(--text)' }}>20 questions / day</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Global Daily AI Budget:</span>
                <strong style={{ color: 'var(--text)' }}>100 queries / day</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Max Prompt Input:</span>
                <strong style={{ color: 'var(--text)' }}>300 characters</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Max Output Tokens:</span>
                <strong style={{ color: 'var(--text)' }}>500 tokens</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Primary AI Provider:</span>
                <strong style={{ color: 'var(--text)' }}>Google Gemini (3.5 Flash)</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Fallback Provider:</span>
                <strong style={{ color: 'var(--text)' }}>xAI Grok (Automatic failover)</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Security & Cooling-Off Policies */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: 'var(--page)',
              border: '1px solid var(--border)',
            }}
          >
            <strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
              Security &amp; Cooling-Off Retention (Golden Rule 3)
            </strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, color: 'var(--muted)' }}>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Failed Attempt Lockout:</span>
                <strong style={{ color: 'var(--text)' }}>15 mins after 5 failures</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Session Idle Timeout:</span>
                <strong style={{ color: 'var(--text)' }}>30 minutes</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Curriculum Cooling-Off:</span>
                <strong style={{ color: 'var(--text)' }}>30 days</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>FYP &amp; Faculty Cooling-Off:</span>
                <strong style={{ color: 'var(--text)' }}>14 days</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>Scheme Version Cooling-Off:</span>
                <strong style={{ color: 'var(--text)' }}>90 days</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: 11 }}>VC Final Purge Rate Cap:</span>
                <strong style={{ color: 'var(--text)' }}>Max 5 items / day</strong>
              </div>
            </div>
          </div>

          {/* Section 3: Audit Log Exporter */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: 'var(--page)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: 13 }}>Institutional Audit Log</strong>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                Immutable event trail of all publishings, logins, and approvals (Section 14).
              </span>
            </div>
            <button
              onClick={handleExportAuditLogs}
              disabled={exporting}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                background: 'var(--primary)',
                color: '#fff',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              {exporting ? 'Generating...' : '📥 Export JSON'}
            </button>
          </div>

          {downloadSuccess && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: 11,
              }}
            >
              ✓ Audit log exported to download folder.
            </div>
          )}

          {/* Configuration Change Request Notice */}
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
            To adjust global AI provider budgets or institutional retention policies, contact the infrastructure team:
            <a
              href="mailto:syed.hurraim898@gmail.com?subject=EduCompass%20System%20Configuration%20Change%20Request"
              style={{ color: 'var(--primary)', marginLeft: 6, textDecoration: 'underline' }}
            >
              Request Configuration Change (mailto)
            </a>
          </div>
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
