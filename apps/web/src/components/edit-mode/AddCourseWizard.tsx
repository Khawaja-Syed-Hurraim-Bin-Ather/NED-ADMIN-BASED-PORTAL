'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';
import { CourseData } from './CourseEditDrawer';

interface AddCourseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  allCourses: CourseData[];
  onCourseAdded: (newCourse: CourseData) => void;
}

export function AddCourseWizard({
  isOpen,
  onClose,
  allCourses,
  onCourseAdded,
}: AddCourseWizardProps) {
  const { saveDraftItem } = useEditMode();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Details
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [credits, setCredits] = useState(3);
  const [theoryCredits, setTheoryCredits] = useState(3);
  const [practicalCredits, setPracticalCredits] = useState(0);
  const [semester, setSemester] = useState(1);
  const [category, setCategory] = useState<CourseData['category']>('core_computing');
  const [passingGrade, setPassingGrade] = useState('D');
  const [description, setDescription] = useState('');

  // Step 2: Syllabus
  const [topics, setTopics] = useState('');
  const [textbook, setTextbook] = useState('');
  const [gradingFormula, setGradingFormula] = useState('40% Final Exam, 30% Sessional, 30% Practical Lab');

  // Step 3: Prerequisites
  const [selectedPrereqs, setSelectedPrereqs] = useState<string[]>([]);

  // Validation
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleNextFromStep1 = () => {
    if (!code.trim() || !title.trim()) {
      setErrorMsg('Course code and course title are required.');
      return;
    }
    const exists = allCourses.some((c) => c.code.toUpperCase() === code.trim().toUpperCase());
    if (exists) {
      setErrorMsg(`Course code ${code.toUpperCase()} already exists in the curriculum catalog.`);
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleTogglePrereq = (courseCode: string) => {
    setSelectedPrereqs((prev) =>
      prev.includes(courseCode) ? prev.filter((c) => c !== courseCode) : [...prev, courseCode]
    );
  };

  const handleConfirmAndStage = () => {
    const cleanCode = code.trim().toUpperCase();
    const cleanTitle = title.trim();
    const syllabusObj = {
      topics: topics.split('\n').map((t) => t.trim()).filter(Boolean),
      textbook: textbook.trim(),
      gradingFormula: gradingFormula.trim(),
    };

    const newCourseObj: CourseData = {
      code: cleanCode,
      title: cleanTitle,
      credits: Number(credits),
      theoryCredits: Number(theoryCredits),
      practicalCredits: Number(practicalCredits),
      semester: Number(semester),
      category,
      passingGrade,
      description: description.trim(),
      prereqs: selectedPrereqs,
      syllabus: syllabusObj,
    };

    // Stage draft item into open working change set
    saveDraftItem(
      'curriculum',
      'curriculum_courses',
      cleanCode,
      {
        code: cleanCode,
        title: cleanTitle,
        credits: Number(credits),
        credits_theory: Number(theoryCredits),
        credits_practical: Number(practicalCredits),
        semester: Number(semester),
        category,
        passing_grade: passingGrade,
        description: description.trim(),
        prerequisites: selectedPrereqs,
        syllabus: syllabusObj,
      },
      'insert',
      `Add new course ${cleanCode} (${cleanTitle}) to Semester ${semester}`
    );

    onCourseAdded(newCourseObj);
    onClose();

    // Reset wizard
    setStep(1);
    setCode('');
    setTitle('');
    setDescription('');
    setSelectedPrereqs([]);
    setTopics('');
    setTextbook('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add New Course to Curriculum"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-xl bg-[#0f1823] border border-[rgba(213,228,236,0.2)] rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                Step {step} of 4
              </span>
              <h3 className="text-base font-semibold text-slate-100">
                {step === 1 && 'Course Details'}
                {step === 2 && 'Syllabus & Grading'}
                {step === 3 && 'Prerequisite Rules'}
                {step === 4 && 'Review & Stage Draft'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Curriculum changes stage into your working change set.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 border-b border-[rgba(213,228,236,0.1)] text-center text-[10px] font-medium select-none bg-[#0b1119]">
          <div className={`py-2 ${step === 1 ? 'text-amber-400 border-b-2 border-amber-400 font-bold' : step > 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
            1. Details
          </div>
          <div className={`py-2 ${step === 2 ? 'text-amber-400 border-b-2 border-amber-400 font-bold' : step > 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
            2. Syllabus
          </div>
          <div className={`py-2 ${step === 3 ? 'text-amber-400 border-b-2 border-amber-400 font-bold' : step > 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
            3. Prerequisites
          </div>
          <div className={`py-2 ${step === 4 ? 'text-amber-400 border-b-2 border-amber-400 font-bold' : 'text-slate-500'}`}>
            4. Review
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/80 border border-rose-500 text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: DETAILS */}
          {step === 1 && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Course Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CS-330"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Semester (1–8)
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s} ({s % 2 === 1 ? 'Fall' : 'Spring'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Course Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Computing & Distributed Services"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Total Cr</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Theory Cr</label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={theoryCredits}
                    onChange={(e) => setTheoryCredits(Number(e.target.value))}
                    className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Practical Cr</label>
                  <input
                    type="number"
                    min={0}
                    max={4}
                    value={practicalCredits}
                    onChange={(e) => setPracticalCredits(Number(e.target.value))}
                    className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
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
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Passing Grade</label>
                  <select
                    value={passingGrade}
                    onChange={(e) => setPassingGrade(e.target.value)}
                    className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
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
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Official course catalog description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: SYLLABUS */}
          {step === 2 && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Course Topics (one per line)
                </label>
                <textarea
                  rows={5}
                  placeholder="1. Architecture and Fundamentals&#10;2. Core Design Patterns&#10;3. Lab Practicals & Projects"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-[11px] resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Prescribed Textbook
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tanenbaum & Van Steen, Distributed Systems, 3rd Ed."
                  value={textbook}
                  onChange={(e) => setTextbook(e.target.value)}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Grading Formula
                </label>
                <input
                  type="text"
                  value={gradingFormula}
                  onChange={(e) => setGradingFormula(e.target.value)}
                  className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                />
              </div>
            </div>
          )}

          {/* STEP 3: PREREQUISITES */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  Select Prerequisites ({selectedPrereqs.length} selected)
                </span>
                <span className="text-[10px] text-slate-400">
                  Courses that students must pass prior to {code || 'this course'}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1 p-2 rounded bg-[#0b1119] border border-slate-800">
                {allCourses
                  .filter((c) => c.semester < semester)
                  .map((c) => {
                    const isChecked = selectedPrereqs.includes(c.code);
                    return (
                      <label
                        key={c.code}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isChecked ? 'bg-[#511030]/40 border border-[#511030]' : 'hover:bg-[#162231]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePrereq(c.code)}
                            className="rounded border-slate-700 text-[#511030] focus:ring-0"
                          />
                          <div>
                            <span className="font-mono font-bold text-amber-300">{c.code}</span>
                            <span className="text-slate-300 ml-2">{c.title}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">Sem {c.semester}</span>
                      </label>
                    );
                  })}
                {allCourses.filter((c) => c.semester < semester).length === 0 && (
                  <p className="text-center text-slate-500 py-3 italic">
                    Semester 1 courses typically have no prerequisites.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & STAGE */}
          {step === 4 && (
            <div className="space-y-3.5 bg-[#0b1119] p-4 rounded-lg border border-slate-800">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-base font-bold text-amber-300">{code}</span>
                  <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                    Semester {semester} • {category.replace('_', ' ')} • {credits} Credits ({theoryCredits}+{practicalCredits})
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Ready to stage
                </span>
              </div>

              <div>
                <span className="font-semibold text-slate-300 block mb-1 text-[11px]">Prerequisites:</span>
                {selectedPrereqs.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPrereqs.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded bg-[#162231] border border-slate-700 font-mono text-amber-300 text-[11px]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-500 italic text-[11px]">None</span>
                )}
              </div>

              {textbook && (
                <div>
                  <span className="font-semibold text-slate-300 block text-[11px]">Textbook:</span>
                  <p className="text-slate-300 text-[11px]">{textbook}</p>
                </div>
              )}

              <div className="p-2.5 rounded bg-amber-950/20 border border-amber-600/30 text-[11px] text-amber-200">
                <strong>Golden Rule #1:</strong> This action will stage an insertion item into your active working change set. Live student views will not change until this change set is approved and published.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                onClick={() => {
                  if (step === 1) handleNextFromStep1();
                  else setStep((s) => (s + 1) as any);
                }}
                className="px-4 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-medium text-xs transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleConfirmAndStage}
                className="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors"
              >
                Confirm &amp; Stage Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
