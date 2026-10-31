'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';

export interface FypBranch {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  projectCount: number;
}

interface ManageBranchesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branches: FypBranch[];
  onUpdateBranches: (updated: FypBranch[]) => void;
  onMergeBranch: (sourceSlug: string, targetSlug: string) => void;
}

export function ManageBranchesDrawer({
  isOpen,
  onClose,
  branches,
  onUpdateBranches,
  onMergeBranch,
}: ManageBranchesDrawerProps) {
  const { saveDraftItem } = useEditMode();
  const [newBranchName, setNewBranchName] = useState('');
  const [mergeTargetMap, setMergeTargetMap] = useState<Record<string, string>>({});
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');

  if (!isOpen) return null;

  const handleToggleHide = (branch: FypBranch) => {
    const updatedStatus = !branch.isActive;
    saveDraftItem(
      'fyp',
      'domain_branches',
      branch.slug,
      { is_active: updatedStatus },
      'update',
      `${updatedStatus ? 'Unhide' : 'Hide'} FYP branch "${branch.name}"`
    );

    const updated = branches.map((b) =>
      b.id === branch.id ? { ...b, isActive: updatedStatus } : b
    );
    onUpdateBranches(updated);
  };

  const handleRename = (branch: FypBranch) => {
    if (!editingBranchName.trim() || editingBranchName === branch.name) {
      setEditingBranchId(null);
      return;
    }

    saveDraftItem(
      'fyp',
      'domain_branches',
      branch.slug,
      { name: editingBranchName.trim() },
      'update',
      `Rename FYP branch from "${branch.name}" to "${editingBranchName.trim()}"`
    );

    const updated = branches.map((b) =>
      b.id === branch.id ? { ...b, name: editingBranchName.trim() } : b
    );
    onUpdateBranches(updated);
    setEditingBranchId(null);
  };

  const handleMerge = (sourceBranch: FypBranch) => {
    const targetSlug = mergeTargetMap[sourceBranch.id];
    if (!targetSlug || targetSlug === sourceBranch.slug) return;

    const targetBranch = branches.find((b) => b.slug === targetSlug);
    if (!targetBranch) return;

    if (
      !confirm(
        `Are you sure you want to merge "${sourceBranch.name}" into "${targetBranch.name}"? All ${sourceBranch.projectCount} projects will be reassigned in your draft change set.`
      )
    ) {
      return;
    }

    saveDraftItem(
      'fyp',
      'domain_branches',
      `${sourceBranch.slug}->${targetSlug}`,
      { source_slug: sourceBranch.slug, target_slug: targetSlug },
      'update',
      `Merge FYP branch "${sourceBranch.name}" into "${targetBranch.name}" (${sourceBranch.projectCount} projects reassigned)`
    );

    onMergeBranch(sourceBranch.slug, targetSlug);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const slug = newBranchName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    const newBranch: FypBranch = {
      id: `branch-${Date.now()}`,
      name: newBranchName.trim(),
      slug,
      isActive: true,
      projectCount: 0,
    };

    saveDraftItem(
      'fyp',
      'domain_branches',
      slug,
      { name: newBranch.name, slug, is_active: true },
      'insert',
      `Add new FYP branch: "${newBranch.name}"`
    );

    onUpdateBranches([...branches, newBranch]);
    setNewBranchName('');
  };

  return (
    <aside
      role="dialog"
      aria-label="Manage FYP Branches"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0f1823] border-l border-[rgba(213,228,236,0.15)] shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Manage FYP Branches</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize domain taxonomy, merge tracks, and control student visibility.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {branches.map((branch) => {
          const isEditing = editingBranchId === branch.id;
          const otherBranches = branches.filter((b) => b.id !== branch.id);

          return (
            <div
              key={branch.id}
              className={`p-3 rounded-lg border transition-all ${
                branch.isActive
                  ? 'bg-[#162231] border-slate-700/60'
                  : 'bg-slate-900/40 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingBranchName}
                      onChange={(e) => setEditingBranchName(e.target.value)}
                      className="flex-1 bg-[#0b1119] border border-amber-400 rounded px-2 py-1 text-slate-100"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(branch)}
                      className="px-2 py-1 rounded bg-[#511030] text-white text-[11px]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingBranchId(null)}
                      className="px-2 py-1 rounded text-slate-400 text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{branch.name}</span>
                    <button
                      onClick={() => {
                        setEditingBranchId(branch.id);
                        setEditingBranchName(branch.name);
                      }}
                      className="text-slate-400 hover:text-amber-300 text-[11px]"
                    >
                      ✎
                    </button>
                  </div>
                )}

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {branch.projectCount} projects
                </span>
              </div>

              {/* Actions & Merge Bar */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleHide(branch)}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                    branch.isActive
                      ? 'text-amber-400 hover:bg-amber-950/40'
                      : 'text-emerald-400 hover:bg-emerald-950/40'
                  }`}
                >
                  {branch.isActive ? '👁 Hide from students' : '👁 Unhide'}
                </button>

                {/* Merge into another branch */}
                {branch.projectCount > 0 && otherBranches.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={mergeTargetMap[branch.id] || ''}
                      onChange={(e) =>
                        setMergeTargetMap({ ...mergeTargetMap, [branch.id]: e.target.value })
                      }
                      className="bg-[#0b1119] border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-300"
                    >
                      <option value="">Merge into...</option>
                      {otherBranches.map((ob) => (
                        <option key={ob.slug} value={ob.slug}>
                          {ob.name}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={!mergeTargetMap[branch.id]}
                      onClick={() => handleMerge(branch)}
                      className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[11px] disabled:opacity-40"
                    >
                      Merge
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Branch Input */}
        <form onSubmit={handleAddBranch} className="pt-3 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            placeholder="New branch name (e.g. Quantum Computing & Cryptography)..."
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            className="flex-1 bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!newBranchName.trim()}
            className="px-3.5 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-medium disabled:opacity-40 transition-colors"
          >
            + Add
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Branch modifications stage to draft</span>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </aside>
  );
}
