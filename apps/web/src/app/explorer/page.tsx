'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Badge,
  Button,
  Modal,
} from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourseData {
  code: string;
  title: string;
  credits: number;
  theoryCredits: number;
  practicalCredits: number;
  semester: number;
  category: 'core_computing' | 'mathematics' | 'science' | 'humanities' | 'fyp' | 'elective';
  prereqs: string[];
  isElective?: boolean;
}

type NodeStatus = 'completed' | 'in_progress' | 'unlocked' | 'locked' | 'simulated_failed' | 'blocked_cascade';

interface CustomNodeData extends CourseData {
  status: NodeStatus;
  isCriticalPath: boolean;
  onSelectCourse: (course: CourseData) => void;
}

// ─── Official Curriculum Definition (Detailed Syllabi BE CS 2018 Onwards) ─────

const CURRICULUM_COURSES: CourseData[] = [
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
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-blue-400 !border-slate-900" />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-xs font-bold tracking-tight text-white">{nodeData.code}</span>
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

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-blue-400 !border-slate-900" />
    </div>
  );
}

const nodeTypes = { courseNode: CourseNodeCard };

// ─── Main Explorer Page ───────────────────────────────────────────────────────

export default function ExplorerPage() {
  const [completedSet, setCompletedSet] = useState<Set<string>>(
    new Set(['CS-114', 'CS-115', 'EE-120', 'MT-114', 'HS-111', 'HS-106']) // Default: Passed 1st sem
  );
  const [inProgressSet, setInProgressSet] = useState<Set<string>>(new Set(['CS-116', 'CS-117', 'PH-122', 'EL-103', 'HS-205']));
  const [simulatedFailedSet, setSimulatedFailedSet] = useState<Set<string>>(new Set());
  const [isSimulationMode, setIsSimulationMode] = useState<boolean>(false);
  const [showCriticalPath, setShowCriticalPath] = useState<boolean>(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ─── Cascade Calculation for Failed Courses (Rule #8 in-memory) ────────────
  const { cascadeBlockedSet, delayedCredits, estimatedDelaySemesters } = useMemo(() => {
    if (simulatedFailedSet.size === 0) {
      return { cascadeBlockedSet: new Set<string>(), delayedCredits: 0, estimatedDelaySemesters: 0 };
    }

    const dependentsMap = new Map<string, string[]>();
    for (const c of CURRICULUM_COURSES) {
      dependentsMap.set(c.code, []);
    }
    for (const c of CURRICULUM_COURSES) {
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
      const course = CURRICULUM_COURSES.find((c) => c.code === code);
      return acc + (course?.credits || 0);
    }, 0);

    const reachesFYP = blocked.has('CS-406');
    const delaySems = reachesFYP ? (blocked.size >= 5 ? 2 : 1) : blocked.size > 0 ? 1 : 0;

    return { cascadeBlockedSet: blocked, delayedCredits: totalDelayed, estimatedDelaySemesters: delaySems };
  }, [simulatedFailedSet]);

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
    // Layout courses along semester columns
    // Column spacing: 320px
    // Row spacing: 130px
    const semesterCounters: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };

    return CURRICULUM_COURSES.map((course) => {
      const rowIndex = semesterCounters[course.semester]++;
      const x = (course.semester - 1) * 320 + 40;
      const y = rowIndex * 135 + 80;

      const isCrit = showCriticalPath && CRITICAL_PATH_CODES.includes(course.code);

      return {
        id: course.code,
        type: 'courseNode',
        position: { x, y },
        data: {
          ...course,
          status: getNodeStatus(course.code, course.prereqs),
          isCriticalPath: isCrit,
          onSelectCourse: (c: CourseData) => {
            if (isSimulationMode) {
              setSimulatedFailedSet((prev) => {
                const next = new Set(prev);
                if (next.has(c.code)) next.delete(c.code);
                else next.add(c.code);
                return next;
              });
            } else {
              setSelectedCourse(c);
            }
          },
        },
      };
    });
  }, [getNodeStatus, showCriticalPath, isSimulationMode]);

  // ─── Build Graph Edges ──────────────────────────────────────────────────────
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    for (const course of CURRICULUM_COURSES) {
      for (const prereq of course.prereqs) {
        const isCritEdge =
          showCriticalPath &&
          CRITICAL_PATH_CODES.includes(prereq) &&
          CRITICAL_PATH_CODES.includes(course.code);

        const isBlockedEdge =
          simulatedFailedSet.has(prereq) ||
          (cascadeBlockedSet.has(prereq) && cascadeBlockedSet.has(course.code));

        edges.push({
          id: `e-${prereq}-${course.code}`,
          source: prereq,
          target: course.code,
          animated: isCritEdge || isBlockedEdge,
          style: {
            stroke: isBlockedEdge ? '#f43f5e' : isCritEdge ? '#f59e0b' : '#475569',
            strokeWidth: isBlockedEdge ? 2.5 : isCritEdge ? 2.5 : 1.5,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isBlockedEdge ? '#f43f5e' : isCritEdge ? '#f59e0b' : '#64748b',
            width: 15,
            height: 15,
          },
        });
      }
    }

    return edges;
  }, [showCriticalPath, simulatedFailedSet, cascadeBlockedSet]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Sync state changes with nodes
  React.useEffect(() => {
    // Trigger react-flow node update on status changes
  }, [initialNodes, initialEdges]);

  // ─── Importance Score Calculator (Rule #7) ──────────────────────────────────
  const selectedCourseImportance = useMemo(() => {
    if (!selectedCourse) return null;

    const code = selectedCourse.code;
    const directUnlocks = CURRICULUM_COURSES.filter((c) => c.prereqs.includes(code)).length;

    // BFS transitive reach
    const reachSet = new Set<string>();
    const queue = CURRICULUM_COURSES.filter((c) => c.prereqs.includes(code)).map((c) => c.code);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (!reachSet.has(cur)) {
        reachSet.add(cur);
        CURRICULUM_COURSES.filter((c) => c.prereqs.includes(cur)).forEach((d) => queue.push(d.code));
      }
    }

    const directScore = Math.min(1.0, directUnlocks / 4) * 40;
    const reachScore = Math.min(1.0, reachSet.size / 12) * 25;
    const creditScore = Math.min(1.0, selectedCourse.credits / 4) * 20;
    const earlinessScore = Math.max(0, (9 - selectedCourse.semester) / 8) * 15;

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
  }, [selectedCourse]);

  return (
    <div className="h-screen w-screen bg-[#0b1119] text-slate-100 flex flex-col overflow-hidden">
      {/* Standardized Page Header */}
      <PageHeader
        title="Prerequisite DAG Explorer"
        breadcrumbs={[{ label: 'Prerequisite Explorer' }]}
        badge="Batch 2018 Onwards"
        description="Directed acyclic graph of NED CISE degree requirements, critical paths, and failure cascades."
        accent="var(--cyan)"
        actions={
          <div className="flex items-center gap-2.5 flex-wrap text-xs">
            {/* Search Box */}
            <input
              type="text"
              placeholder="Search code/title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0f1823] border border-[rgba(213,228,236,0.15)] rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#9bcbd0] w-36 sm:w-44"
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

            {isSimulationMode && simulatedFailedSet.size > 0 && (
              <button
                onClick={() => setSimulatedFailedSet(new Set())}
                className="text-xs text-[#d9a29d] hover:underline"
              >
                Reset
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
          nodes={initialNodes}
          edges={initialEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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

      {/* Course Detail Modal */}
      {selectedCourse && (
        <Modal
          isOpen={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          title={`${selectedCourse.code}: ${selectedCourse.title}`}
          description={`Semester ${selectedCourse.semester} • ${selectedCourse.credits} Credit Hours (${selectedCourse.theoryCredits} Theory + ${selectedCourse.practicalCredits} Practical)`}
        >
          <div className="space-y-4 text-xs">
            {/* Category and Status Bar */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Category:</span>
              <span className="capitalize font-semibold text-slate-200">
                {selectedCourse.category.replace('_', ' ')}
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
              {selectedCourse.prereqs.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCourse.prereqs.map((p) => (
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

            {/* Quick State Toggle Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <Button
                variant={completedSet.has(selectedCourse.code) ? 'outline' : 'primary'}
                size="sm"
                className="flex-1"
                onClick={() => {
                  setCompletedSet((prev) => {
                    const next = new Set(prev);
                    if (next.has(selectedCourse.code)) next.delete(selectedCourse.code);
                    else next.add(selectedCourse.code);
                    return next;
                  });
                  setSelectedCourse(null);
                }}
              >
                {completedSet.has(selectedCourse.code) ? 'Mark as Not Passed' : 'Mark as Passed'}
              </Button>

              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setIsSimulationMode(true);
                  setSimulatedFailedSet(new Set([selectedCourse.code]));
                  setSelectedCourse(null);
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
