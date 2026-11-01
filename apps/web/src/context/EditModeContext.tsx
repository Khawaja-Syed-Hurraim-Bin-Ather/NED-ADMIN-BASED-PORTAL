'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AdminRole = 'operator' | 'chairman' | 'vc';

export interface PendingChangeItem {
  id: string;
  change_set_id: string;
  table_name: string;
  record_id?: string;
  op: 'insert' | 'update' | 'delete' | 'archive';
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  created_at: string;
}

export interface WorkingChangeSet {
  id: string;
  resource: string;
  title: string;
  status: string;
  impact: 'minor' | 'major';
  created_at: string;
}

export interface EditModeContextType {
  isEditMode: boolean;
  toggleEditMode: () => void;
  setIsEditMode: (val: boolean) => void;

  viewAsStudent: boolean;
  toggleViewAsStudent: () => void;
  setViewAsStudent: (val: boolean) => void;

  activeRole: AdminRole | null;
  setActiveRole: (role: AdminRole | null) => void;

  activeScheme: string;
  setActiveScheme: (scheme: string) => void;

  pendingItems: PendingChangeItem[];
  pendingCount: number;
  workingChangeSet: WorkingChangeSet | null;

  isPendingDrawerOpen: boolean;
  setIsPendingDrawerOpen: (val: boolean) => void;

  adminToken: string | null;
  currentUser: { id: string; email: string; fullName: string; role: AdminRole; allowedModules?: string[] } | null;

  can: (resource: string, action: string, context?: Record<string, any>) => boolean;
  saveDraftItem: (
    resource: string,
    tableName: string,
    recordId: string | undefined,
    patch: Record<string, any>,
    op?: 'insert' | 'update' | 'delete' | 'archive',
    title?: string
  ) => Promise<{ success: boolean; changeSetId?: string; item?: any; error?: string }>;
  discardItem: (itemId: string) => Promise<boolean>;
  discardAll: () => Promise<boolean>;
  refreshWorkingSet: () => Promise<void>;
  setDemoAccount: (role: AdminRole) => Promise<void>;
  signOutAdmin: () => void;
  loginAdmin: (credentials: { email: string; password: string }) => Promise<{ success: boolean; otpRequired?: boolean; email?: string; otpHint?: string; error?: string }>;
  verifyAdminOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
}

const EditModeContext = createContext<EditModeContextType | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewAsStudent, setViewAsStudent] = useState(false);
  const [activeRole, setActiveRoleState] = useState<AdminRole | null>(null);
  const [activeScheme, setActiveScheme] = useState('Scheme 2026');
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; fullName: string; role: AdminRole; allowedModules?: string[] } | null>(null);

  const [workingChangeSet, setWorkingChangeSet] = useState<WorkingChangeSet | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingChangeItem[]>([]);
  const [isPendingDrawerOpen, setIsPendingDrawerOpen] = useState(false);

  // Load stored admin session from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('educompass_admin_token');
      const storedUser = localStorage.getItem('educompass_admin_user');
      const storedEdit = localStorage.getItem('educompass_edit_mode') === 'true';
      const storedScheme = localStorage.getItem('educompass_active_scheme');

      if (storedToken && storedUser) {
        const u = JSON.parse(storedUser);
        setAdminToken(storedToken);
        setCurrentUser(u);
        setActiveRoleState(u.role);
        if (storedEdit) setIsEditMode(true);
      }
      if (storedScheme) setActiveScheme(storedScheme);
    } catch (_) {}
  }, []);

  const setActiveRole = (role: AdminRole | null) => {
    setActiveRoleState(role);
  };

  const toggleEditMode = () => {
    const next = !isEditMode;
    setIsEditMode(next);
    localStorage.setItem('educompass_edit_mode', String(next));
    if (!next) setViewAsStudent(false);
  };

  const toggleViewAsStudent = () => {
    setViewAsStudent((prev) => !prev);
  };

  // Switch demo persona
  const setDemoAccount = useCallback(async (role: AdminRole) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/auth/demo-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const json = await res.json();
        const token = json.data?.token;
        const user = json.data?.user;
        if (token && user) {
          setAdminToken(token);
          setCurrentUser(user);
          setActiveRoleState(role);
          localStorage.setItem('educompass_admin_token', token);
          localStorage.setItem('educompass_admin_user', JSON.stringify(user));
        }
      }
    } catch (_) {}
  }, []);

  // Two-step login: Step 1 — email + password → receives sessionId + OTP hint
  const loginAdmin = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error?.message || 'Login failed' };
      }
      return {
        success: true,
        otpRequired: true,
        email: json.data?.email as string | undefined,
        otpHint: json.data?.testCodeHint as string | undefined,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  // Step 2 — OTP verification → receives token + user, persists session
  const verifyAdminOtp = useCallback(async (email: string, code: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        return { success: false, error: json.error?.message || 'Invalid code' };
      }
      const token: string = json.data?.token;
      const user = json.data?.user;
      if (token && user) {
        setAdminToken(token);
        setCurrentUser(user);
        setActiveRoleState(user.role);
        setIsEditMode(true);
        localStorage.setItem('educompass_admin_token', token);
        localStorage.setItem('educompass_admin_user', JSON.stringify(user));
        localStorage.setItem('educompass_edit_mode', 'true');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  const signOutAdmin = () => {
    setAdminToken(null);
    setCurrentUser(null);
    setActiveRoleState(null);
    setIsEditMode(false);
    setViewAsStudent(false);
    localStorage.removeItem('educompass_admin_token');
    localStorage.removeItem('educompass_admin_user');
    localStorage.removeItem('educompass_edit_mode');
  };

  // Fetch pending working set
  const refreshWorkingSet = useCallback(async () => {
    if (!adminToken) {
      setWorkingChangeSet(null);
      setPendingItems([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content/working-set`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setWorkingChangeSet(data.changeSet || null);
        setPendingItems(data.items || []);
      }
    } catch (_) {}
  }, [adminToken]);

  useEffect(() => {
    if (adminToken && isEditMode) {
      refreshWorkingSet();
    }
  }, [adminToken, isEditMode, refreshWorkingSet]);

  // Client-side permission helper matching admin_permissions.json
  const can = useCallback((resource: string, action: string, _context?: Record<string, any>): boolean => {
    if (!activeRole) return false;
    if (activeRole === 'vc') return true;

    // Chairman rules
    if (activeRole === 'chairman') {
      if (resource === 'curriculum') {
        // Chairman can view, edit, add courses; cannot delete whole schemes directly
        return action !== 'purge';
      }
      if (resource === 'admin_accounts') {
        // Can invite operators only
        return action === 'invite_operator' || action === 'view';
      }
      return true;
    }

    // Operator rules
    if (activeRole === 'operator') {
      if (resource === 'curriculum') return action === 'view' || action === 'propose';
      const allowed = currentUser?.allowedModules || ['fyp', 'professors', 'career', 'chatbot'];
      const mod = resource.replace('_content', '');
      return allowed.includes(mod) && (action === 'draft' || action === 'view' || action === 'edit');
    }

    return false;
  }, [activeRole, currentUser]);

  // saveDraftItem server action
  const saveDraftItem = async (
    resource: string,
    tableName: string,
    recordId: string | undefined,
    patch: Record<string, any>,
    op: 'insert' | 'update' | 'delete' | 'archive' = 'update',
    title?: string
  ) => {
    if (!adminToken) {
      return { success: false, error: 'Admin session required' };
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content/working-set/item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          resource,
          tableName,
          recordId,
          op,
          patch,
          title,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error?.message || 'Failed to save draft change' };
      }
      await refreshWorkingSet();
      return { success: true, changeSetId: data.changeSetId, item: data.item };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error saving draft' };
    }
  };

  const discardItem = async (itemId: string): Promise<boolean> => {
    if (!adminToken) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content/working-set/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        await refreshWorkingSet();
        return true;
      }
    } catch (_) {}
    return false;
  };

  const discardAll = async (): Promise<boolean> => {
    if (!adminToken) return false;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/content/working-set`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      if (res.ok) {
        setWorkingChangeSet(null);
        setPendingItems([]);
        return true;
      }
    } catch (_) {}
    return false;
  };

  return (
    <EditModeContext.Provider
      value={{
        isEditMode,
        toggleEditMode,
        setIsEditMode,
        viewAsStudent,
        toggleViewAsStudent,
        setViewAsStudent,
        activeRole,
        setActiveRole,
        activeScheme,
        setActiveScheme,
        pendingItems,
        pendingCount: pendingItems.length,
        workingChangeSet,
        isPendingDrawerOpen,
        setIsPendingDrawerOpen,
        adminToken,
        currentUser,
        can,
        saveDraftItem,
        discardItem,
        discardAll,
        refreshWorkingSet,
        setDemoAccount,
        signOutAdmin,
        loginAdmin,
        verifyAdminOtp,
      }}
    >
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const ctx = useContext(EditModeContext);
  if (!ctx) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return ctx;
}

