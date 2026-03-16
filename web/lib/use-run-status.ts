'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MastraClient, MastraApiError } from './mastra-client';
import type { WorkflowRun, RunStatus } from './mastra-client';

const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set([
  'success',
  'failed',
  'canceled',
  'bailed',
  'tripwire',
]);

const POLL_INTERVAL_MS = 3000;

export interface UseRunStatusResult {
  run: WorkflowRun | null;
  error: string | null;
  loading: boolean;
}

export function useRunStatus(workflowId: string, runId: string): UseRunStatusResult {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientRef = useRef(new MastraClient());

  const fetchStatus = useCallback(async () => {
    try {
      const result = await clientRef.current.getRunStatus(workflowId, runId);
      setRun(result);
      setError(null);
      setLoading(false);

      if (TERMINAL_STATUSES.has(result.status)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    } catch (err) {
      const message =
        err instanceof MastraApiError
          ? `API error (${err.statusCode}): ${err.message}`
          : 'Failed to fetch run status. Is the Mastra server running?';
      setError(message);
      setLoading(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [workflowId, runId]);

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchStatus]);

  return { run, error, loading };
}

export { TERMINAL_STATUSES, POLL_INTERVAL_MS };
