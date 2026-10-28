import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EduCompass — NED University CISE Student Portal',
  description:
    'Official academic planning and guidance platform for the Department of Computer & Information Systems Engineering, NED University of Engineering & Technology, Karachi.',
};

export const viewport: Viewport = {
  themeColor: '#511030',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-page text-text font-sans antialiased" suppressHydrationWarning>
        <div id="toast-region" className="toast-region" aria-live="polite" aria-atomic="true" />
        <div id="modal-root" />
        {children}
      </body>
    </html>
  );
}

