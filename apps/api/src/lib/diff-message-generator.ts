export interface ChangeDiffItem {
  recordName: string;
  field?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  op: 'insert' | 'update' | 'delete' | 'archive';
}

export interface ApprovalMessageParams {
  publicRef: string;
  approverName: string;
  approverRole: 'Chairman' | 'Vice Chancellor';
  approverEmail: string;
  requesterName: string;
  requesterRole: string;
  departmentName: string;
  moduleName: string;
  sectionName?: string;
  diffItems: ChangeDiffItem[];
  reason: string;
  impact: 'Minor' | 'Major';
  targetAudience?: string;
  expiresAt: string;
  code: string;
}

/**
 * Deterministic diff-to-sentence generator matching Section 4.3 specification.
 * Zero LLM invocation — 100% deterministic template.
 */
export function generateApprovalMessage(params: ApprovalMessageParams): string {
  const {
    publicRef,
    approverName,
    approverRole,
    approverEmail,
    requesterName,
    requesterRole,
    departmentName,
    moduleName,
    sectionName = 'General',
    diffItems,
    reason,
    impact,
    targetAudience = 'visible to all students',
    expiresAt,
    code,
  } = params;

  // Determine overall action summary
  const inserts = diffItems.filter((i) => i.op === 'insert').length;
  const updates = diffItems.filter((i) => i.op === 'update').length;
  const deletes = diffItems.filter((i) => i.op === 'delete' || i.op === 'archive').length;

  const actionParts: string[] = [];
  if (updates > 0) actionParts.push(`Edit ${updates} record${updates > 1 ? 's' : ''}`);
  if (inserts > 0) actionParts.push(`Add ${inserts} record${inserts > 1 ? 's' : ''}`);
  if (deletes > 0) actionParts.push(`Delete ${deletes} record${deletes > 1 ? 's' : ''}`);
  const actionSummary = actionParts.join(' | ') || 'Update records';

  // Format exact changes (capped at 20 lines)
  const maxLines = 20;
  const changeLines: string[] = [];

  for (let idx = 0; idx < Math.min(diffItems.length, maxLines); idx++) {
    const item = diffItems[idx];
    let line = `${idx + 1}. ${item.recordName}`;
    if (item.op === 'insert') {
      line += `: [New Record Created]`;
    } else if (item.op === 'delete' || item.op === 'archive') {
      line += `: [Marked for Deletion]`;
    } else if (item.field) {
      line += ` (${item.field}): "${item.oldValue ?? 'None'}" -> "${item.newValue ?? 'None'}"`;
    } else {
      line += `: Modified`;
    }
    changeLines.push(line);
  }

  if (diffItems.length > maxLines) {
    changeLines.push(`... and ${diffItems.length - maxLines} more, see the panel`);
  }

  const escalationHeader =
    approverRole === 'Vice Chancellor'
      ? `Contact the Vice Chancellor at <${approverEmail}>.\n\n`
      : '';

  return `${escalationHeader}APPROVAL REQUEST ${publicRef}
To: ${approverName}, ${approverRole}, ${approverEmail}
From: ${requesterName}, ${requesterRole}, Department of ${departmentName}
Module: ${moduleName} > ${sectionName}
Action: ${actionSummary}

Exact changes:
${changeLines.join('\n')}

Reason given: ${reason || 'Institutional curriculum / content update'}
Impact: ${impact}, ${targetAudience}
Expires: ${expiresAt}

To approve: log in to the EduCompass admin panel, open Approvals, and enter code ${code}.
This message does not give anyone permission by itself.`;
}

