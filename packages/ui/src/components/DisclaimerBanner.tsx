import React from 'react';
import { cn } from '../utils';

export interface DisclaimerBannerProps {
  className?: string;
  termsHref?: string;
}

export function DisclaimerBanner({
  className,
  termsHref = '/terms',
}: DisclaimerBannerProps) {
  return (
    <aside
      role="note"
      aria-label="EduCompass Advisory Disclaimer"
      className={cn(
        'w-full border-b border-amber-500/20 bg-amber-950/20 px-4 py-2 text-center text-xs text-amber-200/90 backdrop-blur-sm transition-colors',
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="font-medium">Notice:</span>
        <span>
          All match scores, prerequisite mappings, and recommendations are guidance estimates, not official university decisions.
        </span>
        <a
          href={termsHref}
          className="underline hover:text-amber-100 font-medium transition-colors ml-1"
        >
          Terms of Service &amp; Policies
        </a>
      </div>
    </aside>
  );
}
