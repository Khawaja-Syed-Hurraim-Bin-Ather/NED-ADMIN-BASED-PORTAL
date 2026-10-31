'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';

export interface UnansweredQuestion {
  id: string;
  query: string;
  hitCount: number;
  batchLabel: string;
  createdAt: string;
}

const DEFAULT_UNANSWERED: UnansweredQuestion[] = [
  {
    id: 'uq-1',
    query: 'What is the exact penalty for late submission of FYP progress report 2?',
    hitCount: 14,
    batchLabel: 'Batch 2022',
    createdAt: '2026-10-28 14:20',
  },
  {
    id: 'uq-2',
    query: 'Can I take Machine Learning and Distributed Systems in the same summer term?',
    hitCount: 9,
    batchLabel: 'Batch 2023',
    createdAt: '2026-10-29 11:05',
  },
  {
    id: 'uq-3',
    query: 'How do I apply for an official clearance letter for overseas internships?',
    hitCount: 7,
    batchLabel: 'Batch 2022',
    createdAt: '2026-10-30 09:45',
  },
  {
    id: 'uq-4',
    query: 'Does CIS Department accept external co-supervisors from Aga Khan University?',
    hitCount: 5,
    batchLabel: 'Batch 2023',
    createdAt: '2026-10-30 16:30',
  },
];

interface UnansweredQuestionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UnansweredQuestionsDrawer({ isOpen, onClose }: UnansweredQuestionsDrawerProps) {
  const { saveDraftItem } = useEditMode();

  const [questions, setQuestions] = useState<UnansweredQuestion[]>(DEFAULT_UNANSWERED);
  const [selectedQuestion, setSelectedQuestion] = useState<UnansweredQuestion | null>(null);
  const [verifiedAnswer, setVerifiedAnswer] = useState('');
  const [category, setCategory] = useState('academic_regulations');
  const [stageSuccess, setStageSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConvert = (q: UnansweredQuestion) => {
    setSelectedQuestion(q);
    setVerifiedAnswer('');
    setStageSuccess(null);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion || !verifiedAnswer.trim()) return;

    saveDraftItem(
      'faq',
      'faq_answers',
      `faq-${Date.now()}`,
      {
        question: selectedQuestion.query,
        answer: verifiedAnswer.trim(),
        category,
        source: 'department_policy',
        verified_by: 'Department Administration',
      },
      'insert',
      `Add verified FAQ answer for: "${selectedQuestion.query.slice(0, 50)}..."`
    );

    setStageSuccess(`Verified answer staged into your draft change set!`);
    setQuestions((prev) => prev.filter((q) => q.id !== selectedQuestion.id));

    setTimeout(() => {
      setSelectedQuestion(null);
      setVerifiedAnswer('');
      setStageSuccess(null);
    }, 1500);
  };

  return (
    <aside
      role="dialog"
      aria-label="Unanswered Student Inquiries"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0f1823] border-l border-[rgba(213,228,236,0.15)] shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
              Chatbot Fallback Queue
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {questions.length} unresolved
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-100">Unanswered Questions</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Student questions that triggered Layer 4 fallback. Convert to verified FAQs.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {stageSuccess && (
          <div className="p-2.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-200">
            {stageSuccess}
          </div>
        )}

        {/* Selected FAQ Conversion Form */}
        {selectedQuestion && (
          <form
            onSubmit={handleSaveFaq}
            className="p-4 rounded-xl bg-[#0b1119] border border-amber-500/50 space-y-3 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-amber-300">Convert to Verified FAQ</span>
              <button
                type="button"
                onClick={() => setSelectedQuestion(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Question</label>
              <p className="p-2 rounded bg-[#162231] border border-slate-800 text-slate-200 font-medium leading-snug">
                {selectedQuestion.query}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Verified Official Answer <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={verifiedAnswer}
                onChange={(e) => setVerifiedAnswer(e.target.value)}
                placeholder="Enter precise institutional policy answer (<80 words, plain language, Rule 3 compliant)..."
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 resize-none focus:border-amber-400"
              />
              <span className="text-[10px] text-slate-500">
                Rule 6: Official answers must be factual. Never guess or hallucinate.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">FAQ Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2 py-1 text-slate-100"
              >
                <option value="academic_regulations">Academic Regulations</option>
                <option value="fyp_policies">FYP & Supervisory Policies</option>
                <option value="curriculum_prerequisites">Curriculum & Prerequisites</option>
                <option value="career_advising">Career & Internship Guidance</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedQuestion(null)}
                className="px-3 py-1 rounded text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-semibold transition-colors"
              >
                Stage Verified FAQ
              </button>
            </div>
          </form>
        )}

        {/* List of Unanswered Questions */}
        <div className="space-y-2.5">
          {questions.map((q) => (
            <div
              key={q.id}
              className="p-3 rounded-lg bg-[#162231] border border-slate-700/60 space-y-2 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-slate-100 leading-snug">{q.query}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40 shrink-0 font-mono">
                  {q.hitCount} asks
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span>{q.batchLabel}</span>
                  <span>•</span>
                  <span>{q.createdAt}</span>
                </div>

                <button
                  onClick={() => handleConvert(q)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-[#511030] text-slate-200 hover:text-white transition-colors font-medium text-[11px]"
                >
                  Convert to FAQ →
                </button>
              </div>
            </div>
          ))}

          {questions.length === 0 && (
            <p className="text-center text-slate-500 py-8 italic">
              All chatbot inquiries have been resolved or converted to verified FAQs.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
        <span className="text-[11px] text-slate-400">Zero student PII stored (Rule 3)</span>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors"
        >
          Done
        </button>
      </div>
    </aside>
  );
}

