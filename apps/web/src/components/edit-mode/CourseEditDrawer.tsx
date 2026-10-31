'use client';

import React, { useState, useEffect } from 'react';
import { useEditMode } from '../../context/EditModeContext';
import { LockedHint } from './LockedHint';

export interface CourseData {
  code: string;
  title: string;
  credits: number;
  theoryCredits: number;
  practicalCredits: number;
  semester: number;
  category: 'core_computing' | 'mathematics' | 'science' | 'humanities' | 'fyp' | 'elective';
  prereqs: string[];
  isElective?: boolean;
  description?: string;
  passingGrade?: string;
  status?: string;
  syllabus?: {
    topics?: string[];
    textbook?: string;
    gradingFormula?: string;
  };
}

interface CourseEditDrawerProps {
  course: CourseData | null;
  allCourses: CourseData[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateCourse: (updated: CourseData) => void;
  onSelectCourseByCode: (code: string) => void;
}

export function CourseEditDrawer({
  course,
  allCourses,
  isOpen,
  onClose,
  onUpdateCourse,
  onSelectCourseByCode,
}: CourseEditDrawerProps) {
  const { isEditMode, viewAsStudent, can, saveDraftItem } = useEditMode();
  const [activeTab, setActiveTab] = useState<'details' | 'syllabus' | 'prereqs' | 'used_by'>('details');

  // Form local state
  const [title, setTitle] = useState('');
  const [credits, setCredits] = useState(3);
  const [theoryCredits, setTheoryCredits] = useState(3);
  const [practicalCredits, setPracticalCredits] = useState(0);
  const [semester, setSemester] = useState(1);
  const [category, setCategory] = useState<CourseData['category']>('core_computing');
  const [passingGrade, setPassingGrade] = useState('D');
  const [description, setDescription] = useState('');
  const [topicsText, setTopicsText] = useState('');
  const [textbook, setTextbook] = useState('');
  const [gradingFormula, setGradingFormula] = useState('');
  const [selectedNewPrereq, setSelectedNewPrereq] = useState('');

  const canEdit = isEditMode && !viewAsStudent && can('curriculum', 'edit');

  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setCredits(course.credits || 3);
      setTheoryCredits(course.theoryCredits ?? 3);
      setPracticalCredits(course.practicalCredits ?? 0);
      setSemester(course.semester || 1);
      setCategory(course.category || 'core_computing');
      setPassingGrade(course.passingGrade || 'D');
      setDescription(course.description || '');
      setTopicsText(course.syllabus?.topics?.join('\n') || 'Course foundations\nIntermediate concepts\nLaboratory applications');
      setTextbook(course.syllabus?.textbook || 'Official CISE Department Prescribed Text');
      setGradingFormula(course.syllabus?.gradingFormula || '40% Final Exam, 30% Midterm, 30% Lab / Quizzes');
    }
  }, [course]);

  if (!isOpen || !course) return null;

  // Courses that list this course as a prerequisite
  const usedByCourses = allCourses.filter((c) => c.prereqs.includes(course.code));

  // Eligible courses for prerequisites (excluding self and already added)
  const eligiblePrereqs = allCourses.filter(
    (c) => c.code !== course.code && !course.prereqs.includes(c.code)
  );

  const handleSaveDetails = () => {
    if (!canEdit) return;
    const patch = {
      title,
      credits: Number(credits),
      credits_theory: Number(theoryCredits),
      credits_practical: Number(practicalCredits),
      semester: Number(semester),
      category,
      passing_grade: passingGrade,
      description,
    };

    saveDraftItem(
      'curriculum',
      'curriculum_courses',
      course.code,
      patch,
      'update',
      `Update course details for ${course.code} (${title})`
    );

    onUpdateCourse({
      ...course,
      title,
      credits: Number(credits),
      theoryCredits: Number(theoryCredits),
      practicalCredits: Number(practicalCredits),
      semester: Number(semester),
      category,
      passingGrade,
      description,
    });
  };

  const handleSaveSyllabus = () => {
    if (!canEdit) return;
    const topics = topicsText.split('\n').map((t) => t.trim()).filter(Boolean);
    const syllabusData = { topics, textbook, gradingFormula };

    saveDraftItem(
      'curriculum',
      'course_master',
      course.code,
      { syllabus: syllabusData },
      'update',
      `Update syllabus topics and textbook for ${course.code}`
    );

    onUpdateCourse({
      ...course,
      syllabus: syllabusData,
    });
  };

  const handleRemovePrereq = (prereqCode: string) => {
    if (!canEdit) return;
    saveDraftItem(
      'curriculum',
      'course_prerequisites',
      `${prereqCode}->${course.code}`,
      { course_code: course.code, prerequisite_code: prereqCode },
      'delete',
      `Remove prerequisite ${prereqCode} from ${course.code}`
    );

    onUpdateCourse({
      ...course,
      prereqs: course.prereqs.filter((p) => p !== prereqCode),
    });
  };

  const handleAddPrereq = () => {
    if (!canEdit || !selectedNewPrereq) return;
    saveDraftItem(
      'curriculum',
      'course_prerequisites',
      `${selectedNewPrereq}->${course.code}`,
      { course_code: course.code, prerequisite_code: selectedNewPrereq },
      'insert',
      `Add prerequisite ${selectedNewPrereq} for ${course.code}`
    );

    onUpdateCourse({
      ...course,
      prereqs: [...course.prereqs, selectedNewPrereq],
    });
    setSelectedNewPrereq('');
  };

  return (
    <aside
      role="dialog"
      aria-label={`Course Details: ${course.code}`}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-[#0f1823] border-l border-[rgba(213,228,236,0.15)] shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-[rgba(213,228,236,0.1)] flex items-start justify-between bg-[#162231]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-bold text-amber-300">{course.code}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">
              {course.category.replace('_', ' ')}
            </span>
            {canEdit ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                ✎ Editable
              </span>
            ) : (
              <LockedHint reason="Requires Curriculum Coordinator role in Edit Mode" />
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-100">{course.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Semester {course.semester} • {course.credits} Credits ({course.theoryCredits}+{course.practicalCredits})
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close drawer"
        >
          ✕
        </button>
      </div>

      {/* 4 Tabs Navigation */}
      <div className="flex border-b border-[rgba(213,228,236,0.1)] bg-[#0b1119] text-xs">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-2.5 px-3 text-center font-medium border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-[#511030] text-amber-300 bg-[#162231]/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab('syllabus')}
          className={`flex-1 py-2.5 px-3 text-center font-medium border-b-2 transition-colors ${
            activeTab === 'syllabus'
              ? 'border-[#511030] text-amber-300 bg-[#162231]/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Syllabus
        </button>
        <button
          onClick={() => setActiveTab('prereqs')}
          className={`flex-1 py-2.5 px-3 text-center font-medium border-b-2 transition-colors ${
            activeTab === 'prereqs'
              ? 'border-[#511030] text-amber-300 bg-[#162231]/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Prerequisites ({course.prereqs.length})
        </button>
        <button
          onClick={() => setActiveTab('used_by')}
          className={`flex-1 py-2.5 px-3 text-center font-medium border-b-2 transition-colors ${
            activeTab === 'used_by'
              ? 'border-[#511030] text-amber-300 bg-[#162231]/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Used By ({usedByCourses.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Tab 1: Details */}
        {activeTab === 'details' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Course Code</label>
              <input
                type="text"
                disabled
                value={course.code}
                className="w-full bg-[#0b1119] border border-slate-700/60 rounded px-2.5 py-1.5 text-slate-400 font-mono"
              />
              <span className="text-[10px] text-slate-500">Official course codes are immutable once registered.</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Course Title</label>
              <input
                type="text"
                disabled={!canEdit}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveDetails}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Total Cr</label>
                <input
                  type="number"
                  disabled={!canEdit}
                  min={1}
                  max={6}
                  value={credits}
                  onChange={(e) => {
                    const c = Number(e.target.value);
                    setCredits(c);
                  }}
                  onBlur={handleSaveDetails}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Theory Cr</label>
                <input
                  type="number"
                  disabled={!canEdit}
                  min={0}
                  max={4}
                  value={theoryCredits}
                  onChange={(e) => setTheoryCredits(Number(e.target.value))}
                  onBlur={handleSaveDetails}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Practical Cr</label>
                <input
                  type="number"
                  disabled={!canEdit}
                  min={0}
                  max={4}
                  value={practicalCredits}
                  onChange={(e) => setPracticalCredits(Number(e.target.value))}
                  onBlur={handleSaveDetails}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Semester (1–8)</label>
                <select
                  disabled={!canEdit}
                  value={semester}
                  onChange={(e) => {
                    setSemester(Number(e.target.value));
                    setTimeout(handleSaveDetails, 50);
                  }}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s} ({s % 2 === 1 ? 'Fall' : 'Spring'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Passing Grade</label>
                <select
                  disabled={!canEdit}
                  value={passingGrade}
                  onChange={(e) => {
                    setPassingGrade(e.target.value);
                    setTimeout(handleSaveDetails, 50);
                  }}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                >
                  {['D', 'C-', 'C', 'B-', 'B', 'A'].map((g) => (
                    <option key={g} value={g}>
                      Min {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Curriculum Category</label>
              <select
                disabled={!canEdit}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as any);
                  setTimeout(handleSaveDetails, 50);
                }}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              >
                <option value="core_computing">Core Computing</option>
                <option value="mathematics">Mathematics</option>
                <option value="science">Natural Sciences</option>
                <option value="humanities">Humanities & Social</option>
                <option value="fyp">Final Year Project</option>
                <option value="elective">Elective</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                disabled={!canEdit}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSaveDetails}
                placeholder="Institutional course overview and learning outcomes..."
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 resize-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Syllabus */}
        {activeTab === 'syllabus' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Course Topics (one per line)
              </label>
              <textarea
                disabled={!canEdit}
                rows={6}
                value={topicsText}
                onChange={(e) => setTopicsText(e.target.value)}
                onBlur={handleSaveSyllabus}
                placeholder="1. Introduction and Foundations&#10;2. Core Theoretical Models&#10;3. Applied Lab Practicals"
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 resize-none font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Prescribed Textbook</label>
              <input
                type="text"
                disabled={!canEdit}
                value={textbook}
                onChange={(e) => setTextbook(e.target.value)}
                onBlur={handleSaveSyllabus}
                placeholder="e.g. Silberschatz, Operating System Concepts, 10th Ed."
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Grading Formula</label>
              <input
                type="text"
                disabled={!canEdit}
                value={gradingFormula}
                onChange={(e) => setGradingFormula(e.target.value)}
                onBlur={handleSaveSyllabus}
                placeholder="e.g. 40% Final Exam, 30% Sessional, 30% Practical Lab"
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>

            {canEdit && (
              <p className="text-[10px] text-slate-400 italic">
                Edits save automatically to your open working change set upon exiting input fields.
              </p>
            )}
          </div>
        )}

        {/* Tab 3: Prerequisites */}
        {activeTab === 'prereqs' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-300">Direct Prerequisites ({course.prereqs.length})</span>
                <span className="text-[10px] text-slate-400">Must be completed before this course</span>
              </div>

              {course.prereqs.length === 0 ? (
                <div className="p-3 rounded bg-[#0b1119] border border-slate-800 text-slate-400 text-center italic">
                  No prerequisites registered. This is an entry-level course.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {course.prereqs.map((pCode) => {
                    const prereqObj = allCourses.find((c) => c.code === pCode);
                    return (
                      <div
                        key={pCode}
                        className="flex items-center justify-between p-2.5 rounded bg-[#162231] border border-slate-800"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-300">{pCode}</span>
                            <span className="text-[10px] text-slate-400">
                              Sem {prereqObj?.semester ?? '?'}
                            </span>
                          </div>
                          <p className="text-slate-300 line-clamp-1">{prereqObj?.title || pCode}</p>
                        </div>

                        {canEdit && (
                          <button
                            onClick={() => handleRemovePrereq(pCode)}
                            className="px-2 py-1 rounded text-[11px] text-rose-400 hover:bg-rose-950/50 hover:text-rose-200 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add Prerequisite Autocomplete / Dropdown */}
            {canEdit && (
              <div className="p-3 rounded-lg bg-[#0b1119] border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-200 block">+ Add Prerequisite</span>
                <div className="flex gap-2">
                  <select
                    value={selectedNewPrereq}
                    onChange={(e) => setSelectedNewPrereq(e.target.value)}
                    className="flex-1 bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 text-xs"
                  >
                    <option value="">Select course to require...</option>
                    {eligiblePrereqs.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.title} (Sem {c.semester})
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!selectedNewPrereq}
                    onClick={handleAddPrereq}
                    className="px-3 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white disabled:opacity-40 font-medium text-xs transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Used By */}
        {activeTab === 'used_by' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-300">Downstream Courses ({usedByCourses.length})</span>
              <span className="text-[10px] text-slate-400">Courses that require {course.code}</span>
            </div>

            {usedByCourses.length === 0 ? (
              <div className="p-3 rounded bg-[#0b1119] border border-slate-800 text-slate-400 text-center italic">
                No downstream courses depend on {course.code}. This is a terminal or final-year course.
              </div>
            ) : (
              <div className="space-y-1.5">
                {usedByCourses.map((c) => (
                  <div
                    key={c.code}
                    className="flex items-center justify-between p-2.5 rounded bg-[#162231] border border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300">{c.code}</span>
                        <span className="text-[10px] text-slate-400">Semester {c.semester}</span>
                      </div>
                      <p className="text-slate-300 line-clamp-1">{c.title}</p>
                    </div>

                    <button
                      onClick={() => onSelectCourseByCode(c.code)}
                      className="px-2.5 py-1 rounded text-[11px] bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Jump to →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Changes stage to draft change set</span>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </aside>
  );
}
