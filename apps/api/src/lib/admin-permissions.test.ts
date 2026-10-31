import { describe, it, expect, beforeAll } from 'vitest';
import { loadPermissionMatrix, checkPermission } from './admin-permissions';

describe('Admin Governance & Permission Matrix (admin_permissions.json)', () => {
  let matrix: any;

  beforeAll(() => {
    matrix = loadPermissionMatrix();
  });

  it('loads valid permission matrix matching schema_version 1', () => {
    expect(matrix.schema_version).toBe(1);
    expect(matrix.roles).toContain('vc');
    expect(matrix.roles).toContain('chairman');
    expect(matrix.roles).toContain('operator');
    expect(matrix.resources).toContain('curriculum');
    expect(matrix.resources).toContain('fyp');
    expect(matrix.resources).toContain('chatbot_settings');
  });

  // VC Permissions
  describe('Vice Chancellor (vc) permissions', () => {
    it('allows VC full view and draft on curriculum', () => {
      const viewCheck = checkPermission('curriculum', 'view', { role: 'vc' });
      expect(viewCheck.allowed).toBe(true);

      const draftCheck = checkPermission('curriculum', 'draft', { role: 'vc' });
      expect(draftCheck.allowed).toBe(true);

      const pubCheck = checkPermission('curriculum', 'publish', { role: 'vc' });
      expect(pubCheck.allowed).toBe(true);
    });

    it('allows VC to configure chatbot_settings', () => {
      const pubCheck = checkPermission('chatbot_settings', 'publish', { role: 'vc' });
      expect(pubCheck.allowed).toBe(true);
    });

    it('denies VC drafting student deletion requests directly', () => {
      const draftCheck = checkPermission('student_deletion_requests', 'draft', { role: 'vc' });
      expect(draftCheck.allowed).toBe(false);
      expect(draftCheck.decision).toBe('deny');
    });

    it('allows VC purging records after cooling off', () => {
      const purgeCheck = checkPermission('fyp', 'purge', { role: 'vc' });
      expect(purgeCheck.allowed).toBe(true);
      expect(purgeCheck.decision).toBe('allow_after_cooling_off');
    });
  });

  // Chairman Permissions
  describe('Department Chairman (chairman) permissions', () => {
    const cisDept = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const eeDept = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

    it('allows chairman to view and draft in own department', () => {
      const ownCheck = checkPermission('curriculum', 'view', {
        role: 'chairman',
        userDepartmentId: cisDept,
        targetDepartmentId: cisDept,
      });
      expect(ownCheck.allowed).toBe(true);
    });

    it('strictly denies chairman acting on another department', () => {
      const otherCheck = checkPermission('curriculum', 'view', {
        role: 'chairman',
        userDepartmentId: cisDept,
        targetDepartmentId: eeDept,
      });
      expect(otherCheck.allowed).toBe(false);
    });

    it('allows chairman publishing minor curriculum changes directly', () => {
      const minorCheck = checkPermission('curriculum', 'publish', {
        role: 'chairman',
        userDepartmentId: cisDept,
        targetDepartmentId: cisDept,
        impact: 'minor',
      });
      expect(minorCheck.allowed).toBe(true);
    });

    it('routes major curriculum changes to Vice Chancellor approval', () => {
      const majorCheck = checkPermission('curriculum', 'publish', {
        role: 'chairman',
        userDepartmentId: cisDept,
        targetDepartmentId: cisDept,
        impact: 'major',
      });
      expect(majorCheck.allowed).toBe(false);
      expect(majorCheck.decision).toBe('needs_vc_approval');
    });

    it('denies chairman accessing chatbot_settings or university departments', () => {
      const csCheck = checkPermission('chatbot_settings', 'view', { role: 'chairman' });
      expect(csCheck.allowed).toBe(false);
      expect(csCheck.decision).toBe('deny');

      const deptCheck = checkPermission('departments', 'view', { role: 'chairman' });
      expect(deptCheck.allowed).toBe(false);
      expect(deptCheck.decision).toBe('deny');
    });

    it('denies chairman purging live records', () => {
      const purgeCheck = checkPermission('fyp', 'purge', { role: 'chairman' });
      expect(purgeCheck.allowed).toBe(false);
      expect(purgeCheck.decision).toBe('deny');
    });
  });

  // Operator Permissions
  describe('Data-Entry Operator (operator) permissions', () => {
    it('strictly denies operator any access to curriculum', () => {
      const viewCheck = checkPermission('curriculum', 'view', { role: 'operator' });
      expect(viewCheck.allowed).toBe(false);
      expect(viewCheck.decision).toBe('deny');

      const draftCheck = checkPermission('curriculum', 'draft', { role: 'operator' });
      expect(draftCheck.allowed).toBe(false);
      expect(draftCheck.decision).toBe('deny');
    });

    it('allows operator drafting only on assigned modules', () => {
      const assignedCheck = checkPermission('fyp', 'draft', {
        role: 'operator',
        allowedModules: ['fyp', 'professors'],
      });
      expect(assignedCheck.allowed).toBe(true);

      const unassignedCheck = checkPermission('career', 'draft', {
        role: 'operator',
        allowedModules: ['fyp', 'professors'],
      });
      expect(unassignedCheck.allowed).toBe(false);
      expect(unassignedCheck.decision).toBe('allow_assigned_modules');
    });

    it('denies operator direct publish — always requires approval', () => {
      const pubCheck = checkPermission('fyp', 'publish', {
        role: 'operator',
        allowedModules: ['fyp'],
      });
      expect(pubCheck.allowed).toBe(false);
      expect(pubCheck.decision).toBe('deny');
    });

    it('allows operator requesting deletion through approval flow only', () => {
      const delCheck = checkPermission('fyp', 'request_delete', {
        role: 'operator',
        allowedModules: ['fyp'],
      });
      expect(delCheck.allowed).toBe(false);
      expect(delCheck.decision).toBe('needs_approval');
    });

    it('restricts operator history to own submissions only', () => {
      const ownHist = checkPermission('fyp', 'view_history', {
        role: 'operator',
        allowedModules: ['fyp'],
        isOwnSubmission: true,
      });
      expect(ownHist.allowed).toBe(true);

      const otherHist = checkPermission('fyp', 'view_history', {
        role: 'operator',
        allowedModules: ['fyp'],
        isOwnSubmission: false,
      });
      expect(otherHist.allowed).toBe(false);
      expect(otherHist.decision).toBe('own_submissions_only');
    });
  });
});
