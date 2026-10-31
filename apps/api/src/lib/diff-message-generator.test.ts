import { describe, it, expect } from 'vitest';
import { generateApprovalMessage, ChangeDiffItem } from './diff-message-generator';

describe('Deterministic Diff-to-Sentence Approval Message Generator (Section 4.3)', () => {
  it('generates standard operator to chairman approval message', () => {
    const diffs: ChangeDiffItem[] = [
      {
        recordName: 'Data Science Career Track',
        field: 'description',
        oldValue: 'Overview of modern data engineering',
        newValue: 'Updated industry roadmap for 2026',
        op: 'update',
      },
    ];

    const msg = generateApprovalMessage({
      publicRef: 'CIS-2026-0042',
      approverName: 'Dr. Muhammad Ali',
      approverRole: 'Chairman',
      approverEmail: 'chairman.cis@nedut.edu.pk',
      requesterName: 'Syed Hurraim',
      requesterRole: 'Data-entry operator',
      departmentName: 'Computer & Information Systems Engineering',
      moduleName: 'Career Hub',
      sectionName: 'Tracks',
      diffItems: diffs,
      reason: 'Align track with newly introduced semester 6 electives',
      impact: 'Minor',
      targetAudience: 'visible to all students',
      expiresAt: '2026-11-03 17:00 PKT',
      code: '849201',
    });

    expect(msg).toContain('APPROVAL REQUEST CIS-2026-0042');
    expect(msg).toContain('To: Dr. Muhammad Ali, Chairman, chairman.cis@nedut.edu.pk');
    expect(msg).toContain('From: Syed Hurraim, Data-entry operator, Department of Computer & Information Systems Engineering');
    expect(msg).toContain('Module: Career Hub > Tracks');
    expect(msg).toContain('Action: Edit 1 record');
    expect(msg).toContain('1. Data Science Career Track (description): "Overview of modern data engineering" -> "Updated industry roadmap for 2026"');
    expect(msg).toContain('Reason given: Align track with newly introduced semester 6 electives');
    expect(msg).toContain('Impact: Minor, visible to all students');
    expect(msg).toContain('To approve: log in to the EduCompass admin panel, open Approvals, and enter code 849201');
    expect(msg).toContain('This message does not give anyone permission by itself.');
  });

  it('generates VC escalation header when routed to Vice Chancellor', () => {
    const diffs: ChangeDiffItem[] = [
      {
        recordName: 'CS-218 Prerequisites',
        field: 'rule',
        oldValue: 'Requires CS-115',
        newValue: 'Requires CS-116',
        op: 'update',
      },
    ];

    const msg = generateApprovalMessage({
      publicRef: 'CIS-2026-0099',
      approverName: 'Dr. Sarosh Lodhi',
      approverRole: 'Vice Chancellor',
      approverEmail: 'vc@nedut.edu.pk',
      requesterName: 'Dr. Muhammad Ali',
      requesterRole: 'Department Chairman',
      departmentName: 'Computer & Information Systems Engineering',
      moduleName: 'Curriculum',
      sectionName: 'Prerequisites',
      diffItems: diffs,
      reason: 'Major scheme revision for Scheme 2026',
      impact: 'Major',
      targetAudience: 'visible to all students',
      expiresAt: '2026-11-03 17:00 PKT',
      code: '551940',
    });

    expect(msg).toContain('Contact the Vice Chancellor at <vc@nedut.edu.pk>.');
    expect(msg).toContain('APPROVAL REQUEST CIS-2026-0099');
    expect(msg).toContain('Impact: Major, visible to all students');
  });

  it('caps diff list at 20 lines with summary notice', () => {
    const diffs: ChangeDiffItem[] = [];
    for (let i = 1; i <= 25; i++) {
      diffs.push({
        recordName: `Course CS-${100 + i}`,
        field: 'credits',
        oldValue: 3,
        newValue: 4,
        op: 'update',
      });
    }

    const msg = generateApprovalMessage({
      publicRef: 'CIS-2026-0100',
      approverName: 'Dr. Muhammad Ali',
      approverRole: 'Chairman',
      approverEmail: 'chairman.cis@nedut.edu.pk',
      requesterName: 'Operator',
      requesterRole: 'Operator',
      departmentName: 'CISE',
      moduleName: 'Curriculum',
      diffItems: diffs,
      reason: 'Batch credit adjustment',
      impact: 'Major',
      expiresAt: '2026-11-03',
      code: '123456',
    });

    expect(msg).toContain('20. Course CS-120 (credits): "3" -> "4"');
    expect(msg).toContain('... and 5 more, see the panel');
    expect(msg).not.toContain('21. Course CS-121');
  });
});
