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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Intercept setAttribute to stop extensions adding bis_skin_checked
                  var origSetAttr = Element.prototype.setAttribute;
                  Element.prototype.setAttribute = function(name, value) {
                    if (name === 'bis_skin_checked') return;
                    return origSetAttr.apply(this, arguments);
                  };
                  // Suppress console.error for bis_skin_checked extension hydration mismatch
                  var origError = console.error;
                  console.error = function() {
                    for (var i = 0; i < arguments.length; i++) {
                      var arg = arguments[i];
                      if (typeof arg === 'string' && (arg.indexOf('bis_skin_checked') !== -1 || (arg.indexOf('hydrat') !== -1 && arg.indexOf('bis_skin') !== -1))) {
                        return;
                      }
                    }
                    return origError.apply(console, arguments);
                  };
                  // Mutation observer to clean any injected attributes before React mounts
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && m.attributeName === 'bis_skin_checked') {
                        m.target.removeAttribute('bis_skin_checked');
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['bis_skin_checked']
                  });
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
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

