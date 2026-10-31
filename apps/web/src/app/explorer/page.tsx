'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
  useNodesState,
  useEdgesState,
  MarkerType,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Badge,
  Button,
  Modal,
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';
import { useEditMode } from '../../context/EditModeContext';
import { CourseEditDrawer, CourseData } from '../../components/edit-mode/CourseEditDrawer';
import { AddCourseWizard } from '../../components/edit-mode/AddCourseWizard';

// ─── Default Fallback Curriculum (Detailed Syllabi BE CS 2018 Onwards) ────────

const DEFAULT_CURRICULUM_COURSES: CourseData[] = [
  // Semester 1 (Fall)
  { code: 'CS-114', title: 'Fundamentals of Computer Engineering', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 1, category: 'core_computing', prereqs: [] },
  { code: 'CS-115', title: 'Computer Programming', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 1, category: 'core_computing', prereqs: [] },
  { code: 'EE-120', title: 'Basic Electrical Engineering', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 1, category: 'core_computing', prereqs: [] },
  { code: 'MT-114', title: 'Calculus', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 1, category: 'mathematics', prereqs: [] },
  { code: 'HS-111', title: 'Functional English', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 1, category: 'humanities', prereqs: [] },
  { code: 'HS-106', title: 'Pakistan Studies', credits: 1, theoryCredits: 1, practicalCredits: 0, semester: 1, category: 'humanities', prereqs: [] },

  // Semester 2 (Spring)
  { code: 'CS-116', title: 'Object Oriented Programming', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 2, category: 'core_computing', prereqs: ['CS-115'] },
  { code: 'CS-117', title: 'Discrete Structures', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 2, category: 'core_computing', prereqs: [] },
  { code: 'PH-122', title: 'Applied Physics', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 2, category: 'science', prereqs: [] },
  { code: 'EL-103', title: 'Basic Electronics', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 2, category: 'core_computing', prereqs: [] },
  { code: 'HS-205', title: 'Islamic Studies', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 2, category: 'humanities', prereqs: [] },

  // Semester 3 (Fall)
  { code: 'CS-218', title: 'Data Structures & Algorithms', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 3, category: 'core_computing', prereqs: ['CS-116'] },
  { code: 'CS-220', title: 'Digital Logic Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 3, category: 'core_computing', prereqs: ['EE-120'] },
  { code: 'CS-219', title: 'Computer Engineering Workshop', credits: 1, theoryCredits: 0, practicalCredits: 1, semester: 3, category: 'core_computing', prereqs: [] },
  { code: 'MT-224', title: 'Complex Variables & Fourier Analysis', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 3, category: 'mathematics', prereqs: ['MT-114'] },
  { code: 'EE-217', title: 'Circuit Theory', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 3, category: 'core_computing', prereqs: ['EE-120'] },
  { code: 'HS-218', title: 'Business Communication', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 3, category: 'humanities', prereqs: ['HS-111'] },

  // Semester 4 (Spring)
  { code: 'CS-221', title: 'Computer Organization & Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 4, category: 'core_computing', prereqs: ['CS-220'] },
  { code: 'CS-215', title: 'Signals and Systems', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 4, category: 'core_computing', prereqs: ['EE-120'] },
  { code: 'CS-222', title: 'Database Management Systems', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 4, category: 'core_computing', prereqs: ['CS-218'] },
  { code: 'MT-222', title: 'Linear Algebra & ODEs', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 4, category: 'mathematics', prereqs: ['MT-114'] },
  { code: 'HS-219', title: 'Professional Ethics', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 4, category: 'humanities', prereqs: [] },

  // Semester 5 (Fall)
  { code: 'CS-328', title: 'Computer Architecture', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 5, category: 'core_computing', prereqs: ['CS-221'] },
  { code: 'CS-326', title: 'Software Engineering', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 5, category: 'core_computing', prereqs: ['CS-218'] },
  { code: 'CS-327', title: 'Computer Communication Networks', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 5, category: 'core_computing', prereqs: ['CS-114'] },
  { code: 'CS-323', title: 'Artificial Intelligence', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 5, category: 'core_computing', prereqs: ['CS-218'] },
  { code: 'MT-335', title: 'Probability & Statistics', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 5, category: 'mathematics', prereqs: ['MT-114'] },

  // Semester 6 (Spring)
  { code: 'CS-301', title: 'Microprocessor System Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 6, category: 'core_computing', prereqs: ['CS-221'] },
  { code: 'CS-329', title: 'Operating Systems', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 6, category: 'core_computing', prereqs: ['CS-218'] },
  { code: 'MT-442', title: 'Numerical Methods', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 6, category: 'mathematics', prereqs: ['MT-224'] },
  { code: 'EF-305', title: 'Engineering Economics & Management', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 6, category: 'humanities', prereqs: [] },
  { code: 'CS-324', title: 'Machine Learning (Elective-I)', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 6, category: 'elective', isElective: true, prereqs: ['CS-323'] },

  // Semester 7 (Fall)
  { code: 'CS-419', title: 'Digital Signal Processing', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 7, category: 'core_computing', prereqs: ['CS-215'] },
  { code: 'CS-431', title: 'Digital System Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 7, category: 'core_computing', prereqs: ['CS-220'] },
  { code: 'CS-425', title: 'Entrepreneurship for Engineers', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 7, category: 'humanities', prereqs: [] },
  { code: 'CS-433', title: 'Internet Computing (Elective-II)', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 7, category: 'elective', isElective: true, prereqs: ['CS-327'] },
  { code: 'CS-406', title: 'Computer Engineering Project', credits: 6, theoryCredits: 0, practicalCredits: 6, semester: 7, category: 'fyp', prereqs: ['CS-218', 'CS-222', 'CS-326'] },

  // Semester 8 (Spring)
  { code: 'CS-438', title: 'Computer System Modelling', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 8, category: 'core_computing', prereqs: ['MT-335'] },
  { code: 'CS-432', title: 'Distributed Computing', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 8, category: 'core_computing', prereqs: ['CS-329'] },
  { code: 'MG-482', title: 'Organizational Behaviour', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 8, category: 'humanities', prereqs: [] },
  { code: 'CS-426', title: 'Computer Security (Elective-III)', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 8, category: 'elective', isElective: true, prereqs: ['CS-327'] },
];

const CRITICAL_PATH_CODES = ['CS-115', 'CS-116', 'CS-218', 'CS-222', 'CS-406'];

const CATEGORY_STYLES = {
  core_computing: 'border-indigo-500/50 bg-indigo-950/40 text-indigo-200',
  mathematics: 'border-purple-500/50 bg-purple-950/40 text-purple-200',
  science: 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200',
  humanities: 'border-slate-600/50 bg-slate-900/60 text-slate-300',
  fyp: 'border-rose-500/70 bg-rose-950/50 text-rose-200',
  elective: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200',
};

type NodeStatus = 'completed' | 'in_progress' | 'unlocked' | 'locked' | 'simulated_failed' | 'blocked_cascade';

interface CustomNodeData extends CourseData {
  status: NodeStatus;
  isCriticalPath: boolean;
  isEditModeActive: boolean;
  onSelectCourse: (course: CourseData) => void;
}

// ─── Custom Course Node Component ─────────────────────────────────────────────

function CourseNodeCard({ data }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;

  const statusBadge = () => {
    switch (nodeData.status) {
      case 'completed':
        return <Badge variant="success" className="text-[9px] px-1.5 py-0">✓ Passed</Badge>;
      case 'in_progress':
        return <Badge variant="info" className="text-[9px] px-1.5 py-0 animate-pulse">In Progress</Badge>;
      case 'simulated_failed':
        return <Badge variant="danger" className="text-[9px] px-1.5 py-0 animate-bounce">⚠️ Failed</Badge>;
      case 'blocked_cascade':
        return <Badge variant="danger" className="text-[9px] px-1.5 py-0">🚫 Blocked</Badge>;
      case 'unlocked':
        return <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-blue-900/60 text-blue-300 border-blue-700/50">Unlocked</Badge>;
      case 'locked':
      default:
        return <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-slate-400 border-slate-700">Locked</Badge>;
    }
  };

  const isFailed = nodeData.status === 'simulated_failed';
  const isBlocked = nodeData.status === 'blocked_cascade';

  return (
    <div
      onClick={() => nodeData.onSelectCourse(nodeData)}
      className={`relative w-64 rounded-xl border p-3.5 shadow-lg backdrop-blur cursor-pointer transition-all hover:scale-105 select-none ${
        isFailed
          ? 'border-rose-500 bg-rose-950/80 ring-2 ring-rose-500 shadow-rose-950/50'
          : isBlocked
          ? 'border-amber-500/80 bg-amber-950/50 ring-1 ring-amber-500/50'
          : nodeData.isCriticalPath
          ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/40 shadow-amber-900/20'
          : CATEGORY_STYLES[nodeData.category]
      } ${nodeData.isEditModeActive ? 'ring-1 ring-amber-400/40 hover:ring-amber-300' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-amber-400 !border-slate-900" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
          {nodeData.code}
          {nodeData.isEditModeActive && <span className="text-[9px] text-amber-300">✎</span>}
        </span>
        {statusBadge()}
      </div>

      {/* Title */}
      <h4 className="text-xs font-medium text-slate-100 line-clamp-2 leading-snug mb-2">
        {nodeData.title}
      </h4>

      {/* Footer Details */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
        <span className="capitalize">{nodeData.category.replace('_', ' ')}</span>
        <span className="font-mono text-slate-300 font-semibold">{nodeData.credits} Cr ({nodeData.theoryCredits}+{nodeData.practicalCredits})</span>
      </div>

      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-amber-400 !border-slate-900" />
    </div>
  );
}

const nodeTypes = { courseNode: CourseNodeCard };

// ─── Live DAG Validation Engine (Pure Function) ───────────────────────────────

interface DAGValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cycleCourseCodes: string[];
}

function validateCurriculumGraphLocally(courses: CourseData[]): DAGValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const courseMap = new Map<string, CourseData>();
  const semesterCredits = new Map<number, number>();

  for (const c of courses) {
    courseMap.set(c.code, c);
    semesterCredits.set(c.semester, (semesterCredits.get(c.semester) || 0) + c.credits);
  }

  // 1. Credit limits (max 21 per semester)
  for (const [sem, totalCr] of semesterCredits.entries()) {
    if (totalCr > 21) {
      errors.push(`Semester ${sem} has ${totalCr} credit hours, exceeding the maximum limit of 21.`);
    }
  }

  // 2. Backward prerequisite check
  for (const c of courses) {
    for (const pCode of c.prereqs) {
      const prereqCourse = courseMap.get(pCode);
      if (prereqCourse) {
        if (c.semester <= prereqCourse.semester) {
          errors.push(
            `Backward prerequisite: ${c.code} (Semester ${c.semester}) requires ${prereqCourse.code} (Semester ${prereqCourse.semester}). Prerequisites must be taken in an earlier semester.`
          );
        }
      } else {
        warnings.push(`Prerequisite ${pCode} required by ${c.code} is not currently in the curriculum.`);
      }
    }
  }

  // 3. DFS Cycle Detection
  const adj = new Map<string, string[]>();
  for (const c of courses) {
    adj.set(c.code, []);
  }
  for (const c of courses) {
    for (const p of c.prereqs) {
      if (adj.has(p)) {
        adj.get(p)!.push(c.code);
      }
    }
  }

  const visited = new Map<string, number>(); // 0=unvisited, 1=visiting, 2=visited
  const cycleNodes: string[] = [];
  let foundCycle = false;

  function dfs(node: string, path: string[]) {
    visited.set(node, 1);
    path.push(node);

    for (const next of adj.get(node) || []) {
      const state = visited.get(next) || 0;
      if (state === 1) {
        foundCycle = true;
        const cycleStartIndex = path.indexOf(next);
        const subPath = path.slice(cycleStartIndex).concat(next);
        errors.push(`Circular prerequisite dependency detected: ${subPath.join(' → ')}`);
        subPath.forEach((cn) => cycleNodes.push(cn));
      } else if (state === 0) {
        dfs(next, path);
      }
    }

    path.pop();
    visited.set(node, 2);
  }

  for (const c of courses) {
    if (!visited.has(c.code)) {
      dfs(c.code, []);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cycleCourseCodes: Array.from(new Set(cycleNodes)),
  };
}

// ─── Main Explorer Page ───────────────────────────────────────────────────────

export default function ExplorerPage() {
  const { isEditMode, viewAsStudent, can, pendingItems, saveDraftItem } = useEditMode();

  // Base courses fetched from API or fallback
  const [baseCourses, setBaseCourses] = useState<CourseData[]>(DEFAULT_CURRICULUM_COURSES);
  const [selectedBatch, setSelectedBatch] = useState<string>('2022');

  // Student academic state
  const [completedSet, setCompletedSet] = useState<Set<string>>(
    new Set(['CS-114', 'CS-115', 'EE-120', 'MT-114', 'HS-111', 'HS-106'])
  );
  const [inProgressSet, setInProgressSet] = useState<Set<string>>(
    new Set(['CS-116', 'CS-117', 'PH-122', 'EL-103', 'HS-205'])
  );
  const [simulatedFailedSet, setSimulatedFailedSet] = useState<Set<string>>(new Set());
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [showCriticalPath, setShowCriticalPath] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers
  const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseData | null>(null);
  const [selectedCourseForDrawer, setSelectedCourseForDrawer] = useState<CourseData | null>(null);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);

  // Line drawing confirmation state
  const [pendingConnect, setPendingConnect] = useState<{ source: string; target: string } | null>(null);

  const canEdit = isEditMode && !viewAsStudent && can('curriculum', 'edit');

  // Fetch live curriculum from API
  useEffect(() => {
    async function loadCurriculum() {
      try {
        const res = await fetch(`/api/v1/curriculum?batch=${selectedBatch}&program=CSE`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.courses && Array.isArray(json.data.courses) && json.data.courses.length > 0) {
            setBaseCourses(json.data.courses);
          }
        }
      } catch {
        // Fallback to default courses already set
      }
    }
    loadCurriculum();
  }, [selectedBatch]);

  // Compute active courses with draft overlays applied
  const activeCourses = useMemo(() => {
    // Clone base courses
    let courses: CourseData[] = baseCourses.map((c) => ({
      ...c,
      prereqs: [...c.prereqs],
      syllabus: c.syllabus ? { ...c.syllabus } : undefined,
    }));

    if (isEditMode && !viewAsStudent) {
      for (const item of pendingItems) {
        if (item.table_name === 'curriculum_courses' && item.record_id) {
          if (item.op === 'update' && item.after) {
            const idx = courses.findIndex((c) => c.code === item.record_id);
            if (idx !== -1) {
              courses[idx] = { ...courses[idx], ...item.after };
            }
          } else if (item.op === 'insert' && item.after) {
            const exists = courses.some((c) => c.code === item.record_id);
            if (!exists) {
              const p = item.after;
              courses.push({
                code: item.record_id,
                title: p.title || item.record_id,
                credits: Number(p.credits) || 3,
                theoryCredits: Number(p.credits_theory) || 3,
                practicalCredits: Number(p.credits_practical) || 0,
                semester: Number(p.semester) || 1,
                category: p.category || 'core_computing',
                prereqs: Array.isArray(p.prerequisites) ? p.prerequisites : [],
                description: p.description,
                syllabus: p.syllabus,
              });
            }
          }
        } else if (item.table_name === 'course_prerequisites' && item.record_id) {
          const [sourceCode, targetCode] = item.record_id.split('->');
          const targetCourse = courses.find((c) => c.code === targetCode);
          if (targetCourse) {
            if (item.op === 'insert' && !targetCourse.prereqs.includes(sourceCode)) {
              targetCourse.prereqs.push(sourceCode);
            } else if (item.op === 'delete') {
              targetCourse.prereqs = targetCourse.prereqs.filter((p) => p !== sourceCode);
            }
          }
        }
      }
    }

    return courses;
  }, [baseCourses, isEditMode, viewAsStudent, pendingItems]);

  // Live DAG validation
  const validationReport = useMemo(() => {
    return validateCurriculumGraphLocally(activeCourses);
  }, [activeCourses]);

  // ─── Cascade Calculation for Failed Courses (Rule #8 in-memory) ────────────
  const { cascadeBlockedSet, delayedCredits, estimatedDelaySemesters } = useMemo(() => {
    if (simulatedFailedSet.size === 0) {
      return { cascadeBlockedSet: new Set<string>(), delayedCredits: 0, estimatedDelaySemesters: 0 };
    }

    const dependentsMap = new Map<string, string[]>();
    for (const c of activeCourses) {
      dependentsMap.set(c.code, []);
    }
    for (const c of activeCourses) {
      for (const p of c.prereqs) {
        if (dependentsMap.has(p)) {
          dependentsMap.get(p)!.push(c.code);
        }
      }
    }

    const blocked = new Set<string>();
    const queue = Array.from(simulatedFailedSet);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const downstreams = dependentsMap.get(current) || [];
      for (const d of downstreams) {
        if (!blocked.has(d) && !simulatedFailedSet.has(d)) {
          blocked.add(d);
          queue.push(d);
        }
      }
    }

    const totalDelayed = Array.from(blocked).reduce((acc, code) => {
      const course = activeCourses.find((c) => c.code === code);
      return acc + (course?.credits || 0);
    }, 0);

    const reachesFYP = blocked.has('CS-406');
    const delaySems = reachesFYP ? (blocked.size >= 5 ? 2 : 1) : blocked.size > 0 ? 1 : 0;

    return { cascadeBlockedSet: blocked, delayedCredits: totalDelayed, estimatedDelaySemesters: delaySems };
  }, [simulatedFailedSet, activeCourses]);

  // ─── Node Status Resolver ──────────────────────────────────────────────────
  const getNodeStatus = useCallback(
    (code: string, prereqs: string[]): NodeStatus => {
      if (simulatedFailedSet.has(code)) return 'simulated_failed';
      if (cascadeBlockedSet.has(code)) return 'blocked_cascade';
      if (completedSet.has(code)) return 'completed';
      if (inProgressSet.has(code)) return 'in_progress';

      const allPrereqsMet = prereqs.every((p) => completedSet.has(p) && !simulatedFailedSet.has(p));
      return allPrereqsMet ? 'unlocked' : 'locked';
    },
    [completedSet, inProgressSet, simulatedFailedSet, cascadeBlockedSet]
  );

  // ─── Build Graph Nodes ──────────────────────────────────────────────────────
  const initialNodes: Node[] = useMemo(() => {
    const semesterCounters: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

    return activeCourses.map((course) => {
      const rowIndex = semesterCounters[course.semester] || 0;
      semesterCounters[course.semester] = rowIndex + 1;
      const x = (course.semester - 1) * 320 + 40;
      const y = rowIndex * 135 + 80;

      const isCrit = showCriticalPath && CRITICAL_PATH_CODES.includes(course.code);

      return {
        id: course.code,
        type: 'courseNode',
        position: { x, y },
        draggable: canEdit,
        data: {
          ...course,
          status: getNodeStatus(course.code, course.prereqs),
          isCriticalPath: isCrit,
          isEditModeActive: canEdit,
          onSelectCourse: (c: CourseData) => {
            if (canEdit) {
              setSelectedCourseForDrawer(c);
            } else if (isSimulationMode) {
              setSimulatedFailedSet((prev) => {
                const next = new Set(prev);
                if (next.has(c.code)) next.delete(c.code);
                else next.add(c.code);
                return next;
              });
            } else {
              setSelectedCourseForModal(c);
            }
          },
        },
      };
    });
  }, [activeCourses, getNodeStatus, showCriticalPath, canEdit, isSimulationMode]);

  // ─── Build Graph Edges ──────────────────────────────────────────────────────
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    for (const course of activeCourses) {
      for (const prereq of course.prereqs) {
        const isCritEdge =
          showCriticalPath &&
          CRITICAL_PATH_CODES.includes(prereq) &&
          CRITICAL_PATH_CODES.includes(course.code);

        const isBlockedEdge =
          simulatedFailedSet.has(prereq) ||
          (cascadeBlockedSet.has(prereq) && cascadeBlockedSet.has(course.code));

        const isCycleEdge =
          validationReport.cycleCourseCodes.includes(prereq) &&
          validationReport.cycleCourseCodes.includes(course.code);

        edges.push({
          id: `e-${prereq}-${course.code}`,
          source: prereq,
          target: course.code,
          animated: isCritEdge || isBlockedEdge || isCycleEdge,
          style: {
            stroke: isCycleEdge ? '#ef4444' : isBlockedEdge ? '#f43f5e' : isCritEdge ? '#f59e0b' : '#475569',
            strokeWidth: isCycleEdge ? 3 : isBlockedEdge ? 2.5 : isCritEdge ? 2.5 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isCycleEdge ? '#ef4444' : isBlockedEdge ? '#f43f5e' : isCritEdge ? '#f59e0b' : '#64748b',
            width: 15,
            height: 15,
          },
        });
      }
    }

    return edges;
  }, [activeCourses, showCriticalPath, simulatedFailedSet, cascadeBlockedSet, validationReport.cycleCourseCodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync react-flow state whenever initial nodes/edges change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // ─── Handle Node Drag Stop (Semester Reassignment) ─────────────────────────
  const handleNodeDragStop = useCallback(
    (_event: any, node: Node) => {
      if (!canEdit) return;

      const course = activeCourses.find((c) => c.code === node.id);
      if (!course) return;

      // Calculate target semester from X coordinate (each column is 320px wide, starting at x=40)
      const targetSemester = Math.max(1, Math.min(8, Math.floor((node.position.x - 40 + 160) / 320) + 1));

      if (targetSemester !== course.semester) {
        saveDraftItem(
          'curriculum',
          'curriculum_courses',
          course.code,
          { semester: targetSemester },
          'update',
          `Move ${course.code} from Semester ${course.semester} to Semester ${targetSemester}`
        );

        // Update local base course state immediately
        setBaseCourses((prev) =>
          prev.map((c) => (c.code === course.code ? { ...c, semester: targetSemester } : c))
        );
      }
    },
    [canEdit, activeCourses, saveDraftItem]
  );

  // ─── Handle Line Drawing (onConnect) ──────────────────────────────────────
  const handleConnect = useCallback(
    (params: Connection) => {
      if (!canEdit || !params.source || !params.target) return;
      if (params.source === params.target) return;

      const targetCourse = activeCourses.find((c) => c.code === params.target);
      if (targetCourse?.prereqs.includes(params.source)) {
        return; // Already a prereq
      }

      setPendingConnect({
        source: params.source,
        target: params.target,
      });
    },
    [canEdit, activeCourses]
  );

  const confirmPendingConnect = () => {
    if (!pendingConnect || !canEdit) return;
    const { source, target } = pendingConnect;

    saveDraftItem(
      'curriculum',
      'course_prerequisites',
      `${source}->${target}`,
      { course_code: target, prerequisite_code: source },
      'insert',
      `Add prerequisite: ${source} for ${target}`
    );

    setBaseCourses((prev) =>
      prev.map((c) => (c.code === target ? { ...c, prereqs: [...c.prereqs, source] } : c))
    );

    setPendingConnect(null);
  };

  // ─── Importance Score Calculator (Rule #7) ──────────────────────────────────
  const selectedCourseImportance = useMemo(() => {
    if (!selectedCourseForModal) return null;

    const code = selectedCourseForModal.code;
    const directUnlocks = activeCourses.filter((c) => c.prereqs.includes(code)).length;

    // Transitive reach
    const reachSet = new Set<string>();
    const queue = activeCourses.filter((c) => c.prereqs.includes(code)).map((c) => c.code);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (!reachSet.has(cur)) {
        reachSet.add(cur);
        activeCourses.filter((c) => c.prereqs.includes(cur)).forEach((d) => queue.push(d.code));
      }
    }

    const directScore = Math.min(1.0, directUnlocks / 4) * 40;
    const reachScore = Math.min(1.0, reachSet.size / 12) * 25;
    const creditScore = Math.min(1.0, selectedCourseForModal.credits / 4) * 20;
    const earlinessScore = Math.max(0, (9 - selectedCourseForModal.semester) / 8) * 15;

    const total = Math.min(100, Math.round(directScore + reachScore + creditScore + earlinessScore));

    return {
      total,
      breakdown: {
        directUnlocks: Math.round(directScore),
        downstreamReach: Math.round(reachScore),
        creditWeight: Math.round(creditScore),
        earlinessWeight: Math.round(earlinessScore),
      },
      unlockedCourses: Array.from(reachSet),
    };
  }, [selectedCourseForModal, activeCourses]);

  return (
    <div className="h-screen w-screen bg-[#0b1119] text-slate-100 flex flex-col overflow-hidden">
      {/* Standardized Page Header */}
      <PageHeader
        title="Prerequisite DAG Explorer"
        breadcrumbs={[{ label: 'Prerequisite Explorer' }]}
        badge={`Batch ${selectedBatch} Onwards`}
        description="Directed acyclic graph of NED CISE degree requirements, critical paths, and failure cascades."
        accent="var(--cyan)"
        actions={
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            {/* Batch Selector */}
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-[#0f1823] border border-[rgba(213,228,236,0.15)] rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#9bcbd0]"
            >
              <option value="2022">Batch 2022</option>
              <option value="2023">Batch 2023</option>
              <option value="2024">Batch 2024</option>
              <option value="2025">Batch 2025</option>
              <option value="2026">Batch 2026</option>
            </select>

            {/* Search Box */}
            <input
              type="text"
              placeholder="Search code/title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0f1823] border border-[rgba(213,228,236,0.15)] rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#9bcbd0] w-32 sm:w-40"
            />

            {/* Critical Path Toggle */}
            <button
              onClick={() => setShowCriticalPath(!showCriticalPath)}
              className={`button ${showCriticalPath ? 'button-primary' : 'button-secondary'}`}
              style={showCriticalPath ? { background: 'var(--amber)', color: '#0b1119' } : {}}
            >
              ⭐ Critical Path
            </button>

            {/* Simulation Mode Toggle (Rule #8) */}
            <button
              onClick={() => {
                setIsSimulationMode(!isSimulationMode);
                if (isSimulationMode) setSimulatedFailedSet(new Set());
              }}
              className={`button ${isSimulationMode ? 'button-primary' : 'button-secondary'}`}
              style={isSimulationMode ? { background: 'var(--coral)', color: '#fff' } : {}}
            >
              <span>⚠️</span>
              <span>{isSimulationMode ? 'Exit Simulation' : 'What-If Failure Sim'}</span>
            </button>

            {/* Add Course Button (Edit Mode Only) */}
            {canEdit && (
              <button
                onClick={() => setIsAddCourseOpen(true)}
                className="px-3 py-1 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-medium text-xs transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>+ Add Course</span>
              </button>
            )}
          </div>
        }
      />

      {/* Advisory Banner (Rule #13) */}
      <div className="bg-amber-950/20 border-b border-amber-500/20 px-4 py-1.5 text-[11px] text-amber-200/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span>ℹ️</span>
          <span>
            <strong>Advisory Notice:</strong> Prerequisite mappings &amp; failure simulations are guidance estimates, not official university decisions.
          </span>
        </div>
        <Link href="/terms" className="underline hover:text-amber-100 ml-2 whitespace-nowrap">
          Terms
        </Link>
      </div>

      {/* Live DAG Validation Error Banner */}
      {!validationReport.isValid && (
        <div className="bg-rose-950/90 border-b border-rose-500 px-4 py-2 text-xs flex items-center justify-between z-20 shrink-0 text-rose-100 animate-in fade-in">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-base">⚠️</span>
            <div>
              <strong className="font-semibold text-rose-200">Validation Issue:</strong>{' '}
              <span>{validationReport.errors[0]}</span>
              {validationReport.errors.length > 1 && (
                <span className="text-rose-300 ml-1.5">
                  (+{validationReport.errors.length - 1} more issues)
                </span>
              )}
              <span className="text-rose-300/80 text-[11px] block">
                Changes cannot be published until all cycles and backward prerequisites are resolved.
              </span>
            </div>
          </div>
          <Badge variant="danger" className="text-[10px] tracking-wider uppercase shrink-0">
            Invalid Graph
          </Badge>
        </div>
      )}

      {/* Simulation Active Float Banner (Rule #7 & #8) */}
      {isSimulationMode && (
        <div className="bg-rose-950/80 border-b border-rose-500/40 px-4 py-2 text-xs flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Badge variant="danger" className="text-[10px] tracking-wider uppercase">
              Simulation (In-Memory Estimate)
            </Badge>
            <span className="text-slate-300">
              Click any course to simulate failure &amp; visualize cascading blocks.
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-200">
            <div>
              Failed: <strong className="text-rose-400 font-mono">{simulatedFailedSet.size}</strong>
            </div>
            <div>
              Cascading Blocked: <strong className="text-amber-400 font-mono">{cascadeBlockedSet.size}</strong>
            </div>
            <div>
              Delayed Credits: <strong className="text-amber-300 font-mono">{delayedCredits} Cr</strong>
            </div>
            <div>
              Graduation Impact: <strong className="text-rose-300 font-mono">+{estimatedDelaySemesters} semester(s)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Semester Header Columns Guide */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-1.5 flex items-center gap-4 text-[11px] text-slate-400 font-mono overflow-x-auto shrink-0 select-none">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <div key={s} className="w-[305px] shrink-0 text-center border-r border-slate-800/80 last:border-0 font-semibold text-slate-300">
            Semester {s} {s % 2 === 1 ? '(Fall)' : '(Spring)'}
          </div>
        ))}
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 w-full h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.5}
          className="bg-slate-950"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300 fill-slate-300 [&>button]:!border-slate-800" />
          <MiniMap
            className="!bg-slate-900 !border-slate-800 rounded-lg overflow-hidden"
            nodeColor={(n) => {
              const data = n.data as unknown as CustomNodeData;
              if (data.status === 'simulated_failed') return '#f43f5e';
              if (data.status === 'blocked_cascade') return '#f59e0b';
              if (data.status === 'completed') return '#10b981';
              return '#3b82f6';
            }}
          />
        </ReactFlow>
      </div>

      {/* Prerequisite Line Drawing Confirmation Popover Modal */}
      {pendingConnect && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-md bg-[#0f1823] border border-amber-500/40 rounded-xl p-5 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-amber-300">Add Prerequisite Rule</h3>
            <p className="text-slate-200 leading-relaxed">
              Are you sure you want to require{' '}
              <strong className="font-mono text-amber-400">{pendingConnect.source}</strong> as a prerequisite for{' '}
              <strong className="font-mono text-amber-400">{pendingConnect.target}</strong>?
            </p>
            <p className="text-[11px] text-slate-400">
              Students will be required to pass {pendingConnect.source} before enrolling in {pendingConnect.target}.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPendingConnect(null)}
                className="px-3.5 py-1.5 rounded text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmPendingConnect}
                className="px-4 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-semibold shadow-sm transition-colors"
              >
                Confirm &amp; Add Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-Tab Course Edit Drawer (Edit Mode) */}
      <CourseEditDrawer
        course={selectedCourseForDrawer}
        allCourses={activeCourses}
        isOpen={!!selectedCourseForDrawer}
        onClose={() => setSelectedCourseForDrawer(null)}
        onUpdateCourse={(updated) => {
          setBaseCourses((prev) =>
            prev.map((c) => (c.code === updated.code ? updated : c))
          );
          setSelectedCourseForDrawer(updated);
        }}
        onSelectCourseByCode={(code) => {
          const target = activeCourses.find((c) => c.code === code);
          if (target) setSelectedCourseForDrawer(target);
        }}
      />

      {/* + Add Course 4-Step Wizard */}
      <AddCourseWizard
        isOpen={isAddCourseOpen}
        onClose={() => setIsAddCourseOpen(false)}
        allCourses={activeCourses}
        onCourseAdded={(newCourse) => {
          setBaseCourses((prev) => [...prev, newCourse]);
        }}
      />

      {/* Student View Course Modal */}
      {selectedCourseForModal && (
        <Modal
          isOpen={!!selectedCourseForModal}
          onClose={() => setSelectedCourseForModal(null)}
          title={`${selectedCourseForModal.code}: ${selectedCourseForModal.title}`}
          description={`Semester ${selectedCourseForModal.semester} • ${selectedCourseForModal.credits} Credit Hours (${selectedCourseForModal.theoryCredits} Theory + ${selectedCourseForModal.practicalCredits} Practical)`}
        >
          <div className="space-y-4 text-xs">
            {/* Category and Status Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Category:</span>
              <span className="capitalize font-semibold text-slate-200">
                {selectedCourseForModal.category.replace('_', ' ')}
              </span>
            </div>

            {/* Importance Score (Rule #7 — Labelled estimate with breakdown) */}
            {selectedCourseImportance && (
              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span>⚡ Course Importance Rating:</span>
                    <Badge variant="outline" className="text-[9px] text-indigo-300 border-indigo-500/40">
                      Estimate (Rule #7)
                    </Badge>
                  </span>
                  <span className="text-base font-bold font-mono text-indigo-300">
                    {selectedCourseImportance.total} / 100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-indigo-900/40 text-slate-400">
                  <div>Direct Unlocks (40%): <strong className="text-slate-200 font-mono">+{selectedCourseImportance.breakdown.directUnlocks}</strong></div>
                  <div>Downstream Reach (25%): <strong className="text-slate-200 font-mono">+{selectedCourseImportance.breakdown.downstreamReach}</strong></div>
                  <div>Credit Weight (20%): <strong className="text-slate-200 font-mono">+{selectedCourseImportance.breakdown.creditWeight}</strong></div>
                  <div>Earliness Leverage (15%): <strong className="text-slate-200 font-mono">+{selectedCourseImportance.breakdown.earlinessWeight}</strong></div>
                </div>
              </div>
            )}

            {/* Direct Prerequisites */}
            <div>
              <span className="font-semibold text-slate-300 block mb-1">Direct Prerequisites:</span>
              {selectedCourseForModal.prereqs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCourseForModal.prereqs.map((p) => (
                    <Badge
                      key={p}
                      variant={completedSet.has(p) ? 'success' : 'danger'}
                      className="text-xs"
                    >
                      {completedSet.has(p) ? '✓ ' : '✕ '} {p}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 italic">None (Entry-level course)</span>
              )}
            </div>

            {/* Courses Unlocked */}
            <div>
              <span className="font-semibold text-slate-300 block mb-1">Downstream Unlocks:</span>
              {selectedCourseImportance && selectedCourseImportance.unlockedCourses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCourseImportance.unlockedCourses.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs text-slate-300 border-slate-700">
                      {c}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500 italic">None (Terminal course)</span>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <Button
                variant={completedSet.has(selectedCourseForModal.code) ? 'outline' : 'primary'}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setCompletedSet((prev) => {
                    const next = new Set(prev);
                    if (next.has(selectedCourseForModal.code)) next.delete(selectedCourseForModal.code);
                    else next.add(selectedCourseForModal.code);
                    return next;
                  });
                  setSelectedCourseForModal(null);
                }}
              >
                {completedSet.has(selectedCourseForModal.code) ? 'Mark as Not Passed' : 'Mark as Passed'}
              </Button>

              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setIsSimulationMode(true);
                  setSimulatedFailedSet(new Set([selectedCourseForModal.code]));
                  setSelectedCourseForModal(null);
                }}
              >
                Simulate Failure (Rule #8)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
