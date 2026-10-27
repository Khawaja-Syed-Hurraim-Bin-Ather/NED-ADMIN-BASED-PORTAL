'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Card,
  Button,
  Badge,
  Alert,
} from '@educompass/ui';

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

export default function ChatPage() {
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

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
        body: JSON.stringify({
          message: query,
          preferOffline: offlineMode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to get an answer from academic engine.');
      }

      const botMessage: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.data.answer,
        layer: data.data.layer,
        sourceType: data.data.source,
        sources: data.data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : 'Connection error. Please ensure the API service is active.';
      setError(errMessage);
      
      // Fallback message in conversation
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          sender: 'assistant',
          text: 'I am temporarily unable to connect to the academic knowledge service. Please try asking again in a moment, or switch on Offline Mode below to search preloaded departmental regulations.',
          layer: 4,
          sourceType: 'offline_fallback',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getLayerBadge = (layer?: number) => {
    switch (layer) {
      case 1:
        return (
          <Badge variant="success" className="text-[10px] tracking-wide uppercase px-2 py-0.5">
            ⚡ Layer 1: Instant Official Rule
          </Badge>
        );
      case 2:
        return (
          <Badge variant="info" className="text-[10px] tracking-wide uppercase px-2 py-0.5">
            🔍 Layer 2: Department Records
          </Badge>
        );
      case 3:
        return (
          <Badge variant="default" className="text-[10px] tracking-wide uppercase px-2 py-0.5 bg-purple-900/60 text-purple-200 border-purple-700/60">
            🤖 Layer 3: AI Synthesized
          </Badge>
        );
      case 4:
        return (
          <Badge variant="warning" className="text-[10px] tracking-wide uppercase px-2 py-0.5">
            ℹ️ Layer 4: Clarification Needed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              ← Dashboard
            </Link>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-sm font-semibold text-slate-200">NED CISE Academic Assistant</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Offline Mode Toggle (Rule #5 verification) */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 hover:border-slate-600 transition-all select-none">
              <input
                type="checkbox"
                checked={offlineMode}
                onChange={(e) => setOfflineMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
              />
              <span className={offlineMode ? 'text-amber-400 font-medium' : 'text-slate-400'}>
                {offlineMode ? 'Offline Mode ON' : 'Offline Mode (No LLM)'}
              </span>
            </label>

            <Link href="/help" className="text-slate-400 hover:text-slate-200 hidden sm:inline">
              Help
            </Link>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Rule 13 Disclaimer Header */}
        <div className="mb-4">
          <div className="rounded-lg bg-blue-950/20 border border-blue-900/40 p-3 text-xs text-blue-300/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>
                <strong>Official Disclaimer:</strong> Guidance estimates, not official university decisions. All responses are derived from reviewed NED CISE academic documents.
              </span>
            </div>
            <Link href="/terms" className="underline text-blue-400 hover:text-blue-300 ml-2 whitespace-nowrap">
              Terms
            </Link>
          </div>
        </div>

        {error && (
          <Alert variant="danger" onClose={() => setError(null)} className="mb-4">
            {error}
          </Alert>
        )}

        {/* Messages Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-lg rounded-br-sm'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-md rounded-bl-sm'
                }`}
              >
                {/* Assistant Metadata Bar */}
                {msg.sender === 'assistant' && msg.layer && (
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                    <div>{getLayerBadge(msg.layer)}</div>
                    <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Retrieved Sources Accordion / Pill list */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Referenced Academic Records:
                    </span>
                    <div className="space-y-1.5">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="text-xs bg-slate-950/60 border border-slate-800/80 rounded p-2 text-slate-300 flex items-start gap-2"
                        >
                          <span className="text-blue-400 font-bold shrink-0">#{i + 1}</span>
                          <div>
                            <div className="font-medium text-slate-200">{src.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{src.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {msg.sender === 'user' && (
                  <div className="text-right mt-1">
                    <span className="text-[10px] text-blue-200/80">{msg.timestamp}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl rounded-bl-sm p-4 text-sm text-slate-400 flex items-center gap-3">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-400">Consulting NED CISE Knowledge Base...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Pills */}
        {messages.length < 3 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-400 mb-2">Suggested Academic Inquiries:</div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_SUGGESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-full px-3 py-1.5 transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <Card className="p-3 bg-slate-900 border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                maxLength={300}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about minimum CGPA, FYP rules, prerequisites, course codes... (max 300 chars)"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                disabled={loading}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={loading || input.trim().length === 0}
                className="shrink-0 px-5"
              >
                Send
              </Button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>
                🔒 Rule #3: Never enter personal info (student roll number, phone, or name).
              </span>
              <span className={input.length >= 280 ? 'text-amber-400 font-mono' : 'font-mono'}>
                {input.length}/300 characters
              </span>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
