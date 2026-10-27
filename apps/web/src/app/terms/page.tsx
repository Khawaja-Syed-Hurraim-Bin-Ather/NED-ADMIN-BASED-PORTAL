import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Disclaimer — EduCompass',
  description: 'Terms of use, disclaimers, privacy summary, and guidance scope for EduCompass NED University student tool.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            ← Back to EduCompass
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Terms &amp; Disclaimer</h1>
          <p className="mt-1 text-sm text-slate-400">Last updated: October 2026 · NED University Dept. of CISE</p>

          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            ⚠️ <strong>All recommendations, scores, and career guidance on EduCompass are estimates only.</strong>{' '}
            They are not official university decisions, academic records, or professional advice.
          </div>
        </div>

        <nav className="mb-8 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Contents</p>
          <ol className="space-y-1 text-sm text-slate-400">
            {['Scope of Service', 'Guidance Estimates', 'AI-Generated Content', 'Data & Privacy', 'FYP Data Sources', 'Deletion Rights', 'Contact'].map((item, i) => (
              <li key={item}>
                <a href={`#section-${i + 1}`} className="hover:text-indigo-400 transition-colors">
                  {i + 1}. {item}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10 text-sm leading-relaxed text-slate-300">
          <section id="section-1">
            <h2 className="mb-3 text-lg font-semibold text-white">1. Scope of Service</h2>
            <p>
              EduCompass is an academic guidance tool for students enrolled in the Computer Science,
              Computer Systems Engineering, and Software Engineering programmes at NED University of Engineering
              and Technology, Karachi. It provides tools for FYP discovery, GPA calculation,
              prerequisite planning, career roadmap exploration, and AI-assisted Q&amp;A.
            </p>
            <p className="mt-2">
              EduCompass is a student project developed as a Final Year Project (FYP) submission. It is not an
              official NED University service and has no affiliation with the university&apos;s administration,
              admissions, or academic records systems.
            </p>
          </section>

          <section id="section-2">
            <h2 className="mb-3 text-lg font-semibold text-white">2. Guidance Estimates</h2>
            <p>
              All match scores, importance ratings, career track alignments, prerequisite eligibility checks,
              and GPA projections produced by EduCompass are <strong className="text-white">guidance estimates</strong>,
              not official university determinations. Scores always show their calculation breakdown and are labelled
              as estimates in the UI.
            </p>
            <p className="mt-2">
              Never rely solely on EduCompass output for academic decisions such as course registration,
              scholarship applications, or programme eligibility. Always confirm with your department
              or the official NED University website.
            </p>
          </section>

          <section id="section-3">
            <h2 className="mb-3 text-lg font-semibold text-white">3. AI-Generated Content</h2>
            <p>
              The EduCompass chatbot uses a 4-layer answer pipeline:
            </p>
            <ol className="mt-2 list-decimal pl-5 space-y-1">
              <li>Preloaded answers for common questions</li>
              <li>Retrieved context from the published knowledge base</li>
              <li>AI model response (when context is found and within caps)</li>
              <li>&ldquo;I do not have that information&rdquo; when no context is available</li>
            </ol>
            <p className="mt-2">
              The AI receives only your question and retrieved context — <strong className="text-white">never</strong>{' '}
              your name, email, student ID, grades, or any personal data. AI responses are labelled with an
              &ldquo;AI-generated&rdquo; badge and cite their sources.
            </p>
          </section>

          <section id="section-4">
            <h2 className="mb-3 text-lg font-semibold text-white">4. Data &amp; Privacy</h2>
            <p>
              Your profile (email, current semester, career goals, interests) is stored securely in Supabase
              with Row Level Security — only you and administrators can access your data. Your academic records
              entered into the GPA calculator are processed locally in your browser and are not stored on any server.
            </p>
            <p className="mt-2">
              We do not sell, share, or transmit your personal data to third parties. API keys and secrets
              are stored server-side only and never exposed in the browser.
            </p>
            <p className="mt-2">
              See our full <Link href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy →</Link>
            </p>
          </section>

          <section id="section-5">
            <h2 className="mb-3 text-lg font-semibold text-white">5. FYP Data Sources</h2>
            <p>
              Final Year Project data displayed on EduCompass is extracted from publicly presented FYDP
              booklets (NED CSE 2022–2025). Student names and roll numbers are stripped at extraction time
              and are never stored. Project titles, supervisors, and abstracts may be shown with attribution.
            </p>
            <p className="mt-2">
              All extracted records pass through an admin review queue before publication. Only approved
              records are visible to students.
            </p>
          </section>

          <section id="section-6">
            <h2 className="mb-3 text-lg font-semibold text-white">6. Deletion Rights</h2>
            <p>
              You may request deletion of your account and all associated data at any time through{' '}
              <Link href="/settings" className="text-indigo-400 hover:underline">Profile &amp; Settings</Link>.
              Deletion requests are logged and completed by an administrator within 7 days.
              You will not be able to self-delete your account directly to ensure proper audit logging.
            </p>
          </section>

          <section id="section-7">
            <h2 className="mb-3 text-lg font-semibold text-white">7. Contact</h2>
            <p>
              For questions, data concerns, or corrections, contact the project administrator:{' '}
              <a
                href="mailto:syed.hurraim898@gmail.com"
                className="font-mono text-xs text-indigo-400 hover:underline"
              >
                syed.hurraim898@gmail.com
              </a>
            </p>
            <p className="mt-2">
              <Link href="/help" className="text-indigo-400 hover:underline">Visit the Help Centre →</Link>
            </p>
          </section>
        </div>

        <div className="mt-12 flex flex-wrap gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
          <Link href="/help" className="hover:text-slate-300 transition-colors">Help Centre</Link>
          <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
