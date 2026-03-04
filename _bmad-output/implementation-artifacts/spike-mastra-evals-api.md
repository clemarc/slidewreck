# Mastra Evals API Verification Spike

**Date:** 2026-03-03
**Installed version:** @mastra/core 1.8.0
**Purpose:** Verify eval/scorer APIs before Epic 4 sprint planning

---

## Key Findings

### Scorer API Shape

Import path: `import { createScorer, MastraScorer } from '@mastra/core/evals'`

`createScorer()` returns a `MastraScorer` instance with a **fluent builder pattern**:

```typescript
const scorer = createScorer({
  id: 'hook-strength',
  description: 'Evaluates opening hook strength on a 1-5 scale',
  judge: {
    model: 'anthropic/claude-haiku-4-5',
    instructions: 'You are an expert conference talk evaluator...',
  },
})
.generateScore({
  description: 'Score the hook strength',
  createPrompt: ({ run }) => `Evaluate: ${run.output}. Score 1-5.`,
})
.generateReason({
  description: 'Explain the score',
  createPrompt: ({ run, score }) => `You scored ${score}/5. Explain why.`,
});
```

Builder steps (all optional except `generateScore`):
- `.preprocess()` — data extraction
- `.analyze()` — intermediate analysis
- `.generateScore()` — **REQUIRED**, must produce a number
- `.generateReason()` — explanation

Each step can be a **function** (heuristic) or **PromptObject** (LLM-as-judge with `createPrompt`).

### Heuristic Scorers (No LLM)

```typescript
const pacingScorer = createScorer({
  id: 'pacing-distribution',
  description: 'Evaluates pacing balance via word count',
})
.generateScore(({ run }) => {
  // Pure function — no LLM call
  const wordCount = String(run.output).split(/\s+/).length;
  return Math.min(5, Math.max(1, wordCount / 200));
});
```

### Registration in Mastra Instance

**UPDATE (Story 4-2 code review):** The Mastra constructor generic constraint is `TScorers extends Record<string, MastraScorer>` — direct instances, NOT `{ scorer: instance }` wrapping. The `MastraScorerEntry` type is for `addScorer()` API, not the constructor. Story 4-1's `{ scorer }` wrapping caused TS2353 errors, corrected in Story 4-2:

```typescript
// CORRECT per Mastra constructor type (TScorers extends Record<string, MastraScorer>)
export const mastra = new Mastra({
  scorers: {
    'hook-strength': hookStrengthScorer,
    'narrative-coherence': narrativeCoherenceScorer,
  },
});
```

Dynamic registration also available: `mastra.addScorer(scorer)`, `mastra.getScorer(key)`, `mastra.listScorers()`, `mastra.removeScorer(key)`.

### Score Execution

```typescript
const result = await scorer.run({
  output: speakerScript,  // Required — the content being evaluated
  input: topic,           // Optional — context
  runId: workflowRunId,   // Optional — for storage tracking
});
// result: { score, reason, extractStepResult?, analyzeStepResult? }
```

### Score Storage — BUILT-IN

**Major finding:** Score storage is **automatic** via the `ScoresStorage` domain (table: `mastra_scorers`). No custom PostgreSQL implementation needed.

Available queries:
- `saveScore()`, `getScoreById()`, `listScoresByScorerId()`, `listScoresByRunId()`, `listScoresByEntityId()`, `listScoresBySpan()`

This means **Story 4-4's manual storage implementation is largely unnecessary** — Mastra handles it.

### Batch Evaluation — `runEvals`

```typescript
import { runEvals } from '@mastra/core/evals';

await runEvals({
  data: [{ input: topic, groundTruth: '...' }],
  scorers: [hookStrengthScorer, narrativeCoherenceScorer],
  target: myAgent,  // or myWorkflow
  onItemComplete: ({ item, targetResult, scorerResults }) => { ... },
  concurrency: 5,
});
```

### Datasets & Experiments API

Full datasets/experiments system exists:
- `mastra.datasets.create({ name, inputSchema, groundTruthSchema })`
- `dataset.addItems([...])`
- `dataset.startExperiment({ task, scorers })`
- `mastra.datasets.compareExperiments({ experimentIds })` — for trend analysis

### Mastra Studio Integration

Scorers tab exists in Studio. Registered scorers are visible and can be run interactively. CLI: `mastra scorers list`, `mastra scorers add`.

---

## Impact on Epic 4 Stories

| Story | Assumption | Actual API | Required Change |
|-------|-----------|------------|-----------------|
| 4-1 | Registration uses `{ scorer: instance }` wrapping | Direct `MastraScorer` instances | Update story spec: use `scorers: { id: instance }` |
| 4-1 | Score range 1-5 enforced by API | API returns raw `number` | Scorer prompt must enforce range |
| 4-2 | Heuristic scorer pattern unclear | `generateScore()` accepts plain functions | Story spec confirmed compatible |
| 4-3 | Custom eval suite step needed | `runEvals` function exists with batch support | Consider using `runEvals` instead of custom step |
| 4-4 | Manual PostgreSQL storage for results | Storage is built-in via `ScoresStorage` | Dramatically simplify — query existing storage, don't implement custom |
| 4-4 | Custom trend analysis queries | `listScoresByScorerId()` + `compareExperiments()` | Leverage existing APIs |

### Recommendations

1. **Update Story 4-1 spec** to use correct registration pattern (no wrapping)
2. **Simplify Story 4-4** significantly — leverage built-in score storage instead of custom PostgreSQL implementation
3. **Consider `runEvals` for Story 4-3** automated eval suite — handles batch execution with concurrency and callbacks
4. **Consider Datasets API for Story 4-4** trend analysis — `compareExperiments()` provides cross-run comparison
5. **Run Mastra API Verification Checklist** on `createScorer`, `runEvals`, and `Datasets` during sprint planning
