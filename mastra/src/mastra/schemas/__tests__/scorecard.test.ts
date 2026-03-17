import { describe, it, expect } from 'vitest';
import { ScorecardEntrySchema, ScorecardSchema } from '../scorecard';

describe('ScorecardEntrySchema', () => {
  it('should validate a successful scorer result', () => {
    const result = ScorecardEntrySchema.parse({
      scorerId: 'hook-strength',
      score: 4,
      reason: 'Strong opening hook with a compelling question.',
      status: 'success',
    });
    expect(result.scorerId).toBe('hook-strength');
    expect(result.score).toBe(4);
    expect(result.status).toBe('success');
  });

  it('should validate a failed scorer result', () => {
    const result = ScorecardEntrySchema.parse({
      scorerId: 'narrative-coherence',
      status: 'error',
      error: 'LLM request timed out',
    });
    expect(result.scorerId).toBe('narrative-coherence');
    expect(result.status).toBe('error');
    expect(result.error).toBe('LLM request timed out');
    expect(result.score).toBeUndefined();
  });

  it('should reject invalid status values', () => {
    expect(() =>
      ScorecardEntrySchema.parse({
        scorerId: 'test',
        status: 'pending',
      }),
    ).toThrow();
  });

  it('should reject scores outside 1-5 range', () => {
    expect(() =>
      ScorecardEntrySchema.parse({
        scorerId: 'test',
        score: 0,
        status: 'success',
      }),
    ).toThrow();
    expect(() =>
      ScorecardEntrySchema.parse({
        scorerId: 'test',
        score: 6,
        status: 'success',
      }),
    ).toThrow();
  });
});

describe('ScorecardSchema', () => {
  it('should validate a full scorecard with entries and overallScore', () => {
    const scorecard = ScorecardSchema.parse({
      entries: [
        { scorerId: 'hook-strength', score: 4, reason: 'Good', status: 'success' },
        { scorerId: 'narrative-coherence', score: 3, reason: 'Adequate', status: 'success' },
      ],
      overallScore: 3.5,
      timestamp: '2026-03-04T12:00:00.000Z',
    });
    expect(scorecard.entries).toHaveLength(2);
    expect(scorecard.overallScore).toBe(3.5);
  });

  it('should validate a scorecard with mixed success and error entries', () => {
    const scorecard = ScorecardSchema.parse({
      entries: [
        { scorerId: 'hook-strength', score: 4, status: 'success' },
        { scorerId: 'narrative-coherence', status: 'error', error: 'Failed' },
      ],
      overallScore: 4,
      timestamp: '2026-03-04T12:00:00.000Z',
    });
    expect(scorecard.entries).toHaveLength(2);
  });

  it('should validate a scorecard with no overallScore (all failed)', () => {
    const scorecard = ScorecardSchema.parse({
      entries: [
        { scorerId: 'hook-strength', status: 'error', error: 'Failed' },
      ],
      timestamp: '2026-03-04T12:00:00.000Z',
    });
    expect(scorecard.overallScore).toBeUndefined();
  });
});
