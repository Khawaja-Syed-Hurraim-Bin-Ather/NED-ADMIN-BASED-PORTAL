'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const FAQ_ITEMS = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is EduCompass?',
        a: 'EduCompass is an academic guidance tool for NED University CS, CSE, and SE students. It helps with FYP discovery, GPA tracking, career roadmap exploration, prerequisite planning, and AI-assisted academic Q&A.',
      },
      {
        q: 'Do I need to register to use EduCompass?',
        a: 'The FYP portal, career hub, and GPA calculator are accessible without an account. Registration is required to save shortlists, track roadmap progress, and use the AI chatbot.',
      },
      {
        q: 'Which programmes are supported?',
        a: 'EduCompass supports students in Computer Science (CS), Computer Systems Engineering (CSE), and Software Engineering (SE) at NED University. Students from other programmes are welcome to explore but some features (such as prerequisite checking) are calibrated for these three programmes.',
      },
    ],
  },
  {
    category: 'FYP Portal',
    questions: [
      {
        q: 'Where does the FYP data come from?',
        a: 'Project data is extracted from NED CSE FYDP booklets (2022–2025). Student names and roll numbers are removed at extraction time. All records are reviewed by an administrator before publication.',
      },
      {
        q: 'Why does a project show as "extracted" and not visible?',
        a: 'Each extracted record passes through an admin review queue (extracted → approved → published) before it appears in search results. This ensures data quality and privacy compliance.',
      },
      {
        q: 'Can I shortlist projects?',
        a: 'Yes. Signed-in enrolled students can shortlist any published FYP project. Your shortlist is private and only visible to you.',
      },
    ],
  },
  {
    category: 'GPA Calculator',
    questions: [
      {
        q: 'Is my GPA data stored on your servers?',
        a: 'No. All GPA calculations happen in your browser. Course codes, grades, and credit hours you enter are never sent to or stored on any server.',
      },
      {
        q: 'What grading scale does EduCompass use?',
        a: 'EduCompass uses the NED University 4.0 grading scale: A=4.0, B+=3.5, B=3.0, C+=2.5, C=2.0, D=1.0, F=0.0.',
      },
      {
        q: 'Can I import my transcript?',
        a: 'Yes. The GPA calculator includes a transcript parser tab (Card E6) that accepts tab-separated or CSV-formatted transcript text. PII such as roll numbers is automatically stripped.',
      },
    ],
  },
  {
    category: 'AI Chatbot',
    questions: [
      {
        q: 'Does the chatbot know my personal information?',
        a: 'No. The chatbot receives only your question text and retrieved document context — never your name, email, student ID, grades, or any profile data. This is a hard technical constraint, not just a policy.',
      },
      {
        q: 'What happens if the chatbot doesn\'t know the answer?',
        a: 'The chatbot answers through a 4-layer pipeline: preloaded answers → knowledge retrieval → AI model → fallback. If no relevant context is found, it responds "I do not have that information" rather than guessing.',
      },
      {
        q: 'Are there usage limits on the chatbot?',
        a: 'Yes. Each message is capped at 300 characters input and 500 tokens output. There is a per-user daily limit and a global daily budget. These limits are enforced server-side.',
      },
      {
        q: 'Can I use the chatbot if the AI is switched off?',
        a: 'Yes. Layers 1–3 (preloaded answers and retrieval) work independently of the AI model. The chatbot remains functional even when the AI provider is unavailable.',
      },
    ],
  },
  {
    category: 'Privacy & Account',
    questions: [
      {
        q: 'How do I delete my account?',
        a: 'Go to Profile & Settings and submit a deletion request. An administrator will permanently delete your account and all associated data within 7 days. You cannot self-delete your account to ensure proper audit logging.',
      },
      {
        q: 'Who can see my data?',
        a: 'Only you and administrators can access your profile data. All user data tables are protected by Supabase Row Level Security. Administrators can only access the data they need to operate the review queue and handle deletion requests.',
      },
      {
        q: 'Is my data sold or shared?',
        a: 'No. Your data is never sold, rented, or shared with advertisers or third parties. See our Privacy Policy for full details.',
      },
    ],
  },
  {
    category: 'Career Hub',
    questions: [
      {
        q: 'Are the career track matches official?',
        a: 'No. Career track alignments are guidance estimates based on course curriculum data. They show their calculation basis and are always labelled as estimates. Never use them as the sole basis for career decisions.',
      },
      {
        q: 'Which career tracks are available?',
        a: 'EduCompass covers 12 tracks: AI & Machine Learning, Data Science, Front-End Development, Back-End Development, Mobile Development, Cybersecurity, DevOps & Cloud, Embedded Systems & IoT, Game Development, Software Testing & QA, Entrepreneurship, and Systems & Hardware.',
      },
    ],
  },
];

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  function toggle(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filtered = FAQ_ITEMS.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            ← Back to EduCompass
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Help Centre</h1>
          <p className="mt-1 text-sm text-slate-400">Frequently asked questions about EduCompass features, privacy, and policies.</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="help-search"
            type="text"
            placeholder="Search help articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
        </div>

        {/* FAQ Accordion */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-500 text-sm">
            No articles match your search. Try different keywords.
          </div>
        ) : (
          <div className="space-y-8">
            {filtered.map((cat) => (
              <div key={cat.category}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">{cat.category}</h2>
                <div className="space-y-2">
                  {cat.questions.map((item) => {
                    const key = `${cat.category}-${item.q}`;
                    const isOpen = openItems.has(key);
                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden"
                      >
                        <button
                          id={`faq-${key.replace(/\s+/g, '-').toLowerCase().slice(0, 40)}`}
                          onClick={() => toggle(key)}
                          className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left text-sm font-medium text-slate-200 hover:bg-slate-800/50 transition-colors"
                          aria-expanded={isOpen}
                        >
                          <span>{item.q}</span>
                          <svg
                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-800 px-4 py-3.5 text-sm text-slate-400 leading-relaxed">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Still need help */}
        <div className="mt-10 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6 text-center">
          <p className="text-sm font-semibold text-white">Still have a question?</p>
          <p className="mt-1 text-xs text-slate-400">Contact the project administrator directly.</p>
          <a
            href="mailto:syed.hurraim898@gmail.com"
            className="mt-3 inline-block rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            {/* Rule #12 — mailto only, never send email programmatically */}
            Email syed.hurraim898@gmail.com
          </a>
        </div>

        <div className="mt-10 flex flex-wrap gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
          <Link href="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
