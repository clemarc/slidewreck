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

export interface WorkflowRun {
  runId: string;
  workflowName?: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  resourceId?: string;
  result?: unknown;
  error?: unknown;
  steps?: Record<string, unknown>;
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

  async resumeStep(
    workflowId: string,
    runId: string,
    step: string,
    resumeData: unknown,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/workflows/${workflowId}/resume-async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId, step, resumeData }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new MastraApiError(res.status, body || res.statusText);
    }
  }
}
