'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useEditMode, AdminRole } from '../../context/EditModeContext';
import { Badge } from '@educompass/ui';
import { ApprovalsModal } from './ApprovalsModal';
import { HistoryReleasesModal } from './HistoryReleasesModal';

export function AdminMenuDropdown() {
  const {
    activeRole,
    currentUser,
    setDemoAccount,
    signOutAdmin,
  } = useEditMode();

  const [isOpen, setIsOpen] = useState(false);
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [approvalsModalOpen, setApprovalsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
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

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-bg)] transition-colors text-[var(--color-text)] shadow-sm cursor-pointer"
        aria-expanded={isOpen}
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
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl py-2 z-50 text-xs">
          {currentUser && (
            <div className="px-3 py-2 border-b border-[var(--color-border)] mb-1">
              <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block">Signed in as:</span>
              <strong className="block text-slate-100 font-medium truncate">{currentUser.fullName}</strong>
              <span className="text-[10px] text-amber-400 font-mono capitalize">{currentUser.role} Account</span>
            </div>
          )}

          {/* Core Admin Modals & Controls per v3 Section 4 */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setApprovalsModalOpen(true);
            }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <span>📋</span>
            <div>
              <span className="font-medium block">Approvals Queue</span>
              <span className="text-[10px] text-[var(--color-muted)] block">Review & sign off pending drafts</span>
            </div>
          </button>

          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors"
          >
            <span>📤</span>
            <div>
              <span className="font-medium block">Uploads & Imports</span>
              <span className="text-[10px] text-[var(--color-muted)] block">Spreadsheet data & dev inbox</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setHistoryModalOpen(true);
            }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors cursor-pointer"
          >
            <span>📜</span>
            <div>
              <span className="font-medium block">History & Releases</span>
              <span className="text-[10px] text-[var(--color-muted)] block">Version snapshots & rollbacks</span>
            </div>
          </button>

          {(activeRole === 'chairman' || activeRole === 'vc') && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors"
            >
              <span>👥</span>
              <div>
                <span className="font-medium block">People & Access</span>
                <span className="text-[10px] text-[var(--color-muted)] block">Manage operator invitations</span>
              </div>
            </Link>
          )}

          {activeRole === 'vc' && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--color-bg)] text-[var(--color-text)] transition-colors"
            >
              <span>⚙️</span>
              <div>
                <span className="font-medium block">System Settings</span>
                <span className="text-[10px] text-[var(--color-muted)] block">Chatbot budgets & security</span>
              </div>
            </Link>
          )}

          <div className="border-t border-[var(--color-border)] my-1 pt-1" />

          {/* Demo Persona Switcher (v3 Section 5.5) */}
          <div className="px-3 py-1">
            <button
              onClick={() => setDemoMenuOpen((prev) => !prev)}
              className="w-full text-left font-semibold text-[11px] text-amber-400 flex items-center justify-between py-1 hover:underline"
            >
              <span>🧪 Demo Mode Personas</span>
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
                        : 'text-[var(--color-muted)] hover:text-white'
                    }`}
                  >
                    Switch to {role === 'operator' ? 'Data Operator' : role === 'chairman' ? 'Department Chairman (CIS)' : 'Vice Chancellor'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-border)] my-1 pt-1" />

          <button
            onClick={() => {
              signOutAdmin();
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-rose-400 hover:bg-rose-950/20 text-xs transition-colors"
          >
            🚪 Sign Out of Admin
          </button>
        </div>
      )}

      {/* Auxiliary Modals (v3 Section 4) */}
      <ApprovalsModal
        isOpen={approvalsModalOpen}
        onClose={() => setApprovalsModalOpen(false)}
      />
      <HistoryReleasesModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </div>
  );
}

