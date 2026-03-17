'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useRunStatus, TERMINAL_STATUSES } from '@/lib/use-run-status';
import { StepProgress } from '@/components/step-progress';
import { GateContent } from '@/components/gate-content';
import { ReviewControls } from '@/components/review-controls';
import { findSuspendedStep } from '@/lib/gate-helpers';
import type { RunStatus } from '@/lib/mastra-client';

function StatusIndicator({ status }: { status: RunStatus }) {
  if (status === 'success') {
    return <div className="h-3 w-3 rounded-full bg-green-500" />;
  }
  if (status === 'failed' || status === 'canceled' || status === 'bailed' || status === 'tripwire') {
    return <div className="h-3 w-3 rounded-full bg-red-500" />;
  }
  if (status === 'suspended') {
    return <div className="h-3 w-3 rounded-full bg-blue-400" />;
  }
  return <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-400" />;
}

function StatusLabel({ status }: { status: RunStatus }) {
  const labels: Record<string, string> = {
    pending: 'Waiting to start...',
    running: 'Generation in progress',
    waiting: 'Waiting for event...',
    suspended: 'Waiting for review',
    success: 'Generation complete!',
    failed: 'Generation failed',
    canceled: 'Run canceled',
    paused: 'Run paused',
    bailed: 'Run could not start',
    tripwire: 'Tripwire triggered',
  };
  return <span className="text-lg font-medium">{labels[status] ?? status}</span>;
}

export default function RunStatusPage() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const { run, error, loading, refetch } = useRunStatus('slidewreck', runId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Run Status</h1>
        <div className="flex gap-3">
          <Link href="/history" className="text-sm text-gray-500 hover:text-gray-700">
            History
          </Link>
          <Link href="/new" className="text-sm text-gray-500 hover:text-gray-700">
            New Talk
          </Link>
        </div>
      </div>
      <p className="mt-2 font-mono text-xs text-gray-400">{runId}</p>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        {loading && (
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-gray-300" />
            <span className="text-lg font-medium text-gray-400">Loading...</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {run && !error && (
          <>
            <div className="flex items-center gap-3">
              <StatusIndicator status={run.status} />
              <StatusLabel status={run.status} />
            </div>

            <div className="mt-6">
              <StepProgress steps={run.steps} />
            </div>

            {run.status === 'success' && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Your talk has been generated successfully.
                </p>
                <Link
                  href={`/deck/${runId}`}
                  className="mt-2 inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  View Deck
                </Link>
              </div>
            )}

            {run.status === 'suspended' && (() => {
              const gate = findSuspendedStep(run.steps);
              if (!gate) return null;
              return (
                <div className="mt-6 space-y-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                    <GateContent
                      gateId={gate.suspendPayload.gateId}
                      output={gate.suspendPayload.output}
                      summary={gate.suspendPayload.summary}
                    />
                  </div>
                  <ReviewControls
                    workflowId="slidewreck"
                    runId={runId}
                    stepId={gate.stepId}
                    onResumed={refetch}
                  />
                </div>
              );
            })()}

            {run.status === 'failed' && run.error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  {typeof run.error === 'string' ? run.error : JSON.stringify(run.error)}
                </p>
              </div>
            )}

            {!TERMINAL_STATUSES.has(run.status) && run.status !== 'suspended' && (
              <p className="mt-4 text-sm text-gray-500">
                Checking for updates every 3 seconds...
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
