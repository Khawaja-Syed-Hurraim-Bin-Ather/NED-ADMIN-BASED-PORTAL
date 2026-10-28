const app = document.querySelector('#app');
const toastRegion = document.querySelector('#toast-region');
const modalRoot = document.querySelector('#modal-root');
const storedTheme = localStorage.getItem('educompass-theme') || 'dark';
document.documentElement.dataset.theme = storedTheme;

const iconPaths = {
  compass: '<circle cx="12" cy="12" r="9.5"/><path d="m15.5 8.5-2.7 4.3-4.3 2.7 2.7-4.3 4.3-2.7Z"/>',
  arrow: '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>',
  arrowUpRight: '<path d="M5 19 19 5"/><path d="M9 5h10v10"/>',
  dashboard: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 5.5v15A2.5 2.5 0 0 1 6.5 18H20"/>',
  users: '<path d="M16 20v-1.5A3.5 3.5 0 0 0 12.5 15h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="3"/><path d="M17 11a3 3 0 0 0 0-6M19.5 20v-1.5A3.5 3.5 0 0 0 17 15.1"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M16 3v4M8 3v4M3.5 10h17"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  bot: '<rect x="4" y="6" width="16" height="14" rx="3"/><path d="M12 3v3M8 13h.01M16 13h.01M8 17h8M2 11v4M22 11v4"/>',
  calculator: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
  rocket: '<path d="M14.5 4.5C17 2 21 3 21 3s1 4-1.5 6.5c-2 2-5.5 2.5-7 2L9 15l-2-2 3.5-3.5c-.5-1.5 0-5 2-7Z"/><path d="M9 15 6 18M7 13l-3 1 2 2M15 17l-1 3 2-2M12 12l.01.01"/>',
  github: '<path d="M15 22v-3.5c.05-1-.3-1.8-1-2.5 3.2-.35 6.5-1.55 6.5-7A5.45 5.45 0 0 0 19 5.2 5.1 5.1 0 0 0 18.9 1S17.7.65 15 2.4a13.2 13.2 0 0 0-6 0C6.3.65 5.1 1 5.1 1A5.1 5.1 0 0 0 5 5.2a5.45 5.45 0 0 0-1.5 3.8c0 5.45 3.3 6.65 6.5 7-.7.7-1.05 1.55-1 2.5V22M9 18c-4.5 2-5-2-7-2"/>',
  settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a2 2 0 1 1-4 0V19a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 12.1v-.2a1.7 1.7 0 0 0-1.2-2.9h-.3a2 2 0 1 1 0-4h.3A1.7 1.7 0 0 0 3 2.1l-.1-.1A2 2 0 1 1 5.7-.8l.1.1A1.7 1.7 0 0 0 8.7-2v-.3a2 2 0 1 1 4 0v.3a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a2 2 0 1 1 0 4h-.3a1.7 1.7 0 0 0-1.2 2.9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
  moon: '<path d="M20.8 15.2A8.5 8.5 0 0 1 8.8 3.2 8.5 8.5 0 1 0 20.8 15.2Z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  x: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bookmark: '<path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3-6 3V4.5Z"/>',
  trend: '<path d="m4 16 5-5 3 3 7-8"/><path d="M14 6h5v5"/>',
  shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1 .9-1.8 1.2-1.8 2.8M12 17h.01"/>'
};

function icon(name, className = '') {
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.help}</svg>`;
}

function brand() {
  return `<a class="brand" href="/" data-route="landing" aria-label="EduCompass home"><span class="brand-mark">${icon('compass')}</span><span class="brand-word">Edu<em>Compass</em></span></a>`;
}

const features = [
  { key: 'fyp', icon: 'book', title: 'FYP Archive & Search', description: 'Find reviewed projects, domains, tools, and supervisor context.', badge: 'M1', image: '/assets/fyp-archive.webp' },
  { key: 'professors', icon: 'users', title: 'Professor Directory', description: 'Explore research areas and build a better-informed outreach plan.', badge: 'M2', image: '/assets/professor-directory.webp' },
  { key: 'planner', icon: 'calendar', title: 'Degree Planner', description: 'Arrange eight semesters and catch prerequisite conflicts early.', badge: 'M3', image: '/assets/degree-planner.webp' },
  { key: 'explorer', icon: 'layers', title: 'Prerequisite Explorer', description: 'See the dependency chain from foundation courses to FYP.', badge: 'H2', image: '/assets/prerequisite-explorer.webp' },
  { key: 'chat', icon: 'bot', title: 'AI Academic Assistant', description: 'Ask focused questions with visible source and layer context.', badge: 'H3', image: '/assets/ai-assistant.webp' },
  { key: 'gpa', icon: 'calculator', title: 'GPA & What-If', description: 'Model grades and understand what your next semester changes.', badge: 'E4', image: '/assets/gpa-what-if.webp' },
  { key: 'careers', icon: 'rocket', title: 'Career Hub', description: 'Translate course progress into practical technology tracks.', badge: 'E2', image: '/assets/career-hub.webp' },
  { key: 'recommendations', icon: 'github', title: 'GitHub Recommender', description: 'Surface open-source ideas worth exploring for an FYP.', badge: 'E5', image: '/assets/github-recommender.webp' }
];
const modules = features.map(({ key, icon: iconName, title, description, image }) => ({ key, icon: iconName, title: title.replace(' & Search', '').replace(' & What-If', ''), description: key === 'fyp' ? '68 reviewed projects' : description, image }));

function themeButton() {
  const light = document.documentElement.dataset.theme === 'light';
  return `<button class="button button-icon" data-action="theme" aria-label="Switch to ${light ? 'dark' : 'light'} mode" title="Switch theme">${icon(light ? 'moon' : 'sun')}</button>`;
}
function disclaimer() {
  return `<div class="disclaimer">${icon('shield')}<span>Guidance estimates, not official university decisions.</span><a href="/terms" data-action="terms">Read terms</a></div>`;
}

function landingPage() {
  return `<div class="app-shell landing-shell">
    <header class="landing-nav">${brand()}<nav class="landing-links" aria-label="Main navigation"><a href="#features">Platform</a><a href="#workflow">How it works</a><a href="/terms" data-action="terms">Trust & privacy</a></nav><div class="nav-actions"><button class="button button-ghost" data-action="route-dashboard">Sign in / Register</button>${themeButton()}</div></header>
    <main class="landing-main">
      <section class="hero" aria-labelledby="hero-heading"><div class="hero-copy"><div class="hero-kicker"><span class="eyebrow">FYP 2026 / SRS v1.0</span></div><h1 id="hero-heading">Your next step, <span class="gradient-text">with context.</span></h1><p class="hero-lede">EduCompass brings NED CISE course planning, FYP discovery, professor research, and career direction into one calm place to think clearly.</p><div class="hero-actions"><button class="button button-primary" data-action="route-dashboard">Go to dashboard ${icon('arrow', 'icon-sm')}</button><button class="button button-secondary" data-action="route-dashboard">Browse FYP archive</button></div><div class="hero-note">${icon('shield', 'icon-sm')}<span>Built for NED CISE · estimate labels always visible</span></div></div>
        <div class="hero-visual" aria-label="EduCompass dashboard preview"><div class="preview-window"><div class="preview-top"><div class="window-dots"><i></i><i></i><i></i></div><span class="window-label">student / overview</span><span class="pill pill-cyan">demo data</span></div><div class="preview-content"><aside class="preview-side"><span class="brand-mark">${icon('compass')}</span><div class="preview-side-nav">${icon('dashboard', 'active')}${icon('book')}${icon('calendar')}${icon('bot')}${icon('settings')}</div></aside><div class="preview-main"><div class="preview-greeting"><div><span class="eyebrow">Monday, 12 May</span><strong>Good morning, Ayesha</strong></div><span class="avatar">AK</span></div><div class="preview-stats"><div class="preview-stat"><small>Current CGPA</small><strong>3.42</strong><span class="pill pill-sage">+0.18</span></div><div class="preview-stat"><small>Credits complete</small><strong>68 <small>/ 136</small></strong><span class="pill pill-cyan">50%</span></div><div class="preview-stat"><small>FYP shortlist</small><strong>06</strong><span class="pill pill-amber">estimate</span></div></div><div class="preview-chart"><div class="preview-chart-header"><strong>Academic momentum</strong><span class="eyebrow">last 4 terms</span></div><div class="chart-area"><svg class="chart-line" viewBox="0 0 380 90" preserveAspectRatio="none"><polyline points="0,72 65,59 125,63 190,42 250,49 310,28 380,18"/><circle cx="0" cy="72" r="3"/><circle cx="125" cy="63" r="3"/><circle cx="190" cy="42" r="3"/><circle cx="310" cy="28" r="3"/><circle cx="380" cy="18" r="3"/></svg></div></div></div></div></div></div>
      </section>
      <div class="trust-bar"><div class="trust-intro"><span class="eyebrow">A clearer system</span><br />for the decisions behind your degree.</div><div class="trust-item">${icon('check', 'icon-sm')}Demo-first</div><div class="trust-item">${icon('check', 'icon-sm')}Source-aware</div><div class="trust-item">${icon('shield', 'icon-sm')}Privacy-minded</div><div class="trust-item">${icon('layers', 'icon-sm')}NED CISE context</div><div class="trust-item">${icon('bot', 'icon-sm')}AI-ready</div></div>
      <section class="section" id="features"><div class="section-heading"><div><span class="eyebrow">One connected campus map</span><h2>Everything you need to move with intention.</h2></div><p>Stop rebuilding context from PDFs, group chats, and half-remembered advice. EduCompass makes the path visible while keeping estimates clearly marked.</p></div><div class="feature-grid">${features.map(feature => `<article class="feature-card"><div class="feature-image"><img src="${feature.image}" alt="${feature.title} illustration" /></div><div class="feature-top"><div class="feature-icon">${icon(feature.icon)}</div><span class="feature-badge">${feature.badge}</span></div><h3>${feature.title}</h3><p>${feature.description}</p><span class="feature-link">${icon('arrowUpRight', 'icon-sm')}</span></article>`).join('')}</div></section>
      <section class="section" id="workflow"><div class="workflow-band"><div><span class="eyebrow">A practical loop</span><h2>See what is next, and why it matters.</h2><p>From your current semester to your final-year project, each view is designed to reduce uncertainty without pretending to make official university decisions.</p><div style="margin-top:22px"><button class="button button-primary" data-action="route-dashboard">Preview the dashboard ${icon('arrow', 'icon-sm')}</button></div></div><div class="workflow-list"><div class="workflow-step"><span class="workflow-number">01</span><div><strong>Orient</strong><span>Start with your current credits, semester, and goals.</span></div></div><div class="workflow-step"><span class="workflow-number">02</span><div><strong>Explore</strong><span>Compare FYPs, professors, prerequisite chains, and career tracks.</span></div></div><div class="workflow-step"><span class="workflow-number">03</span><div><strong>Decide</strong><span>Save a shortlist and move forward with the source in view.</span></div></div></div></div></section>
      <footer class="landing-footer"><span>© 2026 EduCompass · NED CISE student guidance platform</span><div class="footer-links"><a href="/terms" data-action="terms">Terms</a><a href="/privacy" data-action="terms">Privacy</a><a href="/help" data-action="terms">Help & FAQs</a></div></footer>
    </main>
  </div>`;
}

function sidebar() {
  const workspace = [['dashboard', 'Overview', 'overview'], ['book', 'FYP Archive', 'fyp'], ['users', 'Professors', 'professors'], ['calendar', 'Degree Planner', 'planner'], ['layers', 'Prerequisite Explorer', 'explorer'], ['bot', 'AI Assistant', 'chat']];
  const planning = [['calculator', 'GPA & What-If', 'gpa'], ['rocket', 'Career Hub', 'careers'], ['github', 'GitHub ideas', 'recommendations']];
  const nav = list => list.map(([ic, label, key], index) => `<button class="${key === 'overview' ? 'active' : ''}" data-action="module" data-module="${key}">${icon(ic)}<span>${label}</span></button>`).join('');
  return `<aside class="sidebar" id="sidebar"><div class="sidebar-brand">${brand()}</div><div class="side-label eyebrow">Workspace</div><nav class="side-nav">${nav(workspace)}</nav><div class="side-label eyebrow">Planning</div><nav class="side-nav">${nav(planning)}</nav><div class="sidebar-spacer"></div><div class="sidebar-support">${icon('help', 'icon-sm')}<strong>Need a starting point?</strong><p>Ask the assistant about your next prerequisite or FYP direction.</p><button class="button button-secondary" style="width:100%;min-height:31px;padding:0 8px" data-action="module" data-module="chat">Open assistant ${icon('arrow', 'icon-sm')}</button></div><div class="sidebar-user"><span class="avatar">AK</span><div><strong>Ayesha Khan</strong><span>BE-CSE · Sem 06</span></div>${icon('settings', 'icon-sm')}</div></aside>`;
}
function metricCard(iconName, label, value, suffix, foot, accent = 'brand', meter = '') {
  return `<article class="metric-card"><div class="metric-head"><span>${label}</span><span class="metric-icon" style="color:var(--${accent})">${icon(iconName)}</span></div><div class="metric-value mono">${value}${suffix ? `<small>${suffix}</small>` : ''}</div><div class="metric-foot">${foot}</div>${meter ? `<div class="metric-meter"><span style="width:${meter}%"></span></div>` : ''}</article>`;
}

function dashboardPage() {
  return `<div class="dashboard-shell">${sidebar()}<main class="dashboard-main"><header class="dashboard-topbar"><div class="crumbs"><span>EduCompass</span>${icon('arrow', 'icon-sm')}<strong>Overview</strong></div><div class="topbar-actions"><button class="button button-icon mobile-menu" data-action="mobile-menu" aria-label="Open navigation">${icon('menu')}</button><div class="status-pill"><span class="live-dot"></span>Guidance engine online</div><button class="button button-icon" data-action="notifications" aria-label="Notifications">${icon('bell')}</button>${themeButton()}<span class="avatar">AK</span></div></header><div class="dashboard-content"><div class="dashboard-intro"><div><span class="eyebrow">Student overview · Demo data</span><h1>Good morning, Ayesha.</h1><p>Your academic map is moving in the right direction. Here’s the useful signal for today.</p></div><div class="intro-actions"><button class="button button-secondary" data-action="module" data-module="planner">${icon('calendar', 'icon-sm')} Continue degree plan</button><button class="button button-primary" data-action="module" data-module="chat">${icon('bot', 'icon-sm')} Ask assistant</button></div></div><section class="profile-banner"><div class="profile-main"><span class="avatar">AK</span><div><h2>BE Computer & Information Systems Engineering</h2><p>Semester 06 <span class="subtle">·</span> 68 of 136 credit hours completed <span class="subtle">·</span> Target graduation Spring 2028</p></div></div><div class="profile-chips"><span class="pill pill-cyan">BE-CSE</span><span class="pill pill-sage">50% complete</span><span class="pill pill-amber">Demo data</span></div></section><section class="metric-grid">${metricCard('target', 'Current CGPA', '3.42', '/ 4.00', '<span class="up">↑ 0.18</span> this year', 'brand', '85')}${metricCard('book', 'Credits completed', '68', '/ 136 Cr', '<span class="up">+15 Cr</span> this semester', 'cyan', '50')}${metricCard('layers', 'Prerequisite chain', '04', ' courses', '<span class="estimate">Estimate</span> · critical path depth', 'amber', '67')}${metricCard('bookmark', 'Shortlisted FYPs', '06', ' projects', '<span class="up">+2</span> since last week', 'sage', '')}</section><div class="dashboard-grid"><div class="panel"><div class="panel-header"><div class="panel-title">${icon('compass')}<strong>Your academic toolkit</strong><span class="pill pill-amber">Demo data</span></div><button class="panel-action" data-action="roadmap">View roadmap ${icon('arrow', 'icon-sm')}</button></div><div class="module-grid">${modules.map(module => `<article class="module-card" data-action="module" data-module="${module.key}" tabindex="0" role="button"><div class="module-image"><img src="${module.image}" alt="${module.title} illustration" /></div><div class="module-meta"><span class="module-icon">${icon(module.icon)}</span><span class="module-arrow">${icon('arrowUpRight', 'icon-sm')}</span></div><strong>${module.title}</strong><span>${module.description}</span></article>`).join('')}</div></div><div class="side-stack"><section class="panel"><div class="panel-header"><div class="panel-title">${icon('calendar')}<strong>Today’s schedule</strong></div><button class="panel-action" data-action="schedule">Open calendar</button></div><div class="schedule-list"><div class="schedule-item" style="--accent:var(--cyan)"><span class="schedule-time">09:00</span><i class="schedule-dot"></i><div><strong>Database Systems</strong><span>Lab 2 · 2 hours</span></div></div><div class="schedule-item" style="--accent:var(--brand)"><span class="schedule-time">13:30</span><i class="schedule-dot"></i><div><strong>Software Engineering</strong><span>Room A-12 · Lecture</span></div></div><div class="schedule-item" style="--accent:var(--amber)"><span class="schedule-time">17:00</span><i class="schedule-dot"></i><div><strong>FYP shortlisting</strong><span>Personal focus block</span></div></div></div></section><section class="panel"><div class="panel-header"><div class="panel-title">${icon('bell')}<strong>Department updates</strong></div><span class="pill pill-cyan">2 new</span></div><div class="announcement-list"><article class="announcement"><div class="announcement-top"><strong>FYP archive review complete</strong><time>Today</time></div><p>8 projects in AI & ML were added to the reviewed archive.</p></article><article class="announcement"><div class="announcement-top"><strong>Curriculum office notice</strong><time>2d</time></div><p>Spring 2028 graduation planning window opens next week.</p></article></div></section></div></div><section class="panel" style="margin-top:15px"><div class="panel-header"><div class="panel-title">${icon('clock')}<strong>Recent activity</strong></div><button class="panel-action" data-action="activity">See all activity</button></div><div class="activity-list"><div class="activity-row"><span class="activity-icon">${icon('bookmark', 'icon-sm')}</span><div><strong>Shortlisted “Vision-based Campus Navigation”</strong><span>FYP Archive · AI & Machine Learning</span></div><span class="activity-time">2h ago</span></div><div class="activity-row"><span class="activity-icon">${icon('trend', 'icon-sm')}</span><div><strong>Completed the Computer Networks prerequisite chain</strong><span>Prerequisite Explorer · 3 courses unlocked</span></div><span class="activity-time">Yesterday</span></div><div class="activity-row"><span class="activity-icon">${icon('bot', 'icon-sm')}</span><div><strong>Asked about minimum CGPA to graduate</strong><span>AI Assistant · Layer 1 official rule</span></div><span class="activity-time">Mon</span></div></div></section>${disclaimer()}</div></main></div>`;
}

function render(view = window.location.pathname === '/dashboard' ? 'dashboard' : 'landing') {
  app.innerHTML = view === 'dashboard' ? dashboardPage() : landingPage();
  document.title = view === 'dashboard' ? 'Dashboard · EduCompass' : 'EduCompass — Academic & Career Navigation';
}
function showToast(message, tone = 'cyan') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${icon(tone === 'amber' ? 'help' : 'check', 'icon-sm')}<span>${message}</span>`;
  toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3400);
}
function showModal(title, body, actionLabel = 'Got it') {
  modalRoot.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h3 id="modal-title">${title}</h3><p>${body}</p></div><button class="button button-icon" data-action="close-modal" aria-label="Close">${icon('x')}</button></div><div class="modal-body"><div class="modal-row"><span>Data state</span><strong>Demo data</strong></div><div class="modal-row"><span>Guidance label</span><strong>Estimate where applicable</strong></div><div class="modal-row"><span>Privacy posture</span><strong>No student PII sent to LLMs</strong></div></div><div class="modal-actions"><button class="button button-primary" data-action="close-modal">${actionLabel}</button></div></section></div>`;
}
function routeDashboard() { window.history.pushState({}, '', '/dashboard'); render('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function routeLanding() { window.history.pushState({}, '', '/'); render('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function toggleTheme() { const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; localStorage.setItem('educompass-theme', next); render(window.location.pathname === '/dashboard' ? 'dashboard' : 'landing'); showToast(`${next === 'dark' ? 'Dark' : 'Light'} theme enabled`); }

function triggerAction(target, event) {
  const action = target.dataset.action || target.dataset.route;
  if (target.tagName === 'A' && target.getAttribute('href')?.startsWith('/')) event.preventDefault();
  if (action === 'theme') toggleTheme();
  if (action === 'route-dashboard') routeDashboard();
  if (action === 'landing') routeLanding();
  if (action === 'terms') showModal('Trust is part of the interface', 'EduCompass helps students organize information and compare options. It does not replace official university policy, faculty decisions, or advising.', 'Close notice');
  if (action === 'notifications') showToast('You have 2 new department updates');
  if (action === 'roadmap') showModal('The full platform roadmap', 'The next surfaces are FYP discovery, faculty alignment, degree planning, prerequisite simulation, and the AI assistant with visible source layers.', 'Keep exploring');
  if (action === 'schedule') showToast('Calendar view is next in the product roadmap');
  if (action === 'activity') showToast('Activity history will be available in the next build');
  if (action === 'module') showToast(`${target.dataset.module.replaceAll('-', ' ')} view is staged for the next route`, 'amber');
  if (action === 'mobile-menu') document.querySelector('#sidebar')?.classList.toggle('open');
  if (action === 'close-modal' && (target.classList.contains('modal-backdrop') || target.closest('.modal-actions') || target.closest('.modal-head'))) modalRoot.innerHTML = '';
}

document.addEventListener('click', event => { const target = event.target.closest('[data-action], [data-route]'); if (target) triggerAction(target, event); });
document.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.module-card')) { event.preventDefault(); triggerAction(event.target, event); } });
window.addEventListener('popstate', () => render(window.location.pathname === '/dashboard' ? 'dashboard' : 'landing'));
render();
