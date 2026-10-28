# EduCompass — CS-326 Software Engineering CEP

**NED University of Engineering & Technology**
**Department of Computer & Information Systems Engineering**
**Course: CS-326 Software Engineering**
**Complex Engineering Problem (CEP)**

---

## Project Overview

**EduCompass** is an academic guidance platform for NED CISE students. It addresses the complex engineering problem of **information fragmentation** in undergraduate academic planning — students currently navigate 5+ disconnected sources (course portals, FYP archives, professor pages, career guides) to make one informed decision.

EduCompass consolidates this into a single, privacy-preserving, AI-assisted platform with:
- A **prerequisite dependency engine** that models the 53-course NED CSE curriculum as a directed acyclic graph
- A **GPA & What-If calculator** using the official NED 4.0 grading scale
- A **FYP archive search** over 68 reviewed NED CISE projects (2022–2025)
- A **professor directory** with research domain matching
- An **AI academic assistant** with hard privacy caps (300 chars in / 500 tokens out)

---

## Repository Structure

```
academic-submission/
│
├── data/                         # Extracted and structured academic data
│   ├── ned_cse_course_catalog.json   # All 53 NED CSE courses (code, credits, prerequisites)
│   ├── fyp_projects_sample.json      # Sample of 10 extracted FYP project records
│   ├── career_tracks.json            # 12 computing career tracks with course mappings
│   └── faculty_profiles.json         # 16 NED CISE faculty research profiles
│
├── core/                         # Core algorithmic engines (Python)
│   ├── gpa_engine.py             # NED 4.0 GPA & CGPA calculator with retake policy
│   ├── prereq_graph.py           # Prerequisite DAG: topological sort, eligibility check
│   └── test_algorithms.py        # Unit tests for both engines
│
├── pipeline/                     # Data extraction pipeline (offline, human-reviewed)
│   ├── profiler.py               # Phase 0: PDF profiler — detects tables, PII flags
│   ├── extractor.py              # Phase 1: Transforms raw text into structured domain objects
│   ├── privacy_scrubber.py       # PII scrubber — removes names, roll numbers from records
│   └── test_pipeline.py          # Unit tests for pipeline components
│
├── frontend/                     # Static web prototype (HTML/CSS/JS, no framework)
│   ├── index.html                # Single-page app shell
│   ├── app.js                    # Client-side routing, views, feature modules
│   ├── styles.css                # Complete design system (dark-first, responsive)
│   └── server.js                 # Minimal Node.js static server for local demo
│
└── README.md                     # This file
```

---

## Week 1 Development Summary

This repository represents **Week 1** of the EduCompass project — the data extraction and core algorithm phase. The work was done in this sequence:

### Day 1–2: Data Collection & Profiling
- Collected 5 FYP archive PDFs (2022–2025 NED CISE SOPs) and the full course catalog
- Built `profiler.py` to scan PDFs for table structure and PII flags (student roll numbers)
- All 5 PDFs profiled: 68 total project rows detected, 1 PII flag found and handled

### Day 3–4: Extraction & Privacy Pipeline
- Built `extractor.py` to parse FYP rows into structured records with domain classification
- Built `privacy_scrubber.py` to strip student names and roll numbers before storage
- Result: 68 privacy-safe FYP records extracted (0 PII leaks)

### Day 5: Core Algorithm Engines
- Built `gpa_engine.py`: semester GPA, cumulative CGPA with NED retake replacement policy, academic standing classification (Dean's Honor List, Good Standing, Academic Probation)
- Built `prereq_graph.py`: course dependency graph, topological sort, eligibility evaluator

### Day 6–7: Frontend Prototype
- Built vanilla HTML/CSS/JS prototype to validate UX concepts
- Dark-first design system, responsive layout, SPA routing without a framework
- All structured data rendered from the JSON files in `data/`

---

## Running the Algorithms

### Prerequisites
- Python 3.10+

### GPA Engine
```bash
cd core
python gpa_engine.py
```
**Expected output:**
```
Semester 1 GPA (with F): 2.69
Cumulative CGPA after retake replacement: 3.25
Academic Standing: Good Standing
```

### Prerequisite Graph
```bash
cd core
python prereq_graph.py
```

### Pipeline (Extraction Simulation)
```bash
cd pipeline
python extractor.py
```

### Unit Tests
```bash
cd core && python -m pytest test_algorithms.py -v
cd pipeline && python -m pytest test_pipeline.py -v
```

---

## Running the Frontend

```bash
cd frontend
node server.js
```
Then open `http://localhost:5000` in your browser.

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Data extraction | Offline PDF parsing | No live scraping; all data reviewed by admin before use |
| Privacy model | Strip PII at extraction time | Student names/roll numbers never stored |
| Prerequisite model | Directed Acyclic Graph | Natural representation of course dependencies |
| GPA scale | NED official 4.0 scale | Matches actual university policy |
| Domain classification | Keyword matching | Explainable, auditable, no black-box AI |
| Frontend | Vanilla HTML/CSS/JS | Understandable by all team members, no build step |

---

## Team

| Name | Student ID | Role |
|---|---|---|
| Khawaja Syed Hurraim Bin Ather | — | Lead Developer |

---

## Academic Integrity

All FYP data was extracted from publicly available NED CISE department records. Student names and roll numbers were removed at the extraction stage and are not present in any data file in this repository. This project does not make official university decisions — all outputs are clearly labelled as guidance estimates.

---

*NED University · Dept. of CISE · CS-326 Software Engineering · 2026*
