'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
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
  Alert,
  DisclaimerBanner,
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';

interface FYPProject {
  id: string;
  title: string;
  raw_title: string;
  year: number;
  supervisor: string;
  supervisor_title: string | null;
  co_supervisor: string | null;
  department: string;
  university: string;
  team_size: number | null;
  domain_tags: string[];
  tools: string[];
  proposal_outcome: 'accepted' | 'rejected' | 'unknown';
  outcome_reason: string | null;
  relevance: string;
  source_file: string;
  source_page: number | null;
  natural_key: string;
  created_at: string;
}

interface SimilarProject {
  id: string;
  title: string;
  year?: number;
  supervisor?: string;
  domain_tags?: string[];
  similarity: number;
  matchMethod: string;
  matchLabel: string;
}

interface TeamIdea {
  id: string;
  user_id: string;
  title: string;
  description: string;
  required_skills: string[];
  domain_tags: string[];
  team_size_wanted: number;
  contact_hint: string | null;
  is_open: boolean;
  created_at: string;
}

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'All Domains' },
  { value: 'ai-ml', label: 'AI & Machine Learning' },
  { value: 'healthcare-tech', label: 'Healthcare & MedTech' },
  { value: 'web-mobile', label: 'Web & Mobile' },
  { value: 'robotics-embedded', label: 'Robotics & Embedded/IoT' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
];

const YEAR_OPTIONS = ['all', '2025', '2024', '2023', '2022'];

export default function FYPPortalPage() {
  const [activeTab, setActiveTab] = useState<'archive' | 'teamboard'>('archive');
  const [projects, setProjects] = useState<FYPProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters for Archive
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');

  // Shortlisted project IDs
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Modal details
  const [activeModalProject, setActiveModalProject] = useState<FYPProject | null>(null);

  // Similarity Search State (Card M1)
  const [similarModalOpen, setSimilarModalOpen] = useState(false);
  const [targetProjectForSimilar, setTargetProjectForSimilar] = useState<FYPProject | null>(null);
  const [similarResults, setSimilarResults] = useState<SimilarProject[]>([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState<string | null>(null);
  const [similarDisclaimer, setSimilarDisclaimer] = useState<string | null>(null);

  // Team Formation Board State (Card M1)
  const [teamIdeas, setTeamIdeas] = useState<TeamIdea[]>([]);
  const [teamIdeasLoading, setTeamIdeasLoading] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [postIdeaModalOpen, setPostIdeaModalOpen] = useState(false);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Idea Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newDomain, setNewDomain] = useState('ai-ml');
  const [newTeamSize, setNewTeamSize] = useState(3);
  const [newContact, setNewContact] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    async function fetchFYPs() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Check user session
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          const role = (user.user_metadata?.role as string) || 'enrolled';
          setUserRole(role);

          // Fetch existing shortlists
          const { data: slData } = await supabase
            .from('fyp_shortlists')
            .select('project_id')
            .eq('user_id', user.id);

          if (slData) {
            setShortlistedIds(new Set(slData.map((s) => s.project_id)));
          }
        }

        // Fetch FYP records
        const { data, error } = await supabase
          .from('fyp_projects')
          .select('*')
          .order('year', { ascending: false });

        if (error) {
          setErrorMsg(error.message);
        } else if (data) {
          setProjects(data as FYPProject[]);
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    }

    fetchFYPs();
  }, []);

  // Fetch Team Ideas when tab is switched
  useEffect(() => {
    if (activeTab === 'teamboard') {
      fetchTeamIdeas();
    }
  }, [activeTab]);

  async function fetchTeamIdeas() {
    try {
      setTeamIdeasLoading(true);
      const res = await fetch(`${apiUrl}/api/v1/fyp/team-ideas?pageSize=50`);
      if (res.ok) {
        const json = await res.json();
        setTeamIdeas(json.data || []);
      }
    } catch {
      // Fallback silently or show empty
    } finally {
      setTeamIdeasLoading(false);
    }
  }

  async function handleFindSimilar(project: FYPProject, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setTargetProjectForSimilar(project);
    setSimilarModalOpen(true);
    setSimilarLoading(true);
    setSimilarError(null);
    setSimilarResults([]);

    try {
      const res = await fetch(`${apiUrl}/api/v1/fyp/${project.id}/similar?limit=6`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to calculate similar projects');
      }

      setSimilarResults(data.results || []);
      setSimilarDisclaimer(data.estimateDisclaimer || 'Similarity scores are guidance estimates, not official rankings (Rule #7).');
    } catch (err: unknown) {
      setSimilarError(err instanceof Error ? err.message : 'Could not retrieve similar projects.');
    } finally {
      setSimilarLoading(false);
    }
  }

  async function toggleShortlist(project: FYPProject, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (!userId) {
      alert('Please sign in to shortlist projects.');
      return;
    }

    const supabase = createClient();
    const isCurrentlyShortlisted = shortlistedIds.has(project.id);

    // Optimistic UI update
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyShortlisted) {
        next.delete(project.id);
      } else {
        next.add(project.id);
      }
      return next;
    });

    if (isCurrentlyShortlisted) {
      await supabase
        .from('fyp_shortlists')
        .delete()
        .eq('user_id', userId)
        .eq('project_id', project.id);
    } else {
      await supabase.from('fyp_shortlists').insert({
        user_id: userId,
        project_id: project.id,
      });
    }
  }

  async function handleCreateTeamIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      alert('Please log in with your university account to post an FYP idea.');
      return;
    }

    setPostLoading(true);
    setPostError(null);

    const skillsArray = newSkills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${apiUrl}/api/v1/fyp/team-ideas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          required_skills: skillsArray,
          domain_tags: [newDomain],
          team_size_wanted: Number(newTeamSize),
          contact_hint: newContact.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to submit team idea');
      }

      setPostIdeaModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewSkills('');
      setNewContact('');
      fetchTeamIdeas();
    } catch (err: unknown) {
      setPostError(err instanceof Error ? err.message : 'Error submitting post');
    } finally {
      setPostLoading(false);
    }
  }

  async function handleToggleStatus(idea: TeamIdea) {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${apiUrl}/api/v1/fyp/team-ideas/${idea.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ is_open: !idea.is_open }),
      });

      if (res.ok) {
        fetchTeamIdeas();
      }
    } catch {
      alert('Failed to update status');
    }
  }

  async function handleDeleteIdea(ideaId: string) {
    if (!confirm('Are you sure you want to remove this team proposal?')) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`${apiUrl}/api/v1/fyp/team-ideas/${ideaId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        fetchTeamIdeas();
      }
    } catch {
      alert('Failed to delete idea');
    }
  }

  function handleCopyContact(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  // Filtered Archive dataset
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesSupervisor = (p.supervisor || '').toLowerCase().includes(query);
        const matchesTools = (p.tools || []).some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesSupervisor && !matchesTools) return false;
      }
      if (selectedYear !== 'all' && p.year.toString() !== selectedYear) return false;
      if (selectedDomain !== 'all') {
        const hasDomain = (p.domain_tags || []).some((d) =>
          d.toLowerCase().includes(selectedDomain.toLowerCase())
        );
        if (!hasDomain) return false;
      }
      if (selectedOutcome !== 'all' && p.proposal_outcome !== selectedOutcome) return false;
      return true;
    });
  }, [projects, searchQuery, selectedYear, selectedDomain, selectedOutcome]);

  // Filtered Team Board Ideas
  const filteredTeamIdeas = useMemo(() => {
    return teamIdeas.filter((idea) => {
      if (teamStatusFilter === 'open' && !idea.is_open) return false;
      if (teamStatusFilter === 'closed' && idea.is_open) return false;
      if (teamSearchQuery.trim()) {
        const q = teamSearchQuery.toLowerCase();
        const matchesTitle = idea.title.toLowerCase().includes(q);
        const matchesDesc = idea.description.toLowerCase().includes(q);
        const matchesSkills = (idea.required_skills || []).some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesSkills) return false;
      }
      return true;
    });
  }, [teamIdeas, teamSearchQuery, teamStatusFilter]);

  return (
    <div className="inner-page">
      {/* Shared Page Header */}
      <PageHeader
        title="FYP Archive &amp; Team Board"
        breadcrumbs={[{ label: 'FYP Portal' }]}
        badge="M1"
        description="68 reviewed NED CISE final year projects. Semantic similarity search, domain filters, and student team formation board."
        accent="var(--cyan)"
        actions={
          <Link href="/recommendations" className="button button-secondary" style={{ minHeight: 34, padding: '0 12px', fontSize: 11 }}>
            GitHub Ideas →
          </Link>
        }
      />

      <main className="inner-page-body" style={{ maxWidth: 1280 }}>
        {/* Tab selector — design system toolbar-tabs */}
        <div style={{ marginBottom: 24 }}>
          <div className="toolbar-tabs" style={{ display: 'inline-flex' }}>
            <button
              onClick={() => setActiveTab('archive')}
              className={`toolbar-tab${activeTab === 'archive' ? ' active' : ''}`}
            >
              📚 FYP Archive
              <span className="pill pill-cyan" style={{ marginLeft: 8, minHeight: 18, padding: '0 7px', fontSize: 9 }}>
                {projects.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('teamboard')}
              className={`toolbar-tab${activeTab === 'teamboard' ? ' active' : ''}`}
            >
              🤝 Team Board
              <span className="demo-chip" style={{ marginLeft: 8 }}>M1</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <Alert variant="danger" title="Error loading projects">
            {errorMsg}
          </Alert>
        )}

        {/* ─── TAB 1: ARCHIVE ────────────────────────────────────────────── */}
        {activeTab === 'archive' && (
          <>
            {/* Filter Controls Bar */}
            <div className="space-y-4 bg-[#14212c]/90 p-5 rounded-2xl border border-[rgba(213,228,236,0.12)] shadow-xl backdrop-blur-md">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-6">
                  <Input
                    placeholder="Search projects by keyword, supervisor, or technology..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0f1823] border-[rgba(213,228,236,0.15)] text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] px-3 text-xs text-white focus:outline-none focus:border-[#9bcbd0]"
                  >
                    <option value="all">All Years (2022–2025)</option>
                    <option value="2025">2025 (Latest)</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] px-3 text-xs text-white focus:outline-none focus:border-[#9bcbd0]"
                  >
                    {DOMAIN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <select
                    value={selectedOutcome}
                    onChange={(e) => setSelectedOutcome(e.target.value)}
                    className="w-full h-10 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] px-3 text-xs text-white focus:outline-none focus:border-[#9bcbd0]"
                  >
                    <option value="all">All Outcomes</option>
                    <option value="accepted">Accepted Projects</option>
                    <option value="rejected">Rejected Projects</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-[rgba(213,228,236,0.08)]">
                <span>
                  Showing <strong className="text-white font-mono">{filteredProjects.length}</strong> of{' '}
                  <span className="font-mono">{projects.length}</span> recorded FYDPs
                </span>
                {shortlistedIds.size > 0 && (
                  <span className="text-[#e1b97d] font-bold flex items-center gap-1">
                    <span>★</span> {shortlistedIds.size} Shortlisted
                  </span>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
                <svg className="animate-spin h-7 w-7 text-[#9bcbd0]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-semibold">Loading official NED FYDP database records...</span>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-16 p-8 space-y-3 bg-[#14212c]/60 rounded-2xl border border-[rgba(213,228,236,0.1)]">
                <p className="text-slate-200 font-bold">No FYP projects match your selected filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedYear('all');
                    setSelectedDomain('all');
                    setSelectedOutcome('all');
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              /* Projects Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                  const isShortlisted = shortlistedIds.has(project.id);

                  return (
                    <Card
                      key={project.id}
                      variant="interactive"
                      onClick={() => setActiveModalProject(project)}
                      className="flex flex-col justify-between border-t-2 border-t-[rgba(145,172,203,0.4)] hover:border-t-[#91accb] hover:border-[rgba(155,203,208,0.4)] transition-all duration-200 group"
                    >
                      <CardHeader className="p-5 pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0f1823] text-slate-300 border border-[rgba(213,228,236,0.15)]">
                              {project.year}
                            </span>
                            <Badge
                              variant={
                                project.proposal_outcome === 'accepted'
                                  ? 'success'
                                  : project.proposal_outcome === 'rejected'
                                  ? 'danger'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {project.proposal_outcome === 'accepted'
                                ? 'Accepted'
                                : project.proposal_outcome === 'rejected'
                                ? 'Rejected'
                                : 'Pending'}
                            </Badge>
                          </div>

                          <button
                            onClick={(e) => toggleShortlist(project, e)}
                            aria-label="Toggle shortlist"
                            className={`text-base p-1 rounded-full transition-colors ${
                              isShortlisted
                                ? 'text-[#e1b97d] hover:text-amber-300'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                          >
                            {isShortlisted ? '★' : '☆'}
                          </button>
                        </div>

                        <CardTitle className="text-sm font-extrabold line-clamp-2 leading-snug text-white group-hover:text-[#9bcbd0] transition-colors">
                          {project.title}
                        </CardTitle>

                        <CardDescription className="text-xs text-slate-400 mt-2">
                          Supervisor: <span className="text-slate-200 font-medium">{project.supervisor || 'Department Assigned'}</span>
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="px-5 space-y-3">
                        {project.domain_tags && project.domain_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {project.domain_tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[rgba(155,203,208,0.12)] text-[#9bcbd0] border border-[rgba(155,203,208,0.3)]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="border-t border-[rgba(213,228,236,0.06)] p-5 pt-3 text-xs text-slate-400 justify-between items-center mt-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleFindSimilar(project, e)}
                          className="text-xs text-[#9bcbd0] hover:text-white p-0 h-auto font-bold flex items-center gap-1"
                        >
                          <span>✨ Similar FYPs</span>
                        </Button>
                        <span className="text-slate-400 group-hover:text-white font-bold transition-colors">
                          Details &rarr;
                        </span>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── TAB 2: TEAM FORMATION BOARD (Card M1) ────────────────────── */}
        {activeTab === 'teamboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Student FYP Team Collaboration Board</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Connect with fellow CISE students seeking teammates or pitch your own project idea.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPostIdeaModalOpen(true)}
                className="whitespace-nowrap"
              >
                + Pitch Your Team Idea
              </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <Input
                placeholder="Search ideas by role, skill (e.g., PyTorch, Next.js), or topic..."
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="w-full sm:max-w-md"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant={teamStatusFilter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTeamStatusFilter('all')}
                >
                  All Posts
                </Button>
                <Button
                  variant={teamStatusFilter === 'open' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTeamStatusFilter('open')}
                >
                  Open Only
                </Button>
                <Button
                  variant={teamStatusFilter === 'closed' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTeamStatusFilter('closed')}
                >
                  Filled
                </Button>
              </div>
            </div>

            {/* Ideas List */}
            {teamIdeasLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
                <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading team proposals...
              </div>
            ) : filteredTeamIdeas.length === 0 ? (
              <div className="text-center py-16 space-y-3 bg-slate-900/30 rounded-xl border border-slate-800">
                <p className="text-slate-300 font-medium">No team proposals found.</p>
                <p className="text-xs text-slate-500">
                  Be the first to pitch your project idea and find complementary teammates!
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setPostIdeaModalOpen(true)}
                >
                  Post Team Idea
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTeamIdeas.map((idea) => {
                  const isAuthor = userId && idea.user_id === userId;
                  const isAdmin = userRole === 'admin';

                  return (
                    <Card key={idea.id} className="flex flex-col justify-between border-slate-800 bg-slate-900/40">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge variant={idea.is_open ? 'success' : 'neutral'} size="sm">
                            {idea.is_open ? '● Seeking Teammates' : 'Team Filled'}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            Team Size Target: <strong className="text-slate-300">{idea.team_size_wanted}</strong>
                          </span>
                        </div>
                        <CardTitle className="text-base text-white">{idea.title}</CardTitle>
                        <CardDescription className="text-xs text-slate-400 mt-1">
                          Posted on {new Date(idea.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                          {idea.description}
                        </p>

                        {idea.required_skills && idea.required_skills.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                              Desired Skills / Roles:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {idea.required_skills.map((skill, idx) => (
                                <Badge key={idx} variant="info" size="sm">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="border-t border-slate-800/80 pt-3 text-xs flex flex-wrap items-center justify-between gap-2">
                        {idea.contact_hint ? (
                          <div className="flex items-center gap-2">
                            {idea.contact_hint.includes('@') ? (
                              <a
                                href={`mailto:${idea.contact_hint}?subject=FYP Team Inquiry: ${encodeURIComponent(idea.title)}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-medium transition-colors"
                              >
                                ✉️ Email Lead
                              </a>
                            ) : null}
                            <button
                              onClick={() => handleCopyContact(idea.contact_hint!, idea.id)}
                              className="text-[11px] text-slate-400 hover:text-slate-200 underline decoration-dotted"
                            >
                              {copiedId === idea.id ? '✓ Copied!' : `Contact: ${idea.contact_hint}`}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">No contact info provided</span>
                        )}

                        {(isAuthor || isAdmin) && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(idea)}
                              className="text-xs text-amber-400 hover:text-amber-300 p-1 h-auto"
                            >
                              {idea.is_open ? 'Close' : 'Reopen'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteIdea(idea.id)}
                              className="text-xs text-rose-400 hover:text-rose-300 p-1 h-auto"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── SIMILAR PROJECTS MODAL (Card M1) ─────────────────────────── */}
        <Modal
          isOpen={similarModalOpen}
          onClose={() => setSimilarModalOpen(false)}
          title="Semantically Similar FYP Projects"
          description={targetProjectForSimilar ? `Matching candidates for "${targetProjectForSimilar.title}"` : 'Similarity Search'}
        >
          <div className="space-y-4 text-xs sm:text-sm text-slate-300">
            {similarDisclaimer && (
              <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-xs text-blue-300 flex items-start gap-2">
                <span>ℹ️</span>
                <span>{similarDisclaimer}</span>
              </div>
            )}

            {similarLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Computing vector embeddings & similarity scores...
              </div>
            ) : similarError ? (
              <Alert variant="danger" title="Similarity Search Error">
                {similarError}
              </Alert>
            ) : similarResults.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No sufficiently similar FYP projects found in the archive.
              </div>
            ) : (
              <div className="space-y-3">
                {similarResults.map((sim) => (
                  <div
                    key={sim.id}
                    className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium text-white text-sm">{sim.title}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                        {sim.similarity}% Match
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {sim.year && <span>Year: {sim.year}</span>}
                      {sim.supervisor && <span>• Supervisor: {sim.supervisor}</span>}
                      <span className="text-[11px] text-slate-500">• {sim.matchLabel}</span>
                    </div>

                    {sim.domain_tags && sim.domain_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sim.domain_tags.map((t, idx) => (
                          <Badge key={idx} variant="info" size="sm">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 text-right">
              <Button variant="outline" size="sm" onClick={() => setSimilarModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>

        {/* ─── POST TEAM IDEA MODAL (Card M1) ────────────────────────────── */}
        <Modal
          isOpen={postIdeaModalOpen}
          onClose={() => setPostIdeaModalOpen(false)}
          title="Pitch Your FYP Project Idea"
          description="Looking for teammates? Post your concept and required skills to the NED CISE board."
        >
          <form onSubmit={handleCreateTeamIdea} className="space-y-4 text-xs sm:text-sm">
            {postError && (
              <Alert variant="danger" title="Submission Error">
                {postError}
              </Alert>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project Title / Idea Name *
              </label>
              <Input
                placeholder="e.g., Edge-AI Medical Image Diagnostic Tool"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                minLength={5}
                maxLength={200}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project Overview & Objectives *
              </label>
              <textarea
                rows={4}
                placeholder="Describe your project vision, target problem, planned tech stack, and what you want to achieve..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                required
                minLength={20}
                maxLength={1000}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-500">
                {newDescription.length}/1000 characters (minimum 20)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Domain
                </label>
                <select
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ai-ml">AI & Machine Learning</option>
                  <option value="healthcare-tech">Healthcare & MedTech</option>
                  <option value="web-mobile">Web & Mobile</option>
                  <option value="robotics-embedded">Robotics & IoT</option>
                  <option value="cybersecurity">Cybersecurity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Desired Team Size
                </label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={newTeamSize}
                  onChange={(e) => setNewTeamSize(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Required Skills / Roles (comma-separated)
              </label>
              <Input
                placeholder="e.g., PyTorch, Next.js, Embedded C, UI/UX"
                value={newSkills}
                onChange={(e) => setNewSkills(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Contact Hint or University Email (Rule #12 Compliant)
              </label>
              <Input
                placeholder="e.g., yourname@cloud.neduet.edu.pk or Telegram handle"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                className="w-full"
              />
              <span className="text-[10px] text-slate-500">
                Interested students will reach out via direct mailto link or copy.
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPostIdeaModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={postLoading}>
                {postLoading ? 'Posting Idea...' : 'Publish Idea'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* ─── PROJECT DETAILS MODAL ────────────────────────────────────── */}
        <Modal
          isOpen={!!activeModalProject}
          onClose={() => setActiveModalProject(null)}
          title={activeModalProject?.title || 'Project Details'}
          description={`Academic Year ${activeModalProject?.year} • NED CISE`}
        >
          {activeModalProject && (
            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Supervisor:</span>
                  <span className="text-white font-medium">
                    {activeModalProject.supervisor_title
                      ? `${activeModalProject.supervisor_title} `
                      : ''}
                    {activeModalProject.supervisor}
                  </span>
                </div>
                {activeModalProject.co_supervisor && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Co-Supervisor:</span>
                    <span className="text-white">{activeModalProject.co_supervisor}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="text-slate-200">{activeModalProject.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Team Size:</span>
                  <span className="text-slate-200">
                    {activeModalProject.team_size ? `${activeModalProject.team_size} Students` : 'Unspecified'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Proposal Outcome:</span>
                  <span className="capitalize font-semibold text-emerald-400">
                    {activeModalProject.proposal_outcome}
                  </span>
                </div>
              </div>

              {activeModalProject.outcome_reason && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1">
                    Outcome Audit Note:
                  </span>
                  <p className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                    {activeModalProject.outcome_reason}
                  </p>
                </div>
              )}

              {activeModalProject.domain_tags && activeModalProject.domain_tags.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                    Domain Classifications:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeModalProject.domain_tags.map((tag, i) => (
                      <Badge key={i} variant="info" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Provenance Footer */}
              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFindSimilar(activeModalProject)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  ✨ Find Similar FYPs
                </Button>
                <Button
                  variant={shortlistedIds.has(activeModalProject.id) ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => toggleShortlist(activeModalProject)}
                >
                  {shortlistedIds.has(activeModalProject.id)
                    ? '★ Shortlisted'
                    : '☆ Save to Shortlist'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Rule 13 Disclaimer Notice */}
        <DisclaimerBanner />
      </main>
    </div>
  );
}
