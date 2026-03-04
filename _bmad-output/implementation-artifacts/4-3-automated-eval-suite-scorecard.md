# Story 4.3: Automated Eval Suite & Scorecard

Status: done

## Story

As a speaker,
I want all quality evaluations to run automatically after generation completes and see a unified scorecard,
so that I get immediate quality feedback without manual steps.

## Acceptance Criteria

1. **Given** the pipeline completes successfully (speaker approves final output) **When** the eval step executes **Then** all 4 scorers (hook strength, narrative coherence, pacing distribution, jargon density) run automatically against the final output (AC: #1)

2. **Given** all scorers have completed **When** the eval suite produces results **Then** a scorecard is generated containing each scorer's name, score, rating, and recommendations **And** the scorecard is included in the pipeline's final output (AC: #2)

3. **Given** the scorecard is produced **When** the speaker views the results **Then** the scorecard is displayed in Mastra Studio **And** the scorecard is available as structured data in the pipeline output (AC: #3)

4. **Given** one scorer fails during evaluation **When** the eval suite encounters the failure **Then** the remaining scorers still execute **And** the scorecard notes which scorer failed and why (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Create scorecard schema (AC: #2, #3)
  - [x] 1.1 Write TDD test: `ScorecardEntrySchema` validates a successful scorer result (score, reason, status)
  - [x] 1.2 Write TDD test: `ScorecardEntrySchema` validates a failed scorer result (status 'error', error message)
  - [x] 1.3 Write TDD test: `ScorecardSchema` validates a full scorecard with entries and overallScore
  - [x] 1.4 Implement `ScorecardEntrySchema` and `ScorecardSchema` in `src/mastra/schemas/scorecard.ts`

- [x] Task 2: Create eval suite function (AC: #1, #4)
  - [x] 2.1 Write TDD test: `runEvalSuite()` runs all 4 scorers and returns a scorecard
  - [x] 2.2 Write TDD test: `runEvalSuite()` handles scorer failure — failed scorer produces error entry, others still succeed
  - [x] 2.3 Write TDD test: `runEvalSuite()` computes overallScore as average of successful scores
  - [x] 2.4 Write TDD test: `runEvalSuite()` handles all scorers failing — returns scorecard with all error entries
  - [x] 2.5 Implement `runEvalSuite()` in `src/mastra/scorers/eval-suite.ts` using `Promise.allSettled`

- [x] Task 3: Add scorecard to workflow output schema (AC: #2, #3)
  - [x] 3.1 Write TDD test: `WorkflowOutputSchema` has optional `scorecard` field (preserves scorecard in parsed result)
  - [x] 3.2 Update `WorkflowOutputSchema` in `src/mastra/schemas/workflow-output.ts` to include optional scorecard

- [x] Task 4: Integrate eval suite into slidewreck workflow (AC: #1, #3)
  - [x] 4.1 Added `runEvalSuite()` call in the final map step of `src/mastra/workflows/slidewreck.ts`
  - [x] 4.2 Scorecard passed through to workflow output with try/catch resilience

- [x] Task 5: Verify no regressions (AC: #4 implicit)
  - [x] 5.1 Confirm all 234 tests pass (no regressions)
  - [x] 5.2 Confirm no modifications to existing scorer files

## Dev Notes

### Architecture Decision: Inline Eval vs. Separate Step

**Decision: Run eval suite inline in the final `.map()` of the workflow.**

The `runEvals` API from `@mastra/core/evals` requires a `target` (Agent or Workflow) and runs the target on data items before scoring — it's designed for dataset-level evaluation, not scoring an existing output. Not suitable here.

`getStepResult()` is only available in `.map()` callbacks, not in `createStep` execute functions. So a dedicated `createStep` for evals can't access the writer output directly.

**Simplest approach:** Call `runEvalSuite()` inside the existing final `.map()` that produces the workflow output. This:
- Has access to `getStepResult(writerStep)` for the approved script
- Runs after the speaker approves the script
- Includes the scorecard in the workflow output (visible in Studio)
- Uses `Promise.allSettled` for resilience

### Scorecard Schema Design

```typescript
const ScorecardEntrySchema = z.object({
  scorerId: z.string().describe('ID of the scorer that produced this result'),
  score: z.number().min(1).max(5).optional().describe('Score from 1-5. Absent when scorer failed.'),
  reason: z.string().optional().describe('Explanation and recommendations. Absent when scorer failed.'),
  status: z.enum(['success', 'error']).describe('Whether the scorer completed successfully'),
  error: z.string().optional().describe('Error message when scorer failed. Absent on success.'),
});

const ScorecardSchema = z.object({
  entries: z.array(ScorecardEntrySchema).describe('Results from each scorer'),
  overallScore: z.number().optional().describe('Average score across successful scorers. Absent when all failed.'),
  timestamp: z.string().describe('ISO 8601 timestamp when the eval suite ran'),
});
```

### Eval Suite Function Design

```typescript
import { hookStrengthScorer } from './hook-strength';
import { narrativeCoherenceScorer } from './narrative-coherence';
import { pacingDistributionScorer } from './pacing-distribution';
import { jargonDensityScorer } from './jargon-density';

const ALL_SCORERS = [
  hookStrengthScorer,
  narrativeCoherenceScorer,
  pacingDistributionScorer,
  jargonDensityScorer,
];

export async function runEvalSuite(script: string): Promise<Scorecard> {
  const results = await Promise.allSettled(
    ALL_SCORERS.map(scorer => scorer.run({ output: script }))
  );

  const entries = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return {
        scorerId: ALL_SCORERS[i].id,
        score: result.value.score,
        reason: result.value.reason,
        status: 'success' as const,
      };
    }
    return {
      scorerId: ALL_SCORERS[i].id,
      status: 'error' as const,
      error: result.reason?.message ?? 'Unknown error',
    };
  });

  const successfulScores = entries.filter(e => e.status === 'success' && e.score != null);
  const overallScore = successfulScores.length > 0
    ? successfulScores.reduce((sum, e) => sum + e.score!, 0) / successfulScores.length
    : undefined;

  return {
    entries,
    overallScore: overallScore ? Math.round(overallScore * 10) / 10 : undefined,
    timestamp: new Date().toISOString(),
  };
}
```

### Workflow Integration Point

```typescript
// In slidewreck.ts — the final .map() (lines 282-296)
.map(async ({ runId, getStepResult, getInitData }) => {
  const researchBrief = getStepResult(researcherStep);
  const speakerScript = getStepResult(writerStep);
  const initData = getInitData<WorkflowInput>();

  // Run eval suite against the approved script
  const scorecard = await runEvalSuite(String(speakerScript.speakerScript));

  return {
    researchBrief,
    speakerScript,
    scorecard,
    metadata: {
      workflowRunId: runId,
      completedAt: new Date().toISOString(),
      input: initData,
    },
  };
})
```

### Testing Strategy

**Schema tests:** Standard Zod validation tests — valid data passes, invalid data fails.

**Eval suite function tests:** Mock all 4 scorers to avoid LLM calls. Test:
- All succeed → scorecard with 4 entries + overallScore
- One fails → 3 success entries + 1 error entry, overallScore from 3 scores
- All fail → 4 error entries, no overallScore

**Workflow integration tests:** Verify the WorkflowOutputSchema accepts the scorecard field. The actual workflow execution is tested via integration tests (which require DATABASE_URL), so we test the schema compatibility and function integration separately.

**Mocking approach:** Mock the scorer `.run()` method:
```typescript
vi.mock('./hook-strength', () => ({
  hookStrengthScorer: {
    id: 'hook-strength',
    run: vi.fn().mockResolvedValue({ score: 4, reason: 'Good hook' }),
  },
}));
```

### File Structure

```
src/mastra/
  schemas/
    scorecard.ts                         # NEW — Scorecard schemas
    __tests__/
      scorecard.test.ts                  # NEW — schema validation tests
    workflow-output.ts                   # MODIFY — add optional scorecard field
  scorers/
    eval-suite.ts                        # NEW — runEvalSuite function
    __tests__/
      eval-suite.test.ts                 # NEW — eval suite function tests
  workflows/
    slidewreck.ts                        # MODIFY — add eval suite call in final map
```

### Previous Story Intelligence

**From Story 4-2:**
- 4 scorers implemented and registered: hook-strength, narrative-coherence, pacing-distribution, jargon-density
- Registration corrected: direct instances (no `{ scorer }` wrapping) per Mastra constructor type
- 220 tests passing baseline
- 2 pre-existing workflow test failures (DATABASE_URL missing)
- Heuristic scorer (pacing) uses function steps, LLM scorers use PromptObject steps

**From Story 4-2 code review:**
- Registration pattern corrected — Mastra constructor expects `Record<string, MastraScorer>` not `Record<string, MastraScorerEntry>`
- TypeScript now compiles cleanly (0 errors)

### References

- [Source: epics.md#Epic 4 — Story 4.3] — Acceptance criteria
- [Source: architecture.md#Phase Recipes] — "Create scorer file → register in Mastra config → verify in Studio"
- [Source: spike-mastra-evals-api.md] — runEvals API (not suitable), score storage built-in
- [Source: @mastra/core/dist/evals/run/index.d.ts] — runEvals requires target Agent/Workflow
- [Source: slidewreck.ts] — Current workflow structure, final map at lines 282-296
- [Source: workflow-output.ts] — Current output schema to extend

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Zod `.object()` strips unknown keys by default — tests must verify parsed output includes expected fields, not just `.success`
- `runEvals` from `@mastra/core/evals` requires a `target` (Agent/Workflow) — not suitable for scoring existing output, use manual scorer.run() approach instead

### Completion Notes List

- Scorecard schema: ScorecardEntrySchema + ScorecardSchema with success/error status, optional fields per Defensive Validation Checklist
- Eval suite function: `Promise.allSettled` runs all 4 scorers in parallel, individual failures don't block others
- overallScore: average of successful scores, rounded to 1 decimal, undefined when all fail
- Workflow integration: eval suite runs in final `.map()` step, scorecard included in workflow output
- Workflow output schema: optional scorecard field for backward compatibility
- 14 new tests (7 schema + 5 eval-suite + 2 workflow-output) = 234 total passing

### Change Log

- 2026-03-04: Implemented story 4-3 — automated eval suite with scorecard, workflow integration

### File List

- `src/mastra/schemas/scorecard.ts` — NEW: ScorecardEntrySchema + ScorecardSchema
- `src/mastra/schemas/__tests__/scorecard.test.ts` — NEW: 7 tests
- `src/mastra/scorers/eval-suite.ts` — NEW: runEvalSuite function
- `src/mastra/scorers/__tests__/eval-suite.test.ts` — NEW: 5 tests
- `src/mastra/schemas/workflow-output.ts` — MODIFIED: added optional scorecard field
- `src/mastra/schemas/__tests__/workflow-output.test.ts` — MODIFIED: 2 new tests
- `src/mastra/workflows/slidewreck.ts` — MODIFIED: added eval suite call in final map
