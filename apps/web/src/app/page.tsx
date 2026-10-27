'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

// ─── Inline SVG icon system (mirrors handoff iconPaths) ──────────────────────

const iconPaths: Record<string, string> = {
  compass:    '<circle cx="12" cy="12" r="9.5"/><path d="m15.5 8.5-2.7 4.3-4.3 2.7 2.7-4.3 4.3-2.7Z"/>',
  arrow:      '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>',
  arrowUpRight: '<path d="M5 19 19 5"/><path d="M9 5h10v10"/>',
  dashboard:  '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
  book:       '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 5.5v15A2.5 2.5 0 0 1 6.5 18H20"/>',
  users:      '<path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3"/><path d="M17 11a3 3 0 0 0 0-6M19.5 20v-1.5A3.5 3.5 0 0 0 17 15.1"/>',
  calendar:   '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M16 3v4M8 3v4M3.5 10h17"/>',
  layers:     '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  bot:        '<rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 3v3M8 13h.01M16 13h.01M8 17h8M2 11v4M22 11v4"/>',
  calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
  rocket:     '<path d="M14.5 4.5C17 2 21 3 21 3s1 4-1.5 6.5c-2 2-5.5 2.5-7 2L9 15l-2-2 3.5-3.5c-.5-1.5 0-5 2-7Z"/><path d="M9 15 6 18M7 13l-3 1 2 2M15 17l-1 3 2-2M12 12l.01.01"/>',
  github:     '<path d="M15 22v-3.5c.05-1-.3-1.8-1-2.5 3.2-.35 6.5-1.55 6.5-7A5.45 5.45 0 0 0 19 5.2 5.1 5.1 0 0 0 18.9 1S17.7.65 15 2.4a13.2 13.2 0 0 0-6 0C6.3.65 5.1 1 5.1 1A5.1 5.1 0 0 0 5 5.2a5.45 5.45 0 0 0-1.5 3.8c0 5.45 3.3 6.65 6.5 7-.7.7-1.05 1.55-1 2.5V22M9 18c-4.5 2-5-2-7-2"/>',
  sun:        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
  moon:       '<path d="M20.8 15.2A8.5 8.5 0 0 1 8.8 3.2 8.5 8.5 0 1 0 20.8 15.2Z"/>',
  shield:     '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  check:      '<path d="m5 12 4.5 4.5L19 7"/>',
  help:       '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1 .9-1.8 1.2-1.8 2.8M12 17h.01"/>',
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

// ─── Feature data ─────────────────────────────────────────────────────────────

const features = [
  { key: 'fyp',             iconName: 'book',       href: '/fyp',             title: 'FYP Archive & Search',      description: 'Find reviewed projects, domains, tools, and supervisor context.',                     badge: 'M1', image: '/assets/fyp-archive.webp' },
  { key: 'professors',      iconName: 'users',      href: '/professors',      title: 'Professor Directory',       description: 'Explore research areas and build a better-informed outreach plan.',                  badge: 'M2', image: '/assets/professor-directory.webp' },
  { key: 'planner',         iconName: 'calendar',   href: '/planner',         title: 'Degree Planner',            description: 'Arrange eight semesters and catch prerequisite conflicts early.',                    badge: 'M3', image: '/assets/degree-planner.webp' },
  { key: 'explorer',        iconName: 'layers',     href: '/explorer',        title: 'Prerequisite Explorer',     description: 'See the dependency chain from foundation courses to FYP.',                          badge: 'H2', image: '/assets/prerequisite-explorer.webp' },
  { key: 'chat',            iconName: 'bot',        href: '/chat',            title: 'AI Academic Assistant',     description: 'Ask focused questions with visible source and layer context.',                       badge: 'H3', image: '/assets/ai-assistant.webp' },
  { key: 'gpa',             iconName: 'calculator', href: '/gpa',             title: 'GPA & What-If',             description: 'Model grades and understand what your next semester changes.',                       badge: 'E4', image: '/assets/gpa-what-if.webp' },
  { key: 'careers',         iconName: 'rocket',     href: '/careers',         title: 'Career Hub',                description: 'Translate course progress into practical technology tracks.',                         badge: 'E2', image: '/assets/career-hub.webp' },
  { key: 'recommendations', iconName: 'github',     href: '/recommendations', title: 'GitHub Recommender',        description: 'Surface open-source ideas worth exploring for an FYP.',                             badge: 'E5', image: '/assets/github-recommender.webp' },
];

// ─── Theme toggle (client-side, mirrors handoff) ──────────────────────────────

function ThemeToggle() {
  const [isDark, setIsDark] = React.useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('educompass-theme') || 'dark';
    document.documentElement.dataset.theme = stored;
    setIsDark(stored === 'dark');
  }, []);

  function toggle() {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('educompass-theme', next);
    setIsDark(!isDark);
  }

  return (
    <button
      className="button button-icon"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title="Switch theme"
    >
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  );
}

// ─── Brand mark ───────────────────────────────────────────────────────────────

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="EduCompass home">
      <span className="brand-mark"><Icon name="compass" /></span>
      <span className="brand-word">Edu<em>Compass</em></span>
    </Link>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="app-shell landing-shell">
      {/* ── Navigation ── */}
      <header className="landing-nav">
        <Brand />
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#features">Platform</a>
          <a href="#workflow">How it works</a>
          <Link href="/terms">Trust &amp; privacy</Link>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="button button-ghost">Sign in / Register</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="landing-main">
        {/* ── Hero ── */}
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="eyebrow">FYP 2026 / SRS v1.0</span>
            </div>
            <h1 id="hero-heading">
              Your next step, <span className="gradient-text">with context.</span>
            </h1>
            <p className="hero-lede">
              EduCompass brings NED CISE course planning, FYP discovery, professor research, and career direction
              into one calm place to think clearly.
            </p>
            <div className="hero-actions">
              <Link href="/dashboard" className="button button-primary">
                Go to dashboard <Icon name="arrow" className="icon-sm" />
              </Link>
              <Link href="/fyp" className="button button-secondary">Browse FYP archive</Link>
            </div>
            <div className="hero-note">
              <Icon name="shield" className="icon-sm" />
              <span>Built for NED CISE · estimate labels always visible</span>
            </div>
          </div>

          {/* ── Preview window ── */}
          <div className="hero-visual" aria-label="EduCompass dashboard preview">
            <div className="preview-window">
              <div className="preview-top">
                <div className="window-dots"><i /><i /><i /></div>
                <span className="window-label">student / overview</span>
                <span className="pill pill-cyan">demo data</span>
              </div>
              <div className="preview-content">
                <aside className="preview-side">
                  <span className="brand-mark" style={{ margin: '0 auto 34px', display: 'grid' }}>
                    <Icon name="compass" />
                  </span>
                  <div className="preview-side-nav">
                    <Icon name="dashboard" className="active" />
                    <Icon name="book" />
                    <Icon name="calendar" />
                    <Icon name="bot" />
                  </div>
                </aside>
                <div className="preview-main">
                  <div className="preview-greeting">
                    <div>
                      <span className="eyebrow">Monday, 12 May</span>
                      <strong>Good morning, Ayesha</strong>
                    </div>
                    <span className="avatar">AK</span>
                  </div>
                  <div className="preview-stats">
                    <div className="preview-stat">
                      <small>Current CGPA</small>
                      <strong>3.42</strong>
                      <span className="pill pill-sage">+0.18</span>
                    </div>
                    <div className="preview-stat">
                      <small>Credits complete</small>
                      <strong>68 <small>/ 136</small></strong>
                      <span className="pill pill-cyan">50%</span>
                    </div>
                    <div className="preview-stat">
                      <small>FYP shortlist</small>
                      <strong>06</strong>
                      <span className="pill pill-amber">estimate</span>
                    </div>
                  </div>
                  <div className="preview-chart">
                    <div className="preview-chart-header">
                      <strong>Academic momentum</strong>
                      <span className="eyebrow">last 4 terms</span>
                    </div>
                    <div className="chart-area">
                      <svg className="chart-line" viewBox="0 0 380 90" preserveAspectRatio="none">
                        <polyline points="0,72 65,59 125,63 190,42 250,49 310,28 380,18" />
                        <circle cx="0" cy="72" r="3" />
                        <circle cx="125" cy="63" r="3" />
                        <circle cx="190" cy="42" r="3" />
                        <circle cx="310" cy="28" r="3" />
                        <circle cx="380" cy="18" r="3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Trust bar ── */}
        <div className="trust-bar">
          <div className="trust-intro">
            <span className="eyebrow">A clearer system</span><br />
            for the decisions behind your degree.
          </div>
          <div className="trust-item"><Icon name="check" className="icon-sm" />Demo-first</div>
          <div className="trust-item"><Icon name="check" className="icon-sm" />Source-aware</div>
          <div className="trust-item"><Icon name="shield" className="icon-sm" />Privacy-minded</div>
          <div className="trust-item"><Icon name="layers" className="icon-sm" />NED CISE context</div>
          <div className="trust-item"><Icon name="bot" className="icon-sm" />AI-ready</div>
        </div>

        {/* ── Feature grid ── */}
        <section className="section" id="features">
          <div className="section-heading">
            <div>
              <span className="eyebrow">One connected campus map</span>
              <h2>Everything you need to move with intention.</h2>
            </div>
            <p>
              Stop rebuilding context from PDFs, group chats, and half-remembered advice.
              EduCompass makes the path visible while keeping estimates clearly marked.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((f) => (
              <Link href={f.href} key={f.key}>
                <article className="feature-card">
                  <div className="feature-image">
                    <img src={f.image} alt={`${f.title} illustration`} />
                  </div>
                  <div className="feature-top">
                    <div className="feature-icon"><Icon name={f.iconName} /></div>
                    <span className="feature-badge">{f.badge}</span>
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                  <span className="feature-link"><Icon name="arrowUpRight" className="icon-sm" /></span>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Workflow band ── */}
        <section className="section" id="workflow">
          <div className="workflow-band">
            <div>
              <span className="eyebrow">A practical loop</span>
              <h2>See what is next, and why it matters.</h2>
              <p>
                From your current semester to your final-year project, each view is designed to reduce
                uncertainty without pretending to make official university decisions.
              </p>
              <div style={{ marginTop: '22px' }}>
                <Link href="/dashboard" className="button button-primary">
                  Preview the dashboard <Icon name="arrow" className="icon-sm" />
                </Link>
              </div>
            </div>
            <div className="workflow-list">
              <div className="workflow-step">
                <span className="workflow-number">01</span>
                <div>
                  <strong>Orient</strong>
                  <span>Start with your current credits, semester, and goals.</span>
                </div>
              </div>
              <div className="workflow-step">
                <span className="workflow-number">02</span>
                <div>
                  <strong>Explore</strong>
                  <span>Compare FYPs, professors, prerequisite chains, and career tracks.</span>
                </div>
              </div>
              <div className="workflow-step">
                <span className="workflow-number">03</span>
                <div>
                  <strong>Decide</strong>
                  <span>Save a shortlist and move forward with the source in view.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="landing-footer">
          <span>© 2026 EduCompass · NED CISE student guidance platform</span>
          <div className="footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/help">Help &amp; FAQs</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
