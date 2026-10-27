/**
 * EduCompass Transcript CSV & Text Parser (Card E6)
 * Extracts completed courses, credit hours, and grades while strictly stripping
 * student names, roll numbers, and PII per Decision D6 and Non-negotiable Rule #6.
 */

import { gradeToPoints, calculateCGPA } from './index';

export interface ParsedCourse {
  courseCode: string;
  courseTitle: string;
  credits: number;
  grade: string;
  points: number;
  semesterNumber?: number;
}

export interface TranscriptParseResult {
  courses: ParsedCourse[];
  ignoredLinesCount: number;
  redactedPiiCount: number;
  errors: string[];
  totalAttemptedCredits: number;
  totalEarnedCredits: number;
  cgpa: number;
}

// Roll number pattern: letters + hyphen + digits (e.g. CS-24040, SE-21001)
const ROLL_NUMBER_PATTERN = /\b[A-Za-z]{2,}-\d{2,}\b/i;

// PII header keywords to discard immediately
const PII_HEADER_KEYWORDS = [
  'student name',
  'roll no',
  'roll number',
  'father name',
  'candidate',
  'seat no',
  'enrollment',
  'cnic',
  'batch',
];

// Course code pattern: e.g. CS-101, MT101, HS-101, SE-201
const COURSE_CODE_REGEX = /\b([A-Za-z]{2,4}[-\s]?\d{3}[A-Za-z]?)\b/;

// Valid grades regex
const GRADE_REGEX = /\b(A-|A|B\+|B-|B|C\+|C-|C|D\+|D|F|W|I|P)\b/i;

/**
 * Parses raw CSV, TSV, or copy-pasted portal text into structured course records.
 */
export function parseTranscript(rawText: string): TranscriptParseResult {
  const result: TranscriptParseResult = {
    courses: [],
    ignoredLinesCount: 0,
    redactedPiiCount: 0,
    errors: [],
    totalAttemptedCredits: 0,
    totalEarnedCredits: 0,
    cgpa: 0.0,
  };

  if (!rawText || !rawText.trim()) {
    return result;
  }

  const lines = rawText.split(/\r?\n/);
  let currentSemester = 1;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const originalLine = lines[lineIndex].trim();
    if (!originalLine) {
      continue;
    }

    const lowerLine = originalLine.toLowerCase();

    // 1. Check for PII / Student Identification Headers -> Discard & Redact
    if (
      PII_HEADER_KEYWORDS.some((kw) => lowerLine.includes(kw)) ||
      (ROLL_NUMBER_PATTERN.test(originalLine) && !COURSE_CODE_REGEX.test(originalLine))
    ) {
      result.redactedPiiCount++;
      continue;
    }

    // 2. Check for Semester / Term markers (e.g., "Semester 1", "Term 2")
    const semMatch = lowerLine.match(/(?:semester|term)\s*(\d+)/);
    if (semMatch) {
      currentSemester = parseInt(semMatch[1], 10);
      result.ignoredLinesCount++;
      continue;
    }

    // 3. Skip standard column header lines (e.g., "Course Code, Title, Credits, Grade")
    if (
      (lowerLine.includes('course') && lowerLine.includes('grade')) ||
      (lowerLine.includes('credit') && lowerLine.includes('grade'))
    ) {
      result.ignoredLinesCount++;
      continue;
    }

    // 4. Split by delimiter: Tab, Comma, or Semicolon
    let tokens: string[] = [];
    if (originalLine.includes('\t')) {
      tokens = originalLine.split('\t').map((t) => t.trim()).filter(Boolean);
    } else if (originalLine.includes(',')) {
      tokens = originalLine.split(',').map((t) => t.trim()).filter(Boolean);
    } else if (originalLine.includes(';')) {
      tokens = originalLine.split(';').map((t) => t.trim()).filter(Boolean);
    } else {
      // Space separated
      tokens = originalLine.split(/\s{2,}/).map((t) => t.trim()).filter(Boolean);
    }

    // 5. Identify Course Code
    const codeMatch = originalLine.match(COURSE_CODE_REGEX);
    if (!codeMatch) {
      result.ignoredLinesCount++;
      result.errors.push(`Line ${lineIndex + 1}: No valid course code found`);
      continue;
    }

    const courseCode = codeMatch[1].toUpperCase().replace(/\s+/, '-');

    // 6. Identify Grade
    let detectedGrade: string | null = null;
    let detectedCredits: number | null = null;
    let detectedTitle = '';

    // Search tokens from the right (usually [Code, Title, Cr, Grade])
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i].toUpperCase();
      if (!detectedGrade && GRADE_REGEX.test(token)) {
        const gm = token.match(GRADE_REGEX);
        if (gm) {
          detectedGrade = gm[1].toUpperCase();
          continue;
        }
      }

      const numVal = parseFloat(tokens[i]);
      if (detectedCredits === null && !isNaN(numVal) && numVal >= 1 && numVal <= 6) {
        detectedCredits = numVal;
        continue;
      }
    }

    // Fallback if tokens didn't separate neatly
    if (!detectedGrade) {
      const gm = originalLine.match(GRADE_REGEX);
      if (gm) detectedGrade = gm[1].toUpperCase();
    }

    if (detectedCredits === null) {
      // Common default credit hours in engineering is 3
      const numMatch = originalLine.match(/\b([1-6])(?:\.0)?\b/);
      if (numMatch) {
        detectedCredits = parseFloat(numMatch[1]);
      } else {
        detectedCredits = 3;
      }
    }

    if (!detectedGrade) {
      result.errors.push(
        `Line ${lineIndex + 1}: Course '${courseCode}' found without recognized grade`
      );
      continue;
    }

    // Extract title if present in tokens
    if (tokens.length >= 3) {
      const titleCandidate = tokens.find(
        (t) =>
          !t.includes(courseCode) &&
          t.toUpperCase() !== detectedGrade &&
          parseFloat(t) !== detectedCredits
      );
      if (titleCandidate) {
        detectedTitle = titleCandidate;
      }
    }

    // Clean any PII or roll numbers from title if present
    detectedTitle = detectedTitle.replace(ROLL_NUMBER_PATTERN, '').trim();

    const points = gradeToPoints(detectedGrade) ?? 0.0;

    result.courses.push({
      courseCode,
      courseTitle: detectedTitle || courseCode,
      credits: detectedCredits,
      grade: detectedGrade,
      points,
      semesterNumber: currentSemester,
    });
  }

  // Calculate Cumulative CGPA and credits summary
  let totalAttempted = 0;
  let totalEarned = 0;
  let totalQP = 0;

  for (const c of result.courses) {
    if (c.grade === 'W' || c.grade === 'I') {
      continue;
    }
    totalAttempted += c.credits;
    if (c.points > 0) {
      totalEarned += c.credits;
    }
    totalQP += c.credits * c.points;
  }

  result.totalAttemptedCredits = totalAttempted;
  result.totalEarnedCredits = totalEarned;
  result.cgpa =
    totalAttempted > 0
      ? Math.round((totalQP / totalAttempted + Number.EPSILON) * 100) / 100
      : 0.0;

  return result;
}
