'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  calculateSemesterGPA,
  calculateWhatIfTarget,
  getAcademicStanding,
  parseTranscript,
  TranscriptParseResult,
  GRADE_POINTS,
  CourseGradeInput,
} from '@educompass/gpa';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Alert,
} from '@educompass/ui';

interface CourseRow {
  id: string;
  courseCode: string;
  credits: number;
  grade: string;
}

export default function GPACalculatorPage() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'whatif' | 'upload'>('calculator');

  // ── Transcript Parser State (Card E6) ──────────────────────────
  const [rawTranscriptText, setRawTranscriptText] = useState('');
  const [parsedTranscript, setParsedTranscript] = useState<TranscriptParseResult | null>(null);

  function handleParseTranscript() {
    if (!rawTranscriptText.trim()) return;
    const result = parseTranscript(rawTranscriptText);
    setParsedTranscript(result);
  }

  function handleImportToCalculator() {
    if (!parsedTranscript || parsedTranscript.courses.length === 0) return;
    const rows: CourseRow[] = parsedTranscript.courses.map((c) => ({
      id: Math.random().toString(36).substring(2, 9),
      courseCode: c.courseCode,
      credits: c.credits,
      grade: c.grade,
    }));
    setCourses(rows);
    setActiveTab('calculator');
  }

  // ── Semester GPA State ──────────────────────────────────────────
  const [courses, setCourses] = useState<CourseRow[]>([
    { id: '1', courseCode: 'CS-101', credits: 3, grade: 'A' },
    { id: '2', courseCode: 'MT-101', credits: 4, grade: 'B+' },
    { id: '3', courseCode: 'CS-105', credits: 3, grade: 'A-' },
    { id: '4', courseCode: 'HS-101', credits: 2, grade: 'B' },
  ]);

  function addCourseRow() {
    setCourses((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        courseCode: '',
        credits: 3,
        grade: 'A',
      },
    ]);
  }

  function removeCourseRow(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  function updateCourse(id: string, field: keyof CourseRow, value: any) {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  const semesterResult = useMemo(() => {
    const courseInputs: CourseGradeInput[] = courses.map((c) => ({
      courseCode: c.courseCode || 'Course',
      credits: Number(c.credits) || 0,
      grade: c.grade,
    }));
    return calculateSemesterGPA(courseInputs);
  }, [courses]);

  const standing = useMemo(() => {
    return getAcademicStanding(semesterResult.gpa);
  }, [semesterResult.gpa]);

  // ── What-If Target State ────────────────────────────────────────
  const [currentCGPA, setCurrentCGPA] = useState<number>(3.15);
  const [completedCredits, setCompletedCredits] = useState<number>(68);
  const [targetCGPA, setTargetCGPA] = useState<number>(3.5);
  const [remainingCredits, setRemainingCredits] = useState<number>(64);

  const whatIfResult = useMemo(() => {
    return calculateWhatIfTarget({
      currentCGPA: Number(currentCGPA) || 0,
      completedCredits: Number(completedCredits) || 0,
      targetCGPA: Number(targetCGPA) || 0,
      remainingCredits: Number(remainingCredits) || 0,
    });
  }, [currentCGPA, completedCredits, targetCGPA, remainingCredits]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                GPA Calculator &amp; What-If Planner
              </h1>
              <Badge variant="info">NED Official Scale</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Precision academic GPA engine &bull; 4.0 Scale &bull; Retake Policies
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              &larr; Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'calculator'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Semester GPA Calculator
          </button>
          <button
            onClick={() => setActiveTab('whatif')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'whatif'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            What-If Target Planner
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Paste / Import Transcript
          </button>
        </div>

        {/* TAB 1: Semester GPA Calculator */}
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Course Grade Entries</CardTitle>
                    <CardDescription>
                      Enter your semester course credit hours and awarded grades.
                    </CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" onClick={addCourseRow}>
                    + Add Course
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 px-2 pb-1 border-b border-slate-800">
                  <span className="col-span-5">Course Code / Title</span>
                  <span className="col-span-3 text-center">Credit Hours</span>
                  <span className="col-span-3 text-center">Letter Grade</span>
                  <span className="col-span-1 text-center"></span>
                </div>

                {courses.map((course, idx) => (
                  <div
                    key={course.id}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-900/40 p-2 rounded-lg border border-slate-800/80"
                  >
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder={`e.g. CS-${100 + idx}`}
                        value={course.courseCode}
                        onChange={(e) =>
                          updateCourse(course.id, 'courseCode', e.target.value)
                        }
                        className="w-full rounded bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <select
                        value={course.credits}
                        onChange={(e) =>
                          updateCourse(
                            course.id,
                            'credits',
                            Number(e.target.value)
                          )
                        }
                        className="w-full rounded bg-slate-950 border border-slate-800 px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-blue-500"
                      >
                        {[1, 2, 3, 4, 5, 6].map((cr) => (
                          <option key={cr} value={cr}>
                            {cr} {cr === 1 ? 'Credit' : 'Credits'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <select
                        value={course.grade}
                        onChange={(e) =>
                          updateCourse(course.id, 'grade', e.target.value)
                        }
                        className="w-full rounded bg-slate-950 border border-slate-800 px-2 py-1.5 text-xs text-white text-center font-mono font-medium focus:outline-none focus:border-blue-500"
                      >
                        {Object.entries(GRADE_POINTS).map(([letter, pts]) => (
                          <option key={letter} value={letter}>
                            {letter} ({(pts as number).toFixed(1)})
                          </option>
                        ))}
                        <option value="W">W (Withdrawn)</option>
                        <option value="I">I (Incomplete)</option>
                      </select>
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => removeCourseRow(course.id)}
                        disabled={courses.length <= 1}
                        aria-label="Remove course"
                        className="text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Result Display Box */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card variant="default" className="p-4 border-blue-500/30 bg-blue-950/20 text-center">
                <span className="text-xs text-slate-400 block mb-1">Semester GPA</span>
                <span className="text-3xl font-extrabold text-blue-400 font-mono">
                  {semesterResult.gpa.toFixed(2)}
                </span>
              </Card>

              <Card variant="default" className="p-4 border-slate-800 text-center">
                <span className="text-xs text-slate-400 block mb-1">Attempted Credits</span>
                <span className="text-2xl font-bold text-slate-200 font-mono">
                  {semesterResult.attemptedCredits}
                </span>
              </Card>

              <Card variant="default" className="p-4 border-slate-800 text-center">
                <span className="text-xs text-slate-400 block mb-1">Quality Points</span>
                <span className="text-2xl font-bold text-slate-200 font-mono">
                  {semesterResult.totalQualityPoints.toFixed(1)}
                </span>
              </Card>

              <Card variant="default" className="p-4 border-slate-800 flex flex-col items-center justify-center">
                <span className="text-xs text-slate-400 block mb-1">Standing</span>
                <Badge
                  variant={
                    standing.status === 'deans_honor_list'
                      ? 'success'
                      : standing.isOnProbation
                      ? 'danger'
                      : 'info'
                  }
                  size="md"
                >
                  {standing.label}
                </Badge>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: What-If Target Planner */}
        {activeTab === 'whatif' && (
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle>What-If Target CGPA Estimator</CardTitle>
                <CardDescription>
                  Determine the exact average GPA you must achieve across your upcoming semesters to reach your graduation honors goal.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Current CGPA"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    value={currentCGPA}
                    onChange={(e) => setCurrentCGPA(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    label="Completed Credit Hours"
                    type="number"
                    min="0"
                    max="140"
                    value={completedCredits}
                    onChange={(e) => setCompletedCredits(parseInt(e.target.value) || 0)}
                  />
                  <Input
                    label="Target Graduation CGPA"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.0"
                    value={targetCGPA}
                    onChange={(e) => setTargetCGPA(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    label="Remaining Credit Hours"
                    type="number"
                    min="1"
                    max="140"
                    value={remainingCredits}
                    onChange={(e) => setRemainingCredits(parseInt(e.target.value) || 0)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Target Results */}
            <div className="space-y-4">
              <Alert
                variant={whatIfResult.isFeasible ? 'info' : 'danger'}
                title={whatIfResult.isFeasible ? 'Plan Feasible' : 'Mathematical Limit Exceeded'}
              >
                {whatIfResult.message}
              </Alert>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card variant="default" className="p-5 border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Required Future GPA</span>
                  <span
                    className={`text-4xl font-extrabold font-mono ${
                      whatIfResult.isFeasible ? 'text-blue-400' : 'text-rose-400'
                    }`}
                  >
                    {whatIfResult.requiredGPA.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Average needed across remaining {remainingCredits} credits
                  </span>
                </Card>

                <Card variant="default" className="p-5 border-slate-800 text-center">
                  <span className="text-xs text-slate-400 block mb-1">Max Ceiling Possible</span>
                  <span className="text-4xl font-extrabold text-emerald-400 font-mono">
                    {whatIfResult.maxPossibleCGPA.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Achievable if you score straight 4.0s (A grades)
                  </span>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Paste / Import Transcript (Card E6) */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Import University Transcript (CSV / Text)</CardTitle>
                    <CardDescription>
                      Copy and paste your course list or grade report from the student portal.
                    </CardDescription>
                  </div>
                  <Badge variant="success" size="sm">
                    PII Redaction Active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-200 block">
                    Supported Formats:
                  </span>
                  <p>
                    Comma-separated (CSV), tab-separated (TSV), or copy-pasted text with columns:
                    <code className="text-blue-300 ml-1">
                      [Course Code, Title, Credit Hours, Grade]
                    </code>
                  </p>
                  <p className="text-[11px] text-amber-300/80">
                    &bull; Student names and roll numbers (e.g. CS-24040) are strictly stripped per Decision D6 and never stored.
                  </p>
                </div>

                <textarea
                  rows={8}
                  placeholder={`Example:\nCS-101, Introduction to Computing, 3, A\nMT-101, Calculus & Analytical Geometry, 4, B+\nCS-102, Object Oriented Programming, 4, A\nHS-101, Functional English, 2, B`}
                  value={rawTranscriptText}
                  onChange={(e) => setRawTranscriptText(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />

                <div className="flex items-center justify-between">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleParseTranscript}
                    disabled={!rawTranscriptText.trim()}
                  >
                    Parse Transcript
                  </Button>
                  {parsedTranscript && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleImportToCalculator}
                    >
                      Import into Calculator &rarr;
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Parsed Output Display */}
            {parsedTranscript && (
              <div className="space-y-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card variant="default" className="p-4 border-blue-500/30 bg-blue-950/20 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Cumulative CGPA</span>
                    <span className="text-3xl font-extrabold text-blue-400 font-mono">
                      {parsedTranscript.cgpa.toFixed(2)}
                    </span>
                  </Card>

                  <Card variant="default" className="p-4 border-slate-800 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Courses Parsed</span>
                    <span className="text-2xl font-bold text-slate-200 font-mono">
                      {parsedTranscript.courses.length}
                    </span>
                  </Card>

                  <Card variant="default" className="p-4 border-slate-800 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Earned Credits</span>
                    <span className="text-2xl font-bold text-emerald-400 font-mono">
                      {parsedTranscript.totalEarnedCredits} / {parsedTranscript.totalAttemptedCredits}
                    </span>
                  </Card>

                  <Card variant="default" className="p-4 border-slate-800 text-center">
                    <span className="text-xs text-slate-400 block mb-1">Purged PII Items</span>
                    <span className="text-2xl font-bold text-amber-400 font-mono">
                      {parsedTranscript.redactedPiiCount}
                    </span>
                  </Card>
                </div>

                {parsedTranscript.errors.length > 0 && (
                  <Alert variant="warning" title="Parser Warnings">
                    {parsedTranscript.errors.slice(0, 3).map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </Alert>
                )}

                {/* Parsed Courses Table */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Extracted Academic Records</CardTitle>
                    <CardDescription>
                      Review the parsed courses below. Click &quot;Import into Calculator&quot; to test adjustments.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Code</th>
                            <th className="py-2.5 px-3">Course Title</th>
                            <th className="py-2.5 px-3 text-center">Credits</th>
                            <th className="py-2.5 px-3 text-center">Grade</th>
                            <th className="py-2.5 px-3 text-center">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {parsedTranscript.courses.map((course, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="py-2 px-3 font-mono font-medium text-blue-400">
                                {course.courseCode}
                              </td>
                              <td className="py-2 px-3 text-slate-200">
                                {course.courseTitle}
                              </td>
                              <td className="py-2 px-3 text-center text-slate-300">
                                {course.credits}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-white">
                                {course.grade}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-400">
                                {course.points.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
