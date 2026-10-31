'use client';

import React, { useState } from 'react';
import { useEditMode } from '../../context/EditModeContext';

interface AddFypModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded: (project: any) => void;
}

export function AddFypModal({ isOpen, onClose, onProjectAdded }: AddFypModalProps) {
  const { saveDraftItem } = useEditMode();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [supervisor, setSupervisor] = useState('');
  const [coSupervisor, setCoSupervisor] = useState('');
  const [department, setDepartment] = useState('Computer & Information Systems Engineering');
  const [domain, setDomain] = useState('ai-ml');
  const [tools, setTools] = useState('');
  const [industryPartner, setIndustryPartner] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Project title is required.');
      return;
    }

    const domainTags = [domain];
    const toolsArray = tools.split(',').map((t) => t.trim()).filter(Boolean);
    const newId = `fyp-draft-${Date.now()}`;

    const projectData = {
      id: newId,
      title: title.trim(),
      raw_title: title.trim(),
      description: description.trim(),
      year: Number(year),
      supervisor: supervisor.trim() || 'Faculty Supervisor',
      co_supervisor: coSupervisor.trim() || null,
      department: department.trim(),
      university: 'NED University of Engineering & Technology',
      domain_tags: domainTags,
      tools: toolsArray,
      industry_partner: industryPartner.trim() || null,
      proposal_outcome: 'accepted',
      created_at: new Date().toISOString(),
    };

    saveDraftItem(
      'fyp',
      'fyp_projects',
      newId,
      projectData,
      'insert',
      `Add new FYP project: "${title.trim()}" (${year})`
    );

    onProjectAdded(projectData);
    onClose();

    // Reset
    setTitle('');
    setDescription('');
    setSupervisor('');
    setCoSupervisor('');
    setTools('');
    setIndustryPartner('');
    setErrorMsg('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add New FYP Project"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-xl bg-[#0f1823] border border-[rgba(213,228,236,0.2)] rounded-xl shadow-2xl flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(213,228,236,0.1)] bg-[#162231] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                FYP Staging
              </span>
              <h3 className="text-base font-semibold text-slate-100">Add FYP Project</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Draft stages directly to your active change set.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto max-h-[70vh] space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-950/80 border border-rose-500 text-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Privacy Notice Banner (Rule 119) */}
          <div className="p-2.5 rounded bg-amber-950/20 border border-amber-600/30 text-[11px] text-amber-200">
            <strong>Rule 119 (Student Privacy):</strong> FYP archive records contain zero student names or roll numbers. Only institutional academic and technical attributes are stored.
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Project Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Autonomous Solar-Powered Underwater Glider for Marine Telemetry"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Abstract / Project Summary
            </label>
            <textarea
              rows={3}
              placeholder="Technical summary, problem statement, and key architectural outcomes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Batch Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
              >
                {[2026, 2025, 2024, 2023, 2022].map((y) => (
                  <option key={y} value={y}>
                    Batch {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Domain Branch</label>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              >
                <option value="ai-ml">AI & Machine Learning</option>
                <option value="healthcare-tech">Healthcare & MedTech</option>
                <option value="robotics-embedded">Robotics & Embedded / IoT</option>
                <option value="software-cloud">Software Systems & Cloud</option>
                <option value="cybersecurity">Networks & Cyber Security</option>
                <option value="web-mobile">Web & Mobile Platforms</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Supervisor</label>
              <input
                type="text"
                placeholder="e.g. Dr. Muhammad Khurram"
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Co-Supervisor (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Engr. Maria Khan"
                value={coSupervisor}
                onChange={(e) => setCoSupervisor(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Industry Partner (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Systems Limited, 10Pearls, Folio3"
                value={industryPartner}
                onChange={(e) => setIndustryPartner(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Technologies / Tools (comma-separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Python, ROS2, PyTorch, STM32, LoRaWAN"
              value={tools}
              onChange={(e) => setTools(e.target.value)}
              className="w-full bg-[#162231] border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-[rgba(213,228,236,0.1)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#511030] hover:bg-[#6e1642] text-white font-semibold transition-colors"
            >
              Stage Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

