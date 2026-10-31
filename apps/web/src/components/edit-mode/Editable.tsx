'use client';

import React, { useState, useEffect } from 'react';
import { useEditMode } from '../../context/EditModeContext';
import { LockedHint } from './LockedHint';

interface EditableProps {
  resource: string;
  tableName: string;
  recordId?: string;
  field: string;
  value: string;
  onSave?: (newValue: string) => void;
  className?: string;
  multiline?: boolean;
  requiredRole?: 'operator' | 'chairman' | 'vc';
  children?: React.ReactNode;
}

export function Editable({
  resource,
  tableName,
  recordId,
  field,
  value,
  onSave,
  className = '',
  multiline = false,
  requiredRole = 'operator',
  children,
}: EditableProps) {
  const { isEditMode, viewAsStudent, can, saveDraftItem } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // If not in Edit Mode or viewing as student, render standard view
  if (!isEditMode || viewAsStudent) {
    return <>{children || value}</>;
  }

  const isAllowed = can(resource, 'edit');

  if (!isAllowed) {
    return (
      <LockedHint requiredRole={requiredRole === 'vc' ? 'Vice Chancellor' : requiredRole === 'chairman' ? 'Department Chairman' : 'Authorized Operator'}>
        <span className={className}>{children || value}</span>
      </LockedHint>
    );
  }

  const handleCommit = async () => {
    if (tempValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveDraftItem(resource, tableName, recordId, { [field]: tempValue });
      if (res.success) {
        onSave?.(tempValue);
      }
    } catch (_) {}
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      handleCommit();
    } else if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <span className="relative inline-block w-full">
        {multiline ? (
          <textarea
            autoFocus
            rows={3}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className={`w-full text-xs p-1.5 rounded border border-amber-500 bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-amber-500 ${className}`}
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className={`w-full text-xs p-1 rounded border border-amber-500 bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-amber-500 ${className}`}
          />
        )}
        {isSaving && (
          <span className="absolute right-2 top-1 text-[10px] text-amber-400 animate-pulse">
            Saving...
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={`group relative inline-flex items-center gap-1 cursor-pointer rounded px-1 -mx-1 border border-transparent hover:border-amber-500/40 hover:bg-amber-500/10 transition-colors ${className}`}
      title="Click to edit field"
    >
      <span>{children || value}</span>
      <span className="opacity-0 group-hover:opacity-100 text-amber-400 text-xs transition-opacity select-none" aria-hidden="true">
        ✏️
      </span>
    </span>
  );
}
