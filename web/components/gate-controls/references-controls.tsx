'use client';

import { useState, useRef } from 'react';
import { MastraClient, MastraApiError } from '@/lib/mastra-client';

interface ReferenceMaterial {
  type: 'file' | 'url';
  path: string;
}

export function buildReferencesPayload(materials: ReferenceMaterial[]) {
  return { materials };
}

export interface ReferencesControlsProps {
  workflowId: string;
  runId: string;
  stepId: string;
  onResumed: () => void;
}

export function ReferencesControls({ workflowId, runId, stepId, onResumed }: ReferencesControlsProps) {
  const [rows, setRows] = useState<ReferenceMaterial[]>([{ type: 'url', path: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const clientRef = useRef(new MastraClient());

  function addRow() {
    setRows((prev) => [...prev, { type: 'url', path: '' }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: 'type' | 'path', value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value as ReferenceMaterial['type'] } : row,
      ),
    );
  }

  async function handleSubmit(skip: boolean) {
    if (submitting) return;
    setSubmitting(true);
    setApiError('');

    try {
      const materials = skip ? [] : rows.filter((r) => r.path.trim() !== '');
      const payload = buildReferencesPayload(materials);
      await clientRef.current.resumeStep(workflowId, runId, stepId, payload);
      onResumed();
    } catch (err) {
      const message =
        err instanceof MastraApiError
          ? `Resume failed (${err.statusCode}): ${err.message}`
          : 'Failed to resume workflow. Is the Mastra server running?';
      setApiError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={row.type}
              onChange={(e) => updateRow(i, 'type', e.target.value)}
              disabled={submitting}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="url">URL</option>
              <option value="file">File</option>
            </select>
            <input
              type="text"
              value={row.path}
              onChange={(e) => updateRow(i, 'path', e.target.value)}
              placeholder={row.type === 'url' ? 'https://example.com/article' : '/path/to/file.md'}
              disabled={submitting}
              className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            />
            <button
              onClick={() => removeRow(i)}
              disabled={submitting || rows.length <= 1}
              className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-30"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        disabled={submitting}
        className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
      >
        + Add reference
      </button>

      {apiError && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit References'}
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={submitting}
          className="flex-1 rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Skip'}
        </button>
      </div>
    </div>
  );
}
