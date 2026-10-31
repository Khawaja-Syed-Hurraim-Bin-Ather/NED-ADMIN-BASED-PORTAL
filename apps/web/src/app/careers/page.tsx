'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Modal,
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';
import { useEditMode } from '../../context/EditModeContext';
import { Editable } from '../../components/edit-mode/Editable';

// ─── Static career track data (mirrors docs/data/career_tracks.json) ─────────
// Served as static data — no live scraping at runtime (Rule #1)

interface CareerTrack {
  slug: string;
  title: string;
  summary: string;
  relevant_courses: string[];
  roadmap_variants: string[];
  stages: string[];
  category: string;
  icon: string;
  color: string;
  skills: string[];
  roles: string[];
}

const CAREER_TRACKS: CareerTrack[] = [
  {
    slug: 'ai-ml-engineering',
    title: 'AI & Machine Learning',
    summary: 'Build, train, and ship machine-learning systems, including applications built on large language models.',
    relevant_courses: ['CS-323', 'CS-324', 'CS-436', 'MT-335', 'MT-222', 'MT-442', 'CS-218', 'CS-117'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Foundation (Yr 1)', 'Core ML (Yr 2)', 'Deep Learning (Yr 3)', 'Production AI (Final)'],
    category: 'AI & Data',
    icon: '🧠',
    color: 'purple',
    skills: ['Python', 'TensorFlow/PyTorch', 'Scikit-learn', 'SQL', 'Statistics', 'MLOps'],
    roles: ['ML Engineer', 'AI Researcher', 'Data Scientist', 'NLP Engineer', 'Computer Vision Engineer'],
  },
  {
    slug: 'data-science',
    title: 'Data Science & Analytics',
    summary: 'Turn data into decisions with statistics, SQL, visualisation, and basic modelling.',
    relevant_courses: ['MT-335', 'CS-222', 'CS-324', 'CS-434', 'CS-218'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['SQL & Stats (Yr 1)', 'Analysis (Yr 2)', 'Advanced ML (Yr 3)', 'Capstone Analytics (Final)'],
    category: 'AI & Data',
    icon: '📊',
    color: 'blue',
    skills: ['Python', 'Pandas', 'SQL', 'Power BI / Tableau', 'Statistics', 'R'],
    roles: ['Data Analyst', 'Business Intelligence Engineer', 'Data Engineer', 'Quantitative Analyst'],
  },
  {
    slug: 'frontend-development',
    title: 'Front-End Development',
    summary: 'Build fast, accessible, well-designed interfaces for the web.',
    relevant_courses: ['CS-115', 'CS-116', 'CS-326', 'CS-325', 'CS-433'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['HTML/CSS/JS (Yr 1)', 'React/Vue (Yr 2)', 'Advanced UI (Yr 3)', 'Full Stack (Final)'],
    category: 'Web & Mobile',
    icon: '🎨',
    color: 'pink',
    skills: ['HTML/CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS'],
    roles: ['Frontend Developer', 'UI Engineer', 'React Developer', 'UX Engineer'],
  },
  {
    slug: 'backend-development',
    title: 'Back-End Development',
    summary: 'Design APIs, databases, and server logic that scale and stay secure.',
    relevant_courses: ['CS-222', 'CS-329', 'CS-327', 'CS-433', 'CS-432', 'CS-326', 'CS-218'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Programming (Yr 1)', 'Databases (Yr 2)', 'APIs & Services (Yr 3)', 'Architecture (Final)'],
    category: 'Web & Mobile',
    icon: '⚙️',
    color: 'emerald',
    skills: ['Node.js / Express', 'PostgreSQL', 'REST APIs', 'Docker', 'Redis', 'System Design'],
    roles: ['Backend Developer', 'API Engineer', 'Database Engineer', 'Software Architect'],
  },
  {
    slug: 'mobile-development',
    title: 'Mobile App Development',
    summary: 'Build Android and iOS apps, native or cross-platform.',
    relevant_courses: ['CS-116', 'CS-326', 'CS-325', 'CS-433'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['OOP (Yr 1)', 'Android/Flutter (Yr 2)', 'Native & APIs (Yr 3)', 'App Store Ready (Final)'],
    category: 'Web & Mobile',
    icon: '📱',
    color: 'orange',
    skills: ['Flutter / Dart', 'React Native', 'Kotlin', 'Swift', 'Firebase', 'REST APIs'],
    roles: ['Mobile Developer', 'iOS Engineer', 'Android Engineer', 'Cross-Platform Developer'],
  },
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity',
    summary: 'Find and fix weaknesses in software, networks, and systems.',
    relevant_courses: ['CS-426', 'CS-327', 'CS-329', 'CS-222'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Networking (Yr 1)', 'OS & Security (Yr 2)', 'Ethical Hacking (Yr 3)', 'SOC & Forensics (Final)'],
    category: 'Security & Systems',
    icon: '🔐',
    color: 'red',
    skills: ['Linux', 'Networking', 'Penetration Testing', 'Python', 'Cryptography', 'SIEM'],
    roles: ['Security Engineer', 'Penetration Tester', 'SOC Analyst', 'Security Researcher'],
  },
  {
    slug: 'devops-cloud',
    title: 'DevOps & Cloud Engineering',
    summary: 'Automate builds, deployments, and infrastructure on the cloud.',
    relevant_courses: ['CS-329', 'CS-327', 'CS-432', 'CS-325', 'CS-435'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Linux & Git (Yr 1)', 'CI/CD (Yr 2)', 'Kubernetes (Yr 3)', 'Cloud Architecture (Final)'],
    category: 'Security & Systems',
    icon: '☁️',
    color: 'cyan',
    skills: ['Docker', 'Kubernetes', 'AWS/GCP/Azure', 'Terraform', 'GitHub Actions', 'Linux'],
    roles: ['DevOps Engineer', 'Cloud Architect', 'SRE', 'Platform Engineer'],
  },
  {
    slug: 'embedded-iot',
    title: 'Embedded Systems & IoT',
    summary: 'Program microcontrollers and connected devices close to the hardware.',
    relevant_courses: ['CS-301', 'CS-221', 'CS-219', 'CS-328', 'CS-431', 'EE-120', 'EL-103', 'CS-220'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Digital Logic (Yr 1)', 'Microcontrollers (Yr 2)', 'RTOS & IoT (Yr 3)', 'Edge AI (Final)'],
    category: 'Security & Systems',
    icon: '🤖',
    color: 'yellow',
    skills: ['C/C++', 'Arduino', 'Raspberry Pi', 'RTOS', 'MQTT', 'PCB Design'],
    roles: ['Embedded Systems Engineer', 'IoT Developer', 'Firmware Engineer', 'Hardware Engineer'],
  },
  {
    slug: 'game-development',
    title: 'Game Development',
    summary: 'Build games and interactive experiences with real-time graphics and physics.',
    relevant_courses: ['CS-116', 'CS-218', 'CS-437', 'MT-222', 'CS-436'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Programming (Yr 1)', 'Game Math (Yr 2)', 'Unity/Unreal (Yr 3)', 'Shipped Title (Final)'],
    category: 'Creative & Design',
    icon: '🎮',
    color: 'violet',
    skills: ['C# / Unity', 'C++ / Unreal', 'Linear Algebra', 'Physics Simulation', 'Shaders', 'Game Design'],
    roles: ['Game Developer', 'Graphics Programmer', 'Technical Artist', 'Unity Developer'],
  },
  {
    slug: 'software-testing-qa',
    title: 'Software Testing & QA',
    summary: 'Make software reliable through test design, automation, and quality processes.',
    relevant_courses: ['CS-325', 'CS-326', 'CS-435'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Testing Basics (Yr 1)', 'Automation (Yr 2)', 'CI/CD Integration (Yr 3)', 'Quality Leadership (Final)'],
    category: 'Creative & Design',
    icon: '🧪',
    color: 'teal',
    skills: ['Selenium', 'Cypress', 'Jest', 'Postman', 'JIRA', 'Test Strategy'],
    roles: ['QA Engineer', 'SDET', 'Automation Engineer', 'Test Lead'],
  },
  {
    slug: 'entrepreneurship',
    title: 'Entrepreneurship',
    summary: 'Turn a technical idea into a product, a team, and a business.',
    relevant_courses: ['CS-425', 'EF-305', 'MG-482', 'CS-435'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Ideation (Yr 1)', 'MVP Build (Yr 2)', 'Market Fit (Yr 3)', 'Scale & Fundraise (Final)'],
    category: 'Business & Leadership',
    icon: '🚀',
    color: 'amber',
    skills: ['Product Management', 'Lean Startup', 'Pitching', 'Prototyping', 'User Research', 'Finance Basics'],
    roles: ['Founder / CTO', 'Product Manager', 'Technical Lead', 'Startup Engineer'],
  },
  {
    slug: 'systems-hardware-design',
    title: 'Systems, Networks & Hardware',
    summary: 'Work on digital design, FPGAs, signal processing, networks, and low-level systems.',
    relevant_courses: ['CS-220', 'CS-431', 'CS-419', 'CS-328', 'CS-221', 'CS-301', 'CS-215', 'CS-327'],
    roadmap_variants: ['6-12 months', '2-4 years'],
    stages: ['Digital Logic (Yr 1)', 'Architecture (Yr 2)', 'Networks & FPGA (Yr 3)', 'Systems Design (Final)'],
    category: 'Security & Systems',
    icon: '🖥️',
    color: 'slate',
    skills: ['Verilog/VHDL', 'FPGA', 'Computer Architecture', 'Networking', 'Linux Kernel', 'Assembly'],
    roles: ['Computer Architect', 'Network Engineer', 'FPGA Engineer', 'Systems Programmer'],
  },
];

const CATEGORIES = ['All', 'AI & Data', 'Web & Mobile', 'Security & Systems', 'Creative & Design', 'Business & Leadership'];

const COLOR_MAP: Record<string, { badge: string; icon: string; border: string; glow: string }> = {
  purple:  { badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',  icon: 'bg-purple-500/15 text-purple-300', border: 'border-purple-500/30', glow: 'shadow-purple-500/10' },
  blue:    { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',        icon: 'bg-blue-500/15 text-blue-300',    border: 'border-blue-500/30',   glow: 'shadow-blue-500/10' },
  pink:    { badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',        icon: 'bg-pink-500/15 text-pink-300',    border: 'border-pink-500/30',   glow: 'shadow-pink-500/10' },
  emerald: { badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: 'bg-emerald-500/15 text-emerald-300', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/10' },
  orange:  { badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',  icon: 'bg-orange-500/15 text-orange-300', border: 'border-orange-500/30', glow: 'shadow-orange-500/10' },
  red:     { badge: 'bg-red-500/15 text-red-300 border-red-500/30',           icon: 'bg-red-500/15 text-red-300',      border: 'border-red-500/30',    glow: 'shadow-red-500/10' },
  cyan:    { badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',        icon: 'bg-cyan-500/15 text-cyan-300',    border: 'border-cyan-500/30',   glow: 'shadow-cyan-500/10' },
  yellow:  { badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',  icon: 'bg-yellow-500/15 text-yellow-300', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/10' },
  violet:  { badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',  icon: 'bg-violet-500/15 text-violet-300', border: 'border-violet-500/30', glow: 'shadow-violet-500/10' },
  teal:    { badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',        icon: 'bg-teal-500/15 text-teal-300',    border: 'border-teal-500/30',   glow: 'shadow-teal-500/10' },
  amber:   { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',     icon: 'bg-amber-500/15 text-amber-300',  border: 'border-amber-500/30',  glow: 'shadow-amber-500/10' },
  slate:   { badge: 'bg-slate-500/15 text-slate-300 border-slate-500/30',     icon: 'bg-slate-500/15 text-slate-300',  border: 'border-slate-500/30',  glow: 'shadow-slate-500/10' },
};

export default function CareerHubPage() {
  const { isEditMode, viewAsStudent, can, pendingItems, saveDraftItem } = useEditMode();
  const canEdit = isEditMode && !viewAsStudent && can('careers', 'edit');

  const [tracks, setTracks] = useState<CareerTrack[]>(CAREER_TRACKS);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTrack, setSelectedTrack] = useState<CareerTrack | null>(null);
  const [newStepText, setNewStepText] = useState('');

  // Fetch live career tracks from API
  useEffect(() => {
    async function loadCareers() {
      try {
        const res = await fetch('/api/v1/careers');
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setTracks(
              json.data.map((t: any) => ({
                ...t,
                category: t.category || 'Engineering',
                icon: t.icon || '💼',
                color: t.color || 'blue',
                skills: t.skills || ['Core Computing', 'System Architecture'],
                roles: t.roles || ['Software Engineer'],
                stages: t.stages || ['Foundation', 'Intermediate', 'Advanced', 'Capstone'],
              }))
            );
          }
        }
      } catch {
        // Fallback remains CAREER_TRACKS
      }
    }
    loadCareers();
  }, []);

  // Overlay draft change items onto tracks
  const activeTracks = useMemo(() => {
    let list: CareerTrack[] = [...tracks];

    if (isEditMode && !viewAsStudent) {
      for (const item of pendingItems) {
        if (item.table_name === 'career_tracks' && item.record_id) {
          if (item.op === 'update' && item.after) {
            const idx = list.findIndex((t) => t.slug === item.record_id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...item.after };
            }
          }
        }
      }
    }

    return list;
  }, [tracks, isEditMode, viewAsStudent, pendingItems]);

  const handleMoveStage = (track: CareerTrack, index: number, direction: 'up' | 'down') => {
    if (!canEdit) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= track.stages.length) return;

    const nextStages = [...track.stages];
    const [removed] = nextStages.splice(index, 1);
    nextStages.splice(newIndex, 0, removed);

    saveDraftItem(
      'careers',
      'career_tracks',
      track.slug,
      { stages: nextStages },
      'update',
      `Reorder roadmap steps for "${track.title}"`
    );

    setTracks((prev) =>
      prev.map((t) => (t.slug === track.slug ? { ...t, stages: nextStages } : t))
    );
    if (selectedTrack?.slug === track.slug) {
      setSelectedTrack({ ...selectedTrack, stages: nextStages });
    }
  };

  const handleAddStage = (track: CareerTrack) => {
    if (!canEdit || !newStepText.trim()) return;
    const nextStages = [...track.stages, newStepText.trim()];

    saveDraftItem(
      'careers',
      'career_tracks',
      track.slug,
      { stages: nextStages },
      'update',
      `Add step "${newStepText.trim()}" to "${track.title}"`
    );

    setTracks((prev) =>
      prev.map((t) => (t.slug === track.slug ? { ...t, stages: nextStages } : t))
    );
    if (selectedTrack?.slug === track.slug) {
      setSelectedTrack({ ...selectedTrack, stages: nextStages });
    }
    setNewStepText('');
  };

  const filtered = useMemo(() => {
    return activeTracks.filter((t) => {
      const matchCat = activeCategory === 'All' || t.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.skills.some((s) => s.toLowerCase().includes(q)) ||
        t.roles.some((r) => r.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [activeTracks, search, activeCategory]);

  return (
    <div className="inner-page">
      {/* Shared Page Header */}
      <PageHeader
        title="Career Hub &amp; Technology Tracks"
        breadcrumbs={[{ label: 'Career Hub' }]}
        badge="12 Curated Tracks"
        description="Explore 12 industry career paths aligned with your NED CISE curriculum. Discover essential skills, job roles, and recommended coursework."
        accent="var(--lavender)"
        actions={
          <Link
            href="/fyp"
            className="button button-secondary text-xs"
          >
            <span>Browse FYPs</span>
            <span>&rarr;</span>
          </Link>
        }
      />

      <main className="inner-page-body space-y-6">
        {/* Search & Category Filter Toolbar */}
        <div className="p-5 rounded-2xl bg-[#14212c]/90 border border-[rgba(213,228,236,0.12)] shadow-xl backdrop-blur-md space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                id="career-search"
                type="text"
                placeholder="Search tracks, skills, or job roles…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-[#0f1823] border-[rgba(213,228,236,0.15)] text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  id={`cat-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-xs font-extrabold transition-all ${
                    activeCategory === cat
                      ? 'border-[#9bcbd0] bg-[rgba(155,203,208,0.15)] text-[#9bcbd0]'
                      : 'border-[rgba(213,228,236,0.12)] text-slate-400 hover:border-slate-500 hover:text-white bg-[#0f1823]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[rgba(213,228,236,0.08)]">
            <span>
              Showing <strong className="text-white font-mono">{filtered.length}</strong> of{' '}
              <span className="font-mono">{CAREER_TRACKS.length}</span> career tracks
            </span>
            <span className="text-[#e1b97d] font-semibold text-[11px]">
              Guidance estimates &bull; NED CISE
            </span>
          </div>
        </div>

        {/* Track Grid */}
        <div>
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-[rgba(213,228,236,0.12)] bg-[#14212c]/60 p-12 text-center">
              <p className="text-slate-400">No career tracks match your search. Try different keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((track) => {
                const c = COLOR_MAP[track.color] ?? COLOR_MAP.slate;
                return (
                  <Card
                    key={track.slug}
                    variant="interactive"
                    className={`group flex flex-col border ${c.border} hover:shadow-lg hover:${c.glow} transition-all duration-300`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${c.border} ${c.icon} text-xl`}
                        >
                          {track.icon}
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${c.badge}`}
                        >
                          {track.category}
                        </span>
                      </div>
                      <CardTitle className="mt-3 text-base text-white">{track.title}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">{track.summary}</CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 space-y-3">
                      {/* Top Skills */}
                      <div>
                        <p className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">
                          Key Skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {track.skills.slice(0, 4).map((skill) => (
                            <span
                              key={skill}
                              className="rounded border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-300"
                            >
                              {skill}
                            </span>
                          ))}
                          {track.skills.length > 4 && (
                            <span className="rounded border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-400">
                              +{track.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Roadmap variants */}
                      <div>
                        <p className="mb-1.5 text-[10px] uppercase tracking-widest text-slate-500">
                          Roadmaps
                        </p>
                        <div className="flex gap-1.5">
                          {track.roadmap_variants.map((v) => (
                            <span
                              key={v}
                              className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="flex gap-2 border-t border-slate-800 pt-4">
                      <Button
                        id={`explore-${track.slug}`}
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedTrack(track)}
                      >
                        Explore Track
                      </Button>
                      <Link href={`/fyp?domain=${encodeURIComponent(track.slug.replace(/-/g, '_'))}`}>
                        <Button variant="outline" size="sm">
                          FYPs
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

      {/* Track Detail Modal */}
      <Modal
        isOpen={!!selectedTrack}
        onClose={() => setSelectedTrack(null)}
        title={selectedTrack ? `${selectedTrack.icon} ${selectedTrack.title}` : ''}
        description={selectedTrack?.summary}
        className="max-w-2xl"
      >
        {selectedTrack && (
          <div className="space-y-5 text-sm">
            {/* Roles */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Target Job Roles
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTrack.roles.map((role) => {
                  const c = COLOR_MAP[selectedTrack.color] ?? COLOR_MAP.slate;
                  return (
                    <span
                      key={role}
                      className={`rounded-full border px-3 py-1 text-xs ${c.badge}`}
                    >
                      {role}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* All Skills */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Skills to Build
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTrack.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Year-by-year stages / Learning Path */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Learning Path {canEdit && <span className="text-amber-400 font-mono">(Editable Roadmap)</span>}
                </p>
                {canEdit && (
                  <span className="text-[10px] text-slate-400">Use arrows to reorder steps</span>
                )}
              </div>

              <ol className="space-y-2">
                {selectedTrack.stages.map((stage, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 p-2 rounded bg-slate-900/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="text-slate-300">{stage}</span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          disabled={i === 0}
                          onClick={() => handleMoveStage(selectedTrack, i, 'up')}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-20 text-xs"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          disabled={i === selectedTrack.stages.length - 1}
                          onClick={() => handleMoveStage(selectedTrack, i, 'down')}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-20 text-xs"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {/* Add Step Form (Edit Mode Only) */}
              {canEdit && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="New roadmap stage (e.g. Distributed Consensus & Raft)..."
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    className="flex-1 bg-[#162231] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    disabled={!newStepText.trim()}
                    onClick={() => handleAddStage(selectedTrack)}
                    className="px-3 py-1 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-medium text-xs disabled:opacity-40 transition-colors"
                  >
                    + Add Step
                  </button>
                </div>
              )}
            </div>

            {/* Relevant NED Courses */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Relevant NED Courses
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTrack.relevant_courses.map((code) => (
                  <span
                    key={code}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs text-slate-300"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>

            {/* Roadmap variants */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Roadmap Timelines
              </p>
              <div className="flex gap-2">
                {selectedTrack.roadmap_variants.map((v) => (
                  <div
                    key={v}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-center text-xs text-slate-300"
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-300/80">
              ⚠️ Career alignment is a guidance estimate based on curriculum data, not official university decisions.
              Track match scores show approximate suitability only.
            </p>

            {/* CTA */}
            <div className="flex gap-3 pt-1">
              <Link href={`/fyp?domain=${selectedTrack.slug}`} className="flex-1">
                <Button id={`modal-fyp-${selectedTrack.slug}`} variant="primary" size="sm" className="w-full">
                  Browse Related FYPs →
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTrack(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  </div>
);
}
