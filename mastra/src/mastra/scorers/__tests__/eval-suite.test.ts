import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScorecardSchema } from '../../schemas/scorecard';

const mockScorers: Record<string, { id: string; run: ReturnType<typeof vi.fn> }> = {
  'hook-strength': { id: 'hook-strength', run: vi.fn() },
  'narrative-coherence': { id: 'narrative-coherence', run: vi.fn() },
  'pacing-distribution': { id: 'pacing-distribution', run: vi.fn() },
  'jargon-density': { id: 'jargon-density', run: vi.fn() },
};

vi.mock('../../index', () => ({
  mastra: {
    getScorer: (key: string) => mockScorers[key],
  },
}));

import { runEvalSuite } from '../eval-suite';

describe('runEvalSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run all 4 scorers and return a valid scorecard', async () => {
    mockScorers['hook-strength'].run.mockResolvedValue({
      score: 4,
      reason: 'Strong hook',
      output: '',
      runId: '1',
    });
    mockScorers['narrative-coherence'].run.mockResolvedValue({
      score: 3,
      reason: 'Adequate flow',
      output: '',
      runId: '2',
    });
    mockScorers['pacing-distribution'].run.mockResolvedValue({
      score: 5,
      reason: 'Excellent balance',
      output: '',
      runId: '3',
    });
    mockScorers['jargon-density'].run.mockResolvedValue({
      score: 4,
      reason: 'Appropriate',
      output: '',
      runId: '4',
    });

    const scorecard = await runEvalSuite('Test script content');

    // Validate against schema
    const parsed = ScorecardSchema.parse(scorecard);
    expect(parsed.entries).toHaveLength(4);
    expect(parsed.entries.every((e) => e.status === 'success')).toBe(true);
    expect(parsed.overallScore).toBe(4); // (4+3+5+4)/4 = 4
    expect(parsed.timestamp).toBeTruthy();
  });

  it('should handle scorer failure — failed scorer produces error entry, others succeed', async () => {
    mockScorers['hook-strength'].run.mockResolvedValue({
      score: 4,
      reason: 'Good',
      output: '',
      runId: '1',
    });
    mockScorers['narrative-coherence'].run.mockRejectedValue(
      new Error('LLM request timed out'),
    );
    mockScorers['pacing-distribution'].run.mockResolvedValue({
      score: 3,
      reason: 'Moderate',
      output: '',
      runId: '3',
    });
    mockScorers['jargon-density'].run.mockResolvedValue({
      score: 4,
      reason: 'Fine',
      output: '',
      runId: '4',
    });

    const scorecard = await runEvalSuite('Test script');

    const parsed = ScorecardSchema.parse(scorecard);
    expect(parsed.entries).toHaveLength(4);

    const successEntries = parsed.entries.filter((e) => e.status === 'success');
    const errorEntries = parsed.entries.filter((e) => e.status === 'error');
    expect(successEntries).toHaveLength(3);
    expect(errorEntries).toHaveLength(1);
    expect(errorEntries[0].scorerId).toBe('narrative-coherence');
    expect(errorEntries[0].error).toContain('timed out');

    // overallScore from 3 successful scores: (4+3+4)/3 ≈ 3.7
    expect(parsed.overallScore).toBeCloseTo(3.7, 1);
  });

  it('should compute overallScore as average of successful scores', async () => {
    mockScorers['hook-strength'].run.mockResolvedValue({
      score: 2,
      reason: 'Weak',
      output: '',
      runId: '1',
    });
    mockScorers['narrative-coherence'].run.mockResolvedValue({
      score: 4,
      reason: 'Strong',
      output: '',
      runId: '2',
    });
    mockScorers['pacing-distribution'].run.mockResolvedValue({
      score: 3,
      reason: 'Moderate',
      output: '',
      runId: '3',
    });
    mockScorers['jargon-density'].run.mockResolvedValue({
      score: 5,
      reason: 'Clean',
      output: '',
      runId: '4',
    });

    const scorecard = await runEvalSuite('Test');

    expect(scorecard.overallScore).toBe(3.5); // (2+4+3+5)/4 = 3.5
  });

  it('should handle all scorers failing — no overallScore', async () => {
    mockScorers['hook-strength'].run.mockRejectedValue(new Error('Fail 1'));
    mockScorers['narrative-coherence'].run.mockRejectedValue(new Error('Fail 2'));
    mockScorers['pacing-distribution'].run.mockRejectedValue(new Error('Fail 3'));
    mockScorers['jargon-density'].run.mockRejectedValue(new Error('Fail 4'));

    const scorecard = await runEvalSuite('Test');

    const parsed = ScorecardSchema.parse(scorecard);
    expect(parsed.entries).toHaveLength(4);
    expect(parsed.entries.every((e) => e.status === 'error')).toBe(true);
    expect(parsed.overallScore).toBeUndefined();
  });

  it('should pass the script to each scorer run', async () => {
    for (const scorer of Object.values(mockScorers)) {
      scorer.run.mockResolvedValue({ score: 3, output: '', runId: '1' });
    }

    await runEvalSuite('My talk script here');

    for (const scorer of Object.values(mockScorers)) {
      expect(scorer.run).toHaveBeenCalledWith({ output: 'My talk script here' });
    }
  });
});
