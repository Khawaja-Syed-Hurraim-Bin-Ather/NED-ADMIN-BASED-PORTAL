'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';

// ─── SVG Line Icons (1.5px stroke, no 3D or cartoon illustrations) ───────────

const Icons = {
  bookOpen: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  users: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  calendar: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  layers: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  messageSquare: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  calculator: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
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
  briefcase: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  github: (
    <svg className="icon workspace-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  ),
  arrowRight: (
    <svg className="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
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
};

// ─── Workspace Items (from design-spec.json) ──────────────────────────────────

const workspaceItems = [
  {
    title: 'FYP Archive',
    text: 'Search past projects by domain, tools and supervisor.',
    icon: Icons.bookOpen,
    href: '/fyp',
  },
  {
    title: 'Professor Directory',
    text: 'Research areas and supervision interests.',
    icon: Icons.users,
    href: '/professors',
  },
  {
    title: 'Degree Planner',
    text: 'Plan eight semesters and catch prerequisite conflicts early.',
    icon: Icons.calendar,
    href: '/planner',
  },
  {
    title: 'Prerequisite Explorer',
    text: 'Trace the course chain leading to your FYP.',
    icon: Icons.layers,
    href: '/explorer',
  },
  {
    title: 'AI Academic Assistant',
    text: 'Ask questions about courses, rules and planning.',
    icon: Icons.messageSquare,
    href: '/chat',
  },
  {
    title: 'GPA Calculator',
    text: 'Model grades and see the effect on your CGPA.',
    icon: Icons.calculator,
    href: '/gpa',
  },
  {
    title: 'Career Hub',
    text: 'Link your coursework to technology career tracks.',
    icon: Icons.briefcase,
    href: '/careers',
  },
  {
    title: 'GitHub Recommender',
    text: 'Open-source projects relevant to your FYP interests.',
    icon: Icons.github,
    href: '/recommendations',
  },
];

export default function LandingPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [firstName, setFirstName] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Theme initialization (Light is default per spec)
    const stored = (localStorage.getItem('educompass-theme') as 'light' | 'dark') || 'light';
    setTheme(stored);
    document.documentElement.dataset.theme = stored;

    // Check user auth state
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const rawName: string =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            '';
          const first = rawName.split(' ')[0] || null;
          setFirstName(first);
          const initials = rawName
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          setUserInitials(initials || 'ST');
        }
      } catch {
        // Fallback gracefully to signed-out view
      } finally {
        setIsLoaded(true);
      }
    }

    checkAuth();
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('educompass-theme', next);
  }

  return (
    <div className="landing-shell">
      {/* ── 1. Navbar ── */}
      <div className="landing-nav-wrap">
        <header className="landing-nav">
          {/* Left: Logo + Wordmark + Small caption NED CISE */}
          <Link href="/" className="brand" aria-label="EduCompass home">
            <img
              src="/assets/brand/ned-logo.png"
              alt="NED University of Engineering & Technology, Karachi"
              className="brand-logo-img"
            />
            <div className="brand-text-block">
              <span className="brand-title">EduCompass</span>
              <span className="brand-dept">NED CISE</span>
            </div>
          </Link>

          {/* Center Links */}
          <nav className="landing-links" aria-label="Primary navigation">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/planner">Planner</Link>
            <Link href="/fyp">FYP</Link>
            <Link href="/professors">Professors</Link>
            <Link href="/chat">Assistant</Link>
          </nav>

          {/* Right: Theme toggle + Avatar / Sign in */}
          <div className="nav-actions">
            <button
              className="button button-icon"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title="Toggle theme"
            >
              {theme === 'dark' ? Icons.sun : Icons.moon}
            </button>

            {isLoaded && firstName ? (
              <Link
                href="/dashboard"
                className="button"
                style={{
                  backgroundColor: '#511030',
                  color: '#FFFFFF',
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 8,
                  gap: 8,
                }}
                title="Open dashboard"
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {userInitials}
                </span>
                <span>Dashboard</span>
              </Link>
            ) : (
              <Link href="/login" className="button button-primary">
                Sign in
              </Link>
            )}
          </div>
        </header>
      </div>

      <main>
        {/* ── 2. Greeting Block ── */}
        <section className="landing-greeting-block">
          <span className="eyebrow">
            Computer &amp; Information Systems Engineering, NED University
          </span>
          {isLoaded && firstName ? (
            <>
              <h1>Welcome back, {firstName}</h1>
              <p>
                Let&apos;s get back to your degree plan, FYP shortlist and upcoming deadlines.
              </p>
            </>
          ) : (
            <>
              <h1>Welcome to EduCompass</h1>
              <p>Sign in with your university account to continue.</p>
              <div className="landing-greeting-action">
                <Link href="/login" className="button button-primary">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </section>

        {/* ── 3. Building Hero (2400x1150, Never Cropped) ── */}
        <section className="building-hero-container" aria-label="Department building">
          <div className="building-hero-wrap">
            <img
              src="/assets/campus/cis-building.jpg"
              alt="Front elevation of the Computer & Information Systems Engineering Department building at NED University"
              width={2400}
              height={1150}
              loading="eager"
            />
          </div>

          {/* ── 4. Caption Bar ── */}
          <div className="building-caption-bar">
            <span>CIS Department, NED University of Engineering &amp; Technology</span>
            <span>Karachi</span>
          </div>
        </section>

        {/* ── 5. Workspace Cards ── */}
        <section className="workspace-section" aria-labelledby="workspace-title">
          <div className="workspace-header">
            <h2 id="workspace-title">Your academic workspace</h2>
            <p>Planning, projects and guidance for your degree, in one place.</p>
          </div>

          <div className="workspace-grid">
            {workspaceItems.map((item) => (
              <Link href={item.href} key={item.title} className="workspace-card">
                <div>{item.icon}</div>
                <span className="workspace-arrow">{Icons.arrowRight}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 6. Closing Section (Text left, Atrium photo right) ── */}
        <section className="closing-section" aria-labelledby="closing-title">
          <div className="closing-copy">
            <span className="eyebrow">Your degree at a glance</span>
            <h2 id="closing-title">Everything for your degree, in one place.</h2>
            <p>
              Track your credits, plan the semesters ahead and prepare for your final year project,
              with guidance built around the NED CISE curriculum.
            </p>
            <ul className="closing-points">
              <li className="closing-point">
                <span className="closing-point-dot" />
                <span>Your progress, updated from official records</span>
              </li>
              <li className="closing-point">
                <span className="closing-point-dot" />
                <span>Prerequisite checks before you register</span>
              </li>
              <li className="closing-point">
                <span className="closing-point-dot" />
                <span>Supervisor and project information for your FYP</span>
              </li>
            </ul>
            <div>
              <Link href="/planner" className="closing-link">
                <span>Open degree planner</span>
                {Icons.arrowRight}
              </Link>
            </div>
          </div>

          {/* Native 4:5 ratio, Never crop */}
          <div className="closing-atrium-wrap">
            <img
              src="/assets/campus/cis-atrium.png"
              alt="Interior glass atrium of the CIS Department at NED University"
              width={816}
              height={1020}
              loading="lazy"
            />
          </div>
        </section>
      </main>

      {/* ── 7. Institutional Footer (Logo, University name, Terms link, Disclaimer) ── */}
      <footer className="site-footer">
        <div className="site-footer-inner">
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
  );
}
