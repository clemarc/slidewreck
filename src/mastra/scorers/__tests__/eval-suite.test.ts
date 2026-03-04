import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScorecardSchema } from '../../schemas/scorecard';

// Mock all 4 scorers
vi.mock('../hook-strength', () => ({
  hookStrengthScorer: {
    id: 'hook-strength',
    run: vi.fn(),
  },
}));
vi.mock('../narrative-coherence', () => ({
  narrativeCoherenceScorer: {
    id: 'narrative-coherence',
    run: vi.fn(),
  },
}));
vi.mock('../pacing-distribution', () => ({
  pacingDistributionScorer: {
    id: 'pacing-distribution',
    run: vi.fn(),
  },
}));
vi.mock('../jargon-density', () => ({
  jargonDensityScorer: {
    id: 'jargon-density',
    run: vi.fn(),
  },
}));

import { runEvalSuite } from '../eval-suite';
import { hookStrengthScorer } from '../hook-strength';
import { narrativeCoherenceScorer } from '../narrative-coherence';
import { pacingDistributionScorer } from '../pacing-distribution';
import { jargonDensityScorer } from '../jargon-density';

describe('runEvalSuite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should run all 4 scorers and return a valid scorecard', async () => {
    vi.mocked(hookStrengthScorer.run).mockResolvedValue({
      score: 4,
      reason: 'Strong hook',
      output: '',
      runId: '1',
    });
    vi.mocked(narrativeCoherenceScorer.run).mockResolvedValue({
      score: 3,
      reason: 'Adequate flow',
      output: '',
      runId: '2',
    });
    vi.mocked(pacingDistributionScorer.run).mockResolvedValue({
      score: 5,
      reason: 'Excellent balance',
      output: '',
      runId: '3',
    });
    vi.mocked(jargonDensityScorer.run).mockResolvedValue({
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
    vi.mocked(hookStrengthScorer.run).mockResolvedValue({
      score: 4,
      reason: 'Good',
      output: '',
      runId: '1',
    });
    vi.mocked(narrativeCoherenceScorer.run).mockRejectedValue(
      new Error('LLM request timed out'),
    );
    vi.mocked(pacingDistributionScorer.run).mockResolvedValue({
      score: 3,
      reason: 'Moderate',
      output: '',
      runId: '3',
    });
    vi.mocked(jargonDensityScorer.run).mockResolvedValue({
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
    vi.mocked(hookStrengthScorer.run).mockResolvedValue({
      score: 2,
      reason: 'Weak',
      output: '',
      runId: '1',
    });
    vi.mocked(narrativeCoherenceScorer.run).mockResolvedValue({
      score: 4,
      reason: 'Strong',
      output: '',
      runId: '2',
    });
    vi.mocked(pacingDistributionScorer.run).mockResolvedValue({
      score: 3,
      reason: 'Moderate',
      output: '',
      runId: '3',
    });
    vi.mocked(jargonDensityScorer.run).mockResolvedValue({
      score: 5,
      reason: 'Clean',
      output: '',
      runId: '4',
    });

    const scorecard = await runEvalSuite('Test');

    expect(scorecard.overallScore).toBe(3.5); // (2+4+3+5)/4 = 3.5
  });

  it('should handle all scorers failing — no overallScore', async () => {
    vi.mocked(hookStrengthScorer.run).mockRejectedValue(new Error('Fail 1'));
    vi.mocked(narrativeCoherenceScorer.run).mockRejectedValue(new Error('Fail 2'));
    vi.mocked(pacingDistributionScorer.run).mockRejectedValue(new Error('Fail 3'));
    vi.mocked(jargonDensityScorer.run).mockRejectedValue(new Error('Fail 4'));

    const scorecard = await runEvalSuite('Test');

    const parsed = ScorecardSchema.parse(scorecard);
    expect(parsed.entries).toHaveLength(4);
    expect(parsed.entries.every((e) => e.status === 'error')).toBe(true);
    expect(parsed.overallScore).toBeUndefined();
  });

  it('should pass the script to each scorer run', async () => {
    vi.mocked(hookStrengthScorer.run).mockResolvedValue({
      score: 3,
      output: '',
      runId: '1',
    });
    vi.mocked(narrativeCoherenceScorer.run).mockResolvedValue({
      score: 3,
      output: '',
      runId: '2',
    });
    vi.mocked(pacingDistributionScorer.run).mockResolvedValue({
      score: 3,
      output: '',
      runId: '3',
    });
    vi.mocked(jargonDensityScorer.run).mockResolvedValue({
      score: 3,
      output: '',
      runId: '4',
    });

    await runEvalSuite('My talk script here');

    expect(hookStrengthScorer.run).toHaveBeenCalledWith({ output: 'My talk script here' });
    expect(narrativeCoherenceScorer.run).toHaveBeenCalledWith({ output: 'My talk script here' });
    expect(pacingDistributionScorer.run).toHaveBeenCalledWith({ output: 'My talk script here' });
    expect(jargonDensityScorer.run).toHaveBeenCalledWith({ output: 'My talk script here' });
  });
});
