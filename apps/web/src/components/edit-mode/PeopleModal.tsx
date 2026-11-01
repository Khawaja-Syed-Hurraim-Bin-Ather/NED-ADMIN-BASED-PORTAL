'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';

interface PeopleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'operator' | 'chairman' | 'vc';
  department: string;
  status: 'active' | 'suspended';
  allowedModules: string[];
  joinedAt: string;
}

const ALL_MODULES = ['courses', 'fyp', 'professors', 'careers', 'chatbot'] as const;
type Module = typeof ALL_MODULES[number];

const MODULE_LABELS: Record<Module, string> = {
  courses: 'Course Catalog',
  fyp: 'FYP Projects',
  professors: 'Professors',
  careers: 'Career Tracks',
  chatbot: 'Chatbot FAQs',
};

const ROLE_BADGE_COLOR: Record<AdminUser['role'], string> = {
  operator: 'var(--info)',
  chairman: 'var(--warning)',
  vc: 'var(--primary)',
};

const DEMO_USERS: AdminUser[] = [
  {
    id: 'u-001',
    fullName: 'Dr. Nadia Farooq',
    email: 'vc.demo@nedut.edu.pk',
    role: 'vc',
    department: 'Administration',
    status: 'active',
    allowedModules: ['courses', 'fyp', 'professors', 'careers', 'chatbot'],
    joinedAt: '2026-09-01',
  },
  {
    id: 'u-002',
    fullName: 'Prof. Ahsan Malik',
    email: 'chairman.demo@nedut.edu.pk',
    role: 'chairman',
    department: 'CISE',
    status: 'active',
    allowedModules: ['courses', 'fyp', 'professors'],
    joinedAt: '2026-09-15',
  },
  {
    id: 'u-003',
    fullName: 'Hira Baig',
    email: 'operator.demo@nedut.edu.pk',
    role: 'operator',
    department: 'CISE',
    status: 'active',
    allowedModules: ['fyp', 'professors', 'chatbot'],
    joinedAt: '2026-10-01',
  },
  {
    id: 'u-004',
    fullName: 'Tariq Hussain',
    email: 'operator2.demo@nedut.edu.pk',
    role: 'operator',
    department: 'CISE',
    status: 'suspended',
    allowedModules: ['careers'],
    joinedAt: '2026-10-10',
  },
];

export function PeopleModal({ isOpen, onClose }: PeopleModalProps) {
  const { activeRole } = useEditMode();
  const [users, setUsers] = useState<AdminUser[]>(DEMO_USERS);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDept, setInviteDept] = useState('CISE');
  const [inviteModules, setInviteModules] = useState<Set<Module>>(new Set(['fyp', 'chatbot']));
  const [inviteSuccess, setInviteSuccess] = useState(false);

  if (!isOpen) return null;

  // Guard: only chairman/vc can access
  if (activeRole !== 'chairman' && activeRole !== 'vc') {
    return null;
  }

  function toggleModule(mod: Module) {
    setInviteModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) next.delete(mod); else next.add(mod);
      return next;
    });
  }

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    // Demo: add to local list only
    const newUser: AdminUser = {
      id: `u-${Date.now()}`,
      fullName: inviteEmail.split('@')[0].replace('.', ' '),
      email: inviteEmail.trim(),
      role: 'operator',
      department: inviteDept,
      status: 'active',
      allowedModules: Array.from(inviteModules),
      joinedAt: new Date().toISOString().slice(0, 10),
    };
    setUsers((prev) => [...prev, newUser]);
    setInviteSuccess(true);
    setTimeout(() => {
      setShowInviteForm(false);
      setInviteSuccess(false);
      setInviteEmail('');
      setInviteDept('CISE');
      setInviteModules(new Set(['fyp', 'chatbot']));
    }, 1800);
  }

  function confirmRevoke(userId: string) {
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'suspended' } : u));
    setRevokeConfirmId(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="People & Access"
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)', color: 'var(--text)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>👥 People &amp; Access</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Manage admin operators and their module access
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => { setShowInviteForm(true); setInviteSuccess(false); }}
              style={{ padding: '7px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              + Invite New Operator
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18, padding: '2px 6px' }} aria-label="Close">✕</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flexGrow: 1 }}>
          {/* Invite Form */}
          {showInviteForm && (
            <div style={{ marginBottom: 20, padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--page)' }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>Invite New Operator</h3>
              {inviteSuccess ? (
                <p style={{ color: 'var(--success)', fontWeight: 500, fontSize: 13 }}>✅ Invitation sent successfully.</p>
              ) : (
                <form onSubmit={handleInvite}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>Institutional Email *</label>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="operator@nedut.edu.pk"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>Department Scope</label>
                      <input
                        type="text"
                        value={inviteDept}
                        onChange={(e) => setInviteDept(e.target.value)}
                        placeholder="e.g. CISE"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>Module Access</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {ALL_MODULES.map((mod) => (
                        <label key={mod} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={inviteModules.has(mod)}
                            onChange={() => toggleModule(mod)}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          {MODULE_LABELS[mod]}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ padding: '7px 16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Send Invitation
                    </button>
                    <button type="button" onClick={() => setShowInviteForm(false)} style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Users Table */}
          <div style={{ borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--page)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Name</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Role</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Modules</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 500, display: 'block', color: 'var(--text)' }}>{user.fullName}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{user.email}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: `${ROLE_BADGE_COLOR[user.role]}20`, color: ROLE_BADGE_COLOR[user.role], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 11 }}>
                      {user.allowedModules.join(', ') || '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600,
                        background: user.status === 'active' ? 'rgba(39,166,108,0.15)' : 'rgba(217,79,64,0.15)',
                        color: user.status === 'active' ? 'var(--success)' : 'var(--danger)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {user.status === 'active' && user.role !== 'vc' && (
                        revokeConfirmId === user.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => confirmRevoke(user.id)}
                              style={{ padding: '3px 8px', fontSize: 10, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setRevokeConfirmId(null)}
                              style={{ padding: '3px 8px', fontSize: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', borderRadius: 5, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRevokeConfirmId(user.id)}
                            style={{ padding: '3px 10px', fontSize: 10, border: '1px solid rgba(217,79,64,0.4)', background: 'rgba(217,79,64,0.08)', color: 'var(--danger)', borderRadius: 5, cursor: 'pointer' }}
                          >
                            Revoke
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)' }}>
            Demo data — live operator list is managed in the Supabase admin_users table with RLS enforcement.
          </p>
        </div>
      </div>
    </div>
  );
}
