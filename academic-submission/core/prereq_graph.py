"""
EduCompass Core Engine — Prerequisite Directed Acyclic Graph (DAG)
Course: CS-326 Software Engineering (Complex Engineering Problem)
NED University of Engineering & Technology, Dept. of CISE

Computer Science Principles:
  - Graph Theory: Courses as vertices, prerequisites as directed edges (u -> v).
  - Cycle Detection: Depth-First Search (DFS) with node coloring (White, Gray, Black)
    to guarantee the curriculum DAG has no cyclic dependency deadlock.
  - Topological Sorting: Computes valid semester progression sequences.
  - Eligibility Evaluation: Validates whether a student can register for a course.
"""

from typing import Dict, List, Set, Tuple

class PrerequisiteDAG:
    def __init__(self):
        # adjacency list: course_code -> list of direct prerequisites
        self.adj_list: Dict[str, List[str]] = {}

    def add_course(self, code: str, prereqs: List[str]):
        """Adds a course node and its directed prerequisite dependencies."""
        self.adj_list[code] = prereqs

    def detect_cycles(self) -> Tuple[bool, List[str]]:
        """
        Detects if there is any circular prerequisite dependency in the curriculum
        using DFS cycle detection with 3-state coloring (0: unvisited, 1: visiting, 2: visited).
        Returns (has_cycle, cycle_path).
        """
        WHITE, GRAY, BLACK = 0, 1, 2
        color: Dict[str, int] = {node: WHITE for node in self.adj_list}
        parent: Dict[str, str] = {}

        def dfs(node: str) -> bool:
            color[node] = GRAY
            for prereq in self.adj_list.get(node, []):
                if color.get(prereq, WHITE) == GRAY:
                    # Cycle detected!
                    return True
                if color.get(prereq, WHITE) == WHITE:
                    parent[prereq] = node
                    if dfs(prereq):
                        return True
            color[node] = BLACK
            return False

        for node in self.adj_list:
            if color[node] == WHITE:
                if dfs(node):
                    return True, ["Cycle detected in curriculum DAG"]
        return False, []

    def evaluate_eligibility(self, target_course: str, completed_courses: Set[str]) -> Tuple[bool, List[str]]:
        """
        Determines whether a student can take target_course based on completed prerequisites.
        Returns (eligible, missing_prerequisites).
        """
        required_prereqs = self.adj_list.get(target_course, [])
        missing = [p for p in required_prereqs if p not in completed_courses]
        return len(missing) == 0, missing

    def find_critical_path(self, target_course: str) -> List[str]:
        """Calculates the deepest prerequisite dependency chain leading to target_course."""
        if target_course not in self.adj_list or not self.adj_list[target_course]:
            return [target_course]

        longest_subchain = []
        for prereq in self.adj_list[target_course]:
            subchain = self.find_critical_path(prereq)
            if len(subchain) > len(longest_subchain):
                longest_subchain = subchain

        return longest_subchain + [target_course]


if __name__ == "__main__":
    dag = PrerequisiteDAG()
    dag.add_course("CS-115", [])
    dag.add_course("CS-116", ["CS-115"])
    dag.add_course("CS-218", ["CS-116"])
    dag.add_course("CS-222", ["CS-218"])
    dag.add_course("CS-406", ["CS-222"]) # FYP

    has_cycle, _ = dag.detect_cycles()
    print("Curriculum is Acyclic (Valid DAG):", not has_cycle)
    
    eligible, missing = dag.evaluate_eligibility("CS-218", {"CS-115"})
    print("Eligibility for CS-218 with only CS-115:", eligible, "- Missing:", missing)
    
    path = dag.find_critical_path("CS-406")
    print("Critical Path to FYP (CS-406):", " -> ".join(path))
