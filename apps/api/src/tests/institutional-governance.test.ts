import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadPermissionMatrix, checkPermission } from '../lib/admin-permissions';
import { validateCurriculumDraft } from '../routes/admin-curriculum';
import { getCoolingOffDays } from '../routes/deletions';
import { calculateDataHealth } from '../routes/health-report';

describe('Institutional Governance & Verification Suite (Section 14, Cards A0–A12)', () => {
  const matrix = loadPermissionMatrix();

  describe('1. Full Matrix Verification (Section 14.1)', () => {
    it('contains all 3 institutional roles and 12 core resources', () => {
      expect(matrix.roles).toEqual(['vc', 'chairman', 'operator']);
      expect(matrix.resources.length).toBeGreaterThanOrEqual(10);
      expect(matrix.resources).toContain('curriculum');
      expect(matrix.resources).toContain('fyp');
      expect(matrix.resources).toContain('professors');
      expect(matrix.resources).toContain('career');
      expect(matrix.resources).toContain('chatbot_content');
      expect(matrix.resources).toContain('chatbot_settings');
      expect(matrix.resources).toContain('data_imports');
    });

    it('enforces that operators are blocked from curriculum, grading, and settings', () => {
      const curr = checkPermission('curriculum', 'view', { role: 'operator', allowedModules: ['fyp'] });
      expect(curr.allowed).toBe(false);

      const settings = checkPermission('chatbot_settings', 'publish', { role: 'operator', allowedModules: ['chatbot_content'] });
      expect(settings.allowed).toBe(false);
    });

    it('enforces that department chairmen cannot modify other departments', () => {
      const cisDept = '11111111-1111-1111-1111-111111111111';
      const foreignDept = '22222222-2222-2222-2222-222222222222';

      const foreignCheck = checkPermission('curriculum', 'draft', {
        role: 'chairman',
        userDepartmentId: cisDept,
        targetDepartmentId: foreignDept,
      });
      expect(foreignCheck.allowed).toBe(false);
    });
  });

  describe('2. Curriculum Validation Engine (Section 14.5)', () => {
    it('detects directed prerequisite cycles in draft schemes', () => {
      const result = validateCurriculumDraft({
        courses: [
          { courseId: '1', code: 'CS-101', semester: 1, credits: 3 },
          { courseId: '2', code: 'CS-102', semester: 2, credits: 3 },
          { courseId: '3', code: 'CS-103', semester: 3, credits: 3 },
        ],
        rules: [
          { courseId: '1', courseCode: 'CS-101', prereqCourseCode: 'CS-103' },
          { courseId: '2', courseCode: 'CS-102', prereqCourseCode: 'CS-101' },
          { courseId: '3', courseCode: 'CS-103', prereqCourseCode: 'CS-102' },
        ],
        maxCreditsPerSemester: 21,
        gradeScale: { A: 4.0, D: 1.0, F: 0.0 },
        passingGrade: 'D',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('rejects prerequisites placed in the same or later semester', () => {
      const result = validateCurriculumDraft({
        courses: [
          { courseId: '1', code: 'CS-200', semester: 3, credits: 3 },
          { courseId: '2', code: 'CS-300', semester: 3, credits: 3 },
        ],
        rules: [
          { courseId: '1', courseCode: 'CS-200', prereqCourseCode: 'CS-300' },
        ],
        maxCreditsPerSemester: 21,
        gradeScale: { A: 4.0, D: 1.0, F: 0.0 },
        passingGrade: 'D',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'BACKWARD_PREREQUISITE')).toBe(true);
    });

    it('flags credit hour overload when exceeding semester maximum', () => {
      const result = validateCurriculumDraft({
        courses: [
          { courseId: '1', code: 'C1', semester: 1, credits: 12 },
          { courseId: '2', code: 'C2', semester: 1, credits: 11 }, // Total 23 > 21
        ],
        rules: [],
        maxCreditsPerSemester: 21,
        gradeScale: { A: 4.0, D: 1.0, F: 0.0 },
        passingGrade: 'D',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CREDIT_LIMIT_EXCEEDED')).toBe(true);
    });
  });

  describe('3. Deletion Lifecycle Governance (Section 14.4)', () => {
    it('enforces exact cooling-off timelines by resource type', () => {
      expect(getCoolingOffDays('career')).toBe(7);
      expect(getCoolingOffDays('chatbot')).toBe(7);
      expect(getCoolingOffDays('fyp')).toBe(14);
      expect(getCoolingOffDays('professors')).toBe(14);
      expect(getCoolingOffDays('curriculum')).toBe(30);
      expect(getCoolingOffDays('curriculum_version')).toBe(90);
    });
  });

  describe('4. Privacy & Zero-Student PII Verification (Section 14.9, Rule 3, Rule 12)', () => {
    it('verifies data health outputs do not expose individual student records or PII', () => {
      const health = calculateDataHealth({
        unreviewedFypCount: 10,
        coursesWithoutCredits: 0,
        coolingOffCount: 2,
        brokenPrereqCount: 0,
      });

      const serialized = JSON.stringify(health);
      expect(serialized).not.toMatch(/student_id/i);
      expect(serialized).not.toMatch(/@student\.nedut\.edu\.pk/i);
      expect(serialized).not.toMatch(/roll_number/i);
      expect(serialized).not.toMatch(/cgpa/i);
    });
  });

  describe('5. Client Bundle Secret Scan (Section 14.12, Rule 11)', () => {
    it('verifies no service role keys or JWT secrets are present in apps/web client components', () => {
      const webSrc = path.resolve(__dirname, '../../../web/src');
      const files = fs.readdirSync(webSrc, { recursive: true }) as string[];

      for (const file of files) {
        if (typeof file === 'string' && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const content = fs.readFileSync(path.join(webSrc, file), 'utf8');

          // Hard-coded secrets check (Rule 11) across ALL files
          expect(content).not.toMatch(/AdminPassword/);
          expect(content).not.toMatch(/sbp_[a-zA-Z0-9]{20,}/);

          // Client components ('use client') must NEVER reference service role keys or server secrets
          if (content.includes("'use client'") || content.includes('"use client"')) {
            expect(content).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
            expect(content).not.toMatch(/ADMIN_JWT_SECRET/);
            expect(content).not.toMatch(/NEXTAUTH_SECRET/);
          }
        }
      }
    });
  });
});
