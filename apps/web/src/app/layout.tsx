import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduCompass — Academic & Career Navigation',
  description:
    'EduCompass helps NED CISE students see the next step with context — FYP discovery, professor matching, prerequisite planning, career roadmaps, and AI guidance.',
};

export const viewport: Viewport = {
  themeColor: '#0d141d',
};

import { DisclaimerBanner } from '@educompass/ui';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased" suppressHydrationWarning>
        <DisclaimerBanner termsHref="/terms" />
        <div id="toast-region" className="toast-region" aria-live="polite" aria-atomic="true" />
        <div id="modal-root" />
        {children}
      </body>
    </html>
  );
}
