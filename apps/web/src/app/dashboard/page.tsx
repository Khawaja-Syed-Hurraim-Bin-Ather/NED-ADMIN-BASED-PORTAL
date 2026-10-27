'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

// ─── SVG Icon System ──────────────────────────────────────────────────────────

const iconPaths: Record<string, string> = {
  compass:      '<circle cx="12" cy="12" r="9.5"/><path d="m15.5 8.5-2.7 4.3-4.3 2.7 2.7-4.3 4.3-2.7Z"/>',
  arrow:        '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>',
  arrowUpRight: '<path d="M5 19 19 5"/><path d="M9 5h10v10"/>',
  dashboard:    '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
  book:         '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 5.5v15A2.5 2.5 0 0 1 6.5 18H20"/>',
  users:        '<path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3"/><path d="M17 11a3 3 0 0 0 0-6M19.5 20v-1.5A3.5 3.5 0 0 0 17 15.1"/>',
  calendar:     '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M16 3v4M8 3v4M3.5 10h17"/>',
  layers:       '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  bot:          '<rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 3v3M8 13h.01M16 13h.01M8 17h8M2 11v4M22 11v4"/>',
  calculator:   '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
  rocket:       '<path d="M14.5 4.5C17 2 21 3 21 3s1 4-1.5 6.5c-2 2-5.5 2.5-7 2L9 15l-2-2 3.5-3.5c-.5-1.5 0-5 2-7Z"/><path d="M9 15 6 18M7 13l-3 1 2 2M15 17l-1 3 2-2M12 12l.01.01"/>',
  github:       '<path d="M15 22v-3.5c.05-1-.3-1.8-1-2.5 3.2-.35 6.5-1.55 6.5-7A5.45 5.45 0 0 0 19 5.2 5.1 5.1 0 0 0 18.9 1S17.7.65 15 2.4a13.2 13.2 0 0 0-6 0C6.3.65 5.1 1 5.1 1A5.1 5.1 0 0 0 5 5.2a5.45 5.45 0 0 0-1.5 3.8c0 5.45 3.3 6.65 6.5 7-.7.7-1.05 1.55-1 2.5V22M9 18c-4.5 2-5-2-7-2"/>',
  settings:     '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a2 2 0 1 1-4 0V19a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 12.1v-.2a1.7 1.7 0 0 0-1.2-2.9h-.3a2 2 0 1 1 0-4h.3A1.7 1.7 0 0 0 3 2.1l-.1-.1A2 2 0 1 1 5.7-.8l.1.1A1.7 1.7 0 0 0 8.7-2v-.3a2 2 0 1 1 4 0v.3a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a2 2 0 1 1 0 4h-.3a1.7 1.7 0 0 0-1.2 2.9Z"/>',
  sun:          '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
  moon:         '<path d="M20.8 15.2A8.5 8.5 0 0 1 8.8 3.2 8.5 8.5 0 1 0 20.8 15.2Z"/>',
  bell:         '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  menu:         '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x:            '<path d="m6 6 12 12M18 6 6 18"/>',
  check:        '<path d="m5 12 4.5 4.5L19 7"/>',
  clock:        '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  target:       '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bookmark:     '<path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3-6 3V4.5Z"/>',
  trend:        '<path d="m4 16 5-5 3 3 7-8"/><path d="M14 6h5v5"/>',
  shield:       '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  help:         '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1 .9-1.8 1.2-1.8 2.8M12 17h.01"/>',
};

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconPaths[name] || iconPaths.help }}
    />
  );
}

// ─── Module Data ──────────────────────────────────────────────────────────────

const modules = [
  { key: 'fyp',             iconName: 'book',       href: '/fyp',             title: 'FYP Archive',        description: '68 reviewed NED CISE projects & similarity search.',   image: '/assets/fyp-archive.webp' },
  { key: 'professors',      iconName: 'users',      href: '/professors',      title: 'Professor Directory', description: '16 faculty members & research alignment scoring.',     image: '/assets/professor-directory.webp' },
  { key: 'planner',         iconName: 'calendar',   href: '/planner',         title: 'Degree Planner',      description: '8-term schedule with prerequisite bottleneck guards.',   image: '/assets/degree-planner.webp' },
  { key: 'explorer',        iconName: 'layers',     href: '/explorer',        title: 'Prerequisite Graph',  description: 'Visual DAG dependency flows & What-If failure cascade.', image: '/assets/prerequisite-explorer.webp' },
  { key: 'chat',            iconName: 'bot',        href: '/chat',            title: 'AI Assistant',        description: '4-layer verified academic & syllabus answering.',      image: '/assets/ai-assistant.webp' },
  { key: 'gpa',             iconName: 'calculator', href: '/gpa',             title: 'GPA & What-If',       description: 'Official NED grading scale & graduation target math.', image: '/assets/gpa-what-if.webp' },
  { key: 'careers',         iconName: 'rocket',     href: '/careers',         title: 'Career Hub',          description: '12 technology tracks matched to course progression.',    image: '/assets/career-hub.webp' },
  { key: 'recommendations', iconName: 'github',     href: '/recommendations', title: 'GitHub Recommender',  description: 'Trending open-source architectures & FYP seeds.',       image: '/assets/github-recommender.webp' },
];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'public' | 'enrolled' | 'admin';
  current_semester: number;
  interests: string[];
  career_goal: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('educompass-theme') || 'dark';
    document.documentElement.dataset.theme = stored;
    setIsDark(stored === 'dark');

    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Fallback demo student context for instant review
        setProfile({
          id: 'demo-student',
          email: 'ayesha.khan@cloud.neduet.edu.pk',
          full_name: 'Ayesha Khan',
          role: 'enrolled',
          current_semester: 6,
          interests: ['AI & Machine Learning', 'Software Systems'],
          career_goal: 'Full-Stack AI Engineer',
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
          full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Ayesha Khan',
          role: 'enrolled',
          current_semester: 6,
          interests: [],
          career_goal: null,
        });
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('educompass-theme', next);
    setIsDark(!isDark);
    triggerToast(`${next === 'dark' ? 'Dark' : 'Light'} theme enabled`);
  }

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const studentName = profile?.full_name || 'Ayesha Khan';
  const studentInitials = studentName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AK';

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <svg className="animate-spin h-5 w-5 text-cyan-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading student overview...
        </div>
      </main>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* ── Left Navigation Rail (Persistent Desktop + Mobile Off-Canvas) ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <Link className="brand" href="/" aria-label="EduCompass home">
            <span className="brand-mark"><Icon name="compass" /></span>
            <span className="brand-word">Edu<em>Compass</em></span>
          </Link>
        </div>

        <div className="side-label eyebrow">Workspace</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          <Link href="/dashboard" className="active">
            <Icon name="dashboard" />
            <span>Overview</span>
          </Link>
          <Link href="/fyp">
            <Icon name="book" />
            <span>FYP Archive</span>
          </Link>
          <Link href="/professors">
            <Icon name="users" />
            <span>Professors</span>
          </Link>
          <Link href="/planner">
            <Icon name="calendar" />
            <span>Degree Planner</span>
          </Link>
          <Link href="/explorer">
            <Icon name="layers" />
            <span>Prerequisite Explorer</span>
          </Link>
          <Link href="/chat">
            <Icon name="bot" />
            <span>AI Assistant</span>
          </Link>
        </nav>

        <div className="side-label eyebrow">Planning</div>
        <nav className="side-nav" aria-label="Planning navigation">
          <Link href="/gpa">
            <Icon name="calculator" />
            <span>GPA &amp; What-If</span>
          </Link>
          <Link href="/careers">
            <Icon name="rocket" />
            <span>Career Hub</span>
          </Link>
          <Link href="/recommendations">
            <Icon name="github" />
            <span>GitHub Ideas</span>
          </Link>
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-support">
          <Icon name="help" className="icon-sm" />
          <strong>Need a starting point?</strong>
          <p>Ask the assistant about your next prerequisite or FYP direction.</p>
          <Link href="/chat" className="button button-secondary" style={{ width: '100%', minHeight: '31px', padding: '0 8px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>Open assistant</span>
            <Icon name="arrow" className="icon-sm" />
          </Link>
        </div>

        <div className="sidebar-user">
          <span className="avatar">{studentInitials}</span>
          <div style={{ minWidth: 0 }}>
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{studentName}</strong>
            <span>BE-CSE &bull; Sem 0{profile?.current_semester ?? 6}</span>
          </div>
          <Link href="/settings" title="Profile Settings" aria-label="Settings">
            <Icon name="settings" className="icon-sm" />
          </Link>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="crumbs">
            <span>EduCompass</span>
            <Icon name="arrow" className="icon-sm" />
            <strong>Overview</strong>
          </div>

          <div className="topbar-actions">
            <button
              className="button button-icon mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>

            <div className="status-pill">
              <span className="live-dot" />
              Guidance engine online
            </div>

            <button
              className="button button-icon"
              onClick={() => triggerToast('You have 2 new department updates')}
              aria-label="Notifications"
              title="Notifications"
            >
              <Icon name="bell" />
            </button>

            <button
              className="button button-icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title="Switch theme"
            >
              <Icon name={isDark ? 'sun' : 'moon'} />
            </button>

            <Link href="/settings" title="Profile">
              <span className="avatar">{studentInitials}</span>
            </Link>

            <button
              className="button button-ghost"
              style={{ fontSize: '11px', padding: '6px 12px' }}
              onClick={handleSignOut}
              title="Sign out of account"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Admin Banner if Admin */}
          {profile?.role === 'admin' && (
            <div style={{ padding: '14px 18px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
              <div>
                <strong style={{ color: '#fda4af', display: 'block', fontSize: '12px' }}>Administrator Console Active</strong>
                <span style={{ fontSize: '11px', color: '#fecdd3' }}>
                  You have administrative access to the offline extraction review queue, published FYP records, and student deletion audit logs.
                </span>
              </div>
              <Link href="/admin" className="button button-primary" style={{ fontSize: '11px', padding: '6px 14px' }}>
                Open Admin Queue &rarr;
              </Link>
            </div>
          )}

          {/* Welcome Intro */}
          <div className="dashboard-intro">
            <div>
              <span className="eyebrow">Student overview &bull; Demo data</span>
              <h1>Good morning, {studentName.split(' ')[0]}.</h1>
              <p>Your academic map is moving in the right direction. Here&apos;s the useful signal for today.</p>
            </div>
            <div className="intro-actions">
              <Link href="/planner" className="button button-secondary">
                <Icon name="calendar" className="icon-sm" />
                <span>Continue degree plan</span>
              </Link>
              <Link href="/chat" className="button button-primary">
                <Icon name="bot" className="icon-sm" />
                <span>Ask assistant</span>
              </Link>
            </div>
          </div>

          {/* Profile Banner */}
          <section className="profile-banner">
            <div className="profile-main">
              <span className="avatar">{studentInitials}</span>
              <div>
                <h2>BE Computer &amp; Information Systems Engineering</h2>
                <p>
                  Semester 0{profile?.current_semester ?? 6} <span className="subtle">&bull;</span> 68 of 136 credit hours completed <span className="subtle">&bull;</span> Target graduation Spring 2028
                </p>
              </div>
            </div>
            <div className="profile-chips">
              <span className="pill pill-cyan">BE-CSE</span>
              <span className="pill pill-sage">50% complete</span>
              <span className="pill pill-amber">Demo data</span>
            </div>
          </section>

          {/* 4 Academic Metric Cards */}
          <section className="metric-grid">
            <article className="metric-card">
              <div className="metric-head">
                <span>Current CGPA</span>
                <span className="metric-icon" style={{ color: 'var(--brand)' }}>
                  <Icon name="target" />
                </span>
              </div>
              <div className="metric-value mono">
                3.42<small>/ 4.00</small>
              </div>
              <div className="metric-foot">
                <span className="up">&uarr; 0.18</span> this year
              </div>
              <div className="metric-meter">
                <span style={{ width: '85%' }} />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-head">
                <span>Credits completed</span>
                <span className="metric-icon" style={{ color: 'var(--cyan)' }}>
                  <Icon name="book" />
                </span>
              </div>
              <div className="metric-value mono">
                68<small>/ 136 Cr</small>
              </div>
              <div className="metric-foot">
                <span className="up">+15 Cr</span> this semester
              </div>
              <div className="metric-meter">
                <span style={{ width: '50%' }} />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-head">
                <span>Prerequisite chain</span>
                <span className="metric-icon" style={{ color: 'var(--amber)' }}>
                  <Icon name="layers" />
                </span>
              </div>
              <div className="metric-value mono">
                04<small> courses</small>
              </div>
              <div className="metric-foot">
                <span className="estimate">Estimate</span> &bull; critical path depth
              </div>
              <div className="metric-meter">
                <span style={{ width: '67%' }} />
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-head">
                <span>Shortlisted FYPs</span>
                <span className="metric-icon" style={{ color: 'var(--sage)' }}>
                  <Icon name="bookmark" />
                </span>
              </div>
              <div className="metric-value mono">
                06<small> projects</small>
              </div>
              <div className="metric-foot">
                <span className="up">+2</span> since last week
              </div>
              <div className="metric-meter">
                <span style={{ width: '40%' }} />
              </div>
            </article>
          </section>

          {/* Split Grid: Toolkit + Side Stack */}
          <div className="dashboard-grid">
            {/* Academic Toolkit (8 Module Cards) */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  <Icon name="compass" />
                  <strong>Your academic toolkit</strong>
                  <span className="pill pill-amber">Demo data</span>
                </div>
                <button
                  className="panel-action"
                  onClick={() =>
                    setModalContent({
                      title: 'Platform Roadmap & Modules',
                      body: 'The full suite integrates FYP discovery, professor matching, degree planning, DAG prerequisite visualization, and LLM-powered academic guidance with strict PII containment.',
                    })
                  }
                >
                  View roadmap <Icon name="arrow" className="icon-sm" />
                </button>
              </div>

              <div className="module-grid">
                {modules.map((m) => (
                  <Link
                    key={m.key}
                    href={m.href}
                    className="module-card"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open ${m.title}`}
                  >
                    <div className="module-image">
                      <img src={m.image} alt={`${m.title} illustration`} />
                    </div>
                    <div className="module-meta">
                      <span className="module-icon">
                        <Icon name={m.iconName} />
                      </span>
                      <span className="module-arrow">
                        <Icon name="arrowUpRight" className="icon-sm" />
                      </span>
                    </div>
                    <strong>{m.title}</strong>
                    <span>{m.description}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Side Stack: Today's Schedule & Department Updates */}
            <div className="side-stack">
              <section className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Icon name="calendar" />
                    <strong>Today&apos;s schedule</strong>
                  </div>
                  <button
                    className="panel-action"
                    onClick={() => triggerToast('Calendar sync staged for next release')}
                  >
                    Open calendar
                  </button>
                </div>
                <div className="schedule-list">
                  <div className="schedule-item" style={{ '--accent': 'var(--cyan)' } as React.CSSProperties}>
                    <span className="schedule-time">09:00</span>
                    <i className="schedule-dot" />
                    <div>
                      <strong>Database Systems</strong>
                      <span>Lab 2 &bull; 2 hours</span>
                    </div>
                  </div>
                  <div className="schedule-item" style={{ '--accent': 'var(--brand)' } as React.CSSProperties}>
                    <span className="schedule-time">13:30</span>
                    <i className="schedule-dot" />
                    <div>
                      <strong>Software Engineering</strong>
                      <span>Room A-12 &bull; Lecture</span>
                    </div>
                  </div>
                  <div className="schedule-item" style={{ '--accent': 'var(--amber)' } as React.CSSProperties}>
                    <span className="schedule-time">17:00</span>
                    <i className="schedule-dot" />
                    <div>
                      <strong>FYP shortlisting</strong>
                      <span>Personal focus block</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Icon name="bell" />
                    <strong>Department updates</strong>
                  </div>
                  <span className="pill pill-cyan">2 new</span>
                </div>
                <div className="announcement-list">
                  <article className="announcement">
                    <div className="announcement-top">
                      <strong>FYP archive review complete</strong>
                      <time>Today</time>
                    </div>
                    <p>8 projects in AI &amp; ML were approved into the official reviewed archive.</p>
                  </article>
                  <article className="announcement">
                    <div className="announcement-top">
                      <strong>Curriculum office notice</strong>
                      <time>2d ago</time>
                    </div>
                    <p>Spring 2028 graduation planning window opens next week.</p>
                  </article>
                </div>
              </section>
            </div>
          </div>

          {/* Recent Activity Panel */}
          <section className="panel" style={{ marginTop: '15px' }}>
            <div className="panel-header">
              <div className="panel-title">
                <Icon name="clock" />
                <strong>Recent activity</strong>
              </div>
              <button
                className="panel-action"
                onClick={() => triggerToast('Activity history will be available in next build')}
              >
                See all activity
              </button>
            </div>
            <div className="activity-list">
              <div className="activity-row">
                <span className="activity-icon">
                  <Icon name="bookmark" className="icon-sm" />
                </span>
                <div>
                  <strong>Shortlisted &ldquo;Vision-based Campus Navigation&rdquo;</strong>
                  <span>FYP Archive &bull; AI &amp; Machine Learning</span>
                </div>
                <span className="activity-time">2h ago</span>
              </div>
              <div className="activity-row">
                <span className="activity-icon">
                  <Icon name="trend" className="icon-sm" />
                </span>
                <div>
                  <strong>Completed the Computer Networks prerequisite chain</strong>
                  <span>Prerequisite Explorer &bull; 3 courses unlocked</span>
                </div>
                <span className="activity-time">Yesterday</span>
              </div>
              <div className="activity-row">
                <span className="activity-icon">
                  <Icon name="bot" className="icon-sm" />
                </span>
                <div>
                  <strong>Asked about minimum CGPA to graduate</strong>
                  <span>AI Assistant &bull; Layer 1 official regulation</span>
                </div>
                <span className="activity-time">Mon</span>
              </div>
            </div>
          </section>

          {/* Rule 13 Guidance Disclaimer */}
          <div className="disclaimer" style={{ marginTop: '20px' }}>
            <Icon name="shield" />
            <span>Guidance estimates, not official university decisions.</span>
            <Link href="/terms">Read terms</Link>
          </div>
        </div>
      </main>

      {/* ── Toast Notifications ── */}
      {toastMessage && (
        <div className="toast-region" aria-live="polite" aria-atomic="true">
          <div className="toast">
            <Icon name="check" className="icon-sm" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* ── Modal Dialog ── */}
      {modalContent && (
        <div className="modal-backdrop" onClick={() => setModalContent(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 id="modal-title">{modalContent.title}</h3>
                <p>{modalContent.body}</p>
              </div>
              <button
                className="button button-icon"
                onClick={() => setModalContent(null)}
                aria-label="Close"
              >
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-row">
                <span>Data state</span>
                <strong>Demo data</strong>
              </div>
              <div className="modal-row">
                <span>Guidance label</span>
                <strong>Estimate where applicable</strong>
              </div>
              <div className="modal-row">
                <span>Privacy posture</span>
                <strong>No student PII sent to LLMs</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="button button-primary"
                onClick={() => setModalContent(null)}
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
