import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ReviewControls resume logic', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls resumeStep with approve decision and feedback', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { MastraClient } = await import('../lib/mastra-client');
    const client = new MastraClient('http://localhost:4111');
    await client.resumeStep('slidewreck', 'run-123', 'review-research', {
      decision: 'approve',
      feedback: 'Looks great!',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4111/api/workflows/slidewreck/resume-async',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          runId: 'run-123',
          step: 'review-research',
          resumeData: { decision: 'approve', feedback: 'Looks great!' },
        }),
      }),
    );
  });

  it('calls resumeStep with reject decision', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { MastraClient } = await import('../lib/mastra-client');
    const client = new MastraClient('http://localhost:4111');
    await client.resumeStep('slidewreck', 'run-123', 'architect-structure', {
      decision: 'reject',
      feedback: 'Need more options',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4111/api/workflows/slidewreck/resume-async',
      expect.objectContaining({
        body: JSON.stringify({
          runId: 'run-123',
          step: 'architect-structure',
          resumeData: { decision: 'reject', feedback: 'Need more options' },
        }),
      }),
    );
  });

  it('throws MastraApiError on failed resume', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Resume failed',
    });

    const { MastraClient, MastraApiError } = await import('../lib/mastra-client');
    const client = new MastraClient('http://localhost:4111');

    await expect(
      client.resumeStep('slidewreck', 'run-123', 'review-research', { decision: 'approve' }),
    ).rejects.toThrow(MastraApiError);
  });

  it('calls resumeStep without feedback when empty', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { MastraClient } = await import('../lib/mastra-client');
    const client = new MastraClient('http://localhost:4111');
    await client.resumeStep('slidewreck', 'run-123', 'review-script', {
      decision: 'approve',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:4111/api/workflows/slidewreck/resume-async',
      expect.objectContaining({
        body: JSON.stringify({
          runId: 'run-123',
          step: 'review-script',
          resumeData: { decision: 'approve' },
        }),
      }),
    );
  });
});
