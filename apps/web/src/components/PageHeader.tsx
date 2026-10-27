'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
  /** Page accent colour token, e.g. 'var(--cyan)' */
  accent?: string;
}

/** Inline SVG icons — no external dependency */
const Ic = {
  compass: (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5"/>
      <path d="m15.5 8.5-2.7 4.3-4.3 2.7 2.7-4.3 4.3-2.7Z"/>
    </svg>
  ),
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
    <svg className="icon-sm" style={{width:12,height:12,display:'inline-block',stroke:'currentColor',fill:'none',strokeWidth:2.2,strokeLinecap:'round',strokeLinejoin:'round'}} viewBox="0 0 24 24" aria-hidden="true">
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
  accent = 'var(--cyan)',
}: PageHeaderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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
    <header className="page-header">
      <div className="page-header-inner">
        {/* ── Left: Brand + Crumbs + Title ── */}
        <div className="page-header-left">
          {/* Brand mark */}
          <Link href="/" className="brand page-header-brand" aria-label="EduCompass home">
            <span className="brand-mark">{Ic.compass}</span>
            <span className="brand-word">Edu<em>Compass</em></span>
          </Link>

          {/* Breadcrumb trail */}
          <nav className="page-crumbs" aria-label="Breadcrumb">
            <Link href="/dashboard" className="page-crumb-link">Dashboard</Link>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                <span className="page-crumb-sep" aria-hidden="true">{Ic.chevron}</span>
                {crumb.href ? (
                  <Link href={crumb.href} className="page-crumb-link">{crumb.label}</Link>
                ) : (
                  <span className="page-crumb-active">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Page title row */}
          <div className="page-header-title-row">
            <h1 className="page-title">{title}</h1>
            {badge && (
              <span className="pill pill-cyan page-badge">{badge}</span>
            )}
            {/* Live status pill */}
            <span className="page-status-pill">
              <span className="live-dot" style={{ background: 'var(--sage)', boxShadow: '0 0 0 4px rgba(154,195,169,.15)' }} />
              Guidance engine online
            </span>
          </div>

          {description && (
            <p className="page-header-desc">{description}</p>
          )}
        </div>

        {/* ── Right: Actions + Theme toggle + Dashboard ── */}
        <div className="page-header-right">
          {actions}

          <button
            className="button button-icon"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title="Toggle theme"
          >
            {theme === 'dark' ? Ic.sun : Ic.moon}
          </button>

          <Link href="/dashboard" className="button button-secondary page-dashboard-btn">
            {Ic.dashboard}
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Accent underline */}
      <div className="page-header-accent" style={{ background: accent }} aria-hidden="true" />
    </header>
  );
}
