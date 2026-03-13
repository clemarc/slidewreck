import type { ScoresStorage } from '@mastra/core/storage';
import type { ListScoresResponse } from '@mastra/core/evals';
import type { Scorecard } from '../schemas/scorecard';

interface SaveContext {
  runId: string;
  entityId: string;
  topic: string;
  output?: unknown;
}

/**
 * Save successful eval results to Mastra's built-in ScoresStorage.
 * Skips entries with status 'error' (only saves successful scores).
 */
export async function saveEvalResults(
  storage: ScoresStorage,
  scorecard: Scorecard,
  context: SaveContext,
): Promise<void> {
  for (const entry of scorecard.entries) {
    if (entry.status !== 'success' || entry.score == null) continue;

    await storage.saveScore({
      runId: context.runId,
      scorerId: entry.scorerId,
      entityId: context.entityId,
      score: entry.score,
      reason: entry.reason,
      source: 'LIVE',
      output: context.output ?? '',
      scorer: { id: entry.scorerId },
      entity: { type: 'talk', topic: context.topic },
      entityType: 'WORKFLOW',
    });
  }
}

/**
 * Retrieve scores for a specific workflow run.
 */
export async function getScoresByRunId(
  storage: ScoresStorage,
  runId: string,
): Promise<ListScoresResponse> {
  return storage.listScoresByRunId({
    runId,
    pagination: { page: 0, perPage: 100 },
  });
}

/**
 * Retrieve historical scores for a specific scorer.
 */
export async function getScoreHistory(
  storage: ScoresStorage,
  scorerId: string,
): Promise<ListScoresResponse> {
  return storage.listScoresByScorerId({
    scorerId,
    pagination: { page: 0, perPage: 100 },
  });
}
