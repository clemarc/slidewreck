# Story 4.4: Eval Result Storage & Trend Analysis

Status: done

## Story

As a speaker,
I want evaluation results stored and queryable over time, with meta-analysis when enough data exists,
so that I can track how my talks improve across sessions.

## Acceptance Criteria

1. **Given** the eval suite produces a scorecard **When** the results are saved **Then** they are stored via Mastra's built-in ScoresStorage with talk ID, run ID, and per-scorer results (AC: #1)

2. **Given** stored evaluation results **When** I query by run ID or scorer ID **Then** the correct results are returned via ScoresStorage query APIs (AC: #2)

3. **Given** at least 3 completed sessions exist with eval results **When** the meta-eval runs after a new session **Then** it produces a trend analysis showing score progression across sessions **And** it identifies improving and declining metrics (AC: #3)

4. **Given** fewer than 3 sessions exist **When** the pipeline completes **Then** the meta-eval step is skipped without error **And** the scorecard notes that trend analysis requires more sessions (AC: #4)

5. **Given** the `pnpm eval` script is configured in `package.json` **When** I run `pnpm eval` **Then** the eval suite runs independently against a specified talk output without requiring a full pipeline run (AC: #5)

## Tasks / Subtasks

- [x] Task 1: Create score persistence function (AC: #1)
  - [x] 1.1 Write TDD test: `saveEvalResults()` saves each scorecard entry via mastra storage
  - [x] 1.2 Write TDD test: `saveEvalResults()` skips error entries (only saves successful scores)
  - [x] 1.3 Write TDD test: `saveEvalResults()` includes run ID and entity context
  - [x] 1.4 Implement `saveEvalResults()` in `src/mastra/scorers/eval-storage.ts`

- [x] Task 2: Create score query functions (AC: #2)
  - [x] 2.1 Write TDD test: `getScoresByRunId()` retrieves scores for a specific workflow run
  - [x] 2.2 Write TDD test: `getScoreHistory()` retrieves historical scores for a specific scorer
  - [x] 2.3 Implement query functions in `src/mastra/scorers/eval-storage.ts`

- [x] Task 3: Create trend analysis function (AC: #3, #4)
  - [x] 3.1 Write TDD test: `analyzeTrends()` produces trend data when ≥3 runs exist
  - [x] 3.2 Write TDD test: `analyzeTrends()` returns null when <3 runs exist
  - [x] 3.3 Write TDD test: `analyzeTrends()` identifies improving and declining metrics
  - [x] 3.4 Implement `analyzeTrends()` in `src/mastra/scorers/eval-trends.ts`

- [x] Task 4: Integrate storage + trends into workflow (AC: #1, #3, #4)
  - [x] 4.1 Update workflow final map to save scores after eval via `saveEvalResults()`
  - [x] 4.2 Add trend analysis call after scoring (skip when <3 sessions)
  - [x] 4.3 Include trend data in scorecard output when available (added `trends` field to ScorecardSchema)

- [x] Task 5: Add `pnpm eval` standalone script (AC: #5)
  - [x] 5.1 Create `src/eval.ts` CLI entry point
  - [x] 5.2 Add `"eval"` script to `package.json`
  - [x] 5.3 Verify standalone eval works without full pipeline

- [x] Task 6: Verify no regressions
  - [x] 6.1 Confirm all existing tests still pass (246 passing)
  - [x] 6.2 TypeScript compiles cleanly (0 errors)

## Dev Notes

### Architecture: Leverage Built-in ScoresStorage

**Key spike finding:** Mastra has built-in score storage via `ScoresStorage` abstract class, implemented by `PostgresStore`. No custom PostgreSQL implementation needed.

**ScoresStorage API (verified from `@mastra/core@1.8.0`):**

```typescript
// Save a score
abstract saveScore(score: SaveScorePayload): Promise<{ score: ScoreRowData }>;

// Query methods
abstract getScoreById({ id }): Promise<ScoreRowData | null>;
abstract listScoresByScorerId({ scorerId, pagination, entityId?, entityType?, source? }): Promise<ListScoresResponse>;
abstract listScoresByRunId({ runId, pagination }): Promise<ListScoresResponse>;
abstract listScoresByEntityId({ entityId, entityType, pagination }): Promise<ListScoresResponse>;

// Pagination
type StoragePagination = { page: number; perPage: number | false };

// Score row includes: id, scorerId, entityId, runId, score, reason, source, createdAt, etc.
```

**Access pattern:** The Mastra instance's PostgresStore implements ScoresStorage. Access via `mastra.getStorage()` or the storage instance directly.

### SaveScorePayload Design

```typescript
// For each successful scorecard entry:
const payload: SaveScorePayload = {
  runId: workflowRunId,
  scorerId: entry.scorerId,
  entityId: talkId || workflowRunId, // use talk topic hash as entity
  source: 'LIVE',
  score: entry.score,
  reason: entry.reason,
  scorer: { id: entry.scorerId },
  entity: { type: 'talk', topic },
  entityType: 'WORKFLOW',
};
```

### Trend Analysis Design

**Algorithm:**
1. For each scorer, query historical scores via `listScoresByScorerId()`
2. If < 3 data points, return null (not enough data)
3. Compare the latest score against the average of previous scores
4. Classify each metric as "improving", "stable", or "declining"
5. Return trend summary

**Trend classification:**
- Improving: latest score > previous average + 0.3
- Declining: latest score < previous average - 0.3
- Stable: within ±0.3 of previous average

**Output schema:**

```typescript
const TrendEntrySchema = z.object({
  scorerId: z.string(),
  latestScore: z.number(),
  previousAverage: z.number(),
  trend: z.enum(['improving', 'stable', 'declining']),
  dataPoints: z.number(),
});

const TrendAnalysisSchema = z.object({
  entries: z.array(TrendEntrySchema),
  sessionCount: z.number(),
  message: z.string().optional(), // e.g., "Not enough data for trend analysis"
});
```

### Standalone Eval Script (`pnpm eval`)

```typescript
// src/eval.ts
import { runEvalSuite } from './mastra/scorers/eval-suite';
import { readFileSync } from 'fs';

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Usage: pnpm eval <path-to-script.md>');
  process.exit(1);
}

const script = readFileSync(scriptPath, 'utf-8');
const scorecard = await runEvalSuite(script);
console.log(JSON.stringify(scorecard, null, 2));
```

### Testing Strategy

**Score persistence + query tests:** Mock the Mastra storage to avoid PostgreSQL dependency. Test that `saveEvalResults()` calls `saveScore()` with correct payloads and that query functions call `listScoresByScorerId()` / `listScoresByRunId()` with correct params.

**Trend analysis tests:** Pure function tests with mock historical data. Test ≥3 data points produces trends, <3 returns null, correctly classifies improving/declining/stable.

**Standalone eval:** Test that the function works independently (already tested via eval-suite tests). The script itself is a thin CLI wrapper.

### File Structure

```
src/
  eval.ts                                # NEW — standalone eval CLI entry point
  mastra/
    scorers/
      eval-suite.ts                      # EXISTING (Story 4-3)
      eval-storage.ts                    # NEW — save/query score functions
      eval-trends.ts                     # NEW — trend analysis function
      __tests__/
        eval-storage.test.ts             # NEW — storage function tests
        eval-trends.test.ts              # NEW — trend analysis tests
    schemas/
      scorecard.ts                       # MODIFY — add optional trends field
    workflows/
      slidewreck.ts                      # MODIFY — add score saving + trends
package.json                             # MODIFY — add eval script
```

### Previous Story Intelligence

**From Story 4-3:**
- `runEvalSuite()` runs all 4 scorers with `Promise.allSettled`
- Scorecard schema defined with entries, overallScore, timestamp
- Workflow integration: eval runs in final `.map()`, scorecard in workflow output
- 234 tests passing baseline

**From spike:**
- Score storage is built-in — don't implement custom PostgreSQL
- `listScoresByScorerId()` handles pagination
- `compareExperiments()` exists but may be overkill — simpler trend analysis is sufficient

### References

- [Source: epics.md#Epic 4 — Story 4.4] — Acceptance criteria
- [Source: spike-mastra-evals-api.md] — Built-in score storage, query APIs
- [Source: @mastra/core/dist/storage/domains/scores/base.d.ts] — ScoresStorage abstract class
- [Source: @mastra/core/dist/evals/types.d.ts] — SaveScorePayload, ScoreRowData, ListScoresResponse
- [Source: 4-3-automated-eval-suite-scorecard.md] — Eval suite function, scorecard schema

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — clean implementation with no debugging required.

### Completion Notes List

- Used dependency injection (ScoresStorage parameter) for testability — no Mastra instance import needed in tests
- `ListScoresResponse.scores` array items have implicit `any` type due to Zod inference depth — used explicit `{ score: number }` annotation in workflow
- TrendAnalysisSchema defined before ScorecardSchema to avoid `z.lazy()` forward reference
- Workflow storage integration uses dynamic `import('../index')` to access mastra instance and `getStore('scores')` for ScoresStorage
- Entity ID derived from topic: `talk-${topic.toLowerCase().replace(/\s+/g, '-')}`
- All storage + trend operations wrapped in try/catch — failures don't break the workflow

### Change Log

- Created `src/mastra/scorers/eval-storage.ts` — saveEvalResults, getScoresByRunId, getScoreHistory
- Created `src/mastra/scorers/eval-trends.ts` — analyzeTrends with improving/stable/declining classification
- Created `src/mastra/scorers/__tests__/eval-storage.test.ts` — 5 tests
- Created `src/mastra/scorers/__tests__/eval-trends.test.ts` — 7 tests
- Modified `src/mastra/schemas/scorecard.ts` — added TrendEntrySchema, TrendAnalysisSchema, optional trends field on ScorecardSchema
- Modified `src/mastra/workflows/slidewreck.ts` — added score saving + trend analysis in final map
- Created `src/eval.ts` — standalone eval CLI entry point
- Modified `package.json` — added "eval" script

### File List

- `src/mastra/scorers/eval-storage.ts` — NEW
- `src/mastra/scorers/eval-trends.ts` — NEW
- `src/mastra/scorers/__tests__/eval-storage.test.ts` — NEW
- `src/mastra/scorers/__tests__/eval-trends.test.ts` — NEW
- `src/mastra/schemas/scorecard.ts` — MODIFIED
- `src/mastra/workflows/slidewreck.ts` — MODIFIED
- `src/eval.ts` — NEW
- `package.json` — MODIFIED
