import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — EduCompass',
  description: 'How EduCompass collects, stores, and protects your data.',
};

const SECTIONS = [
  {
    id: 'what-we-collect',
    title: 'What We Collect',
    content: [
      {
        subtitle: 'Account data',
        text: 'When you register, we collect your email address, full name (optional), current semester, programme (CS/CSE/SE), career interests, and career goal. This is stored in Supabase under Row Level Security.',
      },
      {
        subtitle: 'GPA calculator data',
        text: 'Course grades entered into the GPA calculator are processed entirely in your browser. They are never sent to or stored on any server.',
      },
      {
        subtitle: 'Chatbot queries',
        text: 'Your chatbot questions are sent to our API for processing. Only the question text and retrieved document context are forwarded to an AI model — never your name, email, student ID, or any profile data.',
      },
      {
        subtitle: 'FYP shortlists',
        text: 'Projects you shortlist are saved to your profile in Supabase. Only you can see your shortlist.',
      },
    ],
  },
  {
    id: 'what-we-dont-collect',
    title: 'What We Never Collect',
    bullets: [
      'Student roll numbers or national ID numbers',
      'Academic transcripts from NED systems',
      'Financial or payment information',
      'Device location or GPS data',
      'Contacts or communication history',
      'Browsing history outside EduCompass',
    ],
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Data',
    bullets: [
      'To authenticate your session and protect your account',
      'To personalise career track suggestions and FYP recommendations',
      'To process AI chatbot queries (question + retrieved context only)',
      'To maintain an audit log of admin actions for security compliance',
      'To fulfil account deletion requests within 7 days',
    ],
  },
  {
    id: 'sharing',
    title: 'Who We Share Data With',
    content: [
      {
        subtitle: 'Supabase',
        text: 'Our database and authentication provider. Data is stored in eu-central-1 region. Supabase processes data per their privacy policy.',
      },
      {
        subtitle: 'AI providers (Gemini / Grok)',
        text: 'We send your question and retrieved document context to AI providers for chatbot responses. We never include personal data in these requests.',
      },
      {
        subtitle: 'No other third parties',
        text: 'We do not sell, rent, or share your data with any other parties, advertisers, or analytics providers.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    bullets: [
      'All tables with user data are protected by Supabase Row Level Security (RLS)',
      'API keys and secrets are stored server-side only — never in client bundles',
      'HTTPS is enforced for all connections',
      'Passwords are managed by Supabase Auth (bcrypt hashing)',
      'Admin actions are logged in the audit_log table',
    ],
  },
  {
    id: 'retention',
    title: 'Data Retention & Deletion',
    text: `Your data is retained as long as your account is active. You may submit a deletion request at any time through your Profile & Settings page. Requests are processed within 7 days. After deletion, your data is permanently removed from our database. Audit log entries referencing your account are anonymised, not deleted, to maintain integrity of the audit trail.`,
  },
  {
    id: 'cookies',
    title: 'Cookies & Sessions',
    text: 'We use a single session cookie set by Supabase Auth to maintain your login. We do not use advertising cookies, tracking pixels, or third-party analytics cookies.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10">
          <Link href="/terms" className="mb-6 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            ← Terms &amp; Disclaimer
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-1 text-sm text-slate-400">Last updated: October 2026 · EduCompass FYP Project</p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300">
          {SECTIONS.map((sec) => (
            <section key={sec.id} id={sec.id}>
              <h2 className="mb-3 text-lg font-semibold text-white">{sec.title}</h2>
              {'bullets' in sec && sec.bullets && (
                <ul className="list-disc space-y-1 pl-5">
                  {sec.bullets.map((b) => <li key={b}>{b}</li>)}
                </ul>
              )}
              {'text' in sec && sec.text && <p>{sec.text}</p>}
              {'content' in sec && sec.content && (
                <div className="space-y-4">
                  {sec.content.map((item) => (
                    <div key={item.subtitle} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                      <p className="mb-1 font-semibold text-white">{item.subtitle}</p>
                      <p>{item.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-slate-300 transition-colors">Help Centre</Link>
        </div>
      </div>
    </main>
  );
}
