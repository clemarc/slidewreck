import type { Scorecard, ScorecardEntry } from '../schemas/scorecard';
import { mastra } from '../index';

const SCORER_KEYS = [
  'hook-strength',
  'narrative-coherence',
  'pacing-distribution',
  'jargon-density',
] as const;

/**
 * Run all registered scorers against a speaker script and produce a unified scorecard.
 * Uses Promise.allSettled for resilience — individual scorer failures don't block others.
 */
export async function runEvalSuite(script: string): Promise<Scorecard> {
  const scorers = SCORER_KEYS.map((key) => mastra.getScorer(key));

  const results = await Promise.allSettled(
    scorers.map((scorer) => scorer.run({ output: script })),
  );

  const entries: ScorecardEntry[] = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return {
        scorerId: scorers[i].id,
        score: result.value.score,
        reason: result.value.reason,
        status: 'success' as const,
      };
    }
    return {
      scorerId: scorers[i].id,
      status: 'error' as const,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });

  const successfulScores = entries
    .filter((e): e is ScorecardEntry & { score: number } => e.status === 'success' && e.score != null);

  const overallScore =
    successfulScores.length > 0
      ? Math.round(
          (successfulScores.reduce((sum, e) => sum + e.score, 0) / successfulScores.length) * 10,
        ) / 10
      : undefined;

  return {
    entries,
    overallScore,
    timestamp: new Date().toISOString(),
  };
}
