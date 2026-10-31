'use client';

import React, { useState } from 'react';

interface LockedHintProps {
  requiredRole?: string;
  reason?: string;
  children?: React.ReactNode;
}

export function LockedHint({
  requiredRole = 'Chairman',
  reason,
  children,
}: LockedHintProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipText =
    reason ||
    `Only the ${requiredRole} can change this. Send a request or propose a change set.`;

  return (
    <div
      className="relative inline-flex items-center group cursor-not-allowed opacity-75"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip((prev) => !prev);
      }}
    >
      {children}
      <span className="ml-1 text-[11px] text-amber-400 select-none" aria-hidden="true">
        🔒
      </span>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-900 text-slate-100 text-[11px] leading-tight rounded-lg shadow-xl border border-slate-700 z-50 pointer-events-none text-center"
        >
          {tooltipText}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

