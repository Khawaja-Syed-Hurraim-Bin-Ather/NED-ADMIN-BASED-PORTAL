'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BatchPicker, BatchNoticeBanner } from './BatchPicker';
import { useEditMode } from '../context/EditModeContext';
import { EditModeBanner } from './edit-mode/EditModeBanner';
import { PendingDrawer } from './edit-mode/PendingDrawer';
import { AdminMenuDropdown } from './edit-mode/AdminMenuDropdown';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  badge?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Page accent colour token, e.g. '#511030' */
  accent?: string;
}

/** Inline SVG icons — 1.5px stroke, no external dependency */
const Ic = {
  dashboard: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1"/>
      <rect x="13.5" y="3.5" width="7" height="7" rx="1"/>
      <rect x="3.5" y="13.5" width="7" height="7" rx="1"/>
      <rect x="13.5" y="13.5" width="7" height="7" rx="1"/>
    </svg>
  ),
  sun: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>
    </svg>
  ),
  moon: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 15.2A8.5 8.5 0 0 1 8.8 3.2 8.5 8.5 0 1 0 20.8 15.2Z"/>
    </svg>
  ),
  chevron: (
    <svg className="icon-sm" style={{width:12,height:12,display:'inline-block',stroke:'currentColor',fill:'none',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
};

export function PageHeader({
  title,
  breadcrumbs,
  badge,
  description,
  actions,
  accent = '#511030',
}: PageHeaderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  const {
    isEditMode,
    toggleEditMode,
    pendingCount,
    setIsPendingDrawerOpen,
    activeRole,
    currentUser,
  } = useEditMode();

  useEffect(() => {
    const stored = localStorage.getItem('educompass-theme') as 'dark' | 'light' | null;
    if (stored) setTheme(stored);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('educompass-theme', next);
  }

  return (
    <header className="page-header" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="page-header-inner" style={{ maxWidth: 1360, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        {/* ── Left: Official NED Brand + Crumbs + Title ── */}
        <div className="page-header-left" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* Official Brand */}
            <Link href="/" className="brand" aria-label="EduCompass home">
              <img
                src="/assets/brand/ned-logo.png"
                alt="NED University of Engineering & Technology"
                className="brand-logo-img"
                style={{ height: 36, width: 'auto' }}
              />
              <div className="brand-text-block">
                <span className="brand-title">EduCompass</span>
                <span className="brand-dept">NED CISE</span>
              </div>
            </Link>

            <span style={{ color: 'var(--border)' }}>|</span>

            {/* Breadcrumb trail */}
            <nav className="page-crumbs" aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Dashboard</Link>
              {breadcrumbs.map((crumb) => (
                <React.Fragment key={crumb.label}>
                  <span style={{ color: 'var(--muted-2)' }} aria-hidden="true">{Ic.chevron}</span>
                  {crumb.href ? (
                    <Link href={crumb.href} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{crumb.label}</Link>
                  ) : (
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Page title row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>{title}</h1>
            {badge && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'var(--primary-tint)', color: 'var(--primary)', fontWeight: 500 }}>
                {badge}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
              <span className="live-dot" style={{ width: 6, height: 6 }} />
              Guidance engine online
            </span>
          </div>

          {description && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', maxWidth: 720 }}>{description}</p>
          )}
        </div>

        {/* ── Right: Actions + Edit Mode Switch + Theme toggle + Dashboard ── */}
        <div className="page-header-right" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <React.Suspense fallback={null}>
            <BatchPicker />
          </React.Suspense>

          {/* Edit Mode Switch & Admin Controls (v3 Section 2.1) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {(activeRole || currentUser) && (
              <>
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isEditMode
                      ? 'bg-amber-500 text-black border-amber-600 shadow-sm'
                      : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:bg-[var(--color-bg)]'
                  }`}
                  title="Toggle institutional edit mode"
                >
                  <span>Edit mode</span>
                  <span className={`w-2 h-2 rounded-full ${isEditMode ? 'bg-black animate-pulse' : 'bg-slate-400'}`} />
                </button>

                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsPendingDrawerOpen(true)}
                    className="px-2 py-1 rounded-md text-xs font-medium border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 cursor-pointer flex items-center gap-1"
                  >
                    <span>Pending</span>
                    <span className="bg-amber-500 text-black px-1.5 rounded-full text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  </button>
                )}
              </>
            )}

            <AdminMenuDropdown />
          </div>

          {actions}

          <button
            className="button button-icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title="Toggle theme"
          >
            {theme === 'dark' ? Ic.sun : Ic.moon}
          </button>

          <Link href="/dashboard" className="button button-secondary" style={{ fontSize: 13, padding: '6px 14px' }}>
            {Ic.dashboard}
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Hairline subtle accent */}
      <div style={{ height: 2, background: accent, opacity: 0.8 }} aria-hidden="true" />
      <React.Suspense fallback={null}>
        <BatchNoticeBanner />
      </React.Suspense>

      {/* Edit Mode Draft Status Banner & Drawer (v3 Section 2.1 & 2.2) */}
      <EditModeBanner />
      <PendingDrawer />
    </header>
  );
}

