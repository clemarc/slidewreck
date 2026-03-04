import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('saveEvalResults', () => {
  const mockSaveScore = vi.fn().mockResolvedValue({ score: {} });
  const mockStorage = { saveScore: mockSaveScore } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save each successful scorecard entry via storage', async () => {
    const { saveEvalResults } = await import('../eval-storage');

    await saveEvalResults(mockStorage, {
      entries: [
        { scorerId: 'hook-strength', score: 4, reason: 'Good', status: 'success' },
        { scorerId: 'narrative-coherence', score: 3, reason: 'OK', status: 'success' },
      ],
      overallScore: 3.5,
      timestamp: '2026-03-04T12:00:00Z',
    }, { runId: 'run-1', entityId: 'talk-1', topic: 'Testing' });

    expect(mockSaveScore).toHaveBeenCalledTimes(2);
    expect(mockSaveScore).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        scorerId: 'hook-strength',
        entityId: 'talk-1',
        score: 4,
        source: 'LIVE',
      }),
    );
  });

  it('should skip error entries (only saves successful scores)', async () => {
    const { saveEvalResults } = await import('../eval-storage');

    await saveEvalResults(mockStorage, {
      entries: [
        { scorerId: 'hook-strength', score: 4, status: 'success' },
        { scorerId: 'narrative-coherence', status: 'error', error: 'Failed' },
        { scorerId: 'pacing-distribution', score: 3, status: 'success' },
      ],
      overallScore: 3.5,
      timestamp: '2026-03-04T12:00:00Z',
    }, { runId: 'run-1', entityId: 'talk-1', topic: 'Testing' });

    expect(mockSaveScore).toHaveBeenCalledTimes(2);
  });

  it('should include entity context in saved scores', async () => {
    const { saveEvalResults } = await import('../eval-storage');

    await saveEvalResults(mockStorage, {
      entries: [
        { scorerId: 'hook-strength', score: 4, reason: 'Good', status: 'success' },
      ],
      timestamp: '2026-03-04T12:00:00Z',
    }, { runId: 'run-1', entityId: 'talk-1', topic: 'Microservices' });

    expect(mockSaveScore).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: expect.objectContaining({ topic: 'Microservices' }),
        entityType: 'WORKFLOW',
      }),
    );
  });
});

describe('getScoresByRunId', () => {
  it('should retrieve scores for a specific workflow run', async () => {
    const mockListByRunId = vi.fn().mockResolvedValue({
      scores: [
        { scorerId: 'hook-strength', score: 4, runId: 'run-1' },
        { scorerId: 'pacing-distribution', score: 3, runId: 'run-1' },
      ],
      pagination: { total: 2, page: 0, perPage: 100, hasMore: false },
    });
    const mockStorage = { listScoresByRunId: mockListByRunId } as any;

    const { getScoresByRunId } = await import('../eval-storage');
    const result = await getScoresByRunId(mockStorage, 'run-1');

    expect(mockListByRunId).toHaveBeenCalledWith({
      runId: 'run-1',
      pagination: { page: 0, perPage: 100 },
    });
    expect(result.scores).toHaveLength(2);
  });
});

describe('getScoreHistory', () => {
  it('should retrieve historical scores for a specific scorer', async () => {
    const mockListByScorerId = vi.fn().mockResolvedValue({
      scores: [
        { scorerId: 'hook-strength', score: 4, createdAt: new Date() },
        { scorerId: 'hook-strength', score: 3, createdAt: new Date() },
      ],
      pagination: { total: 2, page: 0, perPage: 100, hasMore: false },
    });
    const mockStorage = { listScoresByScorerId: mockListByScorerId } as any;

    const { getScoreHistory } = await import('../eval-storage');
    const result = await getScoreHistory(mockStorage, 'hook-strength');

    expect(mockListByScorerId).toHaveBeenCalledWith({
      scorerId: 'hook-strength',
      pagination: { page: 0, perPage: 100 },
    });
    expect(result.scores).toHaveLength(2);
  });
});
