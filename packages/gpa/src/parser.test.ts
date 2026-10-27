import { describe, it, expect } from 'vitest';
import { parseTranscript } from './parser';

describe('Transcript CSV/Text Parser (Card E6)', () => {
  it('parses standard comma-separated course rows with semester headers', () => {
    const rawInput = `
Semester 1
Course Code, Course Title, Credit Hours, Grade
CS-101, Introduction to Computing, 3, A
MT-101, Calculus & Analytical Geometry, 4, B+
HS-101, Functional English, 2, A-

Semester 2
CS-102, Object Oriented Programming, 4, A
CS-105, Digital Logic Design, 3, B
    `.trim();

    const result = parseTranscript(rawInput);

    expect(result.courses).toHaveLength(5);
    expect(result.courses[0]).toMatchObject({
      courseCode: 'CS-101',
      credits: 3,
      grade: 'A',
      points: 4.0,
      semesterNumber: 1,
    });
    expect(result.courses[3]).toMatchObject({
      courseCode: 'CS-102',
      credits: 4,
      grade: 'A',
      points: 4.0,
      semesterNumber: 2,
    });
    expect(result.totalEarnedCredits).toBe(16);
    expect(result.cgpa).toBeGreaterThan(3.5);
  });

  it('strictly strips student names, roll numbers, and PII headers', () => {
    const rawInput = `
Student Name: Syed Hurraim
Roll Number: CS-24040
Batch: 2024
Department: Computer & Information Systems Engineering

CS-101, Introduction to Computing, 3, A
CS-102, Object Oriented Programming, 3, B
    `.trim();

    const result = parseTranscript(rawInput);

    expect(result.courses).toHaveLength(2);
    expect(result.redactedPiiCount).toBeGreaterThan(0);

    // Ensure no PII leaked into course titles or codes
    for (const c of result.courses) {
      expect(c.courseCode).not.toContain('CS-24040');
      expect(c.courseTitle).not.toContain('Hurraim');
    }
  });

  it('handles tab-separated portal export format', () => {
    const rawInput = [
      'Course\tTitle\tCr\tGrade',
      'CS-201\tData Structures & Algorithms\t4\tA',
      'CS-205\tComputer Architecture\t3\tB+',
      'MT-201\tDifferential Equations\t3\tA-',
    ].join('\n');

    const result = parseTranscript(rawInput);

    expect(result.courses).toHaveLength(3);
    expect(result.courses[0].courseCode).toBe('CS-201');
    expect(result.courses[0].credits).toBe(4);
    expect(result.courses[0].grade).toBe('A');
    expect(result.totalAttemptedCredits).toBe(10);
  });

  it('correctly handles F grades and W (withdrawn) marks', () => {
    const rawInput = `
CS-301, Database Systems, 3, A
CS-302, Operating Systems, 3, F
CS-303, Software Engineering, 3, W
    `.trim();

    const result = parseTranscript(rawInput);

    expect(result.courses).toHaveLength(3);
    expect(result.totalAttemptedCredits).toBe(6); // F counts as attempted, W does not
    expect(result.totalEarnedCredits).toBe(3);    // Only A is earned
    expect(result.cgpa).toBe(2.0);                // (3 * 4.0 + 3 * 0.0) / 6 = 2.0
  });

  it('returns clean error summaries for malformed or unrecognizable lines', () => {
    const rawInput = `
Valid Header
CS-101, Intro, 3, A
Invalid random text that is not a course at all
CS-999, Unknown Course, NaN, Z
    `.trim();

    const result = parseTranscript(rawInput);

    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].courseCode).toBe('CS-101');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles empty input gracefully', () => {
    const result = parseTranscript('');
    expect(result.courses).toHaveLength(0);
    expect(result.totalAttemptedCredits).toBe(0);
    expect(result.cgpa).toBe(0);
  });
});
