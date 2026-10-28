# EduCompass Professor Profiles: Data and Ingestion Guide

**For:** Claude Opus and Antigravity (the agent), working for Ram. **Generated:** 25 Oct 2026.
**Files:** `professors.json` (canonical data, load this), `EDUCOMPASS_PROFESSOR_PROFILES.pdf` (human-readable cards), this file.
**Where to put them:** `docs/data/professors/` (all three). Module owners: M2 (Professor Directory) and X1 (data), loader by Ram (F4).

> **Rules.** (1) Use these names exactly; they are real faculty. (2) Never invent facts; fields marked derived, inferred, or missing stay flagged until Ram confirms. (3) Phone numbers, email addresses, and PhD student names were removed on purpose; do not add them back. (4) No student names anywhere. (5) Load as `Extracted`; Ram reviews; only then publish.

## 1. What this data is
Sixteen faculty profiles of the Department of Computer & Information Systems Engineering, NED University, each cut down to what a student needs: **name, qualification, research interests, and a short line of highlights and selected publications** (short, not exhaustive). Ram has told us the professors were consulted; keep that confirmation in `docs/permissions/`.

## 2. Fields in `professors.json`
| Field | Meaning |
|---|---|
| `slug` | Stable id (kebab-case name) |
| `name`, `title`, `rank` | Exact name; Dr., Ms., Mr. Engr.; rank only if the source gave one |
| `name_status` | `confirmed`, `inferred` (name guessed from the text), `partial` (surname missing), `missing` |
| `qualification` | One or two lines |
| `research_areas`, `research_areas_source` | Free-text interests; `stated`, `derived` (from publications and roles), or `stated+derived` |
| `domain_tags` | Tags from the controlled FYP vocabulary (`pipeline/vocab/domains.json`) |
| `area_tags` | **Proposed** vocabulary additions (Section 5) |
| `highlights`, `selected_publications` | Short achievement line; up to two publications |
| `fydp_supervised`, `postgraduate_projects` | Project titles only (no student names) |
| `contact_route` | `null` (add by hand after consent) |
| `is_simulated` | `false` (real data) |
| `source`, `consent_note`, `review_status`, `review_flags` | Provenance and review state |

## 3. Database changes (write as a migration; Ram applies)
```sql
alter table professors
  add column if not exists slug text unique,
  add column if not exists title text,
  add column if not exists rank text,
  add column if not exists qualification text,
  add column if not exists highlights text,
  add column if not exists selected_publications text[] default '{}',
  add column if not exists research_areas_source text
    check (research_areas_source in ('stated','derived','stated+derived')),
  add column if not exists domain_tags text[] default '{}',
  add column if not exists area_tags text[] default '{}',
  add column if not exists name_status text default 'confirmed'
    check (name_status in ('confirmed','inferred','partial','missing')),
  add column if not exists consent_note text;

create table if not exists professor_supervised_projects (
  professor_id uuid references professors(id) on delete cascade,
  title text not null,
  year int,
  status text,
  kind text default 'fydp' check (kind in ('fydp','postgraduate')),
  primary key (professor_id, title)
);
```
Public read: only `review_status = 'Published'` and `name_status in ('confirmed','inferred','partial')` after Ram's confirmation. A profile with `name_status = 'missing'` is never published.

## 4. Steps for the agent
1. Copy the three files to `docs/data/professors/`. Read `professors.json`.
2. Validate with a schema (Zod or Pydantic): required fields, tag values, no email or phone patterns, no roll-number patterns.
3. Write `pipeline/seed/professors.py` that reads the JSON and writes `ingestion_records` (type `professor`, status `Extracted`, natural key `sha1(slug)`), idempotent. Add every `review_flags` entry as a flag on the record. Records with `name_status` other than `confirmed` load as `Flagged`.
4. **Merge with the FYDP-derived supervisors** (module X1, playbook Section 6.8): match by normalised name (ignore titles like Dr., Ms., Engr.). For a match, **these profiles win** for qualification, research areas, and highlights; keep the FYDP-derived project links (`supervisor_id`). Do not create duplicates. Report unmatched supervisors for Ram.
5. Insert `fydp_supervised` titles into `professor_supervised_projects`. Then compare the titles against `fyp_projects` (title similarity of 90 percent or more) and link matches by `supervisor_id` instead of adding duplicate projects; list near matches for review.
6. Ram reviews in the Admin queue (module M4): the flagged items in Section 6 first. Only approved records are published.
7. After publishing, add professors to the chatbot index (module H3a) from published fields only.
8. Update `.agent/STATE.md` and the progress board.

**How the interface uses it (module M2):** directory with search and filter by research interest and tag; a profile card with qualification, interests, and highlights; match score from overlapping `domain_tags` and research areas with a visible breakdown and an "Estimate" badge; a "Derived" label wherever `research_areas_source` is `derived`; an email-draft generator (mailto or copy only). Show no per-professor outcome statistics.

## 5. Proposed vocabulary additions (Ram approves)
`computer-architecture`, `vlsi-hardware`, `hpc-cloud`, `optimization`, `computational-biology`, `software-engineering`, `simulation`, `remote-sensing`, `compilers`, `quantum`. Existing tags (`ai-ml`, `computer-vision`, `nlp`, `web`, `iot`, `embedded`, `cybersecurity`, `data`, `networks`, `blockchain`, `ar-vr`, `healthcare-tech`, `agriculture-tech`, `fintech`, `education-tech`) map to career tracks through `domain_track_map`; for the new tags add: `computer-architecture`, `vlsi-hardware`, `hpc-cloud` to `systems-hardware-design`; `optimization` to `ai-ml-engineering`; `computational-biology` to `data-science`; `software-engineering` to `backend-development` and `software-testing-qa`; `remote-sensing` to `data-science`; `compilers` to `systems-hardware-design`; `simulation` to `data-science`; `quantum` to `cybersecurity`.

## 6. Items Ram must confirm
| Profile | Issue |
| Dr. Fakhra Aftab | Source header says "Ms."; "Dr." used because the profile states a completed PhD and the SRS cover lists her as Dr. Confirm title and rank. |
| Dr. Hameeza Ahmed | Two identical copies of this profile were pasted; merged into one. |
| Ms. Syeda Hafsa Ahmed | The source had no name. "Syeda Hafsa Ahmed" is the first author of the only paper listed. Ram must confirm. |
| Mr. Engr. Ali Akhtar | Rank is not stated in the source. Research areas are derived from his work history and supervised projects. |
| Dr. Muhammad Asad Arfeen | Rank conflict in the source (Professor vs Associate Professor). Phone number, email and the names of PhD students were left out on purpose. Research areas derived from publications and roles. |
| Dr. Umar Iftikhar | No name header in the source; name taken from the publication list and CV. Research areas derived from the CV objective and publications. |
| Dr. Muhammad Ali Ismail | Education details and current rank are not in the source; research areas are derived from publications and projects. |
| Dr. Muhammad Khurram | No publications are listed in the source. |
| Dr. Syed Zaffar Qasim | The profile was split when pasted: the supervised-projects, courses and publications lines that follow Dr. Arfeen's profile were matched to Dr. Qasim. |
| Ms. Tahreem | Surname not in the source. A "Tahreem Mumtaz" appears as a co-author in Dr. Arfeen's publication list, but this is unverified. |
| Ms. Fauzia Yasir | PhD period ends June 2026; confirm whether she is already "Dr." and her current rank. |
| Unnamed Assistant Professor | The name was lost when the text was pasted. Do not publish until Ram gives the name. Hints only: her B.E. 2007 and M.Engg 2015 dates match Fauzia Yasir, but research areas and projects differ; CaptureDress is also on Maria Waqas's list. |

## 7. The profiles (readable copy of `professors.json`)

### Dr. Fakhra Aftab
*Assistant Professor (source label); Lecturer since 2013*  
**Qualification:** PhD Computer Systems (2026), embedded systems for machine vision; M.Engg 2015 (Computer Architecture & Systems Design); B.E. 2012, First Class First Position and Gold Medal, NED.  
**Research interests:** Computer vision; Web semantics; Software engineering; Deep learning; Embedded systems design; Performance analysis and optimization  
**Highlights:** Gold Medal and First Class First Position (B.E.); Best Paper Award at INTELLECT 2017; PEC-registered engineer; supervising final year projects since 2013 and serving as departmental internship coordinator.  
**Selected publications:** Web Ontology based Multi-level CACHE Simulator, IEEE C-CODE (2017)  
**Tags:** computer-vision, ai-ml, embedded, web, software-engineering | **Name status:** confirmed

### Dr. Hameeza Ahmed
**Qualification:** PhD Big Data Computing, NED (2021); M.Engg 2015 (Computer Architecture & Systems Design); B.E. 2012.  
**Research interests:** Big data computing; Compilers; Machine learning; Computer architecture  
**Highlights:** Best Researcher Award (3 JCR papers, 2021); HEC-approved PhD supervisor; FYDP coordinator since 2022; published at DATE 2019 on compiler selection of processing-in-memory instructions.  
**Selected publications:** Toward a novel engine for compiler optimization space exploration of big data workloads, Software: Practice and Experience (2022); A Structured Approach towards Big Data Identification, IEEE Transactions on Big Data (2021)  
**Tags:** data, ai-ml, compilers, computer-architecture | **Name status:** confirmed
**Supervised projects:** 1 listed in the JSON

### Ms. Syeda Hafsa Ahmed
*Lecturer (since Aug 2014)*  
**Qualification:** PhD in progress (Computer Systems Engineering, since Nov 2021) on approximate computing in embedded machine learning; M.Engg 2015 and B.E. 2012, NED.  
**Research interests:** Deep learning; Embedded computing; Approximate computing; Computer vision; Point-of-care devices; Intelligent traffic management systems  
**Highlights:** Lead author of a Faster R-CNN vehicle detection and counting framework for undisciplined traffic (IEEE HONET 2021); M.Engg research on mobile apps for medication adherence with AKUH; departmental Community Service focal person and backlog course coordinator.  
**Selected publications:** Faster RCNN Based Vehicle Detection and Counting Framework for Undisciplined Traffic Conditions, IEEE HONET (2021)  
**Tags:** ai-ml, computer-vision, embedded, healthcare-tech | **Name status:** inferred

### Mr. Engr. Ali Akhtar
**Qualification:** PhD in progress (since April 2022) under Dr. Raheela Anwar and Dr. Syed Abbas Ali; M.Engg (CS) and B.E. (CS), NED.  
**Research interests:** Health information systems; OBE management information systems; Web and software development; Augmented and virtual reality; Machine learning for assistive and medical systems (derived)  
**Highlights:** Teaching at NED since 2016 after work at Aga Khan University Hospital and Geo TV; built the NED OBE system and hospital blood-bank and stem-cell-bank systems; departmental industry-liaison representative.  
**Selected publications:** Speech Feature Selection of Normal and Autistic children using Filter and Wrapper Approach, IJCSNS (2021); Virtual Reality in Gymnasium: Stationary bike using Hall-Effect Sensor and Bluetooth BLE, IJCSNS (2022)  
**Tags:** web, healthcare-tech, ar-vr, ai-ml, education-tech | **Name status:** confirmed
**Supervised projects:** 11 listed in the JSON

### Dr. Muhammad Asad Arfeen
*Professor (header); academic profile lists Associate Professor since Feb 2022*  
**Qualification:** PhD Computer Science, University of Canterbury, New Zealand (2015); M.Engg Computer Systems 2007; B.E. 2004, NED. HEC-approved PhD supervisor.  
**Research interests:** Cybersecurity: malware, ransomware, DDoS detection, digital forensics; Computer networks and Internet traffic modelling; Energy-efficient networks and data centers; Quantum key distribution (derived)  
**Highlights:** Scientific Director of the Internet Security Lab, National Center for Cyber Security; Project Director, NED Science & Technology Park; PI of a PKR 11.4M HEC project with NCCPL on a threat-intelligence platform for the capital market; 26 JCR journal articles.  
**Selected publications:** The role of the Weibull distribution in modelling traffic in Internet access and backbone core networks, Journal of Network and Computer Applications (2019); Process based volatile memory forensics for ransomware detection, Concurrency and Computation (2022)  
**Tags:** cybersecurity, networks, ai-ml, data, quantum | **Name status:** confirmed

### Dr. Kashif Asrar
**Qualification:** PhD Computer & Information Systems Engineering; M.Engg (Computer Systems) 2012 and B.E. (Computer Systems) 2009, NED; about 12 years of university teaching.  
**Research interests:** Machine learning; Data science; Data analytics  
**Highlights:** Final Year Project coordinator 2013-2021; in-charge of the departmental research lab; lecturer representative on the NED Syndicate; PEC member; co-author of papers on BOTNETs and IoT cryptography.  
**Selected publications:** Evaluating the Performance Parameters of Cryptographic Algorithms for IoT Based Devices, ETASR (2021); BOTNETs: A Network Security Issue, IJACSA (2020)  
**Tags:** ai-ml, data | **Name status:** confirmed

### Dr. Umar Iftikhar
*Assistant Professor (since Oct 2025; Lecturer 2018-2025)*  
**Qualification:** PhD Computer Systems Engineering, NED (2025); MS Computer Engineering, SSUET (2017); BE Electrical (Computer Systems), Hamdard (2014).  
**Research interests:** Cybersecurity and cyber threat detection; Machine learning and deep learning for intrusion detection; IoT security and cryptography; Computer networks (derived)  
**Highlights:** Certified CISM, CEH and CCNA; MoST Endowment Fund grant (PKR 3M) for PhD on attack-surface modelling for cyber threat detection; former information-security consultant for banks and insurers at A.F. Ferguson & Co. (PwC member firm).  
**Selected publications:** Enhanced Cyber Threat Detection System Leveraging Machine Learning Using Data Augmentation, IJACSA (2025); Evaluating the Performance Parameters of Cryptographic Algorithms for IoT-based Devices, ETASR (2021)  
**Tags:** cybersecurity, ai-ml, networks, iot | **Name status:** confirmed

### Ms. Ibshar Ishrat
*Lecturer (since 2018)*  
**Qualification:** PhD in progress (since April 2021) under Dr. Muhammad Asad Arfeen; M.Engg (CS) and B.E. (CS), NED.  
**Research interests:** Queueing theory; Simulation modelling; Rare-event simulation; Student-project areas: blockchain, deepfake detection, computer vision, fintech (stated + derived)  
**Highlights:** Departmental website content manager and class advisor; presented the Smart Door Lock project at ICCIS 2016; published a comparison of variance-reduction techniques for a retrial M/M/1/K queue (SIMULATION, 2022).  
**Selected publications:** A comparison of variance reduction techniques in the simulation of a retrial M/M/1/K queue, SIMULATION (2022)  
**Tags:** networks, blockchain, cybersecurity, computer-vision, ai-ml, fintech, simulation | **Name status:** confirmed
**Supervised projects:** 9 listed in the JSON

### Dr. Muhammad Ali Ismail
**Qualification:** PhD (details not given in the source); HEC-approved PhD supervisor.  
**Research interests:** Computer architecture and multi-core processors; Big data and cloud computing; Many-objective optimization; Software-defined networking and network security; Machine learning for remote sensing (derived)  
**Highlights:** US patent on a binary-tree multilevel cache for multi-core processors (2014); PI of the Exascale Open Lab (PKR 95M, 2018); funded HEC projects on sunspot detection with ML (PKR 17M, 2022) and wireless-sensor-network deforestation monitoring (PKR 50M, 2021).  
**Selected publications:** Enhanced index for water body delineation using Google Earth Engine, Journal of Water and Climate Change (2022); FMPSO: fuzzy-dominance many-objective particle swarm optimization, Evolutionary Intelligence (2022)  
**Tags:** data, networks, cybersecurity, ai-ml, computer-architecture, hpc-cloud, optimization | **Name status:** confirmed

### Dr. Muhammad Khurram
*Professor (BPS-21)*  
**Qualification:** PhD (Science), IC Design, Massey University, New Zealand (2012); M.E. by research (CS) 2006 and B.E. (CS) 2002, NED.  
**Research interests:** Artificial intelligence and computer vision; Smart cities; RF IC design, VLSI and digital signal processing; On-chip bio-systems; Embedded systems and IoT; 5G networks  
**Highlights:** Director of the Research Center for AI (RCAI) and head of the Smart City Lab at the National Center of AI (NED); founder of AI agritech startup Crop2x; led funding including Rs 75M (CoPI) for IoT crop scouting and EUR 80,000 (DAAD) for a weed-detection robot.  
**Tags:** ai-ml, computer-vision, iot, embedded, networks, agriculture-tech, vlsi-hardware | **Name status:** confirmed

### Dr. Syed Zaffar Qasim
**Qualification:** PhD Multiobjective Optimization, NED (2021); M.Engg 2007 (Computer Architecture & System Design); B.E. 1991 (Computer Systems); at NED since 2000.  
**Research interests:** Evolutionary computation and multiobjective optimization; Machine learning and deep learning; Blockchain technology; Computer security  
**Highlights:** HEC-approved PhD supervisor; several many-objective optimization algorithms published in 2020-2022 (FMPSO, DOCEA/D, MOSA/D, RODE); supervises postgraduate projects on speech emotion recognition, sentiment analysis and wearable-IoT injury prevention.  
**Selected publications:** FMPSO: fuzzy-dominance based many-objective particle swarm optimization, Evolutionary Intelligence (2022); RODE: Ranking-dominance-based algorithm for many-objective optimization, Arabian Journal for Science and Engineering (2020)  
**Tags:** ai-ml, blockchain, cybersecurity, optimization | **Name status:** confirmed

### Ms. Tahreem
*Lecturer (since April 2022)*  
**Qualification:** M.E. Computer Networks & Systems Security (2021) and B.E. Computer Systems Engineering (2018), NED; former research assistant, Smart City Lab, NCAI.  
**Research interests:** Remote sensing and land-cover change detection; AI assistive devices; Computer networks and security (derived)  
**Highlights:** M.E. thesis on vegetation classification and change detection with NDVI and Landsat-8 imagery; analysed 8 years of data on urbanization and green spaces in Karachi; B.E. project on an AI device for the hearing impaired.  
**Selected publications:** Impacts of Urbanization on Green Spaces of the Densely Populated City of Karachi, Pakistan  
**Tags:** ai-ml, networks, cybersecurity, remote-sensing | **Name status:** partial

### Dr. Shahab Tahzeeb
**Qualification:** PhD Computer & Information Systems Engineering, NED (2022); M.Engg 2004 and B.E. 1994 (Computer Systems), NED; about 30 years of teaching.  
**Research interests:** Computer architecture; Mathematical modeling; Bioinformatics; Machine learning  
**Highlights:** In-charge of the AI Lab; Final Year Project coordinator 2011-2021; Nishan-e-Haider Scholarship recipient; co-author of "Smart Career Guidance System" (ICCIS 2021), a project close to EduCompass.  
**Selected publications:** A Neural Network-Based Multi-Label Classifier for Protein Function Prediction, ETASR (2022); Smart Career Guidance System, ICCIS (2021)  
**Tags:** ai-ml, healthcare-tech, computer-architecture, computational-biology | **Name status:** confirmed
**Supervised projects:** 5 listed in the JSON

### Dr. Maria Waqas
**Qualification:** PhD Computational Biology, NED (2019); M.Engg 2008 (Computer Architecture & System Design, CGPA 4.0); B.E. 2001 (5th position).  
**Research interests:** Computational biology and bioinformatics; Cytomorphic and neuromorphic hardware design; Deep learning; Object detection and tracking; Electronic integrated circuit design; High performance computing  
**Highlights:** HEC-approved PhD supervisor; Co-PI of the National Center in Big Data and Cloud Computing; NEDAASC Best Publication Award 2017; MoST PhD funding (Rs 2.3M); Deputy Director II, Quality Enhancement Cell (2023-).  
**Selected publications:** An Analog Electronic Circuit Model for cAMP-dependent Pathway: towards creation of Silicon life, AIMS Bioengineering (2022); Automatic Object Tracking and Segmentation using Unsupervised SiamMask, IEEE Access (2021)  
**Tags:** ai-ml, computer-vision, healthcare-tech, computational-biology, vlsi-hardware, hpc-cloud | **Name status:** confirmed
**Supervised projects:** 25 listed in the JSON

### Ms. Fauzia Yasir
**Qualification:** PhD Computer Systems Engineering (Digital System Design), NED, 2021-June 2026; M.Engg 2014; B.E. 2007, NED.  
**Research interests:** Embedded system design; Natural language processing and language digitization; Computer vision and image processing; OCR; Deep learning  
**Highlights:** Supervised the award-winning "AI Enabled Urdu OCR for Mobile Devices" (2022, IGNITE-NGIRI-NED) and ongoing Transformer-based Urdu OCR and an energy-efficient AI core on FPGA for point-of-care; student career and wellness counselor.  
**Selected publications:** Photometric Ligature Extraction Technique for Urdu Optical Character Recognition, ETASR (2021); Computationally efficient HEVC/H.265 motion estimation for low power applications, ICICT (2015)  
**Tags:** embedded, nlp, computer-vision, ai-ml | **Name status:** confirmed
**Supervised projects:** 4 listed in the JSON

### Mr Affan
*Assistant Professor*  
**Qualification:** PhD (Computer Systems), M.Engg 2015 (CGPA 3.91), B.E. 2007 (85.18%, 9th rank), all NED.  
**Research interests:** Neuromorphic design; Digital system design; Analog circuit design; Computer architecture  
**Highlights:** 9th rank in B.E.; PEC and IEP member; executive advisor of the IEEE-WIE NED student chapter.  
**Tags:** vlsi-hardware, computer-architecture | **Name status:** missing
**Supervised projects:** 3 listed in the JSON
