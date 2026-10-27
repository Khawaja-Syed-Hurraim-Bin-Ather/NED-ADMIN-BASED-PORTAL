'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

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
          const matchLang = item.language.toLowerCase().includes(q);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header Banner */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/50 py-12 px-4 sm:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Real GitHub-Vetted Projects
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              FYP Project Recommendations
            </h1>
            <p className="mt-2 text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Curated, real-world repositories scored for <strong className="text-white">CS vs CSE alignment</strong> and <strong className="text-white">industry-readiness</strong>. Proven architectures you can actually build and defend.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition"
            >
              Back to EduCompass
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {/* Filter Controls Bar */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Search Keyword or Tech
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. YOLO, Docker, IoT, Resume..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            {/* Degree Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Target Degree
              </label>
              <select
                value={degreeFilter}
                onChange={(e) => setDegreeFilter(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="all">All Degrees</option>
                <option value="CS">Computer Science (CS)</option>
                <option value="CSE">Computer Systems (CSE)</option>
                <option value="General">General Computing</option>
              </select>
            </div>

            {/* Industry Ready */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Industry Readiness
              </label>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="all">All Ratings</option>
                <option value="ready">Industry-Ready (Score ≥ 6)</option>
                <option value="not_ready">Needs Polish (Score &lt; 6)</option>
              </select>
            </div>

            {/* Domain Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Specialized Domain
              </label>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
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
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Min Industry Score:
              </span>
              <div className="flex items-center gap-2">
                {[0, 3, 5, 7].map((s) => (
                  <button
                    key={s}
                    onClick={() => setMinScore(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                      minScore === s
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}+ pts
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{filteredItems.length}</strong> matching projects (capped at {MAX_RESULTS})
            </div>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 text-sm font-medium">Loading recommendations dataset...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto shadow-sm">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Matching Projects Found</h3>
            <p className="text-sm text-slate-500 mb-6">
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Project Card Grid */}
        {!loading && currentSlice.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {currentSlice.map((repo) => {
              const isExpanded = expandedCard === repo.id;
              const isCse = repo.degree_tag === 'CSE';
              const isCs = repo.degree_tag === 'CS';

              return (
                <div
                  key={repo.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Degree Tag Badge */}
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-bold tracking-wide uppercase ${
                            isCse
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : isCs
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {repo.degree_tag} Focus
                        </span>

                        {/* Domain Badge */}
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {DOMAIN_LABELS[repo.domain] || repo.domain}
                        </span>

                        {/* Language */}
                        {repo.language && (
                          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {repo.language}
                          </span>
                        )}
                      </div>

                      {/* Industry Score Pill */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            repo.is_industry_ready
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              repo.is_industry_ready ? 'bg-emerald-600' : 'bg-amber-600'
                            }`}
                          ></span>
                          Industry Score: {repo.industry_score}/10 (
                          {repo.industry_label === 'Yes' ? 'Industry-Ready' : 'Developing'})
                        </span>
                      </div>
                    </div>

                    {/* Title & Link */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h2 className="text-xl font-bold text-slate-900 hover:text-indigo-600 transition">
                        <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                          {repo.name}
                        </a>
                      </h2>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline shrink-0 mt-1"
                      >
                        GitHub Repo ↗
                      </a>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">
                      {repo.description || 'No repository summary provided.'}
                    </p>

                    {/* README Excerpt */}
                    {repo.readme_excerpt && (
                      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 border border-slate-100 mb-4 font-mono leading-relaxed line-clamp-2">
                        &quot;{repo.readme_excerpt}&quot;
                      </div>
                    )}

                    {/* Topics */}
                    {repo.topics && repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {repo.topics.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer & Signal Accordion */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-4">
                        <span>⭐ {repo.stars.toLocaleString()} stars</span>
                        <span>🍴 {repo.forks.toLocaleString()} forks</span>
                        {repo.license && <span>📜 {repo.license}</span>}
                      </div>

                      <button
                        onClick={() => setExpandedCard(isExpanded ? null : repo.id)}
                        className="text-xs font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1 transition"
                      >
                        {isExpanded ? 'Hide Signal Breakdown ▲' : 'View Scoring Breakdown ▼'}
                      </button>
                    </div>

                    {/* Detailed Signals Breakdown Drawer */}
                    {isExpanded && (
                      <div className="mt-2 bg-slate-50 rounded-xl p-4 border border-slate-200/80 animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Industry-Readiness Evaluation Checklist ({repo.industry_score}/10 points)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {Object.entries(repo.signals).map(([key, val]) => (
                            <div
                              key={key}
                              className={`flex items-center gap-2 p-1.5 rounded-lg ${
                                val
                                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              <span>{val ? '✅' : '⚪'}</span>
                              <span className={val ? 'font-medium' : ''}>
                                {SIGNAL_LABELS[key as keyof SignalBreakdown] || key}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
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
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              Previous Page
            </button>
            <span className="text-xs text-slate-600 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition"
            >
              Next Page
            </button>
          </div>
        )}
      </main>

      {/* Footer Disclaimer Notice */}
      <footer className="mt-20 border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>
          EduCompass guidance estimates and scores are algorithmic heuristics based on open-source metadata. They do not constitute official university approval.
        </p>
      </footer>
    </div>
  );
}
