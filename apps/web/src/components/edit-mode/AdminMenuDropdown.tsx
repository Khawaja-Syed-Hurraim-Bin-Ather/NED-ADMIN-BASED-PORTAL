'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditMode, AdminRole } from '../../context/EditModeContext';
import { Badge } from '@educompass/ui';
import { ApprovalsModal } from './ApprovalsModal';
import { HistoryReleasesModal } from './HistoryReleasesModal';
import { AdminLoginModal } from './AdminLoginModal';
import { UploadsModal } from './UploadsModal';
import { PeopleModal } from './PeopleModal';
import { SettingsModal } from './SettingsModal';

export function AdminMenuDropdown() {
  const {
    activeRole,
    currentUser,
    setDemoAccount,
    signOutAdmin,
  } = useEditMode();

  const [isOpen, setIsOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [uploadsModalOpen, setUploadsModalOpen] = useState(false);
  const [peopleModalOpen, setPeopleModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setDemoMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Not signed in: completely hide from students ──
  if (!currentUser) {
    return null;
  }

  // ── Signed in: show full Admin dropdown ──
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--page)] transition-colors text-[var(--text)] shadow-sm cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span>Admin</span>
        {activeRole && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 uppercase font-mono">
            {activeRole}
          </Badge>
        )}
        <span className="text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl py-2 z-50 text-xs">
          {/* User identity section */}
          <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
            <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider block">Signed in as</span>
            <strong className="block text-[var(--text)] font-medium truncate">{currentUser.fullName}</strong>
            <span className="text-[10px] text-amber-400 font-mono capitalize">{currentUser.role} Account</span>
          </div>

          {/* Approvals Queue */}
          <button
            type="button"
            onClick={() => { setIsOpen(false); setApprovalsModalOpen(true); }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--page)] text-[var(--text)] transition-colors cursor-pointer"
          >
            <span>📋</span>
            <div>
              <span className="font-medium block">Approvals Queue</span>
              <span className="text-[10px] text-[var(--muted)] block">Review &amp; sign off pending drafts</span>
            </div>
          </button>

          {/* Uploads & Imports */}
          <button
            type="button"
            onClick={() => { setIsOpen(false); setUploadsModalOpen(true); }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--page)] text-[var(--text)] transition-colors cursor-pointer"
          >
            <span>📤</span>
            <div>
              <span className="font-medium block">Uploads &amp; Imports</span>
              <span className="text-[10px] text-[var(--muted)] block">Spreadsheet data &amp; dev inbox</span>
            </div>
          </button>

          {/* History & Releases */}
          <button
            type="button"
            onClick={() => { setIsOpen(false); setHistoryModalOpen(true); }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--page)] text-[var(--text)] transition-colors cursor-pointer"
          >
            <span>📜</span>
            <div>
              <span className="font-medium block">History &amp; Releases</span>
              <span className="text-[10px] text-[var(--muted)] block">Version snapshots &amp; rollbacks</span>
            </div>
          </button>

          {/* People & Access — chairman/vc only */}
          {(activeRole === 'chairman' || activeRole === 'vc') && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); setPeopleModalOpen(true); }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--page)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <span>👥</span>
              <div>
                <span className="font-medium block">People &amp; Access</span>
                <span className="text-[10px] text-[var(--muted)] block">Manage operator invitations</span>
              </div>
            </button>
          )}

          {/* System Settings — vc only */}
          {activeRole === 'vc' && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); setSettingsModalOpen(true); }}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--page)] text-[var(--text)] transition-colors cursor-pointer"
            >
              <span>⚙️</span>
              <div>
                <span className="font-medium block">System Settings</span>
                <span className="text-[10px] text-[var(--muted)] block">Chatbot budgets &amp; security</span>
              </div>
            </button>
          )}

          <div className="border-t border-[var(--border)] my-1 pt-1" />

          {/* Demo Persona Switcher — visible only when signed in */}
          <div className="px-3 py-1">
            <button
              onClick={() => setDemoMenuOpen((prev) => !prev)}
              className="w-full text-left font-semibold text-[11px] text-amber-400 flex items-center justify-between py-1 hover:underline"
            >
              <span>🧪 Switch Demo Role</span>
              <span>{demoMenuOpen ? '▲' : '▼'}</span>
            </button>

            {demoMenuOpen && (
              <div className="mt-1 space-y-1 pl-2 border-l border-amber-500/30">
                {(['operator', 'chairman', 'vc'] as AdminRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => {
                      setDemoAccount(role);
                      setIsOpen(false);
                      setDemoMenuOpen(false);
                    }}
                    className={`block w-full text-left py-1 text-[11px] rounded transition-colors ${
                      activeRole === role
                        ? 'font-bold text-amber-300'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {role === 'operator' ? 'Data Operator' : role === 'chairman' ? 'Department Chairman (CIS)' : 'Vice Chancellor'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] my-1 pt-1" />

          <button
            onClick={() => { signOutAdmin(); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/20 text-xs transition-colors"
          >
            🚪 Sign Out of Admin
          </button>
        </div>
      )}

      {/* Modals */}
      <AdminLoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <ApprovalsModal isOpen={approvalsModalOpen} onClose={() => setApprovalsModalOpen(false)} />
      <HistoryReleasesModal isOpen={historyModalOpen} onClose={() => setHistoryModalOpen(false)} />
      <UploadsModal isOpen={uploadsModalOpen} onClose={() => setUploadsModalOpen(false)} />
      <PeopleModal isOpen={peopleModalOpen} onClose={() => setPeopleModalOpen(false)} />
      <SettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </div>
  );
}
