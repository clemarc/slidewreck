'use client';

import { useState, useRef } from 'react';
import { MastraClient, MastraApiError } from '@/lib/mastra-client';
import type { StructureOption } from '@/components/gate-content/structure-gate';

export function buildStructureApprovePayload(selectedTitle: string, extraFeedback: string) {
  const feedback = extraFeedback.trim()
    ? `Selected option: ${selectedTitle}\n${extraFeedback.trim()}`
    : `Selected option: ${selectedTitle}`;
  return { decision: 'approve' as const, feedback };
}

export function buildStructureRejectPayload(feedback: string) {
  return { decision: 'reject' as const, feedback };
}

export interface StructureControlsProps {
  workflowId: string;
  runId: string;
  stepId: string;
  output: unknown;
  selectedIndex?: number | null;
  onResumed: () => void;
}

export function StructureControls({ workflowId, runId, stepId, output, selectedIndex, onResumed }: StructureControlsProps) {
  const options = (output as { options?: StructureOption[] })?.options ?? [];
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const clientRef = useRef(new MastraClient());

  async function handleApprove() {
    if (submitting || selectedIndex == null || selectedIndex < 0 || selectedIndex >= options.length) return;
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

  const hasSelection = selectedIndex != null && selectedIndex >= 0 && selectedIndex < options.length;
  const selectedTitle = hasSelection ? options[selectedIndex].title : null;

  return (
    <div className="space-y-3">
      {!hasSelection && (
        <p className="text-sm text-gray-500 italic">Click a structure option above to select it.</p>
      )}

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
          disabled={submitting || !hasSelection}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : selectedTitle ? `Approve: ${selectedTitle}` : 'Select an option'}
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
