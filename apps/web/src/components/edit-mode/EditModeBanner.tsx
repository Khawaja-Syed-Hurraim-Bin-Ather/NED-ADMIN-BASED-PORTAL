'use client';

import React from 'react';
import { useEditMode } from '../../context/EditModeContext';
import { Button, Badge } from '@educompass/ui';

export function EditModeBanner() {
  const {
    isEditMode,
    viewAsStudent,
    toggleViewAsStudent,
    activeScheme,
    pendingCount,
    setIsPendingDrawerOpen,
    activeRole,
  } = useEditMode();

  if (!isEditMode) return null;

  return (
    <aside
      aria-label="Institutional edit mode status"
      className={`border-b px-4 py-2 text-xs font-medium transition-colors ${
        viewAsStudent
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
          : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
      }`}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
          <span>
            {viewAsStudent ? (
              <>
                <strong>Viewing as Student:</strong> Showing published live version of {activeScheme}.
              </>
            ) : (
              <>
                <strong>Edit Mode:</strong> You are editing <strong>{activeScheme} (draft)</strong>. Students cannot see these changes yet.
              </>
            )}
          </span>
          {activeRole && (
            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 border-current opacity-80">
              Role: {activeRole}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={() => setIsPendingDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors cursor-pointer"
            >
              <span>Pending changes:</span>
              <span className="font-bold bg-amber-500 text-black px-1.5 py-0.2 rounded-full text-[10px]">
                {pendingCount}
              </span>
            </button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={toggleViewAsStudent}
            className="text-xs py-0.5 h-7 border-current text-inherit hover:bg-white/10"
          >
            {viewAsStudent ? '✏️ Return to Draft' : '👁️ View as student'}
          </Button>
        </div>
      </div>
    </aside>
  );
}
