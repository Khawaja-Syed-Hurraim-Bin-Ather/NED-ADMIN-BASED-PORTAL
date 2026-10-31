'use client';

import React, { useState, useMemo } from 'react';
import { useEditMode } from '../../context/EditModeContext';

interface AddProfessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfessors: { name: string; slug: string }[];
  onProfessorAdded: (newProf: any) => void;
}

// Simple Levenshtein similarity (0 to 1)
function calculateNameSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const maxLen = Math.max(m, n);
  return 1 - dp[m][n] / maxLen;
}

export function AddProfessorModal({
  isOpen,
  onClose,
  existingProfessors,
  onProfessorAdded,
}: AddProfessorModalProps) {
  const { saveDraftItem } = useEditMode();

  const [name, setName] = useState('');
  const [title, setTitle] = useState('Dr.');
  const [rank, setRank] = useState('Associate Professor');
  const [department, setDepartment] = useState('Computer & Information Systems Engineering');
  const [email, setEmail] = useState('');
  const [qualification, setQualification] = useState('Ph.D. Computer Engineering');
  const [researchAreas, setResearchAreas] = useState('');
  const [highlights, setHighlights] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Real-time name duplicate warning check (similarity > 0.8)
  const similarExistingName = useMemo(() => {
    if (name.trim().length < 3) return null;
    for (const ep of existingProfessors) {
      const sim = calculateNameSimilarity(name, ep.name);
      if (sim >= 0.8) {
        return ep.name;
      }
    }
    return null;
  }, [name, existingProfessors]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Professor name is required.');
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Please provide a valid university email address.');
      return;
    }

    const cleanName = name.trim();
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const areasArray = researchAreas
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const professorData = {
      id: `prof-${Date.now()}`,
      slug,
      name: cleanName,
      title: title.trim(),
      rank: rank.trim(),
      name_status: 'confirmed',
      department: department.trim(),
      qualification: qualification.trim(),
      research_areas: areasArray,
      domain_tags: areasArray.slice(0, 3).map((a) => a.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
      contact_route: email.trim() ? `mailto:${email.trim()}` : null,
      highlights: highlights.trim() || null,
      is_simulated: false,
      review_status: 'draft',
      created_at: new Date().toISOString(),
    };

    saveDraftItem(
      'professors',
      'professors',
      slug,
      professorData,
      'insert',
      `Add new faculty profile: ${title} ${cleanName} (${rank})`
    );

    onProfessorAdded(professorData);
    onClose();

    // Reset
    setName('');
    setEmail('');
    setResearchAreas('');
    setHighlights('');
    setErrorMsg('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Professor Profile"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-xl bg-[#0f1823] border border-[rgba(213,228,236,0.2)] rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                Faculty Staging
              </span>
              <h3 className="text-base font-semibold text-slate-100">Add Faculty Member</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Draft stages to your open change set for Chairman review.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto max-h-[70vh] space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/80 border border-rose-500 text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Name Duplicate Warning Check */}
          {similarExistingName && (
            <div className="p-2.5 rounded bg-amber-950/50 border border-amber-500 text-amber-200">
              ⚠️ A professor with a similar name already exists:{' '}
              <strong className="text-amber-100">{similarExistingName}</strong>. Are you sure this is a new person?
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Prefix</label>
              <select
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              >
                <option value="Dr.">Dr.</option>
                <option value="Prof. Dr.">Prof. Dr.</option>
                <option value="Engr.">Engr.</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Muhammad Khurram"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Academic Rank</label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              >
                <option value="Professor & Chairman">Professor & Chairman</option>
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Institutional Email (Rule 12)
              </label>
              <input
                type="email"
                placeholder="e.g. mkhurram@neduet.edu.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Highest Qualification</label>
              <input
                type="text"
                placeholder="e.g. Ph.D. Computer Engineering"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Research Areas (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Artificial Intelligence, Computer Vision, Embedded Robotics"
              value={researchAreas}
              onChange={(e) => setResearchAreas(e.target.value)}
              className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Profile Highlights / Bio</label>
            <textarea
              rows={3}
              placeholder="Key achievements, laboratory leadership, and FYP supervisory specializations..."
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-[rgba(213,228,236,0.1)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-semibold transition-colors"
            >
              Stage Faculty Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

