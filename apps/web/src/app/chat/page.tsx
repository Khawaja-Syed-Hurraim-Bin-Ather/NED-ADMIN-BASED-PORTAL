'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Alert } from '@educompass/ui';
import { PageHeader } from '../../components/PageHeader';
import { useEditMode } from '../../context/EditModeContext';
import { UnansweredQuestionsDrawer } from '../../components/edit-mode/UnansweredQuestionsDrawer';

interface RetrievalSource {
  title: string;
  type: string;
  detail: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  layer?: number;
  sourceType?: string;
  sources?: RetrievalSource[];
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  'What is the minimum CGPA to graduate from NED?',
  'When does the Final Year Project start and what are the rules?',
  'What happens if I fail a prerequisite course?',
  'What is the standard credit hour limit per semester?',
  'How do I reach out to a professor for project supervision?',
  'What is the passing grade scale at NED University?',
];

const LAYER_META: Record<number, { label: string; emoji: string; cls: string }> = {
  1: { label: 'Instant Official Rule',   emoji: '⚡', cls: 'layer-badge-1' },
  2: { label: 'Department Records',      emoji: '🔍', cls: 'layer-badge-2' },
  3: { label: 'AI Synthesised',          emoji: '🤖', cls: 'layer-badge-3' },
  4: { label: 'Clarification Needed',    emoji: 'ℹ️', cls: 'layer-badge-4' },
};

export default function ChatPage() {
  const { isEditMode, viewAsStudent, can, saveDraftItem } = useEditMode();
  const canEdit = isEditMode && !viewAsStudent && can('chat', 'edit');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am the EduCompass Academic Assistant for NED University Computer & Information Systems Engineering.\n\nYou can ask me about degree requirements, course prerequisites, grading scales, FYP rules, and faculty research domains.',
      layer: 1,
      sourceType: 'system',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnansweredOpen, setIsUnansweredOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (query.length > 300) {
      setError('Query exceeds 300 characters hard cap (SRS NFR-08). Please shorten your question.');
      return;
    }

    setError(null);
    setInput('');

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, preferOffline: offlineMode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to get an answer from academic engine.');

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: data.data.answer,
          layer: data.data.layer,
          sourceType: data.data.source,
          sources: data.data.sources || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Connection error. Please ensure the API service is active.';
      setError(errMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: 'I am temporarily unable to connect to the academic knowledge service. Please try again in a moment, or switch on Offline Mode to search preloaded departmental regulations.',
          layer: 4,
          sourceType: 'offline_fallback',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inner-page">
      <PageHeader
        title="AI Academic Assistant"
        badge="4-Layer Verified"
        breadcrumbs={[{ label: 'AI Assistant' }]}
        description="Ask about degree requirements, course prerequisites, grading rules, and FYP regulations."
        accent="var(--lavender)"
        actions={
          <div className="flex items-center gap-2.5">
            {canEdit && (
              <button
                onClick={() => setIsUnansweredOpen(true)}
                className="px-3 py-1.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-600/40 font-medium text-xs shadow-sm transition-colors flex items-center gap-1.5"
              >
                <span>Unanswered Inquiries (4)</span>
              </button>
            )}
            <label
              className={`offline-toggle${offlineMode ? ' active' : ''}`}
              aria-label="Toggle offline mode"
            >
              <input
                type="checkbox"
                checked={offlineMode}
                onChange={(e) => setOfflineMode(e.target.checked)}
                style={{ width: 12, height: 12 }}
              />
              {offlineMode ? '⚡ Offline ON' : 'Offline Mode'}
            </label>
          </div>
        }
      />

      <div className="inner-page-body">
        {/* Rule 13 disclaimer */}
        <div className="disclaimer" style={{ marginBottom: 20 }}>
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
          <span>
            <strong>Guidance estimates, not official university decisions.</strong>{' '}
            All responses are derived from reviewed NED CISE academic documents. The AI cap is 300 chars in / 500 tokens out.
          </span>
          <Link href="/terms">Read terms</Link>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)} className="mb-4">
            {error}
          </Alert>
        )}

        {/* Chat shell */}
        <div className="chat-shell" style={{ border: '1px solid var(--line)', borderRadius: 'var(--radius-xl)', background: 'var(--bg-raised)', overflow: 'hidden' }}>
          {/* Messages area */}
          <div className="chat-messages" style={{ padding: '24px', overflowY: 'auto', maxHeight: '60vh' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-row ${msg.sender === 'user' ? 'chat-row-user' : 'chat-row-assistant'}`}>
                {/* Sender label */}
                {msg.sender === 'assistant' && (
                  <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted-2)', marginBottom: 4, paddingLeft: 4 }}>
                    NED CISE Academic Assistant
                  </span>
                )}

                <div className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                  {/* Layer badge + timestamp for assistant */}
                  {msg.sender === 'assistant' && msg.layer && (() => {
                    const meta = LAYER_META[msg.layer];
                    return meta ? (
                      <div className="chat-bubble-meta">
                        <span className={`layer-badge ${meta.cls}`}>
                          {meta.emoji} Layer {msg.layer}: {meta.label}
                        </span>
                        <span className="chat-time">{msg.timestamp}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Message body */}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                  {/* Retrieved sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources">
                      <span className="chat-source-label">Referenced Academic Records:</span>
                      {msg.sources.map((src, i) => (
                        <div key={i} className="chat-source-item">
                          <span className="chat-source-num">#{i + 1}</span>
                          <div>
                            <div className="chat-source-title">{src.title}</div>
                            <div className="chat-source-detail">{src.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Edit Verified Answer action (Edit Mode Only) */}
                  {msg.sender === 'assistant' && (msg.layer === 1 || msg.layer === 2) && canEdit && (
                    <div className="mt-2 pt-2 border-t border-[rgba(213,228,236,0.1)] flex justify-end">
                      <button
                        onClick={() => setEditingMessage({ id: msg.id, text: msg.text })}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 hover:bg-blue-900/60 transition-colors flex items-center gap-1"
                      >
                        <span>✎ Edit Verified Answer</span>
                      </button>
                    </div>
                  )}

                  {/* Timestamp for user */}
                  {msg.sender === 'user' && (
                    <div style={{ textAlign: 'right', marginTop: 6 }}>
                      <span className="chat-time" style={{ color: 'rgba(232,242,251,.6)' }}>{msg.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="chat-row chat-row-assistant">
                <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted-2)', marginBottom: 4, paddingLeft: 4 }}>
                  NED CISE Academic Assistant
                </span>
                <div className="chat-typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>Consulting knowledge base…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--line)' }} />

          {/* Suggestion chips (shown early in conversation) */}
          {messages.length < 3 && (
            <div style={{ padding: '16px 24px 0' }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: 'var(--muted-2)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                Suggested Academic Inquiries
              </div>
              <div className="chat-suggestions">
                {DEFAULT_SUGGESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="suggestion-chip"
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding: '16px 24px 20px' }}>
            <div className="chat-input-bar">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="chat-input-row"
              >
                <input
                  type="text"
                  value={input}
                  maxLength={300}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about minimum CGPA, FYP rules, prerequisites, course codes… (max 300 chars)"
                  className="chat-input"
                  disabled={loading}
                  aria-label="Academic query input"
                />
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={loading || input.trim().length === 0}
                  style={{ flexShrink: 0, minWidth: 72 }}
                >
                  {loading ? '…' : 'Send'}
                </button>
              </form>
              <div className="chat-input-meta">
                <span>
                  <svg className="icon-sm" style={{ display: 'inline', width: 11, height: 11, marginRight: 4, stroke: 'var(--cyan)', fill: 'none', strokeWidth: 2 }} viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Rule #3: Never enter personal info (student roll number, phone, or name).
                </span>
                <span className={`char-counter${input.length >= 280 ? ' char-warning' : ''}`}>
                  {input.length}/300
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Help link */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link href="/help" style={{ color: 'var(--muted-2)', fontSize: 12, fontWeight: 700 }}>
            View Help &amp; FAQ →
          </Link>
        </div>
      </div>

      {/* Verified Answer Editing Modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0f1823] border border-amber-500/40 rounded-xl p-5 shadow-2xl space-y-3.5 text-xs">
            <h3 className="text-sm font-semibold text-amber-300">Edit Verified Academic Answer</h3>
            <textarea
              rows={5}
              value={editingMessage.text}
              onChange={(e) => setEditingMessage({ ...editingMessage, text: e.target.value })}
              className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 resize-none focus:border-amber-400"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setEditingMessage(null)}
                className="px-3.5 py-1.5 rounded text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveDraftItem(
                    'faq',
                    'faq_answers',
                    editingMessage.id,
                    { answer: editingMessage.text },
                    'update',
                    `Edit verified answer for intent (${editingMessage.id})`
                  );
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === editingMessage.id ? { ...m, text: editingMessage.text } : m
                    )
                  );
                  setEditingMessage(null);
                }}
                className="px-4 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-semibold shadow-sm transition-colors"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unanswered Questions Drawer */}
      <UnansweredQuestionsDrawer
        isOpen={isUnansweredOpen}
        onClose={() => setIsUnansweredOpen(false)}
      />
    </div>
  );
}
