import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MastraClient.listRuns', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls correct endpoint and returns runs with total', async () => {
    const mockRuns = {
      runs: [
        {
          runId: 'run-1',
          status: 'success',
          createdAt: '2026-03-17T00:00:00Z',
          updatedAt: '2026-03-17T00:01:00Z',
        },
        {
          runId: 'run-2',
          status: 'running',
          createdAt: '2026-03-17T01:00:00Z',
          updatedAt: '2026-03-17T01:01:00Z',
        },
      ],
      total: 2,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRuns,
    });

    const { MastraClient } = await import('../lib/mastra-client');
    const client = new MastraClient('http://localhost:4111');
    const result = await client.listRuns('slidewreck');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4111/api/workflows/slidewreck/runs',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.runs).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.runs[0].runId).toBe('run-1');
  });

  it('returns empty runs array when no runs exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ runs: [], total: 0 }),
    });

    const { MastraClient } = await import('../lib/mastra-client');
    const client = new MastraClient('http://localhost:4111');
    const result = await client.listRuns('slidewreck');

    expect(result.runs).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('throws MastraApiError on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Database error',
    });

    const { MastraClient, MastraApiError } = await import('../lib/mastra-client');
    const client = new MastraClient('http://localhost:4111');

    await expect(client.listRuns('slidewreck')).rejects.toThrow(MastraApiError);
  });
});
