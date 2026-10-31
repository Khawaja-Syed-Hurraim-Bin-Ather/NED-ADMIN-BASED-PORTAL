'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';
import { useEditMode } from '../../context/EditModeContext';
import { Editable } from '../../components/edit-mode/Editable';
import { AddProfessorModal } from '../../components/edit-mode/AddProfessorModal';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MatchBreakdown {
  domain_overlap: number;
  area_overlap: number;
  keyword_match: number;
  total: number;
  label: 'Estimate';
}

interface SupervisedProject {
  title: string;
  year: number | null;
  kind: 'fydp' | 'postgraduate';
}

interface Professor {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  rank: string | null;
  name_status: 'confirmed' | 'inferred' | 'partial' | 'missing';
  department: string;
  qualification: string | null;
  research_areas: string[];
  research_areas_source: 'stated' | 'derived' | 'stated+derived' | null;
  domain_tags: string[];
  area_tags: string[];
  highlights: string | null;
  selected_publications: string[];
  contact_route: string | null;
  is_simulated: boolean;
  review_status: string;
  match_score?: MatchBreakdown;
  supervised_projects?: SupervisedProject[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DOMAIN_FILTER_OPTIONS = [
  { value: 'all', label: 'All Research Areas' },
  { value: 'ai-ml', label: 'AI & Machine Learning' },
  { value: 'computer-vision', label: 'Computer Vision' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'data', label: 'Data Science' },
  { value: 'networks', label: 'Computer Networks' },
  { value: 'embedded', label: 'Embedded Systems' },
  { value: 'nlp', label: 'Natural Language Processing' },
  { value: 'iot', label: 'IoT & Edge' },
  { value: 'blockchain', label: 'Blockchain' },
  { value: 'healthcare-tech', label: 'Healthcare Tech' },
  { value: 'ar-vr', label: 'AR / VR' },
  { value: 'web', label: 'Web & Distributed Systems' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'agriculture-tech', label: 'AgriTech' },
];

const AREA_SOURCE_LABEL: Record<string, string> = {
  stated: 'Stated',
  derived: 'Derived',
  'stated+derived': 'Stated + Derived',
};

const NAME_STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }> = {
  confirmed: { label: 'Confirmed', variant: 'success' },
  inferred: { label: 'Inferred Name', variant: 'warning' },
  partial: { label: 'Partial Name', variant: 'warning' },
};

const DOMAIN_TAG_COLORS: Record<string, string> = {
  'ai-ml': 'bg-[rgba(182,172,230,0.12)] text-[#b6ace6] border border-[rgba(182,172,230,0.3)]',
  'computer-vision': 'bg-[rgba(155,203,208,0.12)] text-[#9bcbd0] border border-[rgba(155,203,208,0.3)]',
  'cybersecurity': 'bg-[rgba(217,162,157,0.12)] text-[#d9a29d] border border-[rgba(217,162,157,0.3)]',
  'data': 'bg-[rgba(145,172,203,0.12)] text-[#91accb] border border-[rgba(145,172,203,0.3)]',
  'networks': 'bg-[rgba(154,195,169,0.12)] text-[#9ac3a9] border border-[rgba(154,195,169,0.3)]',
  'embedded': 'bg-[rgba(225,185,125,0.12)] text-[#e1b97d] border border-[rgba(225,185,125,0.3)]',
  'nlp': 'bg-[rgba(182,172,230,0.15)] text-[#c5b9fa] border border-[rgba(182,172,230,0.35)]',
  'iot': 'bg-[rgba(154,195,169,0.15)] text-[#aae3bd] border border-[rgba(154,195,169,0.35)]',
  'blockchain': 'bg-[rgba(225,185,125,0.15)] text-[#f3ce95] border border-[rgba(225,185,125,0.35)]',
  'healthcare-tech': 'bg-[rgba(155,203,208,0.15)] text-[#b3e9ef] border border-[rgba(155,203,208,0.35)]',
  'ar-vr': 'bg-[rgba(217,154,166,0.15)] text-[#f0afbc] border border-[rgba(217,154,166,0.35)]',
  'web': 'bg-[rgba(145,172,203,0.15)] text-[#b2cdec] border border-[rgba(145,172,203,0.35)]',
  'fintech': 'bg-[rgba(154,195,169,0.15)] text-[#9ac3a9] border border-[rgba(154,195,169,0.35)]',
  'agriculture-tech': 'bg-[rgba(154,195,169,0.15)] text-[#86bf9a] border border-[rgba(154,195,169,0.35)]',
};

function domainTagColor(tag: string): string {
  return DOMAIN_TAG_COLORS[tag] ?? 'bg-slate-800/60 text-slate-300 border border-slate-700/60';
}

// ─── Match Score Bar ──────────────────────────────────────────────────────────

function MatchScoreBar({ score }: { score: MatchBreakdown }) {
  const pct = score.total;
  const barColor = pct >= 60 ? 'bg-[#9ac3a9]' : pct >= 30 ? 'bg-[#e1b97d]' : 'bg-slate-600';

  return (
    <div className="space-y-1.5 pt-2 border-t border-[rgba(213,228,236,0.08)]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-bold text-[11px]">Match Alignment</span>
        <span className="flex items-center gap-1 font-mono">
          <span className="font-extrabold text-white">{pct}%</span>
          <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-[rgba(225,185,125,0.15)] text-[#e1b97d] border border-[rgba(225,185,125,0.3)]">
            {score.label}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
        <span>Domain +{score.domain_overlap}</span>
        <span>Area +{score.area_overlap}</span>
        <span>Key +{score.keyword_match}</span>
      </div>
    </div>
  );
}

// ─── Professor Card ───────────────────────────────────────────────────────────

function ProfessorCard({
  prof,
  onOpen,
  showMatchScore,
  canEdit,
  onUpdateField,
}: {
  prof: Professor;
  onOpen: (p: Professor) => void;
  showMatchScore: boolean;
  canEdit?: boolean;
  onUpdateField?: (prof: Professor, field: string, val: any) => void;
}) {
  const allTags = [...(prof.domain_tags ?? []), ...(prof.area_tags ?? [])];
  const nameStatusMeta = NAME_STATUS_BADGE[prof.name_status];

  return (
    <Card
      variant="interactive"
      className="flex flex-col h-full cursor-pointer group border-t-2 border-t-[rgba(155,203,208,0.45)] hover:border-t-[#9bcbd0] hover:border-[rgba(155,203,208,0.5)] transition-all duration-200"
      onClick={() => onOpen(prof)}
    >
      <CardHeader className="p-5 pb-3">
        {/* Avatar initial + name */}
        <div className="flex items-start gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1b2b3a] to-[#14212c] border border-[rgba(155,203,208,0.3)] flex items-center justify-center text-[#9bcbd0] font-black text-xl flex-shrink-0 group-hover:scale-105 group-hover:border-[#9bcbd0] transition-all shadow-inner">
            {(prof.name ?? '?').replace(/^(Dr\.|Ms\.|Mr\.|Engr\.)\s*/i, '').charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div onClick={(e) => canEdit && e.stopPropagation()}>
              <Editable
                resource="professors"
                tableName="professors"
                recordId={prof.slug || prof.id}
                field="name"
                value={prof.name}
                onSave={(val) => onUpdateField?.(prof, 'name', val)}
                className="text-sm font-extrabold leading-snug text-white group-hover:text-[#9bcbd0] transition-colors line-clamp-1"
              />
            </div>
            <div
              className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-1"
              onClick={(e) => canEdit && e.stopPropagation()}
            >
              <Editable
                resource="professors"
                tableName="professors"
                recordId={prof.slug || prof.id}
                field="rank"
                value={prof.rank ?? 'Faculty'}
                onSave={(val) => onUpdateField?.(prof, 'rank', val)}
                className="text-slate-300"
              />
              <span>&bull; CISE, NED University</span>
            </div>
          </div>
        </div>

        {/* Name status badge */}
        {nameStatusMeta && prof.name_status !== 'confirmed' && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
            ⚠ {nameStatusMeta.label}
          </span>
        )}
      </CardHeader>

      <CardContent className="px-5 flex flex-col gap-3 flex-1">
        {/* Research areas */}
        {prof.research_areas?.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span>Research Focus</span>
              {prof.research_areas_source && (
                <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[9px] text-slate-400 lowercase font-mono">
                  {AREA_SOURCE_LABEL[prof.research_areas_source] ?? prof.research_areas_source}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {prof.research_areas.join(' · ')}
            </p>
          </div>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-2">
            {allTags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${domainTagColor(tag)}`}
              >
                {tag}
              </span>
            ))}
            {allTags.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                +{allTags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Match score bar */}
        {showMatchScore && prof.match_score && prof.match_score.total > 0 && (
          <MatchScoreBar score={prof.match_score} />
        )}
      </CardContent>

      <CardFooter className="p-5 pt-3 mt-auto border-t border-[rgba(213,228,236,0.06)]">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-bold justify-between group-hover:border-[rgba(155,203,208,0.4)]"
          onClick={e => { e.stopPropagation(); onOpen(prof); }}
        >
          <span>View Profile &amp; Research</span>
          <span className="text-[#9bcbd0]">&rarr;</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfessorModal({
  prof,
  onClose,
  showMatchScore,
}: {
  prof: Professor;
  onClose: () => void;
  showMatchScore: boolean;
}) {
  const [detailProf, setDetailProf] = useState<Professor>(prof);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (prof.supervised_projects !== undefined) return;
    setLoadingDetail(true);
    fetch(`/api/v1/professors/${prof.slug}`)
      .then(r => r.json())
      .then(j => {
        if (j.data) setDetailProf({ ...prof, ...j.data });
      })
      .catch(() => {/* graceful degradation */})
      .finally(() => setLoadingDetail(false));
  }, [prof]);

  const fydpProjects = (detailProf.supervised_projects ?? []).filter(p => p.kind === 'fydp');
  const pgProjects = (detailProf.supervised_projects ?? []).filter(p => p.kind === 'postgraduate');

  // Build mailto subject (no personal student data — Rule #12)
  const mailtoSubject = encodeURIComponent(`FYP Supervision Inquiry — EduCompass`);
  const mailtoBody = encodeURIComponent(
    `Dear ${detailProf.title ?? ''} ${detailProf.name?.replace(/^(Dr\.|Ms\.|Mr\.|Engr\.)\s*/i, '') ?? 'Professor'},\n\n` +
    `I am a student at NED CISE and would like to discuss FYP supervision in the area of [your interest].\n\n` +
    `Regards`
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={detailProf.name ?? 'Professor Profile'}
    >
      <div className="space-y-5 max-h-[72vh] overflow-y-auto pr-1">
        {/* Header row */}
        <div className="flex items-start gap-4 p-4 rounded-xl bg-[#111b26] border border-[rgba(213,228,236,0.1)]">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1b2b3a] to-[#14212c] border border-[rgba(155,203,208,0.4)] flex items-center justify-center text-[#9bcbd0] font-black text-2xl flex-shrink-0">
            {(detailProf.name ?? '?').replace(/^(Dr\.|Ms\.|Mr\.|Engr\.)\s*/i, '').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-white">{detailProf.name}</h2>
            <p className="text-xs text-slate-300">{detailProf.rank ?? 'Faculty Member'} &bull; CISE, NED University</p>
            {detailProf.qualification && (
              <p className="text-xs text-[#91accb] font-medium mt-0.5">{detailProf.qualification}</p>
            )}
            {detailProf.name_status !== 'confirmed' && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                ⚠ {NAME_STATUS_BADGE[detailProf.name_status]?.label ?? 'Unverified name'}
              </span>
            )}
          </div>
        </div>

        {/* Research areas */}
        {detailProf.research_areas?.length > 0 && (
          <section className="p-4 rounded-xl bg-[#111b26] border border-[rgba(213,228,236,0.08)]">
            <h3 className="text-xs font-bold text-[#9bcbd0] uppercase tracking-wider mb-2">
              Research Interests
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {detailProf.research_areas.map((area, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-[#182733] border border-[rgba(213,228,236,0.12)] text-slate-200">
                  {area}
                </span>
              ))}
            </div>
            {detailProf.research_areas_source && (
              <p className="text-[10px] text-slate-400">
                Source: <span className="font-mono">{AREA_SOURCE_LABEL[detailProf.research_areas_source] ?? detailProf.research_areas_source}</span>
              </p>
            )}
          </section>
        )}

        {/* Highlights */}
        {detailProf.highlights && (
          <section className="p-4 rounded-xl bg-[#111b26] border border-[rgba(213,228,236,0.08)]">
            <h3 className="text-xs font-bold text-[#9bcbd0] uppercase tracking-wider mb-1.5">
              Academic Background &amp; Highlights
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">{detailProf.highlights}</p>
          </section>
        )}

        {/* Selected publications */}
        {detailProf.selected_publications?.length > 0 && (
          <section className="p-4 rounded-xl bg-[#111b26] border border-[rgba(213,228,236,0.08)]">
            <h3 className="text-xs font-bold text-[#9bcbd0] uppercase tracking-wider mb-2">
              Selected Publications ({detailProf.selected_publications.length})
            </h3>
            <ul className="space-y-1.5">
              {detailProf.selected_publications.map((pub, i) => (
                <li key={i} className="text-xs text-slate-300 pl-3 border-l-2 border-[#91accb]/40 leading-relaxed">
                  {pub}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FYDP supervised projects */}
        {!loadingDetail && fydpProjects.length > 0 && (
          <section className="p-4 rounded-xl bg-[#111b26] border border-[rgba(213,228,236,0.08)]">
            <h3 className="text-xs font-bold text-[#9ac3a9] uppercase tracking-wider mb-2">
              Supervised Final Year Projects ({fydpProjects.length})
            </h3>
            <ul className="space-y-1.5 max-h-44 overflow-y-auto">
              {fydpProjects.map(p => (
                <li key={p.title} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-[#9ac3a9] mt-0.5">&bull;</span>
                  <span>{p.title} {p.year ? <span className="text-slate-500 font-mono">({p.year})</span> : null}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Postgraduate projects */}
        {!loadingDetail && pgProjects.length > 0 && (
          <section className="p-4 rounded-xl bg-[#111b26] border border-[rgba(213,228,236,0.08)]">
            <h3 className="text-xs font-bold text-[#b6ace6] uppercase tracking-wider mb-2">
              Postgraduate Research Projects ({pgProjects.length})
            </h3>
            <ul className="space-y-1.5">
              {pgProjects.map(p => (
                <li key={p.title} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-[#b6ace6] mt-0.5">&bull;</span>
                  <span>{p.title} {p.year ? <span className="text-slate-500 font-mono">({p.year})</span> : null}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {loadingDetail && (
          <p className="text-xs text-slate-400 animate-pulse text-center py-2">Loading supervised projects from database…</p>
        )}

        {/* Email action — mailto only, no automated sending (Rule #12) */}
        <section className="p-4 rounded-xl bg-[#111b26] border border-[rgba(213,228,236,0.08)]">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
            Supervision Inquiry Outreach
          </h3>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={`mailto:?subject=${mailtoSubject}&body=${mailtoBody}`}
              className="flex-1"
              onClick={e => e.stopPropagation()}
            >
              <Button variant="primary" size="sm" className="w-full text-xs font-bold">
                ✉ Draft Email via Mail Client
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold"
              onClick={() => {
                const text = `Subject: FYP Supervision Inquiry — EduCompass\n\nDear ${detailProf.name},\n\nI am a student at NED CISE and would like to discuss FYP supervision in the area of [your interest].\n\nRegards`;
                navigator.clipboard.writeText(text).catch(() => {});
              }}
            >
              Copy Template
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Rule 12: EduCompass never sends automated emails. Only open mail clients or copy templates.
          </p>
        </section>

        {/* Disclaimer (Rule #13) */}
        <div className="p-3 rounded-lg bg-[rgba(225,185,125,0.08)] border border-[rgba(225,185,125,0.25)] text-[11px] text-[#e1b97d] leading-relaxed">
          Match scores and research interests marked &quot;Derived&quot; are guidance estimates inferred from publication records, not official faculty decisions.{' '}
          <Link href="/terms" className="underline hover:text-white">Terms &amp; Disclaimer</Link>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfessorDirectoryPage() {
  const { isEditMode, viewAsStudent, can, pendingItems, saveDraftItem } = useEditMode();
  const canEdit = isEditMode && !viewAsStudent && can('professors', 'edit');

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAddProfOpen, setIsAddProfOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [interestInput, setInterestInput] = useState('');
  const [appliedInterests, setAppliedInterests] = useState<string[]>([]);

  // Modal
  const [activeProf, setActiveProf] = useState<Professor | null>(null);

  // Overlay draft items onto professors list
  const activeProfessors = useMemo(() => {
    let list = [...professors];
    if (isEditMode && !viewAsStudent) {
      for (const item of pendingItems) {
        if (item.table_name === 'professors' && item.record_id) {
          if (item.op === 'update' && item.after) {
            const idx = list.findIndex((p) => p.slug === item.record_id || p.id === item.record_id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...item.after };
            }
          } else if (item.op === 'insert' && item.after) {
            const exists = list.some((p) => p.slug === item.record_id || p.id === item.record_id);
            if (!exists) {
              list.unshift(item.after as any);
            }
          } else if (item.op === 'delete') {
            list = list.filter((p) => p.slug !== item.record_id && p.id !== item.record_id);
          }
        }
      }
    }
    return list;
  }, [professors, isEditMode, viewAsStudent, pendingItems]);

  const handleUpdateField = (prof: Professor, field: string, val: any) => {
    if (!canEdit) return;
    saveDraftItem(
      'professors',
      'professors',
      prof.slug || prof.id,
      { [field]: val },
      'update',
      `Update ${field} for faculty ${prof.name}`
    );
    setProfessors((prev) =>
      prev.map((p) => (p.id === prof.id ? { ...p, [field]: val } : p))
    );
  };

  // Fetch professors
  useEffect(() => {
    async function fetchProfessors() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const params = new URLSearchParams({ per_page: '50' });
        if (appliedInterests.length > 0) params.set('interests', appliedInterests.join(','));
        if (selectedDomain !== 'all') params.set('domain', selectedDomain);

        const res = await fetch(`/api/v1/professors?${params.toString()}`);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const json = await res.json();
        setProfessors(json.data ?? []);
      } catch (err) {
        console.error(err);
        setErrorMsg('Could not load professor directory. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfessors();
  }, [selectedDomain, appliedInterests]);

  // Client-side search filter on name + research_areas + highlights
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return activeProfessors;
    const q = searchQuery.toLowerCase();
    return activeProfessors.filter(p =>
      (p.name ?? '').toLowerCase().includes(q) ||
      (p.research_areas ?? []).some(r => r.toLowerCase().includes(q)) ||
      (p.highlights ?? '').toLowerCase().includes(q) ||
      (p.domain_tags ?? []).some(t => t.toLowerCase().includes(q)) ||
      (p.area_tags ?? []).some(t => t.toLowerCase().includes(q))
    );
  }, [activeProfessors, searchQuery]);

  const showMatchScore = appliedInterests.length > 0;

  function applyInterests() {
    const tags = interestInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    setAppliedInterests(tags);
  }

  function clearInterests() {
    setAppliedInterests([]);
    setInterestInput('');
  }

  return (
    <div className="inner-page">
      {/* Shared Page Header */}
      <PageHeader
        title="Professor Directory"
        breadcrumbs={[{ label: 'Professor Directory' }]}
        badge={`${filtered.length} Faculty Members`}
        description="Browse NED CISE faculty profiles, research areas, supervised FYDPs, and calculate alignment with your FYP interests."
        accent="var(--lavender)"
        actions={
          canEdit ? (
            <button
              onClick={() => setIsAddProfOpen(true)}
              className="px-3.5 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-medium text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>+ Add Faculty</span>
            </button>
          ) : undefined
        }
      />

      <main className="inner-page-body space-y-6">
        {/* Filter & Alignment Toolbar Panel */}
        <div className="p-5 rounded-2xl bg-[#14212c]/90 border border-[rgba(213,228,236,0.12)] shadow-xl backdrop-blur-md space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search by Name */}
            <div className="md:col-span-5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Search Faculty or Research Topic
              </label>
              <Input
                id="prof-search"
                placeholder="e.g. Dr. Arfeen, computer vision, deep learning..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-[#0f1823] border-[rgba(213,228,236,0.15)] text-sm"
              />
            </div>

            {/* Research Domain Dropdown */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Research Domain
              </label>
              <select
                id="prof-domain-filter"
                value={selectedDomain}
                onChange={e => setSelectedDomain(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[#0f1823] border border-[rgba(213,228,236,0.15)] text-slate-200 text-sm focus:outline-none focus:border-[#9bcbd0]"
              >
                {DOMAIN_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Match Scoring by Interests */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-[#9bcbd0] uppercase tracking-wider mb-1.5">
                Match Scoring (Your Interest Tags)
              </label>
              <div className="flex gap-2">
                <Input
                  id="prof-interest-input"
                  placeholder="ai-ml, computer-vision..."
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') applyInterests(); }}
                  className="bg-[#0f1823] border-[rgba(213,228,236,0.15)] text-sm flex-1"
                />
                <Button variant="primary" size="sm" onClick={applyInterests} className="font-bold text-xs">
                  Match
                </Button>
                {appliedInterests.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearInterests} className="text-slate-400 hover:text-white">
                    ✕
                  </Button>
                )}
              </div>
            </div>
          </div>

          {appliedInterests.length > 0 && (
            <div className="pt-2 border-t border-[rgba(213,228,236,0.08)] flex items-center justify-between text-xs">
              <span className="text-[#9ac3a9] font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#9ac3a9]" />
                Scoring profiles against tags: <strong>{appliedInterests.join(', ')}</strong>
              </span>
              <button onClick={clearInterests} className="text-slate-400 hover:text-white underline text-xs">
                Clear scoring
              </button>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <Alert variant="danger">
            {errorMsg}
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
            <svg className="animate-spin h-7 w-7 text-[#9bcbd0]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-semibold">Loading faculty directory from database…</span>
          </div>
        )}

        {/* Faculty Cards Grid */}
        {!loading && !errorMsg && (
          <>
            {filtered.length === 0 ? (
              <div className="text-center py-20 p-8 rounded-2xl bg-[#14212c]/60 border border-[rgba(213,228,236,0.1)] text-slate-400 space-y-2">
                <div className="text-4xl">🔍</div>
                <h3 className="text-base font-bold text-white">No professors match your filter criteria</h3>
                <p className="text-xs max-w-sm mx-auto">Try clearing interest keywords or selecting &quot;All Research Areas&quot; to see all 18 CISE faculty profiles.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map(prof => (
                  <ProfessorCard
                    key={prof.id}
                    prof={prof}
                    onOpen={setActiveProf}
                    showMatchScore={showMatchScore}
                    canEdit={canEdit}
                    onUpdateField={handleUpdateField}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Profile Details Modal */}
        {activeProf && (
          <ProfessorModal
            prof={activeProf}
            onClose={() => setActiveProf(null)}
            showMatchScore={showMatchScore}
          />
        )}

        {/* Card E4: Add Professor Modal */}
        <AddProfessorModal
          isOpen={isAddProfOpen}
          onClose={() => setIsAddProfOpen(false)}
          existingProfessors={activeProfessors.map((p) => ({ name: p.name, slug: p.slug }))}
          onProfessorAdded={(newP) => setProfessors((prev) => [newP, ...prev])}
        />
      </main>
    </div>
  );
}
