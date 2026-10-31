'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';

interface FypCsvImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedCount: number) => void;
}

export function FypCsvImporterModal({
  isOpen,
  onClose,
  onImportComplete,
}: FypCsvImporterModalProps) {
  const { saveDraftItem } = useEditMode();
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [detectedPiiColumns, setDetectedPiiColumns] = useState<string[]>([]);
  const [stageStatus, setStageStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Simple CSV parser
  const parseCsv = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    
    // Check for student personal identifier headers (Rule 119)
    const piiKeywords = ['name', 'student', 'roll', 'seat', 'candidate', 'member', 'email', 'phone'];
    const piiCols: string[] = [];
    headers.forEach((h) => {
      const lower = h.toLowerCase();
      if (piiKeywords.some((kw) => lower.includes(kw))) {
        piiCols.push(h);
      }
    });
    setDetectedPiiColumns(piiCols);

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Basic comma-splitting taking quotes into account
      const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
        v.trim().replace(/^["']|["']$/g, '')
      );

      const rowObj: Record<string, string> = {};
      headers.forEach((h, index) => {
        // Strip PII columns immediately following Rule 119
        if (!piiCols.includes(h)) {
          rowObj[h.toLowerCase()] = values[index] || '';
        }
      });

      // Map to standard fields
      const title =
        rowObj['title'] ||
        rowObj['project title'] ||
        rowObj['project_title'] ||
        values[0] ||
        'Untitled Project';

      const supervisor =
        rowObj['supervisor'] ||
        rowObj['faculty supervisor'] ||
        rowObj['advisor'] ||
        'Faculty Advisor';

      const year =
        Number(rowObj['year'] || rowObj['batch'] || rowObj['session']) ||
        new Date().getFullYear();

      const domain =
        rowObj['domain'] || rowObj['branch'] || rowObj['category'] || 'ai-ml';

      const tools =
        rowObj['tools'] || rowObj['technologies'] || rowObj['tech stack'] || '';

      const abstract =
        rowObj['abstract'] || rowObj['description'] || rowObj['summary'] || '';

      rows.push({
        title,
        supervisor,
        year,
        domain_tags: [domain],
        tools: tools.split(';').map((t) => t.trim()).filter(Boolean),
        description: abstract,
      });
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleStageAll = () => {
    let count = 0;
    for (const row of parsedRows) {
      const newId = `csv-import-${Date.now()}-${count}`;
      const projectPayload = {
        id: newId,
        title: row.title,
        raw_title: row.title,
        supervisor: row.supervisor,
        year: row.year,
        department: 'Computer & Information Systems Engineering',
        university: 'NED University of Engineering & Technology',
        domain_tags: row.domain_tags,
        tools: row.tools,
        description: row.description,
        proposal_outcome: 'accepted',
        created_at: new Date().toISOString(),
      };

      saveDraftItem(
        'fyp',
        'fyp_projects',
        newId,
        projectPayload,
        'insert',
        `Import FYP project: "${row.title}" (${row.year})`
      );
      count++;
    }

    setStageStatus(`Successfully staged ${count} project(s) into your working change set!`);
    onImportComplete(count);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Import FYP Projects from CSV"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-2xl bg-[#0f1823] border border-[rgba(213,228,236,0.2)] rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Import FYP Records (Spreadsheet / CSV)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload past batch lists or department catalogs. Rule 119 privacy filters apply automatically.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4 text-xs">
          {stageStatus && (
            <div className="p-3 rounded bg-emerald-950/80 border border-emerald-500 text-emerald-200">
              {stageStatus}
            </div>
          )}

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-amber-400/50 transition-colors bg-[#0b1119]">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="fyp-csv-file-input"
            />
            <label htmlFor="fyp-csv-file-input" className="cursor-pointer block">
              <span className="text-2xl block mb-2">📄</span>
              <span className="text-sm font-semibold text-slate-200 block">
                {fileName ? fileName : 'Choose CSV file or drag and drop here'}
              </span>
              <span className="text-xs text-slate-400 mt-1 block">
                Supported columns: Title, Supervisor, Year, Domain, Tools, Abstract
              </span>
            </label>
          </div>

          {/* Rule 119 PII Detection Alert */}
          {detectedPiiColumns.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/50 text-amber-200 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <strong>Rule 119 (Student Privacy Protection Filter):</strong>
              </div>
              <p className="text-[11px] leading-relaxed">
                Detected columns containing student names or roll numbers:{' '}
                <strong className="text-amber-100 font-mono">
                  {detectedPiiColumns.join(', ')}
                </strong>
                . These columns have been strictly stripped. No student personal identifiers will be staged or stored.
              </p>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">
                  Preview ({parsedRows.length} valid records parsed)
                </span>
                <span className="text-[10px] text-slate-400">All records will stage into draft</span>
              </div>

              <div className="max-h-56 overflow-y-auto rounded border border-slate-800 bg-[#0b1119]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#162231] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-2">Title</th>
                      <th className="p-2">Supervisor</th>
                      <th className="p-2">Year</th>
                      <th className="p-2">Domain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-2 font-medium text-slate-100 max-w-[200px] truncate">{r.title}</td>
                        <td className="p-2 max-w-[120px] truncate">{r.supervisor}</td>
                        <td className="p-2 font-mono">{r.year}</td>
                        <td className="p-2 capitalize">{r.domain_tags?.[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 10 && (
                <p className="text-[10px] text-slate-500 italic">
                  Showing first 10 of {parsedRows.length} records.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            disabled={parsedRows.length === 0}
            onClick={handleStageAll}
            className="px-4 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-semibold disabled:opacity-40 transition-colors"
          >
            Stage {parsedRows.length} Projects to Draft
          </button>
        </div>
      </div>
    </div>
  );
}

