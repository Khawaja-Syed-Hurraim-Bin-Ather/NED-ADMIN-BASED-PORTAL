'use client';

// Execute immediately when the client bundle evaluates — BEFORE React hydration starts.
if (typeof window !== 'undefined') {
  // 1. Intercept and swallow Chrome extension content-script errors (e.g. Bitdefender Anti-Tracker 200.js M_ID crash)
  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      const isExtension =
        event.filename?.includes('chrome-extension://') ||
        event.message?.includes('M_ID') ||
        event.message?.includes('bis_skin_checked');

      if (isExtension) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason?.stack || event.reason?.message || event.reason || '');
      if (reasonStr.includes('chrome-extension://') || reasonStr.includes('M_ID')) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );

  // 2. Intercept console.error to suppress React hydration mismatch overlays caused by extension-injected attributes
  const origConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    const fullLog = args
      .map((a) => (typeof a === 'string' ? a : (a as Error)?.message || ''))
      .join(' ');

    if (
      fullLog.includes('bis_skin_checked') ||
      (fullLog.includes('hydrat') && fullLog.includes('bis_skin_checked')) ||
      fullLog.includes('chrome-extension://') ||
      fullLog.includes("reading 'M_ID'")
    ) {
      return; // Swallow extension-induced warning so Next.js overlay does not trigger
    }

    return origConsoleError.apply(console, args);
  };
}

export function ExtensionErrorGuard() {
  return null;
}
