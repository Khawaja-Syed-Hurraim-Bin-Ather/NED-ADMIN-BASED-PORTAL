'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

interface BatchOption {
  id: string;
  admission_year: number;
  label: string;
  program: {
    code: string;
    name: string;
  };
  curriculum_version: {
    id: string;
    name: string;
  };
}

export function BatchPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Load available batches
  useEffect(() => {
    async function fetchBatches() {
      try {
        const res = await fetch('http://localhost:4000/api/v1/batches?program=CSE');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setBatches(json.data);

          // Resolution order (Section 10):
          // 1. URL search param ?batch=...
          // 2. Remembered in localStorage ('educompass_selected_batch')
          // 3. Default to latest published batch
          const urlBatch = searchParams.get('batch');
          const storedBatch = localStorage.getItem('educompass_selected_batch');

          let matchingBatch: BatchOption | undefined;

          if (urlBatch) {
            matchingBatch = json.data.find(
              (b: BatchOption) =>
                b.id === urlBatch ||
                String(b.admission_year) === urlBatch ||
                b.label.toLowerCase() === urlBatch.toLowerCase()
            );
          }

          if (!matchingBatch && storedBatch) {
            matchingBatch = json.data.find((b: BatchOption) => b.id === storedBatch);
          }

          if (!matchingBatch && json.data.length > 0) {
            matchingBatch = json.data[0]; // first is latest admission_year
          }

          if (matchingBatch) {
            setSelectedBatchId(matchingBatch.id);
            localStorage.setItem('educompass_selected_batch', matchingBatch.id);
          }
        }
      } catch (err) {
        console.error('Failed to load batches:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBatches();
  }, [searchParams]);

  function handleBatchChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    setSelectedBatchId(newId);
    localStorage.setItem('educompass_selected_batch', newId);

    const found = batches.find((b) => b.id === newId);
    if (!found) return;

    // Update URL query param cleanly without reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('batch', String(found.admission_year));
    router.replace(`${pathname}?${params.toString()}`);
  }

  if (loading || batches.length === 0) return null;

  return (
    <div
      className="batch-picker-container"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 6,
        background: 'var(--surface-2, rgba(81, 16, 48, 0.05))',
        border: '1px solid var(--border)',
        fontSize: 12,
        color: 'var(--text)',
      }}
    >
      <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Batch:</span>
      <select
        value={selectedBatchId}
        onChange={handleBatchChange}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--primary, #511030)',
          fontWeight: 600,
          fontSize: 12,
          outline: 'none',
          cursor: 'pointer',
        }}
        aria-label="Select Curriculum Batch"
      >
        {batches.map((b) => (
          <option key={b.id} value={b.id} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
            {b.label} ({b.curriculum_version?.name || 'Scheme'})
          </option>
        ))}
      </select>
    </div>
  );
}

export function BatchNoticeBanner() {
  const searchParams = useSearchParams();
  const [bannerInfo, setBannerInfo] = useState<{ label: string; scheme: string } | null>(null);

  useEffect(() => {
    const urlBatch = searchParams.get('batch');
    const storedBatch = localStorage.getItem('educompass_selected_batch');

    async function checkBatchInfo(batchKey: string) {
      try {
        const res = await fetch(`http://localhost:4000/api/v1/batches?program=CSE&q=${batchKey}`);
        const json = await res.json();
        if (json.success && json.data?.length > 0) {
          const b = json.data[0];
          setBannerInfo({
            label: b.label,
            scheme: b.curriculum_version?.name || 'Scheme 2022',
          });
        }
      } catch (_) {}
    }

    if (urlBatch) {
      checkBatchInfo(urlBatch);
    } else if (storedBatch) {
      checkBatchInfo(storedBatch);
    }
  }, [searchParams]);

  if (!bannerInfo) return null;

  return (
    <div
      role="status"
      style={{
        background: 'rgba(255, 174, 7, 0.12)',
        borderBottom: '1px solid rgba(255, 174, 7, 0.3)',
        padding: '6px 20px',
        fontSize: 12,
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span style={{ color: '#D97706', fontWeight: 600 }}>ℹ️ Notice:</span>
      <span>
        You are currently viewing <strong>{bannerInfo.label}</strong> ({bannerInfo.scheme}) curriculum guidelines in read-only mode.
      </span>
    </div>
  );
}

