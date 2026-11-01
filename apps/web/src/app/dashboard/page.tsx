'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useEditMode } from '../../context/EditModeContext';
import { AdminMenuDropdown } from '../../components/edit-mode/AdminMenuDropdown';
import { EditModeBanner } from '../../components/edit-mode/EditModeBanner';
import { PendingDrawer } from '../../components/edit-mode/PendingDrawer';

// ─── SVG Line Icons (1.5px stroke, no 3D or cartoon illustrations) ───────────

const Icons = {
  compass: (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  dashboard: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  book: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  users: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  calendar: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  layers: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  bot: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  ),
  calculator: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <path d="M16 10h.01" />
      <path d="M12 10h.01" />
      <path d="M8 10h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M12 18h.01" />
      <path d="M8 18h.01" />
    </svg>
  ),
  rocket: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  github: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  ),
  settings: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  sun: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  ),
  moon: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.8 15.2A8.5 8.5 0 0 1 8.8 3.2 8.5 8.5 0 1 0 20.8 15.2Z" />
    </svg>
  ),
  menu: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  arrowRight: (
    <svg className="icon-sm" style={{ width: 12, height: 12 }} viewBox="0 0 24 24" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  info: (
    <svg className="icon icon-sm" style={{ width: 14, height: 14, display: 'inline-block', verticalAlign: 'middle' }} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  check: (
    <svg className="icon icon-sm" style={{ width: 14, height: 14 }} viewBox="0 0 24 24" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'public' | 'enrolled' | 'admin';
  current_semester: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const {
    isEditMode,
    toggleEditMode,
    pendingCount,
    setIsPendingDrawerOpen,
    currentUser,
    viewAsStudent,
    activeScheme,
    saveDraftItem,
  } = useEditMode();

  const [announcementText, setAnnouncementText] = useState('Scheme 2026 elective choices and course schedules are currently in administrative review.');
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem('educompass-theme') as 'dark' | 'light') || 'light';
    document.documentElement.dataset.theme = stored;
    setIsDark(stored === 'dark');

    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Standard student fallback context
          setProfile({
            id: 'ned-student',
            email: 'ayesha.khan@cloud.neduet.edu.pk',
            full_name: 'Ayesha Khan',
            role: 'enrolled',
            current_semester: 6,
          });
          setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          setProfile(data as UserProfile);
        } else {
          setProfile({
            id: user.id,
            email: user.email ?? 'student@cloud.neduet.edu.pk',
            full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Student',
            role: 'enrolled',
            current_semester: 6,
          });
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('educompass-theme', next);
    setIsDark(!isDark);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const studentFullName = profile?.full_name || 'Ayesha Khan';
  const firstName = studentFullName.split(' ')[0] || 'Student';
  const studentInitials = studentFullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AK';

  // Format date: Weekday, D Month (e.g. Wednesday, 28 October)
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Time of day greeting
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const currentSem = profile?.current_semester ?? 6;

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--page)', color: 'var(--muted)', fontSize: 14 }}>
        Loading student overview...
      </main>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* ── Left Sidebar (Collapsible, Line icons, Institutional) ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        {/* Brand */}
        <div style={{ padding: '4px 10px 24px', borderBottom: '1px solid var(--border)' }}>
          <Link href="/" className="brand" aria-label="EduCompass home">
            <img
              src="/assets/brand/ned-logo.png"
              alt="NED University of Engineering & Technology, Karachi"
              className="brand-logo-img"
              style={{ height: 36, width: 'auto' }}
            />
            <div className="brand-text-block">
              <span className="brand-title">EduCompass</span>
              <span className="brand-dept">NED CISE</span>
            </div>
          </Link>
        </div>

        {/* Workspace links */}
        <div className="side-label eyebrow" style={{ marginTop: 20 }}>Workspace</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          <Link href="/dashboard" className="active">
            {Icons.dashboard}
            <span>Overview</span>
          </Link>
          <Link href="/fyp">
            {Icons.book}
            <span>FYP Archive</span>
          </Link>
          <Link href="/professors">
            {Icons.users}
            <span>Professors</span>
          </Link>
          <Link href="/planner">
            {Icons.calendar}
            <span>Degree Planner</span>
          </Link>
          <Link href="/explorer">
            {Icons.layers}
            <span>Prerequisite Explorer</span>
          </Link>
          <Link href="/chat">
            {Icons.bot}
            <span>AI Assistant</span>
          </Link>
        </nav>

        {/* Planning links */}
        <div className="side-label eyebrow" style={{ marginTop: 20 }}>Planning</div>
        <nav className="side-nav" aria-label="Planning navigation">
          <Link href="/gpa">
            {Icons.calculator}
            <span>GPA Calculator</span>
          </Link>
          <Link href="/careers">
            {Icons.rocket}
            <span>Career Hub</span>
          </Link>
          <Link href="/recommendations">
            {Icons.github}
            <span>GitHub Recommender</span>
          </Link>
        </nav>

        <div className="sidebar-spacer" />

        {/* User profile capsule */}
        <div className="sidebar-user" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: '#511030',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {studentInitials}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {studentFullName}
            </strong>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>
              BE-CSE &bull; Semester {currentSem}
            </span>
          </div>
          <Link href="/settings" title="Profile Settings" aria-label="Settings" style={{ color: 'var(--muted)' }}>
            {Icons.settings}
          </Link>
        </div>
      </aside>

      {/* ── Main Dashboard Canvas ── */}
      <main className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="crumbs">
            <span>EduCompass</span>
            <span style={{ color: 'var(--muted-2)' }}>&rsaquo;</span>
            <strong>Overview</strong>
          </div>

          <div className="topbar-actions">
            <button
              className="button button-icon mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
            >
              {Icons.menu}
            </button>

            <div className="status-pill">
              <span className="live-dot" />
              Guidance engine online
            </div>

            {mounted && currentUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={toggleEditMode}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isEditMode
                      ? 'bg-amber-500 text-black border-amber-600 shadow-sm'
                      : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--page)]'
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

                <AdminMenuDropdown />
              </div>
            )}

            <button
              className="button button-icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title="Switch theme"
            >
              {isDark ? Icons.sun : Icons.moon}
            </button>

            <button
              className="button button-ghost"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={handleSignOut}
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </header>

        <EditModeBanner />
        <PendingDrawer />

        {/* Content Area (Max width 1360px per spec) */}
        <div className="dashboard-content" style={{ maxWidth: 1360, margin: '0 auto', paddingTop: 28 }}>
          {/* Greeting per spec: Good {timeOfDay}, {firstName} */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 4 }}>
              {dateFormatted}
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: 'var(--text)' }}>
              Good {timeOfDay}, {firstName}
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>
              Here is where you stand this semester.
            </p>
          </div>

          {/* Institutional Announcement Editor (Module 8 Edit Mode) */}
          {isEditMode && !viewAsStudent && (
            <div
              style={{
                marginBottom: 24,
                padding: '14px 18px',
                borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>📢 Batch Announcement Banner</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontWeight: 600 }}>Edit Mode</span>
                </div>
                {!isEditingAnnouncement ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text)' }}>
                    &ldquo;{announcementText}&rdquo;
                  </p>
                ) : (
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {!isEditingAnnouncement ? (
                  <button
                    onClick={() => setIsEditingAnnouncement(true)}
                    className="button button-secondary"
                    style={{ fontSize: 12, padding: '4px 12px' }}
                  >
                    ✎ Edit Announcement
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        await saveDraftItem(
                          'dashboard',
                          'system_announcements',
                          'announcement-main',
                          { text: announcementText, scheme: activeScheme },
                          'update',
                          'Update batch announcement message'
                        );
                        setIsEditingAnnouncement(false);
                      }}
                      className="button button-primary"
                      style={{ fontSize: 12, padding: '4px 12px' }}
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() => setIsEditingAnnouncement(false)}
                      className="button button-ghost"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 4 Stat Cards per spec */}
          <section className="metric-grid" aria-label="Academic statistics">
            {/* Card 1: Current CGPA */}
            <article className="metric-card">
              <div className="metric-head">
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Current CGPA</span>
                <span title="Guidance estimate, not an official university transcript" style={{ color: 'var(--muted-2)', cursor: 'help' }}>
                  {Icons.info}
                </span>
              </div>
              <div className="metric-value mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '12px 0 4px' }}>
                3.42<small style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}> / 4.00</small>
              </div>
              <div className="metric-foot" style={{ fontSize: 12, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--success)', fontWeight: 500 }}>+0.18</span> vs last term
              </div>
            </article>

            {/* Card 2: Credits Completed with gold fill progress bar */}
            <article className="metric-card">
              <div className="metric-head">
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Credits completed</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>50%</span>
              </div>
              <div className="metric-value mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '12px 0 4px' }}>
                68<small style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}> / 136</small>
              </div>
              <div className="metric-meter" style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: '50%', background: '#FFAE07', borderRadius: 3 }} />
              </div>
            </article>

            {/* Card 3: FYP Shortlist */}
            <article className="metric-card">
              <div className="metric-head">
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>FYP shortlist</span>
                <Link href="/fyp" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                  View all
                </Link>
              </div>
              <div className="metric-value mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '12px 0 4px' }}>
                06<small style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}> projects</small>
              </div>
              <div className="metric-foot" style={{ fontSize: 12, color: 'var(--muted)' }}>
                Saved across 3 domains
              </div>
            </article>

            {/* Card 4: Current Semester */}
            <article className="metric-card">
              <div className="metric-head">
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Current semester</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Fall 2026</span>
              </div>
              <div className="metric-value mono" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: '12px 0 4px' }}>
                Semester {currentSem}<small style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}> of 8</small>
              </div>
              <div className="metric-foot" style={{ fontSize: 12, color: 'var(--muted)' }}>
                Target graduation Spring 2028
              </div>
            </article>
          </section>

          {/* Academic Progress Chart + Timeline Grid */}
          <div className="dashboard-analytics-grid">
            {/* Chart per spec: Academic progress, Last 4 terms, maroon line, gold dot on current term, light grid lines */}
            <section className="panel" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Academic progress</h3>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>CGPA trend over last 4 terms</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
                  Last 4 terms
                </span>
              </div>

              {/* Line chart svg */}
              <div style={{ position: 'relative', height: 180, width: '100%' }}>
                <svg viewBox="0 0 500 160" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                  {/* Subtle horizontal grid lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="70" x2="500" y2="70" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="110" x2="500" y2="110" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" y1="150" x2="500" y2="150" stroke="var(--border)" strokeWidth="1" />

                  {/* Maroon trend line */}
                  <polyline
                    fill="none"
                    stroke="#511030"
                    strokeWidth="2.5"
                    points="40,118 160,94 300,72 440,42"
                  />

                  {/* Past term dots */}
                  <circle cx="40" cy="118" r="4.5" fill="var(--surface)" stroke="#511030" strokeWidth="2" />
                  <circle cx="160" cy="94" r="4.5" fill="var(--surface)" stroke="#511030" strokeWidth="2" />
                  <circle cx="300" cy="72" r="4.5" fill="var(--surface)" stroke="#511030" strokeWidth="2" />

                  {/* Gold dot on current term per spec */}
                  <circle cx="440" cy="42" r="6" fill="#FFAE07" stroke="#511030" strokeWidth="2.5" />
                </svg>

                {/* Term labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                  <span>Sem 03 (3.12)</span>
                  <span>Sem 04 (3.24)</span>
                  <span>Sem 05 (3.32)</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>Sem 06 (3.42) &bull; Current</span>
                </div>
              </div>
            </section>

            {/* Progress Section: Semester Timeline 1 to 8 + Milestones per spec */}
            <section className="panel" style={{ padding: 22 }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Semester progression</h3>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Eight-semester curriculum timeline</span>
              </div>

              {/* 1 to 8 timeline with current marked in gold */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 20 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                  const isCurrent = sem === currentSem;
                  const isPast = sem < currentSem;
                  return (
                    <div
                      key={sem}
                      style={{
                        padding: '8px 2px',
                        textAlign: 'center',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: isCurrent ? '#FFAE07' : isPast ? 'var(--border)' : 'var(--border)',
                        backgroundColor: isCurrent ? 'rgba(255, 174, 7, 0.12)' : isPast ? 'var(--page)' : 'transparent',
                        color: isCurrent ? '#B77905' : isPast ? 'var(--text)' : 'var(--muted)',
                        fontWeight: isCurrent ? 600 : 500,
                        fontSize: 11,
                      }}
                      title={isCurrent ? `Semester ${sem} (Current)` : isPast ? `Semester ${sem} (Completed)` : `Semester ${sem} (Upcoming)`}
                    >
                      {sem}
                    </div>
                  );
                })}
              </div>

              {/* Milestones & Deadlines */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>Registration window</span>
                  <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>Open for Spring 2027</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text)' }}>FYP proposal submission</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Semester 07</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, padding: '8px 0' }}>
                  <span style={{ color: 'var(--text)' }}>FYP final defense</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Semester 08</span>
                </div>
              </div>
            </section>
          </div>

          {/* Assistant Strip per spec */}
          <section
            style={{
              padding: '16px 20px',
              borderRadius: 10,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#511030' }}>{Icons.bot}</span>
              <div>
                <strong style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'block' }}>
                  AI-powered, privacy-first student assistant
                </strong>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Trained strictly on verified NED CISE regulations and course schemes.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: 'var(--page)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                Privacy-first
              </span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: 'var(--page)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                NED CISE curriculum
              </span>
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, backgroundColor: 'var(--page)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                AI student assistant
              </span>
              <Link href="/chat" className="button button-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
                Open assistant
              </Link>
            </div>
          </section>

          {/* Institutional Academic Modules (8 Tools) */}
          <section style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Academic toolkit</h3>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Direct tools for planning and degree requirements</span>
            </div>

            <div className="dashboard-toolkit-grid">
              <Link href="/planner" className="workspace-card" style={{ minHeight: 120 }}>
                <span style={{ color: '#511030', marginBottom: 10 }}>{Icons.calendar}</span>
                <span className="workspace-arrow">{Icons.arrowRight}</span>
                <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>Degree Planner</h3>
                <p style={{ fontSize: 12, margin: 0 }}>Eight-semester sequencing and prerequisite alerts.</p>
              </Link>

              <Link href="/fyp" className="workspace-card" style={{ minHeight: 120 }}>
                <span style={{ color: '#511030', marginBottom: 10 }}>{Icons.book}</span>
                <span className="workspace-arrow">{Icons.arrowRight}</span>
                <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>FYP Archive</h3>
                <p style={{ fontSize: 12, margin: 0 }}>Approved department projects, domains, and tools.</p>
              </Link>

              <Link href="/professors" className="workspace-card" style={{ minHeight: 120 }}>
                <span style={{ color: '#511030', marginBottom: 10 }}>{Icons.users}</span>
                <span className="workspace-arrow">{Icons.arrowRight}</span>
                <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>Professors</h3>
                <p style={{ fontSize: 12, margin: 0 }}>Faculty research areas and supervision focus.</p>
              </Link>

              <Link href="/explorer" className="workspace-card" style={{ minHeight: 120 }}>
                <span style={{ color: '#511030', marginBottom: 10 }}>{Icons.layers}</span>
                <span className="workspace-arrow">{Icons.arrowRight}</span>
                <h3 style={{ fontSize: 15, margin: '0 0 4px' }}>Prerequisite Explorer</h3>
                <p style={{ fontSize: 12, margin: 0 }}>Interactive DAG chain leading to graduation.</p>
              </Link>
            </div>
          </section>

          {/* Institutional Footer per spec */}
          <footer className="site-footer" style={{ marginTop: 40, padding: '24px 0 16px' }}>
            <div className="site-footer-inner" style={{ padding: 0 }}>
              <div className="site-footer-top">
                <div className="site-footer-brand">
                  <img
                    src="/assets/brand/ned-logo.png"
                    alt="NED University of Engineering & Technology, Karachi"
                    className="site-footer-logo"
                  />
                  <span>NED University of Engineering &amp; Technology, Karachi</span>
                </div>
                <div className="site-footer-links">
                  <Link href="/terms">Terms of Service &amp; Policies</Link>
                  <Link href="/privacy">Privacy</Link>
                  <Link href="/help">Help &amp; FAQs</Link>
                </div>
              </div>
              <div className="site-footer-disclaimer">
                Match scores, prerequisite mappings and recommendations are guidance only, not official university decisions.
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
