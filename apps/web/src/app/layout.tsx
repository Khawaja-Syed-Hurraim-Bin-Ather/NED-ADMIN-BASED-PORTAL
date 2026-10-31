import type { Metadata, Viewport } from 'next';
import './globals.css';
import { EditModeProvider } from '../context/EditModeContext';

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
      <body className="min-h-screen bg-page text-text font-sans antialiased" suppressHydrationWarning>
        <EditModeProvider>
          {children}
        </EditModeProvider>
        <div id="toast-region" className="toast-region" aria-live="polite" aria-atomic="true" suppressHydrationWarning />
        <div id="modal-root" suppressHydrationWarning />
      </body>
    </html>
  );
}

