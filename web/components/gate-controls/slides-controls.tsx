'use client';

import { useState, useRef } from 'react';
import { MastraClient, MastraApiError } from '@/lib/mastra-client';

export function buildSlidesApprovePayload(feedback: string, deckSpec: unknown | undefined) {
  const payload: Record<string, unknown> = { decision: 'approve' as const };
  if (feedback.trim()) {
    payload.feedback = feedback.trim();
  }
  if (deckSpec !== undefined) {
    payload.deckSpec = deckSpec;
  }
  return payload;
}

export interface SlidesControlsProps {
  workflowId: string;
  runId: string;
  stepId: string;
  output: unknown;
  onResumed: () => void;
}

export function SlidesControls({ workflowId, runId, stepId, output, onResumed }: SlidesControlsProps) {
  const [feedback, setFeedback] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [deckSpecJson, setDeckSpecJson] = useState(() => JSON.stringify(output, null, 2));
  const [jsonError, setJsonError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const clientRef = useRef(new MastraClient());

  function parseDeckSpec(): unknown | undefined {
    if (!showEditor) return undefined;
    try {
      const parsed = JSON.parse(deckSpecJson);
      setJsonError('');
      return parsed;
    } catch {
      setJsonError('Invalid JSON — please fix before submitting');
      return null; // null = parse error (distinct from undefined = no edit)
    }
  }

  async function handleDecision(decision: 'approve' | 'reject') {
    if (submitting) return;

    let payload: Record<string, unknown>;
    if (decision === 'approve') {
      const deckSpec = parseDeckSpec();
      if (deckSpec === null) return; // JSON parse error
      payload = buildSlidesApprovePayload(feedback, deckSpec);
    } else {
      payload = { decision: 'reject' };
      if (feedback.trim()) {
        payload.feedback = feedback.trim();
      }
    }

    setSubmitting(true);
    setApiError('');

    try {
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
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Optional feedback or guidance for the next step..."
        rows={3}
        disabled={submitting}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
      />

      <div>
        <button
          onClick={() => setShowEditor((prev) => !prev)}
          disabled={submitting}
          className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          {showEditor ? '- Hide DeckSpec editor' : '+ Edit DeckSpec JSON'}
        </button>
        {showEditor && (
          <div className="mt-2 space-y-1">
            <textarea
              value={deckSpecJson}
              onChange={(e) => {
                setDeckSpecJson(e.target.value);
                setJsonError('');
              }}
              rows={10}
              disabled={submitting}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-50"
            />
            {jsonError && <p className="text-xs text-red-600">{jsonError}</p>}
          </div>
        )}
      </div>

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
