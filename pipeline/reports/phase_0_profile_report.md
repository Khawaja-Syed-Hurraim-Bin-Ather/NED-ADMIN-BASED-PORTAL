# EduCompass — Phase 0 PDF Profile Report

> **Review required before Phase 1 extraction starts.**  
> This report contains NO student names or roll numbers.  
> Confirm PII flags are handled before loading any record to the database.

---

## A. FYP List PDFs

**Total PDFs:** 5

### FYP 2022.pdf
- **Year:** 2022
- **Pages:** 5
- **Tables detected:** 5
- **⚠️ PII flags:** Roll-number pattern detected (140 matches, e.g. CS-18071) — must be discarded at extraction time.

#### Table 1 (page 1)
- Approx. rows: 24
- ⚠️ PII columns detected (will be dropped): ['Name', 'Roll No.']

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `Group ID` | No | 1 |
| `Name` | ⚠️ YES — DROP | — |
| `Roll No.` | ⚠️ YES — DROP | — |
| `Project Title` | No | IoT Based Air Pollution Monitoring & Alert
System |
| `Internal Advisor(s)` | No | Dr. Syed Zaffar Qasim |
| `` | No | — |

#### Table 2 (page 2)
- Approx. rows: 31

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `7` | No | — |
| `Syed Maaz Hassan` | No | Musab Bin Javed / Faiza / Javeria Arif |
| `CS-18054` | No | [ROLL_REDACTED] / [ROLL_REDACTED] / [ROLL_REDACTED] |
| `Point Pay (Track & Pay on the go!)` | No | — |
| `Dr. Asad Arfeen` | No | — |
| `` | No | — |

#### Table 3 (page 3)
- Approx. rows: 27

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `15` | No | — |
| `Syed Saad Hasan Emaad` | No | Muhammad Fahad Alam / Syed Umair Hasan / Muhammad Hamiz Habib |
| `CS-18039` | No | [ROLL_REDACTED] / [ROLL_REDACTED] / [ROLL_REDACTED] |
| `Visualri - Image and Video Fores Toolkit` | No | — |
| `Dr. Syed Abbas Ali` | No | — |
| `` | No | — |

#### Table 4 (page 4)
- Approx. rows: 31

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `22` | No | — |
| `Abdullah Abrar` | No | Dua Zehra / Areeba Ayub / Shehrose Arshad |
| `CS-18063` | No | [ROLL_REDACTED] / [ROLL_REDACTED] / [ROLL_REDACTED] |
| `Dynamic Chatbot` | No | — |
| `Dr. Maria Waqas` | No | — |
| `` | No | — |

#### Table 5 (page 5)
- Approx. rows: 28

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `30` | No | — |
| `Insiyah Talib Hussain` | No | Arouba Mushtaq / Raheen Ahmed / Saima Ali |
| `CS-18044` | No | [ROLL_REDACTED] / [ROLL_REDACTED] / [ROLL_REDACTED] |
| `"Air Writing with finger Detection"` | No | — |
| `Mr. Umar Iftikhar` | No | — |
| `` | No | — |

### SOP FYDP list-2022.pdf
- **Year:** 2022
- **Pages:** 5
- **Tables detected:** 5
- **PII flags:** None detected in full-text scan

#### Table 1 (page 1)
- Approx. rows: 8
- ⚠️ PII columns detected (will be dropped): ['Student Name']

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `S.No.` | No | 1 / 2 / 3 |
| `Project Title` | No | Design and implement an expert system to
analyze plant health / Active speaker detection / Automated interview analysis of interview
candidates |
| `Student Name` | ⚠️ YES — DROP | — |
| `Supervisor/Co-Supervisor` | No | Dr. Aqeel Haider / Dr. Urooj Ainuddin / Dr. Urooj Ainuddin |
| `Industry` | No | — |

#### Table 2 (page 2)
- Approx. rows: 8

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `` | No | 9 / 10 / 11 |
| `` | No | Resolution enhancement of Low Quality
Images / Smart SQL query generator / Artificial intelligence based depression
detection system |
| `3. Ghazia Hashmi
4. Sawera Ansari` | No | 1. Hasnain Ali Arain
2. Sadaf Jawed Farooqui
3. Bisma Ibrahim
4. Ibrahim Rehman / 1. Izma Aziz
2. Ayesha Aamir
3. Eesha Ansari
4. Heba Naveed / 1. Abdullah Ahmed Khan
2. Muhammad Taimoor Jawaid
3. Syed Jahanzaib Ali Zaidi
4. |
| `` | No | Dr. Maria Waqas / Dr. Shahab Tahzeeb / Dr. Shahab Tahzeeb |
| `` | No | — |

#### Table 3 (page 3)
- Approx. rows: 7

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `17` | No | 18 / 19 / 20 |
| `Optimal robotic arm gripper` | No | DeepFai (Intelligence for audio deepfake) / Design of structural health monitoring system
on FPGA / Deep learning based automated quality
assurance for detecting surface defects |
| `1. Owais Ahmed
2. Hamza Ali Khan
3. Muhammad Huzaifa
4. Muhammad Areeb` | No | 1. Syed Saad Ali
2. Muhammad Arham Khan
3. Mina Baig
4. Rida Saleem / 1. Muhammad Umar
2. Mir Shahnawaz Abbasi
3. Aiman
4. Shakeel Ahmad / 1. Kaenaat Samad
2. Iqra Imran
3. Neha Fatima
4. Rana Junaid |
| `Ms. Anita Ali` | No | Ms. Anita Ali / Ms. Fakhra Aftab/ Dr. Majida
Kazmi / Ms. Fakhra Aftab/ Dr. Majida
Kazmi |
| `` | No | Mohammad Saqlain, team
lead at P&G |

#### Table 4 (page 4)
- Approx. rows: 7

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `25` | No | 26 / 27 / 28 |
| `Real time IT skills recommender and
predictor` | No | Smart performance appraisal analyzer / Smart recommender for process optimization
in pharmaceutical industry / Polarity detection of bi-lingual data from
online source |
| `1. Sana Parveen
2. Sidra Fatima
3. Wasia Mukhtar Khan
4. Maryam Bashir` | No | 1. Khadija
2. Ayesha Farooq
3. Uzma Aijaz
4. Faryal Rana / 1. Rahaab Nadeem
2. Rida Ul Fatima
3. Amna Aslam
4. Anas Ahmed Khan / 1. Zobia Khan
2. Muqadas Ashraf
3. Wajiha Khan
4. Hafiza Javeria Adil |
| `Mr. Kashif Asrar` | No | Mr. Umar Iftikhar/ Mr. Kashif
Asrar / Mr. Umar Iftikhar/ Mr. Kashif
Asrar / Mr. Kashif Asrar |
| `` | No | Mr. Ehtisham Ul Haq, director
at VisBizGlobal / Mr. Ehtisham Ul Haq, director
at VisBizGlobal |

#### Table 5 (page 5)
- Approx. rows: 6

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `33` | No | 34 / 35 / 36 |
| `Phoenix data security platform (discover,
protect, and control static and transit data
using vulnerability assessment, data
encryption, and tokenization)` | No | Security orchestration and automation
response (SOAR) / Fractional ownership of real estate using
asset tokenization in blockchain / Attack eye-External cyber attack surface
monitoring solution |
| `1. Arham Ahmed Siddiqui
2. Syed Khurram Abbas Rizvi
3. Shafay Azeem
4. Ahmer Waqar` | No | 1. Dawood Arshad
2. Javeria Jameel
3. Neha Akhter
4. Maheen Khan / 1. Hamza Junaid
2. Mohsin Iqbal
3. Mehdi Zafar
4. Muhammad Shayan / 1. Muhammad Hamza
2. Muhtashim Malick
3. Muhammad Ebadullah
4. Muhammad Shayan |
| `Ms. Ibshar Ishrat/ Dr. Asad Arfeen` | No | Dr. Asad Arfeen / Ms. Ibshar Ishrat/ Dr. Asad Arfeen / Dr. Asad Arfeen |
| `` | No | — |

### SOP FYDP list-2023.pdf
- **Year:** 2023
- **Pages:** 6
- **Tables detected:** 5
- **PII flags:** None detected in full-text scan

#### Table 1 (page 1)
- Approx. rows: 8
- ⚠️ PII columns detected (will be dropped): ['Student Name']

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `S.No.` | No | 1 / 2 / 3 |
| `Project Title` | No | Deepwriter: Enhancing integrity in industrial
handwritten document recognition / Deep learning-based voice cloning for local
languages with a focus on Urdu / Seamless recognition: FPGA powered Urdu
card reader |
| `Student Name` | ⚠️ YES — DROP | — |
| `Supervisor/Co-Supervisor` | No | Ms. Fauzia Yasir/ Dr. Majida Kazmi / Ms. Fauzia Yasir/ Dr. Majida Kazmi / Ms. Fauzia Yasir/ Dr. Majida Kazmi |
| `Industry` | No | Lucky Motors / Anjuman Taraqqi-e-Urdu
Pakistan / - |

#### Table 2 (page 2)
- Approx. rows: 8

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `` | No | 9 / 10 / 11 |
| `using deep learning framework` | No | PersonifyU: A deep dive into personalities / LogiSync-Streamlining last mile logistic1s.
through map matching based tracking  / Therapy AI- An AI powered tool for
empathetic support and self-care plans |
| `3. Hassan farooqui` | No | 1. Muhammad Anas Ansari
2. Bilal
3. Haris Ahmed
4. Waleed Ahmed / 1. Abdul Raffay
2. Syed Ali Salar
3. Askari Abbas
4. Syed Ibrahim Noman / 1. Waseela
2. Syeda Laiba Azam
3. Abdur Rehman
4. Syed Osama shad |
| `` | No | Dr. Shahab Tahzeeb / Dr. Shahab Tahzeeb / Dr. Shahab Tahzeeb |
| `` | No | ICAN / Bazaar Technologies / ICAN |

#### Table 3 (page 3)
- Approx. rows: 8

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `` | No | 17 / 18 / 19 |
| `` | No | Image captioning for visually impaired people / Interview EQ analyzer / AutoTag media manager |
| `4. Mohsin Ali` | No | 1. Muhammad Huzaifa Inshal
2. Muhammad Zain ul Abedin
3. Muhammad Huzaifa
4. Sye / 1. Muhammad Usman Yousuf
2. Syed Yasoob Raza Naqvi
3. Muhammad Jahanzaib Khan
4. / 1. Mufeeza Khan
2. Faiqa Haider
3. Rimsha Nadeem
4. Aqsa Aslam |
| `` | No | Dr. Syed Zaffar Qasim / Dr. Syed Zaffar Qasim / Mr. Kashif Asrar |
| `` | No | - / - / - |

#### Table 4 (page 4)
- Approx. rows: 7

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `25` | No | 26 / 27 / 28 |
| `Rice grain variety classification through deep
learning` | No | Neuroball: Embedded system-based cricket
ball tracking / Custom SIEM log parser generator to
enhance the security of open source and
ente / Personal protective equipment (PPE)
monitoring and violation alert system for
fa |
| `1. Romaisa Manzoor
2. Fareha Ahmed
3. Kaneez Sukaina
4. Bisma Aleem` | No | 1. Farrukh Ahmed Siddiqui
2. Syed Muhammad Hamza
Naveed
3. Aleena Fatima
4. Ifra / 1. Ifra Bint-e-Khalid
2. Werdah Hashmi
3. Muhammad Hamza Hussain
4. Syed Muhamma / 1. Muhammad Maaz Zahid
2. Hassan Hussain Merchant
3. Muhammad Khubaib
4. Taha Am |
| `Ms. Fakhra Aftab/ Dr. Majida Kazmi` | No | Ms. Fakhra Aftab/ Dr. Majida Kazmi / Dr. Asad Arfeen / Ms. Mehwish Raza/ Dr. Majida
Kazmi |
| `Matco Foods Limited` | No | Rashid Latif Academy / - / Agriauto Industries Limited |

#### Table 5 (page 5)
- Approx. rows: 6

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `33` | No | 34 / 35 / 36 |
| `Dialogify: Intelligent chat interface for
simplified cloud orchestration and
monitoring` | No | Salesforce files connect: Sync data from
salesforce to cloud storage / ServiceSwift:
Universal Plug-n-Play OEM support and
personalized assistance chat / SmartServe360 - A comprehensive
accelerator for F&B industry |
| `1. M. Hayyan Khan
2. Umair Ali
3. Hasnain Ahmed
4. Sibtain Ahmed` | No | 1. Bilal Arif
2. Muhammad Ali
3. Hubban Khan
4. Muhammad Huzaifa / 1. Rimsha Ishtiaq
2. Syeda Zobia Irshad
3. Habiba Asif
4. Vandana / 1. Yumna Khan
2. Hamza Ahad Akhtar
3. Hammad Khan
4. Muhammad Mudasir Alam |
| `Dr. Hameeza Ahmed` | No | Dr. Hameeza Ahmed / Dr. Asad Arfeen / Dr. Asad Arfeen |
| `Aus Pro Experts` | No | Cloud Junction Advisors Inc. / Empiric Technology / Empiric Technology |

### SOP FYDP list-2024.pdf
- **Year:** 2024
- **Pages:** 5
- **Tables detected:** 5
- **PII flags:** None detected in full-text scan

#### Table 1 (page 1)
- Approx. rows: 8
- ⚠️ PII columns detected (will be dropped): ['Student Name']

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `S.No.` | No | 1 / 2 / 3 |
| `Project Title` | No | Link2Insight: AI-Driven Optimization Tool for Website
Analysis and Strategic Enh / Egocentric Event Coverage: Automatic Highlighting
and Summarization of Everyday  / Insightful Horizons: AI-Powered Predictive Analytics
and Visualization for Busin |
| `Student Name` | ⚠️ YES — DROP | — |
| `Supervisor/Co-Supervisor` | No | Dr. Maria Waqas / Dr. Maria Waqas / Dr. Maria Waqas |
| `Industry` | No | - / - / Data and Dashboards
Ltd |

#### Table 2 (page 2)
- Approx. rows: 8

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `` | No | 9 / 10 / 11 |
| `` | No | RetinoVision– Generalizable Diabetic Retinopathy
Detection through Anatomical an / Design and Analysis of AXI-MM Integrated Set
Associative Cache in Modern SoC Arc / Privacy-Centric AI for Diabetic Retinopathy Screening
using Federated Learning |
| `3. Muhammad Usaid Siddiqui
4. Muhammad Azher` | No | 1. Sameen Baig
2. Shumaila Zafar
3. Fatima Ejaz
4. Zoha Fatima / 1. Abdhullah
2. Ahamed Safnas
3. Farwes Musharraf
4. Ahamed Najman / 1. Syeda Rumaisa Saeed
2. Tahira Aurangzeb |
| `` | No | Dr. Majida Kazmi / Dr. Majida Kazmi / Dr. Majida Kazmi |
| `` | No | A-Eye Diagnostics / DreamBig
Semiconductor Inc. / A-Eye Diagnostics |

#### Table 3 (page 3)
- Approx. rows: 7

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `17` | No | 18 / 19 / 20 |
| `Development of Low-Power Vision Sensor Node for
Vehicle Detection using FPGA` | No | Next-Gen Philanthropy: Blockchain-Enhanced
Tracking and Reporting for Charitable / Precision Plant Care: A System for Identifying and
Treating Plant Diseases / Smart Asset Tracking and Predictive Maintenance
System for Flight Catering |
| `1. Rooman
2. Syed Maarij
3. Usama Khalid
4. Faizan Khan` | No | 1. Maha Zubair
2. Yusra Shahnawaz
3. Hadia Mehmood
4. Hafiza Warisha Aftab / 1. Muhammad Faizan Soomro
2. Muhammad Subhan Sohair
3. Shehryar Nasir
4. Muhamma / 1. Huzaifa Naseer Khan
2. Sheikh Muhammad Farrukh Niaz
3. Syed Wahaj Raza Zaidi
 |
| `Ms. Mehwish Raza, Dr. Majida
Kazmi` | No | Dr. Syed Zaffar Qasim / Dr. Syed Zaffar Qasim / Dr. Shahab Tahzeeb |
| `DreamBig
semiconductor` | No | - / - / Ephlux |

#### Table 4 (page 4)
- Approx. rows: 7

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `25` | No | 26 / 27 / 28 |
| `Main Campus QuickServe: Streamlined Ordering,
Personalized Recommendations, and Departmental
Delivery for Main University Cafeteria` | No | Automated Anti-Theft Parking with Vision-Based
License Plate Verification / FashionFusion: AI-Driven Apparel Design Generator
for Personalized Styles and In / SmartDoc Assistant: AI Chatbot for Optimized
Document Assistance and Website Sup |
| `1. Fatima Siddiqui
2. Aqsa Asif
3. Barira Babar
4. Syeda Maria` | No | 1. Mirza Taha Hassan
2. Shayan Zahid
3. Ibrahim
4. Muhammad Abdurrahman / 1. Syed Muhammad Baqar Hussain
Rizvi
2. Meerab Shabeeh
3. Aania Tasleem Imam
4.  / 1. Muhammad Asim
2. Rasib Hassan
3. Maaz Mansoor
4. Mazhar Ahmad Khan |
| `Mr. Kashif Asrar, Dr. Ali Hasan
Mahmood` | No | Mr. Kashif Asrar / Mr. Kashif Asrar / Ms. Sumayya Zafar |
| `-` | No | - / - / - |

#### Table 5 (page 5)
- Approx. rows: 7

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `` | No | 33 / 34 / 35 |
| `` | No | Machine Vision Pipeline for Steel Surface Defects
Detection using FPGA SoC / Automated Surveillance and Security System using
Motion Transfer Technology for  / Procedural Modelling using Large Language Models
for Intelligent 3D Model Synthe |
| `4. Muhammad Asad Shahab` | No | 1. Aaliyan Mansoor
2. Muhammad Maaz Khan
3. Mohib Ud Din
4. Muhammad Babar Ali / 1. Khola Binte Sultan
2. Khansa Asif
3. Hafsa Najam
4. Muhammad Bilal Zubairi / 1. Usman
2. Vinodh Kumar Nihallani
3. Zubair Akhtar |
| `` | No | Ms. Fakhra Aftab, Dr. Majida
Kazmi / Mr. Ali Akhtar / Mr. Ali Akhtar |
| `` | No | DreamBig
Semiconductor &
Agriauto / - / - |

### SOP FYDP list-2025.pdf
- **Year:** 2025
- **Pages:** 6
- **Tables detected:** 5
- **PII flags:** None detected in full-text scan

#### Table 1 (page 1)
- Approx. rows: 8
- ⚠️ PII columns detected (will be dropped): ['Student Name']

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `S.No.` | No | 1 / 2 / 3 |
| `Project Title` | No | INSPIRE - Innovation Support Platform for Ideas,
Research, & Evaluation / Human Capital Management System / Smart Stock Manager: AI-Powered Smart Retail
Ecosystem with Stock Analysis, Faul |
| `Student Name` | ⚠️ YES — DROP | — |
| `Supervisor/Co-Supervisor` | No | Dr. Kashif Asrar / Dr. Kashif Asrar / Dr. Kashif Asrar |
| `Industry` | No | Elahi Group of
Companies |

#### Table 2 (page 2)
- Approx. rows: 8

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `` | No | 9 / 10 / 11 |
| `` | No | RoboComm: A Smart Interactive Campus Assistant / Virtual Chemistry Tutor / SEE BEYOND - Guided by sound empowered by
touch |
| `3. Fiza Farzand` | No | 1. Shayan Hussain
2. S.M. Hashaam Hasan
3. Ali Hyder
4. Abdul Moiz / 1. Fatima Hafsa
2. Mohammad Ashfi Uzama
3. Fathima Amna / 1. Sheikh Malaika Mustafa
2. Sumaika Imran
3. Qurratul Ain
4. Urooj Fatima |
| `` | No | Dr. Urooj Ain Uddin / Dr. Urooj Ain Uddin / Dr. Urooj Ain Uddin |
| `` | No | — |

#### Table 3 (page 3)
- Approx. rows: 8

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `17` | No | 18 / 19 / 20 |
| `Predicting Hemodynamic Instability in ICU Patients
Using Time-Series Clinical Data` | No | Vocaris - Your Intelligent Meeting Partner for
Seamless Conversation and Smart C / AI Powered Logs Anomaly Detection System for
Network Infrastructure / FINSURE- Financial Insight & Secure Reporting
Platform |
| `1. Muhammad Owais Alam
2. Hussain Raza
3. Mudasir Shaikh` | No | 1. Hafsa Ahmed
2. Fatima Mansoor
3. Zobia Nasim
4. Muhammad Awab Shuja / 1. Syeda Zainab Fatima
2. Syeda Samana Zehra Naqvi
3. Anum Azam / 1. Hamza Nasir
2. Abdus Samad
3. Talha Bin Sajid
4. Bilal Ahmed Sheikh |
| `Dr. Syed Zaffar Qasim` | No | Dr. Shahab Tahzeeb / D r . Shahab Tahzeeb / Dr. Shahab Tahzeeb |
| `SIUT` | No | Ephlux |

#### Table 4 (page 4)
- Approx. rows: 7

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `` | No | 26 / 27 / 28 |
| `` | No | KHIVISION: Smart AI-Powered Accident Detection
and Emergency Response System / AI Powered Crypto Automation and Analysis / Early Diagnosis of Diabetic Retinopathy on Edge |
| `3. Hamza Hussain
4. Wania Khan` | No | 1. Irza Salahuddin
2. Summiaya Fatimah
3. M. Hadi Raza
4. Roshik Adil / 1. Huzaifa Daniyal
2. Konoz Bin Rashid
3. Syed Tehsheem Abdul Wasay
4. Hamza Nav / 1. Muhammad Ubaid
2. Syeda Hibra Tariq
3. Alishba Gul Ahmed
4. Muhammad Ahmed Kh |
| `` | No | Dr. Asad Arfeen / Ms. Fauzia Yasir / Dr. Majida Kazmi |
| `` | No | Urban Department
NEDUET / Beenco Labs / A-Eye Diagnostics Ltd |

#### Table 5 (page 5)
- Approx. rows: 6

| Column Header | PII Risk | Sample Values |
|---|---|---|
| `33` | No | 34 / 35 / 36 |
| `iura: Design & Implementation of a bilingual Agentic
AI Legal Assistant for Pakistani Law` | No | AI-Driven Wearable Assistive Device for Navigation
and Fall Detection: Combining / REVIVE-Rehabilitation and Evaluation via IoT for
Vital Exercises / W.H.I.S.P.E.R Waveform Heart Intelligence Signal
Processing & Early Recognition  |
| `1. Abdullah Athar
2. Ahzam Rehan
3. Muneeb Ahmed
4. Sardar Abdul Moiz Khan` | No | 1. Zainab Raza
2. Doa Ahmed
3. Hiba Mahboob
4. Affaf Arif / 1. Usman Faizyab
2. Muhammad Owais
3. Zuhaib Noor
4. Muhammad Zunain / 1. Sanya Sajid
2. Fatima Kashif
3. Farzam Nasir
4. Hamza Ali |
| `Mr. Muhammad Ali Akhtar` | No | Mr. Muhammad Ali Akhtar / Mr. Muhammad Ali Akhtar / Mr. Muhammad Ali Akhtar |
| `High Court` | No | — |

---

## B. Roadmap PDFs

**Total PDFs:** 9

| Filename | Pages | Notes |
|---|---|---|
| ai-engineer.pdf | 1 | Extracted ~146 text lines; ~146 candidate topic-node labels No PII signals detected. No PII |
| backend.pdf | 1 | Extracted ~158 text lines; ~158 candidate topic-node labels No PII signals detected. No PII |
| computer-science.pdf | 1 | Extracted ~187 text lines; ~185 candidate topic-node labels No PII signals detected. No PII |
| cyber-security.pdf | 1 | Extracted ~242 text lines; ~241 candidate topic-node labels No PII signals detected. No PII |
| data-engineer.pdf | 1 | Extracted ~207 text lines; ~203 candidate topic-node labels No PII signals detected. No PII |
| devops.pdf | 1 | Extracted ~136 text lines; ~136 candidate topic-node labels No PII signals detected. No PII |
| frontend.pdf | 1 | Extracted ~124 text lines; ~124 candidate topic-node labels No PII signals detected. No PII |
| qa.pdf | 1 | Extracted ~129 text lines; ~129 candidate topic-node labels No PII signals detected. No PII |
| system-design.pdf | 1 | Extracted ~166 text lines; ~163 candidate topic-node labels No PII signals detected. No PII |

---

## C. Summary

| Metric | Value |
|---|---|
| FYP PDFs profiled | 5 |
| Roadmap PDFs profiled | 9 |
| FYP tables detected | 25 |
| Approx. FYP rows total | 288 |
| PII flags raised | 1 |

### ⚠️ PII Flags Requiring Attention

- FYP 2022.pdf: Roll-number pattern detected (140 matches, e.g. CS-18071) — must be discarded at extraction time.

---

## D. Next Step

Ram must review this report and confirm:
1. The column layout for each FYP year is correct.
2. PII flags are acknowledged and will be handled at extraction time.
3. Phase 1 extraction can proceed.

_Generated by `pipeline/core/profiler.py`. No records were loaded to the database._