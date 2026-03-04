# Story 4.2: Eval Scorers — Pacing Distribution & Jargon Density

Status: done

## Story

As a speaker,
I want my talk's pacing balance and jargon level evaluated automatically,
so that I get feedback on two common presentation pitfalls — uneven section timing and inaccessible language.

## Acceptance Criteria

1. **Given** the pacing distribution scorer exists in `src/mastra/scorers/pacing-distribution.ts` **When** invoked with a speaker script **Then** it uses heuristic analysis (word count per section, timing estimation at 140 wpm) to evaluate pacing balance **And** it returns a score (1-5), per-section timing breakdown in the reason, and flags for sections that are too long or too short (AC: #1)

2. **Given** the jargon density scorer exists in `src/mastra/scorers/jargon-density.ts` **When** invoked with a speaker script and optional audience level context **Then** it uses an LLM-as-judge (Haiku model tier) to identify jargon relative to the audience level **And** it returns a score (1-5), flagged terms, and suggested simplifications in the reason (AC: #2)

3. **Given** both scorers are registered in the Mastra eval registry in `src/mastra/index.ts` **When** I open Mastra Studio **Then** both scorers are visible in the Scorers tab and can be run independently (AC: #3)

4. **Given** adding a new scorer **When** I add entries to the eval registry **Then** no modifications to existing scorers or core code are required (NFR-14) (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Create pacing distribution scorer — heuristic (AC: #1)
  - [x] 1.1 Write TDD test: `createScorer` produces a MastraScorer with id `pacing-distribution`
  - [x] 1.2 Write TDD test: scorer has a description mentioning pacing/balance
  - [x] 1.3 Write TDD test: scorer has `preprocess`, `generateScore`, and `generateReason` steps in source
  - [x] 1.4 Write TDD test: scorer does NOT have a judge (heuristic, no LLM)
  - [x] 1.5 Write TDD test: `parseSections()` correctly splits markdown by headers
  - [x] 1.6 Write TDD test: `parseSections()` falls back to paragraph splitting when no headers
  - [x] 1.7 Write TDD test: `calculatePacingScore()` returns 5 for perfectly balanced sections
  - [x] 1.8 Write TDD test: `calculatePacingScore()` returns 1 for extremely unbalanced sections
  - [x] 1.9 Write TDD test: `calculatePacingScore()` returns 3 for single-section input (can't assess balance)
  - [x] 1.10 Implement `parseSections()` helper — splits script by markdown headers (`## ` / `### `) or by double-newline paragraphs
  - [x] 1.11 Implement `calculatePacingScore()` helper — uses coefficient of variation (CV) of section word counts to derive 1-5 score
  - [x] 1.12 Implement `pacingDistributionScorer` using `createScorer` with `.preprocess()` (section analysis), `.generateScore()` (CV-based score), `.generateReason()` (formatted breakdown with flags)
  - [x] 1.13 Export scorer and helpers from `src/mastra/scorers/pacing-distribution.ts`

- [x] Task 2: Create jargon density scorer — LLM-as-judge (AC: #2)
  - [x] 2.1 Write TDD test: `createScorer` produces a MastraScorer with id `jargon-density`
  - [x] 2.2 Write TDD test: scorer has a description mentioning jargon/accessibility
  - [x] 2.3 Write TDD test: scorer uses HAIKU_MODEL as judge
  - [x] 2.4 Write TDD test: scorer has `generateScore` and `generateReason` steps in source
  - [x] 2.5 Write TDD test: scorer judge instructions contain scoring rubric (Score 1 through Score 5)
  - [x] 2.6 Implement `jargonDensityScorer` using `createScorer` with Haiku judge, `.generateScore()` prompt (audience-level aware), `.generateReason()` prompt (flagged terms + simplifications)
  - [x] 2.7 Export scorer from `src/mastra/scorers/jargon-density.ts`

- [x] Task 3: Register scorers in Mastra config (AC: #3)
  - [x] 3.1 Write TDD test: mastra instance has `pacing-distribution` scorer registered
  - [x] 3.2 Write TDD test: mastra instance has `jargon-density` scorer registered
  - [x] 3.3 Import both scorers in `src/mastra/index.ts` and add to `scorers` config

- [x] Task 4: Verify extensibility — no existing code modified (AC: #4)
  - [x] 4.1 Confirm all 220 tests pass (no regressions)
  - [x] 4.2 Confirm no modifications to existing agent, workflow, tool, or scorer files

## Dev Notes

### Pacing Distribution Scorer — Heuristic Design

**Key principle:** This is a **pure heuristic scorer** — no LLM calls. All three steps (preprocess, generateScore, generateReason) are plain functions. This makes it fast, deterministic, and zero-cost.

**Section parsing strategy:**
1. Primary: Split by markdown headers (`## ` or `### ` at line start)
2. Fallback: Split by double-newline paragraph breaks (when no headers found)
3. Edge case: Single section → score defaults to 3 (can't meaningfully assess pacing balance with one section)
4. Edge case: Empty/whitespace-only → score 1

**Timing estimation:** Standard conference speaking rate ≈ 140 words per minute.

**Pacing balance metric:** Coefficient of Variation (CV) = standard deviation / mean of section word counts.

**Score rubric (CV-based):**
- Score 5: CV < 0.20 — excellent balance, sections are very evenly distributed
- Score 4: CV 0.20–0.40 — well-balanced, minor variation
- Score 3: CV 0.40–0.70 — moderate variation, some sections noticeably longer/shorter
- Score 2: CV 0.70–1.00 — significant imbalance, major timing issues
- Score 1: CV > 1.00 — extremely unbalanced, or degenerate input

**Section flags:**
- "Too long": section word count > 2× average section word count
- "Too short": section word count < 0.5× average section word count

**Builder pattern (all function steps, no PromptObject):**

```typescript
const pacingDistributionScorer = createScorer({
  id: 'pacing-distribution',
  description: 'Evaluates pacing balance across sections of a conference talk using heuristic word-count analysis on a 1-5 scale',
  // NO judge — heuristic scorer
})
.preprocess(({ run }) => {
  // Parse sections, count words, compute timing
  return { sections: [...], totalWords, totalMinutes, avgWordsPerSection };
})
.generateScore(({ results }) => {
  // Compute CV from results.preprocessStepResult
  return scoreFromCV;
})
.generateReason(({ results, score }) => {
  // Format per-section breakdown with flags
  return 'Section breakdown: ...';
});
```

**Exported helpers (for testability):**
- `parseSections(script: string): Array<{ name: string; text: string; wordCount: number }>` — section parsing logic
- `calculatePacingScore(sections: Array<{ wordCount: number }>): number` — CV calculation → 1-5 score

### Jargon Density Scorer — LLM-as-Judge Design

Same pattern as Story 4-1 scorers. Uses Haiku model tier.

**Score rubric:**
- Score 1: Overwhelmingly jargon-heavy — most sentences contain unexplained technical terms
- Score 2: High jargon density — many terms that would confuse the target audience
- Score 3: Moderate jargon — some terms need explanation or simplification
- Score 4: Appropriate level — jargon mostly explained or audience-appropriate
- Score 5: Clean and accessible — technical terms well-managed, accessible to target audience

**Audience level handling:** The scorer's `run.input` can optionally carry audience context (e.g., `"developer audience"`, `"general business audience"`). The prompt should gracefully handle cases where no audience level is provided by defaulting to "general technical audience".

**Builder pattern:**
```typescript
const jargonDensityScorer = createScorer({
  id: 'jargon-density',
  description: 'Evaluates jargon accessibility relative to target audience on a 1-5 scale',
  judge: { model: HAIKU_MODEL, instructions: '...' },
})
.generateScore({ description: '...', createPrompt: ({ run }) => '...' })
.generateReason({ description: '...', createPrompt: ({ run, score }) => '...' });
```

### Scorer API (verified from `@mastra/core@1.8.0`)

**Heuristic function step signatures (from type definitions):**

```typescript
// preprocess: FunctionStep — receives { run, results }, returns any
.preprocess(({ run }) => { /* return preprocessed data */ })

// generateScore: GenerateScoreFunctionStep — receives { run, results }, MUST return number
.generateScore(({ run, results }) => { /* return 1-5 */ })

// generateReason: GenerateReasonFunctionStep — receives { run, results, score }, returns any
.generateReason(({ run, results, score }) => { /* return string */ })
```

**Step result accumulation:** Each step's output is stored in `results` keyed by step name:
- `results.preprocessStepResult` — output of preprocess step
- `results.generateScoreStepResult` — output of generateScore step (the number)

**Registration pattern (same as Story 4-1):**
```typescript
scorers: {
  'pacing-distribution': { scorer: pacingDistributionScorer },
  'jargon-density': { scorer: jargonDensityScorer },
},
```

### Testing Strategy

**Unit tests only** — no LLM calls in tests.

**Pacing distribution (heuristic) — more tests possible since logic is deterministic:**
- Scorer config tests: id, description, no judge, steps in source
- `parseSections()` unit tests: header splitting, paragraph fallback, edge cases
- `calculatePacingScore()` unit tests: balanced input → 5, unbalanced → 1, single section → 3
- These helper tests verify the actual scoring logic without needing to run the scorer

**Jargon density (LLM) — same test pattern as Story 4-1:**
- Scorer config tests: id, description, judge model, steps in source
- No runtime scoring tests (LLM-dependent)

**`getSteps()` bug:** Same `@mastra/core@1.8.0` limitation as Story 4-1. Use `readFileSync` source inspection for step verification. See Known Limitations in architecture.md.

### DRY Opportunity from Story 4-1 Code Review

Story 4-1 code review noted a DRY opportunity: both hook-strength and narrative-coherence scorers share identical test structure. Now with 4 scorers, consider whether a shared test helper is worthwhile. **Decision: defer** — the test files are small (6 tests each) and the duplication is in test structure, not production code. A shared helper would add indirection with minimal benefit. Reassess if a 5th+ scorer is added.

### File Structure

```
src/mastra/
  scorers/
    hook-strength.ts                     # EXISTING (Story 4-1)
    narrative-coherence.ts               # EXISTING (Story 4-1)
    pacing-distribution.ts               # NEW — heuristic pacing scorer + helpers
    jargon-density.ts                    # NEW — LLM jargon scorer
    __tests__/
      hook-strength.test.ts              # EXISTING (Story 4-1)
      narrative-coherence.test.ts        # EXISTING (Story 4-1)
      pacing-distribution.test.ts        # NEW — scorer config + helper unit tests
      jargon-density.test.ts             # NEW — scorer config tests
  index.ts                               # MODIFY — add 2 more scorer registrations
  __tests__/
    index.test.ts                        # MODIFY — add 2 more registration tests
  config/
    models.ts                            # READ ONLY — HAIKU_MODEL already defined
```

### Previous Story Intelligence

**From Story 4-1:**
- `createScorer` builder pattern verified and working
- Registration uses `{ scorer: instance }` wrapping per `MastraScorerEntry` type
- `getSteps()` crashes for prompt-based steps in `@mastra/core@1.8.0` — use source inspection
- `readFileSync` + `join(__dirname, ...)` pattern for source inspection tests
- 208 tests passing baseline (194 original + 14 from story 4-1)
- 2 pre-existing workflow test failures (DATABASE_URL missing) — not caused by changes
- Code review: added rating labels to `generateReason` prompts — apply same pattern to jargon density

**From Story 4-1 code review (action items for 4-2):**
- Include rating labels in `generateReason` prompts (e.g., `[1] Jargon-Heavy, [2] High Density...`)
- Source inspection tests are documented as a known workaround — acceptable pattern

### References

- [Source: epics.md#Epic 4 — Story 4.2] — Acceptance criteria with BDD scenarios
- [Source: architecture.md#Eval Framework] — LLM-as-judge, Haiku model tier, scorer file structure
- [Source: architecture.md#Phase Recipes] — "Create scorer file → register in Mastra config → verify in Studio"
- [Source: architecture.md#Known Limitations] — getSteps() bug, source inspection workaround
- [Source: spike-mastra-evals-api.md] — Heuristic scorer pattern confirmed, function-based generateScore
- [Source: @mastra/core/dist/evals/base.d.ts] — createScorer API, FunctionStep types, preprocess/analyze/generateScore/generateReason
- [Source: 4-1-eval-scorers-hook-strength-narrative-coherence.md] — Previous story intelligence, patterns, learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Heuristic scorer with `.preprocess()` function step works correctly — no issues with function-based steps (unlike prompt-based steps which trigger the getSteps() bug)
- `run.input` is typed as `any` by default, so audience level can be passed as string without custom typing

### Completion Notes List

- Pacing distribution scorer: pure heuristic (zero LLM cost), uses preprocess → generateScore → generateReason, all function steps
- Section parsing: markdown headers (## / ###) with paragraph fallback, handles edge cases (empty, single section)
- Pacing score: coefficient of variation (CV) of section word counts mapped to 1-5 scale
- Reason includes per-section timing breakdown at 140 wpm with [TOO LONG] / [TOO SHORT] flags
- Jargon density scorer: LLM-as-judge with Haiku, audience-level aware (defaults to "general technical audience")
- Both scorers include rating labels in generateReason prompts per Story 4-1 code review action item
- Registration uses `{ scorer: instance }` wrapping per MastraScorerEntry type
- 26 new tests (18 pacing + 6 jargon + 2 registration) = 220 total passing
- 2 pre-existing workflow test failures (DATABASE_URL missing) — not caused by this story

### Change Log

- 2026-03-04: Implemented story 4-2 — pacing distribution (heuristic) and jargon density (LLM) scorers with registration
- 2026-03-04: Code review fix — corrected scorer registration pattern from `{ scorer: instance }` to direct instances (fixes TS2353 on all 4 scorers, including pre-existing Story 4-1 bug)

### File List

- `src/mastra/scorers/pacing-distribution.ts` — NEW: heuristic pacing scorer with parseSections() and calculatePacingScore() helpers
- `src/mastra/scorers/jargon-density.ts` — NEW: LLM-as-judge jargon scorer
- `src/mastra/scorers/__tests__/pacing-distribution.test.ts` — NEW: 18 tests (5 scorer config + 7 parseSections + 6 calculatePacingScore)
- `src/mastra/scorers/__tests__/jargon-density.test.ts` — NEW: 6 tests
- `src/mastra/index.ts` — MODIFIED: added pacing-distribution and jargon-density scorer imports and registration
- `src/mastra/__tests__/index.test.ts` — MODIFIED: added 2 registration tests + 2 mocks
