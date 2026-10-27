'use client';

const FEATURES = [
  {
    emoji: '📚',
    title: 'FYP Archive & Semantic Search',
    description:
      '68 officially reviewed Final Year Projects with AI similarity matching, team formation board, and shortlisting.',
    href: '/fyp',
    color: 'blue',
    badge: 'M1',
  },
  {
    emoji: '🧑‍🏫',
    title: 'Professor Directory',
    description:
      '16 CISE faculty profiles with research domains, supervised FYPs, and AI match scoring. Request supervision via mailto.',
    href: '/professors',
    color: 'violet',
    badge: 'M2',
  },
  {
    emoji: '🗓️',
    title: 'Degree Planner',
    description:
      'Build your 8-semester schedule with live prerequisite validation, workload balancing, and JSON export.',
    href: '/planner',
    color: 'emerald',
    badge: 'M3',
  },
  {
    emoji: '🔬',
    title: 'Prerequisite Explorer',
    description:
      'Visualise the full course dependency graph, simulate failure scenarios, and identify critical path bottlenecks.',
    href: '/explorer',
    color: 'amber',
    badge: 'H2',
  },
  {
    emoji: '🤖',
    title: 'AI Academic Assistant',
    description:
      '4-layer chatbot: preloaded answers → retrieval → LLM → fallback. 300-char cap, verified context only. No hallucination.',
    href: '/chat',
    color: 'cyan',
    badge: 'H3',
  },
  {
    emoji: '📊',
    title: 'GPA Calculator & What-If',
    description:
      'Calculate semester GPA, simulate grade changes, and see how your current average affects graduation CGPA.',
    href: '/gpa',
    color: 'rose',
    badge: 'E4',
  },
  {
    emoji: '🚀',
    title: 'Career Hub',
    description:
      '12 tech career tracks — AI, Web, DevOps, Cybersecurity — with skills maps, roles, and personalised recommendations.',
    href: '/careers',
    color: 'orange',
    badge: 'E2',
  },
  {
    emoji: '⭐',
    title: 'GitHub FYP Recommender',
    description:
      'Discover public GitHub repositories matching your interests. Real-time GitHub API search with star/fork ranking.',
    href: '/recommendations',
    color: 'yellow',
    badge: 'E5',
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  blue:    { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.25)',  badge: 'rgba(59,130,246,0.2)',  text: '#93c5fd' },
  violet:  { bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.25)',  badge: 'rgba(139,92,246,0.2)',  text: '#c4b5fd' },
  emerald: { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)', badge: 'rgba(16,185,129,0.2)', text: '#6ee7b7' },
  amber:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)',  badge: 'rgba(245,158,11,0.2)',  text: '#fcd34d' },
  cyan:    { bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.25)',   badge: 'rgba(6,182,212,0.2)',   text: '#67e8f9' },
  rose:    { bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.25)',   badge: 'rgba(244,63,94,0.2)',   text: '#fda4af' },
  orange:  { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  badge: 'rgba(249,115,22,0.2)',  text: '#fdba74' },
  yellow:  { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.25)',   badge: 'rgba(234,179,8,0.2)',   text: '#fde047' },
};

export function FeatureGrid() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
      }}
    >
      {FEATURES.map((f) => {
        const c = COLOR_MAP[f.color] ?? COLOR_MAP.blue;
        return (
          <a
            key={f.href}
            href={f.href}
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <FeatureCard feature={f} colors={c} />
          </a>
        );
      })}
    </div>
  );
}

function FeatureCard({
  feature,
  colors,
}: {
  feature: (typeof FEATURES)[number];
  colors: { bg: string; border: string; badge: string; text: string };
}) {
  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '24px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = `0 12px 40px ${colors.border}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = '';
        el.style.boxShadow = '';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.6rem' }}>{feature.emoji}</span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: '700',
            padding: '2px 8px',
            borderRadius: '20px',
            background: colors.badge,
            color: colors.text,
            letterSpacing: '0.05em',
          }}
        >
          {feature.badge}
        </span>
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: '1rem',
          fontWeight: '700',
          color: '#e2e8f0',
          lineHeight: 1.3,
        }}
      >
        {feature.title}
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: '0.8rem',
          color: '#94a3b8',
          lineHeight: 1.6,
          flexGrow: 1,
        }}
      >
        {feature.description}
      </p>
      <span style={{ fontSize: '0.8rem', color: colors.text, fontWeight: '600' }}>
        Open →
      </span>
    </div>
  );
}
