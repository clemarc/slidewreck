# Story 4.1: Eval Scorers — Hook Strength & Narrative Coherence

Status: ready-for-dev

## Story

As a speaker,
I want my talk's opening hook and narrative flow evaluated automatically,
so that I get actionable feedback on the two most impactful aspects of audience engagement.

## Acceptance Criteria

1. **Given** the hook strength scorer exists in `src/mastra/scorers/hook-strength.ts` **When** invoked with a speaker script **Then** it uses an LLM-as-judge (Haiku model tier) to rate the opening hook on a 1–5 scale **And** it returns a score, rating label, and specific improvement suggestions (AC: #1)

2. **Given** the narrative coherence scorer exists in `src/mastra/scorers/narrative-coherence.ts` **When** invoked with a speaker script **Then** it uses an LLM-as-judge (Haiku model tier) to evaluate logical flow, transitions, and thematic consistency **And** it returns a score, rating label, and specific improvement suggestions (AC: #2)

3. **Given** both scorers are registered in the Mastra eval registry in `src/mastra/index.ts` **When** I open Mastra Studio **Then** both scorers are visible in the Scorers tab and can be run independently (AC: #3)

4. **Given** adding a new scorer **When** I add an entry to the eval registry **Then** no modifications to existing scorers or core code are required (NFR-14) (AC: #4)

## Tasks / Subtasks

- [ ] Task 1: Create hook strength scorer (AC: #1)
  - [ ] 1.1 Write TDD test: `createScorer` produces a MastraScorer with id `hook-strength`
  - [ ] 1.2 Write TDD test: scorer `.run()` returns result with numeric `score` property
  - [ ] 1.3 Write TDD test: scorer has `generateScore` and `generateReason` steps
  - [ ] 1.4 Implement `hookStrengthScorer` using `createScorer` with Haiku judge, `.generateScore()` prompt, `.generateReason()` prompt
  - [ ] 1.5 Export scorer from `src/mastra/scorers/hook-strength.ts`

- [ ] Task 2: Create narrative coherence scorer (AC: #2)
  - [ ] 2.1 Write TDD test: `createScorer` produces a MastraScorer with id `narrative-coherence`
  - [ ] 2.2 Write TDD test: scorer `.run()` returns result with numeric `score` property
  - [ ] 2.3 Write TDD test: scorer has `generateScore` and `generateReason` steps
  - [ ] 2.4 Implement `narrativeCoherenceScorer` using `createScorer` with Haiku judge, `.generateScore()` prompt, `.generateReason()` prompt
  - [ ] 2.5 Export scorer from `src/mastra/scorers/narrative-coherence.ts`

- [ ] Task 3: Register scorers in Mastra config (AC: #3)
  - [ ] 3.1 Write TDD test: mastra instance has `hook-strength` scorer registered
  - [ ] 3.2 Write TDD test: mastra instance has `narrative-coherence` scorer registered
  - [ ] 3.3 Import both scorers in `src/mastra/index.ts` and add to `scorers` config

- [ ] Task 4: Verify extensibility — no existing code modified (AC: #4)
  - [ ] 4.1 Confirm all 200 existing tests still pass
  - [ ] 4.2 Confirm no modifications to existing agent, workflow, or tool files

## Dev Notes

### Mastra Scorer API (verified from `@mastra/core@1.8.0` type definitions)

**Import:** `import { createScorer } from '@mastra/core/evals';`

**Builder pattern:**
```typescript
const scorer = createScorer({
  id: 'hook-strength',
  description: 'Evaluates opening hook strength on a 1-5 scale',
  judge: {
    model: HAIKU_MODEL,  // 'anthropic/claude-haiku-4-5'
    instructions: 'You are an expert conference talk evaluator...',
  },
})
.generateScore({
  description: 'Score the hook strength',
  createPrompt: ({ run }) => `Evaluate this talk script's opening hook...
Script: ${run.output}
Return a score from 1 to 5.`,
})
.generateReason({
  description: 'Explain the score and suggest improvements',
  createPrompt: ({ run, score }) => `You scored this hook ${score}/5...
Explain why and provide improvement suggestions.`,
});
```

**Builder steps** (all optional except `generateScore`):
- `.preprocess(fn | PromptObject)` — optional data extraction/reformatting
- `.analyze(fn | PromptObject)` — optional intermediate analysis
- `.generateScore(fn | PromptObject)` — **required** — must return a number
- `.generateReason(fn | PromptObject)` — optional explanation generation

**PromptObject shape** (for LLM-based steps):
```typescript
{
  description: string;
  outputSchema?: z.ZodSchema; // for preprocess/analyze steps
  judge?: { model, instructions }; // override scorer-level judge
  createPrompt: (context) => string | Promise<string>;
}
```

**GenerateScore PromptObject** — the `createPrompt` receives `{ run, results }` where `run = { input, output }`. Must return a number.

**GenerateReason context** — receives `{ run, results, score }` where score is the output of generateScore.

**Running a scorer:**
```typescript
const result = await scorer.run({ output: speakerScript });
// result: { score: number, reason?: string, runId: string, ... }
```

**Scorer introspection:**
```typescript
scorer.id           // 'hook-strength'
scorer.description  // 'Evaluates...'
scorer.getSteps()   // [{ name, type: 'function'|'prompt', description }]
```

### Registration Pattern (from Mastra constructor types)

```typescript
import { hookStrengthScorer } from './scorers/hook-strength';
import { narrativeCoherenceScorer } from './scorers/narrative-coherence';

export const mastra = new Mastra({
  // ... existing config
  scorers: {
    'hook-strength': { scorer: hookStrengthScorer },
    'narrative-coherence': { scorer: narrativeCoherenceScorer },
  },
});
```

**Type:** `MastraScorers = Record<string, MastraScorerEntry>` where `MastraScorerEntry = { scorer: MastraScorer, sampling?: ScoringSamplingConfig }`.

**Note:** Verify the exact registration form works. The type definition requires `{ scorer }` wrapping, but some examples show direct assignment. If `{ scorer }` doesn't work, try passing the scorer directly.

### Model Tier

Both scorers use `HAIKU_MODEL` (`'anthropic/claude-haiku-4-5'`) from `src/mastra/config/models.ts`. The `eval` role is already mapped to `HAIKU_MODEL` in `MODEL_TIERS`.

### Scoring Design

**Hook Strength Scorer** — evaluates the opening hook of a conference talk:
- Score 1: No discernible hook — launches straight into content
- Score 2: Weak hook — generic question or statement
- Score 3: Adequate hook — relevant but predictable
- Score 4: Strong hook — compelling, audience-specific
- Score 5: Exceptional hook — provocative, memorable, creates anticipation

**Narrative Coherence Scorer** — evaluates logical flow and thematic consistency:
- Score 1: Disconnected — sections don't relate, random topic jumping
- Score 2: Weak connections — loose thematic thread, abrupt transitions
- Score 3: Adequate — logical order, basic transitions
- Score 4: Strong — clear narrative arc, smooth transitions, recurring themes
- Score 5: Exceptional — compelling story arc, each section builds on prior, seamless flow

Both scorers should include `generateReason` to provide actionable improvement suggestions.

### Testing Strategy

**Unit tests only** — no LLM calls in tests. Test scorer structure, configuration, and registration.

**What to test:**
- Scorer has correct id, description
- Scorer has expected steps (getSteps() returns generateScore and generateReason)
- Scorer uses correct judge model (HAIKU_MODEL)
- Scorer is registered in Mastra config
- Scorer `.run()` signature accepts `{ output }` (type check, not runtime)

**What NOT to test in this story:**
- Actual LLM scoring quality (that's integration testing, Story 4-3)
- Score storage or retrieval (Story 4-4)

**Mocking:** If testing `.run()`, mock the LLM response. Use `vi.mock()` patterns established in previous stories. The scorer internally creates a workflow — may need to mock at the model/generate level.

**Simpler approach:** Focus tests on scorer configuration and step structure via `getSteps()`, `id`, `description`, `judge` properties rather than trying to mock the internal workflow execution. This keeps tests fast and deterministic.

### File Structure

```
src/mastra/
  scorers/                               # NEW directory
    hook-strength.ts                     # NEW — hook strength scorer
    narrative-coherence.ts               # NEW — narrative coherence scorer
    __tests__/                           # NEW directory
      hook-strength.test.ts              # NEW — scorer config + registration tests
      narrative-coherence.test.ts        # NEW — scorer config + registration tests
  index.ts                               # MODIFY — add scorers registration
  config/
    models.ts                            # READ ONLY — HAIKU_MODEL already defined
```

### Previous Story Intelligence

**From Story 3.3 (RAG-Augmented Research):**
- 200 tests passing baseline
- TDD pattern: write failing tests first, then implement minimal code
- Agent `instructions` property not publicly accessible — use `readFileSync` workaround if needed for testing
- `.optional()` fields for backward compatibility
- All new functionality goes in new files (scorers/), keeping existing code unchanged

**From Epic 3 patterns:**
- Export types alongside implementations
- Co-locate tests in `__tests__/` subdirectories
- Use `readFileSync` + `join(__dirname, ...)` for source inspection tests
- Keep test assertions focused — test observable behavior, not implementation details

### References

- [Source: epics.md#Epic 4 — Story 4.1] — Acceptance criteria with BDD scenarios
- [Source: architecture.md#Eval Framework] — LLM-as-judge, Haiku model tier, scorer file structure
- [Source: architecture.md#Phase Recipes] — "Create scorer file → register in Mastra config → verify in Studio"
- [Source: @mastra/core/dist/evals/base.d.ts] — createScorer API, MastraScorer class, builder pattern
- [Source: @mastra/core/dist/evals/types.d.ts] — MastraScorerEntry, ScoringSamplingConfig types

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

### Completion Notes List

### File List
