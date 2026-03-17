/**
 * Integration smoke tests for MastraClient against a running dev server.
 *
 * These tests require `mastra dev` to be running on localhost:4111.
 * Run with: pnpm test:integration
 *
 * WARNING: The trigger-and-poll test starts a real workflow which invokes LLM
 * APIs and costs real money. Set SKIP_LLM_TESTS=1 to skip it.
 */
import { MastraClient, MastraApiError } from '../../lib/mastra-client';

const WORKFLOW_ID = 'slidewreck';
const BASE_URL = process.env.MASTRA_URL ?? 'http://localhost:4111';
const SKIP_LLM = process.env.SKIP_LLM_TESTS === '1';

const client = new MastraClient(BASE_URL);

// Probe server availability before running any tests
let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/workflows`, { signal: AbortSignal.timeout(3000) });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
  if (!serverAvailable) {
    console.warn('Mastra dev server not running — all integration tests will be skipped');
  }
});

// Track created run IDs for best-effort cleanup
const createdRunIds: string[] = [];

afterAll(async () => {
  // Mastra has no delete-run endpoint, so cleanup is best-effort logging.
  // If a delete endpoint is added later, clean up here.
  if (createdRunIds.length > 0) {
    console.info(`Integration tests created ${createdRunIds.length} run(s): ${createdRunIds.join(', ')}`);
  }
});

describe('MastraClient integration (requires running dev server)', () => {
  describe('create-run via triggerWorkflow (step 1 only)', () => {
    it.skipIf(!serverAvailable)('creates a run and returns a valid runId', async () => {
      // Use a raw create-run to avoid triggering LLM execution
      // but go through a helper that mirrors the client's internal call
      const createRes = await fetch(`${client.baseUrl}/api/workflows/${WORKFLOW_ID}/create-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(createRes.ok).toBe(true);
      const body = (await createRes.json()) as { runId: string };
      expect(body).toHaveProperty('runId');
      expect(typeof body.runId).toBe('string');
      expect(body.runId.length).toBeGreaterThan(0);
      createdRunIds.push(body.runId);
    });
  });

  describe('getRunStatus', () => {
    it.skipIf(!serverAvailable)('retrieves status for an existing run', async () => {
      // Setup: create a run via the same endpoint the client uses internally
      const { runId } = await createTestRun();

      const run = await client.getRunStatus(WORKFLOW_ID, runId);

      expect(run).toHaveProperty('runId', runId);
      expect(run).toHaveProperty('status');
      expect(typeof run.status).toBe('string');
    });

    it.skipIf(!serverAvailable)('throws MastraApiError for non-existent run', async () => {
      await expect(
        client.getRunStatus(WORKFLOW_ID, 'non-existent-run-id'),
      ).rejects.toThrow(MastraApiError);
    });
  });

  describe('resumeStep', () => {
    it.skipIf(!serverAvailable)('throws MastraApiError when resuming a non-suspended run', async () => {
      const { runId } = await createTestRun();

      // A freshly created (not started) run has no suspended step to resume
      await expect(
        client.resumeStep(WORKFLOW_ID, runId, 'nonexistent-step', { approved: true }),
      ).rejects.toThrow(MastraApiError);
    });
  });

  describe('trigger-and-poll flow', () => {
    it.skipIf(!serverAvailable || SKIP_LLM)(
      'triggers a workflow and polls for status (costs real LLM credits)',
      async () => {
        const { runId } = await client.triggerWorkflow(WORKFLOW_ID, {
          topic: 'Integration test topic',
          audienceLevel: 'intermediate',
          format: 'standard',
        });
        createdRunIds.push(runId);

        expect(typeof runId).toBe('string');
        expect(runId.length).toBeGreaterThan(0);

        // Poll once — verify response shape (status may be any valid value)
        const run = await client.getRunStatus(WORKFLOW_ID, runId);

        expect(run).toHaveProperty('runId', runId);
        expect(run).toHaveProperty('status');
        expect(run).toHaveProperty('createdAt');
        expect([
          'pending', 'running', 'waiting', 'suspended',
          'success', 'failed', 'canceled', 'paused', 'bailed', 'tripwire',
        ]).toContain(run.status);
      },
      15000,
    );
  });
});

/** Helper: create a run without starting execution (no LLM cost). */
async function createTestRun(): Promise<{ runId: string }> {
  const res = await fetch(`${client.baseUrl}/api/workflows/${WORKFLOW_ID}/create-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`create-run failed: ${res.status}`);
  const { runId } = (await res.json()) as { runId: string };
  createdRunIds.push(runId);
  return { runId };
}
