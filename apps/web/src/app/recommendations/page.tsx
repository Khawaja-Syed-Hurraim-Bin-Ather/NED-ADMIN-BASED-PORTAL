'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../components/PageHeader';

interface SignalBreakdown {
  sig_stars_10: boolean;
  sig_forks_3: boolean;
  sig_recent_update: boolean;
  sig_readme_length: boolean;
  sig_has_license: boolean;
  sig_docker: boolean;
  sig_tests: boolean;
  sig_ci_cd: boolean;
  sig_deployment: boolean;
  sig_auth_db: boolean;
}

interface FYPRecommendation {
  id: string;
  full_name: string;
  name: string;
  owner: string;
  html_url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  pushed_at: string;
  license: string | null;
  topics: string[];
  degree_tag: 'CS' | 'CSE' | 'General';
  cs_hits: number;
  cse_hits: number;
  domain: string;
  industry_score: number;
  is_industry_ready: boolean;
  industry_label: 'Yes' | 'No';
  signals: SignalBreakdown;
  readme_excerpt: string;
}

const SIGNAL_LABELS: Record<keyof SignalBreakdown, string> = {
  sig_stars_10: 'Popularity (≥ 10 stars)',
  sig_forks_3: 'Community adoption (≥ 3 forks)',
  sig_recent_update: 'Active maintenance (updated in last 12mo)',
  sig_readme_length: 'Comprehensive docs (≥ 1500 chars README)',
  sig_has_license: 'Open source license present',
  sig_docker: 'Containerized (Docker / Dockerfile)',
  sig_tests: 'Automated test suite (pytest/unit tests)',
  sig_ci_cd: 'CI/CD pipeline (GitHub Actions)',
  sig_deployment: 'Live deployment / Demo URL',
  sig_auth_db: 'Backend Auth / Database integrated',
};

const DOMAIN_LABELS: Record<string, string> = {
  all: 'All Domains',
  ai_ml: 'AI & Machine Learning',
  web_dev: 'Web & Fullstack',
  iot_embedded: 'IoT & Embedded Systems',
  mobile_dev: 'Mobile App Development',
  cybersecurity: 'Cybersecurity & Crypto',
  healthcare_tech: 'Healthcare & MedTech',
  general: 'General Computing',
};

export default function FYPRecommendationsPage() {
  const [items, setItems] = useState<FYPRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [degreeFilter, setDegreeFilter] = useState<'all' | 'CS' | 'CSE' | 'General'>('all');
  const [industryFilter, setIndustryFilter] = useState<'all' | 'ready' | 'not_ready'>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const PAGE_SIZE = 10;
  const MAX_RESULTS = 50;

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/data/fyp_recommendations.json');
        if (res.ok) {
          const data: FYPRecommendation[] = await res.json();
          setItems(data);
        } else {
          console.warn('Could not load /data/fyp_recommendations.json');
        }
      } catch (err) {
        console.error('Failed to fetch recommendations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Degree filter
        if (degreeFilter !== 'all' && item.degree_tag !== degreeFilter) {
          return false;
        }
        // Industry ready filter
        if (industryFilter === 'ready' && !item.is_industry_ready) return false;
        if (industryFilter === 'not_ready' && item.is_industry_ready) return false;

        // Domain filter
        if (domainFilter !== 'all' && item.domain !== domainFilter) {
          return false;
        }

        // Min score
        if (item.industry_score < minScore) return false;

        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q) || false;
          const matchTopics = item.topics.some((t) => t.toLowerCase().includes(q));
          const matchLang = item.language?.toLowerCase().includes(q) || false;
          if (!matchName && !matchDesc && !matchTopics && !matchLang) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Primary sort: Industry score desc; Secondary: Stars desc
        if (b.industry_score !== a.industry_score) {
          return b.industry_score - a.industry_score;
        }
        return b.stars - a.stars;
      })
      .slice(0, MAX_RESULTS); // Hard cap 50
  }, [items, search, degreeFilter, industryFilter, domainFilter, minScore]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [search, degreeFilter, industryFilter, domainFilter, minScore]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentSlice = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  return (
    <div className="inner-page">
      {/* Standardized Page Header */}
      <PageHeader
        title="FYP Project Recommendations"
        breadcrumbs={[{ label: 'Recommendations' }]}
        badge="Real GitHub Vetted"
        description="Curated repositories scored for CS vs CSE curriculum alignment and industry readiness (10-signal heuristic breakdown)."
        accent="var(--cyan)"
        actions={
          <Link href="/fyp" className="button button-secondary text-xs">
            <span>Browse FYP Archive</span>
            <span>&rarr;</span>
          </Link>
        }
      />

      {/* Main Content Area */}
      <main className="inner-page-body space-y-6">
        {/* Rule #13 Advisory Notice Banner */}
        <div className="p-3.5 rounded-xl bg-[rgba(225,185,125,0.08)] border border-[rgba(225,185,125,0.25)] text-xs text-[#e1b97d] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>
              <strong>Rule 7 &amp; 13 Compliance:</strong> Industry scores and alignment percentages are heuristic estimates derived from repository metadata. Official FYP approval rests with CISE committee.
            </span>
          </div>
          <Link href="/terms" className="underline hover:text-white shrink-0 text-[11px]">
            Terms &amp; Disclaimer
          </Link>
        </div>

        {/* Filter Controls Bar */}
        <section className="p-5 rounded-2xl bg-[#14212c]/90 border border-[rgba(213,228,236,0.12)] shadow-xl backdrop-blur-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Search Keyword or Tech
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. YOLO, Docker, IoT, Resume..."
                className="w-full h-10 px-3.5 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] text-slate-100 text-sm focus:outline-none focus:border-[#9bcbd0] transition placeholder:text-slate-500"
              />
            </div>

            {/* Degree Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Degree
              </label>
              <select
                value={degreeFilter}
                onChange={(e) => setDegreeFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] text-slate-200 text-sm focus:outline-none focus:border-[#9bcbd0] transition"
              >
                <option value="all">All Degrees</option>
                <option value="CS">Computer Science (CS)</option>
                <option value="CSE">Computer Systems (CSE)</option>
                <option value="General">General Computing</option>
              </select>
            </div>

            {/* Industry Ready */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Industry Readiness
              </label>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] text-slate-200 text-sm focus:outline-none focus:border-[#9bcbd0] transition"
              >
                <option value="all">All Ratings</option>
                <option value="ready">Industry-Ready (Score ≥ 6)</option>
                <option value="not_ready">Needs Polish (Score &lt; 6)</option>
              </select>
            </div>

            {/* Domain Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Specialized Domain
              </label>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] text-slate-200 text-sm focus:outline-none focus:border-[#9bcbd0] transition"
              >
                {Object.entries(DOMAIN_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filter Row: Min Score & Clear */}
          <div className="pt-3 border-t border-[rgba(213,228,236,0.08)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Min Score (Estimate):
              </span>
              <div className="flex items-center gap-1.5">
                {[0, 3, 5, 7].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinScore(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                      minScore === s
                        ? 'bg-[rgba(155,203,208,0.2)] text-[#9bcbd0] border border-[#9bcbd0]'
                        : 'bg-[#0f1823] text-slate-400 border border-[rgba(213,228,236,0.1)] hover:text-white'
                    }`}
                  >
                    {s}+ pts
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Showing <strong className="text-white font-mono">{filteredItems.length}</strong> matching projects (capped at {MAX_RESULTS})
            </div>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#9bcbd0] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-400 text-xs font-medium">Loading recommendations dataset...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="p-12 rounded-2xl bg-[#14212c]/80 border border-[rgba(213,228,236,0.12)] text-center max-w-xl mx-auto">
            <div className="w-12 h-12 bg-amber-500/10 text-[#e1b97d] rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              🔍
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Matching Projects Found</h3>
            <p className="text-xs text-slate-400 mb-6">
              Try lowering the minimum score filter or clearing the search keyword.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setDegreeFilter('all');
                setIndustryFilter('all');
                setDomainFilter('all');
                setMinScore(0);
              }}
              className="button button-primary text-xs"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Project Card Grid */}
        {!loading && currentSlice.length > 0 && (
          <div className="grid grid-cols-1 gap-5">
            {currentSlice.map((repo) => {
              const isExpanded = expandedCard === repo.id;
              const isCse = repo.degree_tag === 'CSE';
              const isCs = repo.degree_tag === 'CS';

              return (
                <div
                  key={repo.id}
                  className="p-6 rounded-2xl bg-[#111b26] border border-[rgba(213,228,236,0.1)] hover:border-[rgba(155,203,208,0.3)] transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Degree Tag Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${
                            isCse
                              ? 'bg-[rgba(182,172,230,0.15)] text-[#b6ace6] border border-[rgba(182,172,230,0.3)]'
                              : isCs
                              ? 'bg-[rgba(120,148,189,0.15)] text-[#7894bd] border border-[rgba(120,148,189,0.3)]'
                              : 'bg-slate-800/60 text-slate-300 border border-slate-700/60'
                          }`}
                        >
                          {repo.degree_tag} Focus
                        </span>

                        {/* Domain Badge */}
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[#0f1823] text-slate-300 border border-[rgba(213,228,236,0.12)]">
                          {DOMAIN_LABELS[repo.domain] || repo.domain}
                        </span>

                        {/* Language */}
                        {repo.language && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-[rgba(154,195,169,0.12)] text-[#9ac3a9] border border-[rgba(154,195,169,0.3)]">
                            {repo.language}
                          </span>
                        )}
                      </div>

                      {/* Industry Score Pill with Estimate Label (Rule #7) */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            repo.is_industry_ready
                              ? 'bg-[rgba(154,195,169,0.15)] text-[#9ac3a9] border border-[rgba(154,195,169,0.3)]'
                              : 'bg-[rgba(225,185,125,0.15)] text-[#e1b97d] border border-[rgba(225,185,125,0.3)]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              repo.is_industry_ready ? 'bg-[#9ac3a9]' : 'bg-[#e1b97d]'
                            }`}
                          />
                          Industry Score: {repo.industry_score}/10 (Estimate &bull; {repo.industry_label === 'Yes' ? 'Ready' : 'Developing'})
                        </span>
                      </div>
                    </div>

                    {/* Title & Link */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h2 className="text-lg font-bold text-white hover:text-[#9bcbd0] transition">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                          {repo.name}
                        </a>
                      </h2>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#9bcbd0] hover:underline shrink-0 mt-1"
                      >
                        GitHub Repo ↗
                      </a>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed mb-4">
                      {repo.description || 'No repository summary provided.'}
                    </p>

                    {/* README Excerpt */}
                    {repo.readme_excerpt && (
                      <div className="bg-[#0b1119] rounded-xl p-3 text-xs text-slate-400 border border-[rgba(213,228,236,0.08)] mb-4 font-mono leading-relaxed line-clamp-2">
                        &quot;{repo.readme_excerpt}&quot;
                      </div>
                    )}

                    {/* Topics */}
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {repo.topics.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-[11px] bg-[#0f1823] text-slate-300 border border-[rgba(213,228,236,0.08)]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer & Signal Accordion */}
                  <div className="pt-4 border-t border-[rgba(213,228,236,0.08)] flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-4">
                        <span>⭐ {repo.stars.toLocaleString()} stars</span>
                        <span>🍴 {repo.forks.toLocaleString()} forks</span>
                        {repo.license && <span>📜 {repo.license}</span>}
                      </div>

                      <button
                        onClick={() => setExpandedCard(isExpanded ? null : repo.id)}
                        className="text-xs font-bold text-[#9bcbd0] hover:underline flex items-center gap-1 transition"
                      >
                        {isExpanded ? 'Hide Signal Breakdown ▲' : 'View Scoring Breakdown (Estimate) ▼'}
                      </button>
                    </div>

                    {/* Detailed Signals Breakdown Drawer */}
                    {isExpanded && (
                      <div className="mt-2 bg-[#0b1119] rounded-xl p-4 border border-[rgba(213,228,236,0.1)]">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                          Industry-Readiness Evaluation Checklist ({repo.industry_score}/10 points)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {Object.entries(repo.signals).map(([key, val]) => (
                            <div
                              key={key}
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                val
                                  ? 'bg-[rgba(154,195,169,0.12)] text-[#9ac3a9] border border-[rgba(154,195,169,0.25)]'
                                  : 'bg-[#0f1823] text-slate-500 border border-[rgba(213,228,236,0.05)]'
                              }`}
                            >
                              <span>{val ? '✅' : '⚪'}</span>
                              <span className={val ? 'font-semibold' : ''}>
                                {SIGNAL_LABELS[key as keyof SignalBreakdown] || key}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-[rgba(213,228,236,0.08)] text-[11px] text-slate-400">
                          Degree classification: <strong>{repo.degree_tag}</strong> (CS keyword hits: {repo.cs_hits}, CSE keyword hits: {repo.cse_hits})
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && filteredItems.length > PAGE_SIZE && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="button button-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous Page
            </button>
            <span className="text-xs text-slate-400 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="button button-secondary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next Page
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
