'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MastraClient, MastraApiError, extractRunDisplayInfo } from '@/lib/mastra-client';
import type { WorkflowRun, RunStatus } from '@/lib/mastra-client';
import { relativeTime } from '@/lib/format';

function StatusDot({ status }: { status: RunStatus }) {
  const colors: Record<string, string> = {
    success: 'bg-green-500',
    failed: 'bg-red-500',
    canceled: 'bg-red-500',
    suspended: 'bg-blue-400',
    running: 'bg-yellow-400 animate-pulse',
    pending: 'bg-gray-300',
  };
  return <div className={`h-2.5 w-2.5 rounded-full ${colors[status] ?? 'bg-gray-300'}`} />;
}

function statusLabel(status: RunStatus): string {
  const labels: Record<string, string> = {
    success: 'Complete',
    failed: 'Failed',
    suspended: 'Waiting for review',
    running: 'In progress',
    pending: 'Pending',
    canceled: 'Canceled',
  };
  return labels[status] ?? status;
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const clientRef = useRef(new MastraClient());

  useEffect(() => {
    async function fetchRuns() {
      try {
        const result = await clientRef.current.listRuns('slidewreck');
        setRuns(result.runs);
        setTotal(result.total);
      } catch (err) {
        const message =
          err instanceof MastraApiError
            ? `API error (${err.statusCode}): ${err.message}`
            : 'Failed to fetch run history. Is the Mastra server running?';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchRuns();
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Run History</h1>
        <Link href="/new" className="text-sm text-gray-500 hover:text-gray-700">
          New Talk
        </Link>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        {total > 0 ? `${total} run${total !== 1 ? 's' : ''}` : ''}
      </p>

      <div className="mt-8">
        {loading && (
          <p className="text-sm text-gray-400">Loading runs...</p>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && runs.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500">No runs yet.</p>
            <Link
              href="/new"
              className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
            >
              Create your first talk
            </Link>
          </div>
        )}

        {!loading && !error && runs.length > 0 && (
          <div className="space-y-2">
            {runs.map((run) => {
              const { title, format } = extractRunDisplayInfo(run);
              return (
                <Link
                  key={run.runId}
                  href={`/run/${run.runId}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
                >
                  <StatusDot status={run.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                    <p className="flex items-center gap-2 text-xs text-gray-400">
                      {format && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {format}
                        </span>
                      )}
                      <span title={run.createdAt}>{relativeTime(run.createdAt)}</span>
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{statusLabel(run.status)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
