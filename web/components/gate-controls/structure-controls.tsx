'use client';

import { useState, useRef } from 'react';
import { MastraClient, MastraApiError } from '@/lib/mastra-client';

export function buildStructureApprovePayload(selectedTitle: string, extraFeedback: string) {
  const feedback = extraFeedback.trim()
    ? `Selected option: ${selectedTitle}\n${extraFeedback.trim()}`
    : `Selected option: ${selectedTitle}`;
  return { decision: 'approve' as const, feedback };
}

export function buildStructureRejectPayload(feedback: string) {
  return { decision: 'reject' as const, feedback };
}

interface StructureOption {
  title: string;
  description: string;
  sections: { title: string; purpose: string; contentWordCount: number; estimatedMinutes: number }[];
  rationale: string;
}

export interface StructureControlsProps {
  workflowId: string;
  runId: string;
  stepId: string;
  output: unknown;
  onResumed: () => void;
}

export function StructureControls({ workflowId, runId, stepId, output, onResumed }: StructureControlsProps) {
  const options = (output as { options?: StructureOption[] })?.options ?? [];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const clientRef = useRef(new MastraClient());

  async function handleApprove() {
    if (submitting || selectedIndex === null) return;
    setSubmitting(true);
    setApiError('');

    try {
      const payload = buildStructureApprovePayload(options[selectedIndex].title, feedback);
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

  async function handleReject() {
    if (submitting) return;
    setSubmitting(true);
    setApiError('');

    try {
      const payload = buildStructureRejectPayload(feedback);
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
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelectedIndex(i)}
            disabled={submitting}
            className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
              selectedIndex === i
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-400'
            } disabled:opacity-50`}
          >
            <p className="text-sm font-semibold">{option.title}</p>
            <p className="mt-1 text-xs text-gray-600">{option.description}</p>
            <p className="mt-1 text-xs text-gray-400">
              {option.sections.length} sections &middot;{' '}
              {option.sections.reduce((sum, s) => sum + s.estimatedMinutes, 0)} min
            </p>
          </button>
        ))}
      </div>

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Optional feedback or guidance..."
        rows={2}
        disabled={submitting}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
      />

      {apiError && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={submitting || selectedIndex === null}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Approve Selected'}
        </button>
        <button
          onClick={handleReject}
          disabled={submitting}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Reject All'}
        </button>
      </div>
    </div>
  );
}
