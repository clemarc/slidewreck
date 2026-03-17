'use client';

import { useState, useRef } from 'react';
import { MastraClient, MastraApiError } from '@/lib/mastra-client';

export interface ReviewControlsProps {
  workflowId: string;
  runId: string;
  stepId: string;
  onResumed: () => void;
}

export function ReviewControls({ workflowId, runId, stepId, onResumed }: ReviewControlsProps) {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const clientRef = useRef(new MastraClient());

  async function handleDecision(decision: 'approve' | 'reject') {
    if (submitting) return;

    setSubmitting(true);
    setApiError('');

    try {
      const resumeData: Record<string, unknown> = { decision };
      if (feedback.trim()) {
        resumeData.feedback = feedback.trim();
      }
      await clientRef.current.resumeStep(workflowId, runId, stepId, resumeData);
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
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Optional feedback or guidance for the next step..."
        rows={3}
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
          onClick={() => handleDecision('approve')}
          disabled={submitting}
          className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Approve'}
        </button>
        <button
          onClick={() => handleDecision('reject')}
          disabled={submitting}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
