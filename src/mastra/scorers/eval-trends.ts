/**
 * Trend analysis for eval scores across sessions.
 * Requires at least 3 data points per scorer to produce trends.
 */

export interface TrendEntry {
  scorerId: string;
  latestScore: number;
  previousAverage: number;
  trend: 'improving' | 'stable' | 'declining';
  dataPoints: number;
}

export interface TrendAnalysis {
  entries: TrendEntry[];
  sessionCount: number;
}

const TREND_THRESHOLD = 0.3;
const MIN_DATA_POINTS = 3;

/**
 * Analyze score trends from historical data.
 * Returns null if fewer than 3 data points exist for any scorer.
 *
 * @param history - Map of scorerId to array of scores (oldest first)
 */
export function analyzeTrends(
  history: Record<string, number[]>,
): TrendAnalysis | null {
  const scorerIds = Object.keys(history);
  if (scorerIds.length === 0) return null;

  // Need at least MIN_DATA_POINTS across all scorers
  const maxDataPoints = Math.max(
    ...scorerIds.map((id) => history[id].length),
  );
  if (maxDataPoints < MIN_DATA_POINTS) return null;

  const entries: TrendEntry[] = [];

  for (const scorerId of scorerIds) {
    const scores = history[scorerId];
    if (scores.length < MIN_DATA_POINTS) continue;

    const latestScore = scores[scores.length - 1];
    const previous = scores.slice(0, -1);
    const previousAverage =
      previous.reduce((sum, s) => sum + s, 0) / previous.length;

    let trend: TrendEntry['trend'];
    if (latestScore > previousAverage + TREND_THRESHOLD) {
      trend = 'improving';
    } else if (latestScore < previousAverage - TREND_THRESHOLD) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    entries.push({
      scorerId,
      latestScore,
      previousAverage: Math.round(previousAverage * 100) / 100,
      trend,
      dataPoints: scores.length,
    });
  }

  if (entries.length === 0) return null;

  return {
    entries,
    sessionCount: maxDataPoints,
  };
}
