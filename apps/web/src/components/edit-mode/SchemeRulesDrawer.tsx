'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';

interface SchemeRulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMaxCredits: number;
  currentPassingGrade: string;
  onRulesUpdated: (newMaxCredits: number, newPassingGrade: string) => void;
}

const DEFAULT_GRADE_SCALE: Record<string, number> = {
  A: 4.0,
  'A-': 3.7,
  'B+': 3.4,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.4,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.4,
  D: 1.0,
  F: 0.0,
};

export function SchemeRulesDrawer({
  isOpen,
  onClose,
  currentMaxCredits,
  currentPassingGrade,
  onRulesUpdated,
}: SchemeRulesDrawerProps) {
  const { activeScheme, saveDraftItem } = useEditMode();

  const [maxCredits, setMaxCredits] = useState<number>(currentMaxCredits || 21);
  const [passingGrade, setPassingGrade] = useState<string>(currentPassingGrade || 'D');
  const [minCgpa, setMinCgpa] = useState<number>(2.0);
  const [minTotalCredits, setMinTotalCredits] = useState<number>(136);
  const [gradeScale, setGradeScale] = useState<Record<string, number>>(DEFAULT_GRADE_SCALE);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const patch = {
      max_credits_per_semester: Number(maxCredits),
      passing_grade: passingGrade,
      grade_scale: gradeScale,
      graduation_rules: {
        min_cgpa: Number(minCgpa),
        min_total_credits: Number(minTotalCredits),
        required_categories: ['core_computing', 'fyp', 'mathematics', 'humanities'],
      },
    };

    saveDraftItem(
      'curriculum',
      'curriculum_versions',
      activeScheme || 'BE-CSE-2018',
      patch,
      'update',
      `Update scheme graduation rules & credit limits (Max ${maxCredits} Cr/term, Min ${passingGrade})`
    );

    onRulesUpdated(Number(maxCredits), passingGrade);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 1000);
  };

  return (
    <aside
      role="dialog"
      aria-label="Scheme Rules & Graduation Criteria"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0f1823] border-l border-[rgba(213,228,236,0.15)] shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Institutional Regulations
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              Scheme 2018 Onwards
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-100">Scheme Rules &amp; Limits</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure semester workloads, passing criteria, and degree completion requirements.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {isSavedNotice && (
          <div className="p-2.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-200">
            Rules updated and staged to draft change set!
          </div>
        )}

        {/* Section 1: Workload & Passing Criteria */}
        <div className="space-y-3 p-3.5 rounded-xl bg-[#162231] border border-slate-700/60">
          <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Semester Workload &amp; Passing Threshold
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Max Credits Per Semester
              </label>
              <input
                type="number"
                min={12}
                max={26}
                value={maxCredits}
                onChange={(e) => setMaxCredits(Number(e.target.value))}
                className="w-full bg-[#0b1119] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-amber-400"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Standard NED limit is 21 Cr. Terms exceeding this will trigger validation warnings.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Minimum Passing Grade
              </label>
              <select
                value={passingGrade}
                onChange={(e) => setPassingGrade(e.target.value)}
                className="w-full bg-[#0b1119] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
              >
                {['D', 'C-', 'C', 'B-', 'B', 'A'].map((g) => (
                  <option key={g} value={g}>
                    Grade {g} ({DEFAULT_GRADE_SCALE[g] ?? 1.0} GP)
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Prerequisites require at least this grade to satisfy unlock rules.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Graduation Thresholds */}
        <div className="space-y-3 p-3.5 rounded-xl bg-[#162231] border border-slate-700/60">
          <h4 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">
            Graduation Requirements
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Minimum CGPA for Degree
              </label>
              <input
                type="number"
                step="0.05"
                min={1.5}
                max={4.0}
                value={minCgpa}
                onChange={(e) => setMinCgpa(Number(e.target.value))}
                className="w-full bg-[#0b1119] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Total Required Credits
              </label>
              <input
                type="number"
                min={100}
                max={160}
                value={minTotalCredits}
                onChange={(e) => setMinTotalCredits(Number(e.target.value))}
                className="w-full bg-[#0b1119] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Grade Scale Table */}
        <div className="space-y-2 p-3.5 rounded-xl bg-[#0b1119] border border-slate-800">
          <h4 className="font-semibold text-slate-300 text-xs uppercase tracking-wider">
            Official NED Grade Scale (Grade Points)
          </h4>
          <div className="max-h-48 overflow-y-auto rounded border border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[#162231] text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-2">Grade</th>
                  <th className="p-2">Grade Point</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {Object.entries(gradeScale).map(([g, pts]) => {
                  const isPassing = (gradeScale[g] ?? 0) >= (gradeScale[passingGrade] ?? 1.0);
                  return (
                    <tr key={g}>
                      <td className="p-2 font-mono font-bold text-amber-300">{g}</td>
                      <td className="p-2 font-mono">{pts.toFixed(1)}</td>
                      <td className="p-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            isPassing
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isPassing ? 'Passing' : 'Failing'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Rules stage into active draft</span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-slate-400 hover:text-slate-200 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-semibold text-xs shadow-sm transition-colors"
          >
            Stage Scheme Rules
          </button>
        </div>
      </div>
    </aside>
  );
}
