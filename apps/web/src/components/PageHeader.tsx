'use client';

import React from 'react';
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
}

export function PageHeader({
  title,
  breadcrumbs,
  badge,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="border-b border-[rgba(213,228,236,0.12)] bg-[#0b1119]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 md:px-10 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Breadcrumbs + Title */}
        <div>
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <span className="w-5 h-5 rounded-md bg-[rgba(155,203,208,0.15)] border border-[rgba(155,203,208,0.4)] flex items-center justify-center text-[#9bcbd0] font-bold text-[10px]">
                EC
              </span>
              <span>EduCompass</span>
            </Link>

            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                <span className="text-slate-600">/</span>
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-[#9bcbd0] font-bold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[rgba(155,203,208,0.12)] text-[#9bcbd0] border border-[rgba(155,203,208,0.3)]">
                {badge}
              </span>
            )}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Engine Online
            </span>
          </div>

          {description && (
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {actions}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(213,228,236,0.15)] bg-[#14212c] hover:bg-[#1a2c3a] hover:border-[rgba(155,203,208,0.4)] text-xs font-bold text-slate-200 transition-all shadow-sm"
          >
            <svg className="w-3.5 h-3.5 text-[#91accb]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
            </svg>
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
