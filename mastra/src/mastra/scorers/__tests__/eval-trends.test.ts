import { describe, it, expect } from 'vitest';
import { analyzeTrends } from '../eval-trends';

describe('analyzeTrends', () => {
  it('should produce trend data when >= 3 runs exist', () => {
    const history = {
      'hook-strength': [3, 4, 5],
      'narrative-coherence': [2, 3, 4],
      'pacing-distribution': [4, 4, 4],
    };

    const result = analyzeTrends(history);
    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(3);
    expect(result!.sessionCount).toBe(3);
  });

  it('should return null when < 3 runs exist', () => {
    const history = {
      'hook-strength': [3, 4],
      'narrative-coherence': [2, 3],
    };

    const result = analyzeTrends(history);
    expect(result).toBeNull();
  });

  it('should return null for empty history', () => {
    const result = analyzeTrends({});
    expect(result).toBeNull();
  });

  it('should identify improving metrics', () => {
    // Previous average: (2+3)/2 = 2.5, latest: 4 → improving (4 > 2.5 + 0.3)
    const history = {
      'hook-strength': [2, 3, 4],
    };

    const result = analyzeTrends(history);
    expect(result).not.toBeNull();
    const entry = result!.entries.find((e) => e.scorerId === 'hook-strength');
    expect(entry?.trend).toBe('improving');
    expect(entry?.latestScore).toBe(4);
  });

  it('should identify declining metrics', () => {
    // Previous average: (4+5)/2 = 4.5, latest: 2 → declining (2 < 4.5 - 0.3)
    const history = {
      'hook-strength': [4, 5, 2],
    };

    const result = analyzeTrends(history);
    const entry = result!.entries.find((e) => e.scorerId === 'hook-strength');
    expect(entry?.trend).toBe('declining');
  });

  it('should identify stable metrics', () => {
    // Previous average: (4+4)/2 = 4, latest: 4 → stable (within ±0.3)
    const history = {
      'pacing-distribution': [4, 4, 4],
    };

    const result = analyzeTrends(history);
    const entry = result!.entries.find((e) => e.scorerId === 'pacing-distribution');
    expect(entry?.trend).toBe('stable');
  });

  it('should include data point count per scorer', () => {
    const history = {
      'hook-strength': [3, 4, 5],
      'pacing-distribution': [2, 3, 4, 5],
    };

    const result = analyzeTrends(history);
    const hookEntry = result!.entries.find((e) => e.scorerId === 'hook-strength');
    const pacingEntry = result!.entries.find((e) => e.scorerId === 'pacing-distribution');
    expect(hookEntry?.dataPoints).toBe(3);
    expect(pacingEntry?.dataPoints).toBe(4);
  });
});
