-- ============================================================================
-- EduCompass Initial Seed Data
-- ============================================================================

-- 1. NED UNIVERSITY
INSERT INTO public.universities (id, name, short_name, city)
VALUES ('a0000000-0000-0000-0000-000000000001', 'NED University of Engineering & Technology', 'NED', 'Karachi')
ON CONFLICT (name) DO NOTHING;

-- 2. PROGRAMS
INSERT INTO public.programs (id, university_id, code, name, degree, max_credits_per_semester, passing_grade)
VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'SE', 'BS Software Engineering', 'Bachelor', 18, 'D'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'CIS', 'BS Computer Science & Information Technology', 'Bachelor', 18, 'D'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'CSE', 'BE Computer Systems Engineering', 'Bachelor', 18, 'D')
ON CONFLICT (university_id, code) DO NOTHING;

-- 3. SAMPLE NED SE COURSES
INSERT INTO public.courses (id, program_id, code, code_normalized, title, credits, semester, category)
VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'CT-175', 'ct175', 'Programming Fundamentals', 4, 1, 'core_computing'),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'MT-173', 'mt173', 'Calculus', 3, 1, 'mathematics'),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'CT-174', 'ct174', 'Object Oriented Programming', 4, 2, 'core_computing'),
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'CT-259', 'ct259', 'Data Structures & Algorithms', 4, 3, 'core_computing'),
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'CT-260', 'ct260', 'Database Management Systems', 4, 4, 'core_computing'),
('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'SE-499', 'se499', 'Final Year Project', 6, 7, 'fyp')
ON CONFLICT (program_id, code_normalized) DO NOTHING;

-- 4. PREREQUISITE RULES
INSERT INTO public.prerequisite_rules (course_id, rule_tree)
VALUES
('c0000000-0000-0000-0000-000000000003', '{"type": "course", "courseId": "c0000000-0000-0000-0000-000000000001", "minGrade": "D"}'::jsonb),
('c0000000-0000-0000-0000-000000000004', '{"type": "course", "courseId": "c0000000-0000-0000-0000-000000000003", "minGrade": "D"}'::jsonb),
('c0000000-0000-0000-0000-000000000005', '{"type": "course", "courseId": "c0000000-0000-0000-0000-000000000004", "minGrade": "D"}'::jsonb),
('c0000000-0000-0000-0000-000000000006', '{"type": "and", "children": [{"type": "course", "courseId": "c0000000-0000-0000-0000-000000000004", "minGrade": "D"}, {"type": "course", "courseId": "c0000000-0000-0000-0000-000000000005", "minGrade": "D"}]}'::jsonb)
ON CONFLICT (course_id) DO NOTHING;

-- 5. CAREER TRACKS
INSERT INTO public.career_tracks (title, slug, description)
VALUES
('Artificial Intelligence & Machine Learning', 'ai-ml', 'Deep learning, LLMs, computer vision, and data engineering pathways.'),
('Full-Stack Web Engineering', 'full-stack-web', 'Modern web architectures with TypeScript, React, Next.js, and cloud backends.'),
('Cloud Architecture & DevOps', 'cloud-devops', 'CI/CD, Kubernetes, Docker, Infrastructure as Code, and AWS/GCP deployments.'),
('Cybersecurity & InfoSec', 'cybersecurity', 'Network security, penetration testing, reverse engineering, and threat intelligence.')
ON CONFLICT (slug) DO NOTHING;

-- 6. PRELOADED CHATBOT ANSWERS (Layers 1-3 Fallback)
INSERT INTO public.chatbot_answers (question_pattern, answer_text, category, confidence_threshold)
VALUES
('fyp,final year project,how to start fyp', 'To start your FYP at NED University: 1. Explore past approved projects in the FYP Portal. 2. Shortlist domains and supervisors whose research matches your interests. 3. Form a 3-4 member team. 4. Submit an initial proposal by 7th semester.', 'fyp', 0.8),
('prerequisite,backlog,failed course', 'If you fail a prerequisite course, you cannot enroll in downstream courses until you pass it. Check the Prerequisite Explorer to see the cascading delays on your graduation timeline.', 'prerequisites', 0.8),
('gpa,cgpa,passing grade', 'The minimum passing grade at NED University is D (1.0 grade point). To maintain good academic standing and scholarship eligibility, aim for a CGPA of 3.0 or higher.', 'academics', 0.8),
('supervisor,professor,outreach', 'Check the Professor Directory on EduCompass. You can review faculty research areas and automatically draft a personalized outreach email to discuss project supervision.', 'professors', 0.8);

-- 7. INITIAL SAMPLE PROFESSORS
INSERT INTO public.professors (name, department, research_areas, contact_route, is_simulated, review_status)
VALUES
('Dr. Muhammad Ali', 'Computer Science & Information Technology', ARRAY['Artificial Intelligence', 'Natural Language Processing', 'Computer Vision'], 'mailto:mali@neduet.edu.pk', false, 'approved'),
('Dr. Fatima Zahra', 'Software Engineering', ARRAY['Software Architecture', 'Cloud Computing', 'DevOps'], 'mailto:fzahra@neduet.edu.pk', false, 'approved'),
('Dr. Tariq Mehmood', 'Computer Systems Engineering', ARRAY['Embedded Systems', 'IoT', 'Robotics'], 'mailto:tariqm@neduet.edu.pk', false, 'approved');
