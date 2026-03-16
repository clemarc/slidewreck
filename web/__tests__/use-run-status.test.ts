import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TERMINAL_STATUSES, POLL_INTERVAL_MS } from '../lib/use-run-status';
import type { RunStatus } from '../lib/mastra-client';

describe('useRunStatus constants and logic', () => {
  describe('TERMINAL_STATUSES', () => {
    it('includes success, failed, canceled, bailed, tripwire', () => {
      expect(TERMINAL_STATUSES.has('success')).toBe(true);
      expect(TERMINAL_STATUSES.has('failed')).toBe(true);
      expect(TERMINAL_STATUSES.has('canceled')).toBe(true);
      expect(TERMINAL_STATUSES.has('bailed')).toBe(true);
      expect(TERMINAL_STATUSES.has('tripwire')).toBe(true);
    });

    it('does not include running, pending, suspended, waiting, paused', () => {
      expect(TERMINAL_STATUSES.has('running')).toBe(false);
      expect(TERMINAL_STATUSES.has('pending')).toBe(false);
      expect(TERMINAL_STATUSES.has('suspended')).toBe(false);
      expect(TERMINAL_STATUSES.has('waiting')).toBe(false);
      expect(TERMINAL_STATUSES.has('paused')).toBe(false);
    });
  });

  describe('POLL_INTERVAL_MS', () => {
    it('is 3000ms', () => {
      expect(POLL_INTERVAL_MS).toBe(3000);
    });
  });

  describe('terminal state detection', () => {
    const terminalStatuses: RunStatus[] = ['success', 'failed', 'canceled', 'bailed', 'tripwire'];
    const nonTerminalStatuses: RunStatus[] = ['pending', 'running', 'waiting', 'suspended', 'paused'];

    it.each(terminalStatuses)('recognizes %s as terminal', (status) => {
      expect(TERMINAL_STATUSES.has(status)).toBe(true);
    });

    it.each(nonTerminalStatuses)('recognizes %s as non-terminal', (status) => {
      expect(TERMINAL_STATUSES.has(status)).toBe(false);
    });
  });
});

describe('MastraClient.getRunStatus integration', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('polling would call getRunStatus with correct params', async () => {
    const { MastraClient } = await import('../lib/mastra-client');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        runId: 'run-456',
        status: 'running',
        createdAt: '2026-03-16T00:00:00Z',
        updatedAt: '2026-03-16T00:00:00Z',
      }),
    });

    const client = new MastraClient('http://localhost:4111');
    const result = await client.getRunStatus('slidewreck', 'run-456');
    expect(result.status).toBe('running');
    expect(result.runId).toBe('run-456');
  });

  it('error response from getRunStatus is catchable', async () => {
    const { MastraClient, MastraApiError } = await import('../lib/mastra-client');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: async () => 'Run not found',
    });

    const client = new MastraClient('http://localhost:4111');
    await expect(client.getRunStatus('slidewreck', 'bad-id')).rejects.toThrow(MastraApiError);
  });
});
