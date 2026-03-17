export class MastraApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'MastraApiError';
  }
}

export type RunStatus =
  | 'pending'
  | 'running'
  | 'waiting'
  | 'suspended'
  | 'success'
  | 'failed'
  | 'canceled'
  | 'paused'
  | 'bailed'
  | 'tripwire';

/** Suspend payload attached to a step when it suspends for human review */
export interface StepSuspendPayload {
  agentId: string;
  gateId: string;
  output: unknown;
  summary: string;
}

/** Per-step status record from the Mastra run API */
export interface StepState {
  status: RunStatus;
  output?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  suspendPayload?: StepSuspendPayload;
  resumePayload?: Record<string, unknown>;
  error?: { message: string; stack?: string };
  startedAt: number;
  endedAt: number;
  suspendedAt?: number;
  resumedAt?: number;
}

export interface WorkflowRun {
  runId: string;
  workflowName?: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  resourceId?: string;
  result?: unknown;
  error?: unknown;
  steps?: Record<string, StepState>;
}

export class MastraClient {
  public readonly baseUrl: string;

  constructor(baseUrl?: string) {
    const url = baseUrl ?? process.env.NEXT_PUBLIC_MASTRA_URL ?? 'http://localhost:4111';
    this.baseUrl = url.replace(/\/+$/, '');
  }

  async triggerWorkflow(
    workflowId: string,
    inputData: Record<string, unknown>,
  ): Promise<{ runId: string }> {
    // Step 1: Create a run to get the runId
    const createRes = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/create-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new MastraApiError(createRes.status, body || createRes.statusText);
    }
    const { runId } = (await createRes.json()) as { runId: string };

    // Step 2: Start the run asynchronously with input data
    const startRes = await fetch(
      `${this.baseUrl}/api/workflows/${workflowId}/start-async?runId=${encodeURIComponent(runId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputData }),
      },
    );
    if (!startRes.ok) {
      const body = await startRes.text();
      throw new MastraApiError(startRes.status, body || startRes.statusText);
    }

    return { runId };
  }

  async getRunStatus(workflowId: string, runId: string): Promise<WorkflowRun> {
    const res = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/runs/${runId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new MastraApiError(res.status, body || res.statusText);
    }
    return res.json();
  }

  async listRuns(workflowId: string): Promise<{ runs: WorkflowRun[]; total: number }> {
    const res = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/runs`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new MastraApiError(res.status, body || res.statusText);
    }
    return res.json();
  }

  async resumeStep(
    workflowId: string,
    runId: string,
    step: string,
    resumeData: unknown,
  ): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/api/workflows/${workflowId}/resume-async?runId=${encodeURIComponent(runId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, resumeData }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new MastraApiError(res.status, body || res.statusText);
    }
  }
}
