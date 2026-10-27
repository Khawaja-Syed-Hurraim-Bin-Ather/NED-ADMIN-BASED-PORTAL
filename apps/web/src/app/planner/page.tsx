'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Modal,
  Alert,
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';

interface Course {
  code: string;
  title: string;
  credits: number;
  theoryCredits?: number;
  practicalCredits?: number;
  semester: number;
  category?: string;
  isElective?: boolean;
  electiveDomain?: string;
}

interface SemesterSlot {
  semesterNumber: number;
  courseCodes: string[];
}

interface PlannerViolation {
  semesterNumber: number;
  courseCode?: string;
  type: string;
  message: string;
  requiredCourseCode?: string;
}

interface SemesterSummary {
  semesterNumber: number;
  courseCodes: string[];
  totalCredits: number;
  workload: 'light' | 'balanced' | 'overload';
  violations: PlannerViolation[];
}

interface PlanValidation {
  isValid: boolean;
  totalCredits: number;
  semesters: SemesterSummary[];
  allViolations: PlannerViolation[];
  totalDegreeCredits: number;
  degreeRequirementMet: boolean;
  degreeTargetCredits: number;
}

const SEMESTER_NAMES = [
  'First Year — Fall (Semester 1)',
  'First Year — Spring (Semester 2)',
  'Second Year — Fall (Semester 3)',
  'Second Year — Spring (Semester 4)',
  'Third Year — Fall (Semester 5)',
  'Third Year — Spring (Semester 6)',
  'Final Year — Fall (Semester 7)',
  'Final Year — Spring (Semester 8)',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  core_computing: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  mathematics: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  science: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  humanities: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  fyp: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  elective: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

export default function StudentPlannerPage() {
  const [coursesMap, setCoursesMap] = useState<Map<string, Course>>(new Map());
  const [allCoursesList, setAllCoursesList] = useState<Course[]>([]);
  const [slots, setSlots] = useState<SemesterSlot[]>([]);
  const [validation, setValidation] = useState<PlanValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeCourseModal, setActiveCourseModal] = useState<Course | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [planName, setPlanName] = useState('My 4-Year Degree Plan');
  const [targetGraduation, setTargetGraduation] = useState('Spring 2028');
  const [filterDrawerCategory, setFilterDrawerCategory] = useState<string>('all');
  const [searchDrawer, setSearchDrawer] = useState('');

  // ── Load Template from API ────────────────────────────────────────────────
  const loadCurriculumTemplate = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/planner/template');
      if (!res.ok) throw new Error('Failed to load curriculum template');
      const data = await res.json();

      const cMap = new Map<string, Course>();
      for (const c of data.courses) {
        cMap.set(c.code, c);
      }
      setCoursesMap(cMap);
      setAllCoursesList(data.courses);

      // Check if user has a saved plan in localStorage
      const savedLocal = localStorage.getItem('educompass_student_plan');
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (parsed.slots && Array.isArray(parsed.slots)) {
            setSlots(parsed.slots);
            if (parsed.planName) setPlanName(parsed.planName);
            if (parsed.targetGraduation) setTargetGraduation(parsed.targetGraduation);
            return;
          }
        } catch {
          // Fall back to template
        }
      }

      setSlots(data.defaultPlan.slots);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurriculumTemplate();
  }, [loadCurriculumTemplate]);

  // ── Trigger Validation Whenever Slots Change ──────────────────────────────
  const runValidation = useCallback(async (currentSlots: SemesterSlot[]) => {
    if (currentSlots.length === 0) return;
    try {
      const res = await fetch('/api/v1/planner/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: currentSlots, maxCreditsPerSemester: 18, overloadLimit: 21 }),
      });
      if (res.ok) {
        const valData = await res.json();
        setValidation(valData);
      }
    } catch (err) {
      console.error('Validation request failed:', err);
    }
  }, []);

  useEffect(() => {
    if (slots.length > 0) {
      runValidation(slots);
      // Auto-save draft to localStorage
      localStorage.setItem('educompass_student_plan', JSON.stringify({ slots, planName, targetGraduation }));
    }
  }, [slots, planName, targetGraduation, runValidation]);

  // ── Move Course Handler ───────────────────────────────────────────────────
  const moveCourse = (courseCode: string, fromSem: number, toSem: number) => {
    setSlots((prevSlots) => {
      return prevSlots.map((slot) => {
        if (slot.semesterNumber === fromSem) {
          return {
            ...slot,
            courseCodes: slot.courseCodes.filter((c) => c !== courseCode),
          };
        }
        if (slot.semesterNumber === toSem) {
          if (!slot.courseCodes.includes(courseCode)) {
            return {
              ...slot,
              courseCodes: [...slot.courseCodes, courseCode],
            };
          }
        }
        return slot;
      });
    });
  };

  // ── Remove Course to Unscheduled Pool ─────────────────────────────────────
  const removeCourse = (courseCode: string, fromSem: number) => {
    setSlots((prevSlots) => {
      return prevSlots.map((slot) => {
        if (slot.semesterNumber === fromSem) {
          return {
            ...slot,
            courseCodes: slot.courseCodes.filter((c) => c !== courseCode),
          };
        }
        return slot;
      });
    });
  };

  // ── Add Course from Pool to a Semester ────────────────────────────────────
  const addCourseToSemester = (courseCode: string, targetSem: number) => {
    setSlots((prevSlots) => {
      return prevSlots.map((slot) => {
        if (slot.semesterNumber === targetSem) {
          if (!slot.courseCodes.includes(courseCode)) {
            return { ...slot, courseCodes: [...slot.courseCodes, courseCode] };
          }
        }
        return slot;
      });
    });
  };

  // ── Reset to Official Curriculum ──────────────────────────────────────────
  const handleResetToOfficial = async () => {
    if (confirm('Reset your degree plan back to the official NED CISE 4-year curriculum sequence?')) {
      localStorage.removeItem('educompass_student_plan');
      await loadCurriculumTemplate();
      setSaveStatus({ type: 'success', message: 'Reset to official NED CISE curriculum template.' });
    }
  };

  // ── Save Plan (Local & Backend) ───────────────────────────────────────────
  const handleSavePlan = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      localStorage.setItem('educompass_student_plan', JSON.stringify({ slots, planName, targetGraduation }));

      const res = await fetch('/api/v1/planner/my-plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planName,
          targetGraduationTerm: targetGraduation,
          slots,
          maxCreditsPerSemester: 18,
        }),
      });

      if (res.ok) {
        setSaveStatus({ type: 'success', message: 'Plan saved securely to your student account!' });
      } else {
        // Saved locally message
        setSaveStatus({ type: 'success', message: 'Plan saved locally in your browser.' });
      }
    } catch {
      setSaveStatus({ type: 'success', message: 'Plan saved locally in your browser.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Find Scheduled Courses Set ────────────────────────────────────────────
  const scheduledCoursesSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      for (const c of s.courseCodes) {
        set.add(c);
      }
    }
    return set;
  }, [slots]);

  // ── Unscheduled Courses Pool ──────────────────────────────────────────────
  const unscheduledCourses = useMemo(() => {
    return allCoursesList.filter((c) => {
      const isScheduled = scheduledCoursesSet.has(c.code);
      if (isScheduled) return false;
      if (filterDrawerCategory !== 'all' && c.category !== filterDrawerCategory) return false;
      if (searchDrawer) {
        const q = searchDrawer.toLowerCase();
        return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allCoursesList, scheduledCoursesSet, filterDrawerCategory, searchDrawer]);

  // ── Metrics ───────────────────────────────────────────────────────────────
  const totalDegreeCredits = validation?.totalCredits ?? 0;
  const targetCredits = validation?.degreeTargetCredits ?? 136;
  const progressPercent = Math.min(100, Math.round((totalDegreeCredits / targetCredits) * 100));
  const totalViolations = validation?.allViolations.length ?? 0;

  return (
    <div className="inner-page">
      {/* ── Standardized Page Header ─────────────────────────────────────── */}
      <PageHeader
        title="Student Degree Planner"
        breadcrumbs={[{ label: 'Degree Planner' }]}
        badge={`${totalDegreeCredits}/${targetCredits} Credits`}
        description="Plan your 8-semester course sequence, balance workload, and validate prerequisite compliance under NED CISE regulations."
        accent="var(--cyan)"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToOfficial}
              className="button button-secondary"
            >
              🔄 Reset to Official
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="button button-secondary"
            >
              📄 Export Summary
            </button>
            <button
              onClick={handleSavePlan}
              disabled={isSaving}
              className="button button-primary"
            >
              {isSaving ? 'Saving...' : '💾 Save Plan'}
            </button>
          </div>
        }
      />

      <div className="inner-page-body space-y-6">
        {/* ── Rule #13 Legal Disclaimer Banner ────────────────────────────── */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
          <span className="text-base flex-shrink-0">⚠️</span>
          <div>
            <strong className="text-amber-100 font-semibold">Academic Guidance Notice:</strong> All schedules and prerequisite evaluations are simulation estimates based on the NED CISE Scheme of Studies. Official enrollment, section scheduling, and graduation clearance are governed strictly by the NED University Department of CISE regulations.
          </div>
        </div>

        {saveStatus && (
          <Alert variant={saveStatus.type === 'success' ? 'success' : 'danger'}>
            {saveStatus.message}
          </Alert>
        )}

        {/* ── Degree Progress & Health Overview Bar ────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/80 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Total Planned Credits</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-cyan-400">{totalDegreeCredits}</span>
              <span className="text-xs text-slate-500">/ {targetCredits} required</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  progressPercent >= 100 ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
              <span>{progressPercent}% Complete</span>
              <span>{targetCredits - totalDegreeCredits > 0 ? `${targetCredits - totalDegreeCredits} left` : 'Goal met!'}</span>
            </div>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Prerequisite Health</div>
            <div className="flex items-baseline gap-2 mt-1">
              {totalViolations === 0 ? (
                <>
                  <span className="text-2xl font-bold text-emerald-400">0</span>
                  <span className="text-xs text-emerald-400/80 font-medium">No violations</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-bold text-rose-400">{totalViolations}</span>
                  <span className="text-xs text-rose-400/80 font-medium">Issues detected</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {totalViolations === 0
                ? 'All prerequisite sequences are valid.'
                : 'Some courses are scheduled before their prerequisites.'}
            </p>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Target Graduation</div>
            <div className="mt-1">
              <input
                type="text"
                value={targetGraduation}
                onChange={(e) => setTargetGraduation(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-sm font-semibold text-white px-2 py-1 rounded w-full focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Spring 2028"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Based on 8 regular terms.</p>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800 p-4">
            <div className="text-xs text-slate-400 font-medium">Average Term Load</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-purple-400">
                {(totalDegreeCredits / Math.max(1, slots.length)).toFixed(1)}
              </span>
              <span className="text-xs text-slate-500">credits / term</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Recommended limit is 18 CH.</p>
          </Card>
        </div>

        {/* ── Main Planner Layout: 8 Semester Columns / Grid ──────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">4-Year Degree Sequence (Semesters 1 to 8)</h2>
              <p className="text-xs text-slate-400">
                Move courses between terms to balance your credit hours and avoid prerequisite bottlenecks.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span> Balanced (15–18)
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span> Light (&lt;15)
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></span> Overload (&gt;18)
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading curriculum sequence...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {slots.map((slot) => {
                const semSummary = validation?.semesters.find(
                  (s) => s.semesterNumber === slot.semesterNumber
                );
                const semCredits = semSummary?.totalCredits ?? 0;
                const workload = semSummary?.workload ?? 'balanced';
                const semViolations = semSummary?.violations ?? [];

                let workloadBadgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                if (workload === 'light') workloadBadgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                if (workload === 'overload') workloadBadgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                return (
                  <div
                    key={slot.semesterNumber}
                    className="bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col overflow-hidden shadow-sm hover:border-slate-700 transition-colors"
                  >
                    {/* ── Semester Column Header ─────────────────────── */}
                    <div className="p-3 border-b border-slate-800 bg-slate-950/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          Semester {slot.semesterNumber}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${workloadBadgeColor}`}
                        >
                          {semCredits} CH • {workload}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {SEMESTER_NAMES[slot.semesterNumber - 1] || `Term ${slot.semesterNumber}`}
                      </div>
                    </div>

                    {/* ── Semester Violations Warning Pill ───────────── */}
                    {semViolations.length > 0 && (
                      <div className="bg-rose-500/10 border-b border-rose-500/20 px-3 py-1.5 space-y-1">
                        {semViolations.map((v, idx) => (
                          <div key={idx} className="text-[10px] text-rose-300 flex items-start gap-1">
                            <span className="text-xs">⚠️</span>
                            <span>{v.message}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Courses In Semester ────────────────────────── */}
                    <div className="p-2.5 space-y-2 flex-1 min-h-[220px]">
                      {slot.courseCodes.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-6 border-2 border-dashed border-slate-800/80 rounded-lg text-slate-600 text-xs">
                          No courses scheduled
                        </div>
                      ) : (
                        slot.courseCodes.map((code) => {
                          const course = coursesMap.get(code);
                          const courseViolations = semViolations.filter(
                            (v) => v.courseCode === code
                          );
                          const hasViolation = courseViolations.length > 0;
                          const cat = course?.category || 'core_computing';
                          const catTheme = CATEGORY_COLORS[cat] || CATEGORY_COLORS.core_computing;

                          return (
                            <div
                              key={code}
                              className={`p-2.5 rounded-lg border transition-all ${
                                hasViolation
                                  ? 'bg-rose-950/20 border-rose-500/50'
                                  : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div
                                  className="cursor-pointer flex-1"
                                  onClick={() => course && setActiveCourseModal(course)}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-mono font-bold text-white">
                                      {code}
                                    </span>
                                    <span
                                      className={`text-[9px] px-1.5 py-0.2 rounded border ${catTheme.bg} ${catTheme.text} ${catTheme.border}`}
                                    >
                                      {cat.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                                    {course?.title || code}
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                  {course?.credits ?? 3} CH
                                </span>
                              </div>

                              {/* Course Specific Prerequisite Violation Warning */}
                              {hasViolation && (
                                <div className="mt-1.5 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                  {courseViolations[0].message}
                                </div>
                              )}

                              {/* ── Move & Remove Controls ───────────────── */}
                              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                                <button
                                  disabled={slot.semesterNumber <= 1}
                                  onClick={() => moveCourse(code, slot.semesterNumber, slot.semesterNumber - 1)}
                                  className="text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-slate-400 px-1 py-0.5"
                                  title="Move to previous semester"
                                >
                                  ◀ Sem {slot.semesterNumber - 1}
                                </button>
                                <button
                                  onClick={() => removeCourse(code, slot.semesterNumber)}
                                  className="text-slate-500 hover:text-rose-400 px-1 py-0.5"
                                  title="Unschedule course"
                                >
                                  ✕ Remove
                                </button>
                                <button
                                  disabled={slot.semesterNumber >= 8}
                                  onClick={() => moveCourse(code, slot.semesterNumber, slot.semesterNumber + 1)}
                                  className="text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-slate-400 px-1 py-0.5"
                                  title="Move to next semester"
                                >
                                  Sem {slot.semesterNumber + 1} ▶
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Unscheduled / Elective Course Drawer ────────────────────────── */}
        <Card className="bg-slate-900/90 border-slate-800 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📚</span> Unscheduled Courses & Available Electives ({unscheduledCourses.length})
              </h3>
              <p className="text-xs text-slate-400">
                Courses not yet assigned to any semester slot. Pick a semester to add them to your degree plan.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchDrawer}
                onChange={(e) => setSearchDrawer(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500 w-44"
              />
              <select
                value={filterDrawerCategory}
                onChange={(e) => setFilterDrawerCategory(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-xs text-slate-200 px-2 py-1.5 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Categories</option>
                <option value="elective">Electives</option>
                <option value="core_computing">Core Computing</option>
                <option value="mathematics">Mathematics</option>
                <option value="humanities">Humanities</option>
                <option value="science">Science</option>
              </select>
            </div>
          </div>

          {unscheduledCourses.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              {allCoursesList.length === 0
                ? 'Loading course catalog...'
                : 'All courses in the curriculum have been scheduled into semesters!'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {unscheduledCourses.map((c) => (
                <div
                  key={c.code}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-white">{c.code}</span>
                      <span className="text-[10px] text-slate-400">{c.credits} CH</span>
                    </div>
                    <div className="text-xs text-slate-300 truncate">{c.title}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const target = parseInt(e.target.value, 10);
                        if (target >= 1 && target <= 8) {
                          addCourseToSemester(c.code, target);
                          e.target.value = '';
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 text-[11px] text-cyan-400 rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                    >
                      <option value="" disabled>
                        + Add to...
                      </option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Course Detail Modal ─────────────────────────────────────────── */}
      {activeCourseModal && (
        <Modal
          isOpen
          onClose={() => setActiveCourseModal(null)}
          title={`${activeCourseModal.code} — ${activeCourseModal.title}`}
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500">Credits:</span>{' '}
                <strong className="text-white">{activeCourseModal.credits} Credit Hours</strong>
              </div>
              <div>
                <span className="text-slate-500">Type:</span>{' '}
                <span className="capitalize text-cyan-400">{activeCourseModal.category?.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-slate-500">Theory Credits:</span>{' '}
                <span className="text-white">{activeCourseModal.theoryCredits ?? 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500">Practical Credits:</span>{' '}
                <span className="text-white">{activeCourseModal.practicalCredits ?? 'N/A'}</span>
              </div>
            </div>

            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="font-semibold text-slate-200">Prerequisite & Degree Sequence</div>
              <p className="text-slate-400">
                Official Recommended Semester: <strong>Semester {activeCourseModal.semester}</strong>
              </p>
              <p className="text-slate-400">
                Scheduled In:{' '}
                {slots.find((s) => s.courseCodes.includes(activeCourseModal.code)) ? (
                  <strong className="text-emerald-400">
                    Semester {slots.find((s) => s.courseCodes.includes(activeCourseModal.code))?.semesterNumber}
                  </strong>
                ) : (
                  <span className="text-amber-400">Currently Unscheduled</span>
                )}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setActiveCourseModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Export Plan Modal ───────────────────────────────────────────── */}
      {showExportModal && (
        <Modal isOpen onClose={() => setShowExportModal(false)} title="Export Degree Schedule">
          <div className="space-y-4 text-xs text-slate-300">
            <p className="text-slate-400">
              Below is the structured JSON summary of your customized 4-year degree plan for BE Computer Systems Engineering:
            </p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-60 overflow-y-auto font-mono text-[11px] text-cyan-300">
              <pre>
                {JSON.stringify(
                  {
                    planName,
                    program: 'BE Computer Systems Engineering (CISE), NED University',
                    targetGraduation,
                    totalPlannedCredits: totalDegreeCredits,
                    isPrerequisiteSequenceValid: validation?.isValid ?? true,
                    semesters: slots.map((s) => ({
                      semester: s.semesterNumber,
                      courses: s.courseCodes,
                      credits: s.courseCodes.reduce((sum, c) => sum + (coursesMap.get(c)?.credits || 3), 0),
                    })),
                    disclaimer:
                      'Curriculum plan generated by EduCompass for student academic guidance. Subject to official NED University rules.',
                  },
                  null,
                  2
                )}
              </pre>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify({ planName, targetGraduation, slots }, null, 2)
                  );
                  alert('Schedule copied to clipboard!');
                }}
              >
                📋 Copy JSON
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowExportModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
