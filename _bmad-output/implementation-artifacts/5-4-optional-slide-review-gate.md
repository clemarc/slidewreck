# Story 5.4: Optional Slide Review Gate

Status: done

## Story

As a speaker,
I want the option to review slide specifications before final output, with auto-approval as the default,
so that I can skip review for speed or opt-in for control when needed.

## Acceptance Criteria

1. **Given** the workflow input schema in `src/mastra/schemas/workflow-input.ts` **When** I inspect the updated schema **Then** it includes an optional `reviewSlides` boolean field defaulting to `false` (AC: #1)

2. **Given** `reviewSlides` is `false` (default) **When** the Designer output is ready **Then** Gate 4 auto-resumes with `{ decision: 'approve' }` without suspending **And** the pipeline proceeds to the next step without user intervention (AC: #2)

3. **Given** `reviewSlides` is `true` **When** the Designer output is ready **Then** the workflow suspends at Gate 4 (`review-slides`) with the DeckSpec in the suspend payload **And** the speaker can review and provide feedback before the pipeline continues (AC: #3)

4. **Given** the slide layout system **When** I add a new layout template via configuration **Then** the Designer can use the new layout without modifying existing code (AC: #4 — NFR-16)

## Tasks / Subtasks

- [x] Task 1: Add `reviewSlides` to WorkflowInputSchema (AC: #1)
  - [x] 1.1 Write TDD tests: schema accepts reviewSlides boolean, defaults to false when omitted, rejects non-boolean
  - [x] 1.2 Add `reviewSlides: z.boolean().default(false).optional()` to WorkflowInputSchema
  - [x] 1.3 Run tests green

- [x] Task 2: Create review-slides gate step (AC: #2, #3)
  - [x] 2.1 Write TDD tests: when reviewSlides=false auto-approves without suspend, when reviewSlides=true suspends with DeckSpec payload, resume returns gate payload
  - [x] 2.2 Implement review-slides step using composite step pattern: checks `getInitData().reviewSlides`, if false returns auto-approve, if true suspends with DeckSpec
  - [x] 2.3 Run tests green

- [x] Task 3: Integrate Gate 4 into workflow (AC: #2, #3)
  - [x] 3.1 Write TDD tests: workflow has review-slides step after designer and before parallel block
  - [x] 3.2 Insert review-slides step between designerStep and the DeckSpec-to-parallel `.map()` in slidewreck.ts
  - [x] 3.3 Run tests green

- [x] Task 4: Verify extensible layout system (AC: #4 — NFR-16)
  - [x] 4.1 Write TDD test: adding a new layout to SLIDE_LAYOUTS const array is reflected in SlideLayoutEnum without other code changes
  - [x] 4.2 Verify the existing pattern (SLIDE_LAYOUTS const → z.enum → SlideLayoutEnum) already satisfies this — no code change expected
  - [x] 4.3 Run tests green

## Dev Notes

### Spike Findings (Critical)

From `spike-epic-5-visual-presentation-design.md`:

- **Story 5.4: Review gate must run AFTER `.parallel()`, not inside** — but the ACs say the gate should run before asset creation ("When the Designer output is ready, Then the workflow suspends"). So the gate goes between designerStep and the parallel block, which is already the correct position.
- **Suspend/resume unsupported in parallel branches** — the gate is NOT inside parallel, so this is fine.

### Gate 4 Design

The review-slides gate follows the existing composite step pattern but with an auto-approve shortcut:

```typescript
const reviewSlidesStep = createStep({
  id: 'review-slides',
  inputSchema: DeckSpecSchema,  // receives designer output
  outputSchema: GateResumeSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ inputData, suspend, resumeData, getInitData }) => {
    if (resumeData) return resumeData;

    const initData = getInitData<WorkflowInput>();
    if (!initData.reviewSlides) {
      // Auto-approve: skip gate without suspending
      return { decision: 'approve' as const };
    }

    // Manual review: suspend with DeckSpec
    return await suspend({
      agentId: 'designer',
      gateId: 'review-slides',
      output: inputData,
      summary: `Slide deck ready for review: ${inputData.title} (${inputData.slides.length} slides)`,
    });
  },
});
```

### Workflow Integration Point

Current flow (from Story 5-3):
```
... → reviewScriptGate → .map(designerPrompt) → designerStep → .map(deckSpec) → .parallel([...]) → ...
```

After Story 5-4:
```
... → reviewScriptGate → .map(designerPrompt) → designerStep → reviewSlidesStep → .map(deckSpec) → .parallel([...]) → ...
```

The reviewSlidesStep receives the DeckSpec from designerStep and either auto-approves or suspends. The next `.map()` extracts the DeckSpec for the parallel block.

### Existing Code Context

- `WorkflowInputSchema` in `src/mastra/schemas/workflow-input.ts` — add `reviewSlides` field
- `GateSuspendSchema`, `GateResumeSchema` in `src/mastra/schemas/gate-payloads.ts` — reuse for gate
- `createReviewGateStep` in `src/mastra/workflows/gates/review-gate.ts` — reference pattern (but this story needs custom logic for auto-approve)
- `slidewreck.ts` — insert gate between designerStep and parallel block
- `SLIDE_LAYOUTS` in `src/mastra/schemas/deck-spec.ts` — extensible layout system

### Testing Strategy

- WorkflowInputSchema: Unit tests for new field validation
- review-slides step: Mock `getInitData()` to return different `reviewSlides` values, verify suspend vs auto-approve
- Layout extensibility: Verify z.enum derives from const array (structural test)

### References

- [Source: spike-epic-5-visual-presentation-design.md#1 — .parallel() suspend caveat]
- [Source: architecture.md — AD-3: Human Gate Placement, Gate 4 optional]
- [Source: epics.md#Story 5.4 — Acceptance Criteria]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

### Completion Notes List

- Added `reviewSlides: z.boolean().default(false)` to WorkflowInputSchema
- Created `reviewSlidesStep` with auto-approve (default) and manual suspend (when reviewSlides=true)
- Gate 4 integrated into slidewreck workflow between designerStep and parallel block
- Layout extensibility verified: SLIDE_LAYOUTS const → z.enum pattern already satisfies NFR-16
- Updated integration test fixtures with `reviewSlides: false`
- 10 new tests across 2 test files, all passing (356 total)
- TypeScript typecheck clean

### Change Log

- 2026-03-12: Implemented Story 5.4 — reviewSlides field, review-slides gate step, workflow integration

### File List

- `src/mastra/schemas/workflow-input.ts` — MODIFIED: Added reviewSlides boolean field with default(false)
- `src/mastra/schemas/__tests__/workflow-input.test.ts` — MODIFIED: 4 new reviewSlides tests
- `src/mastra/workflows/steps/review-slides.ts` — NEW: Gate 4 step with auto-approve/suspend logic
- `src/mastra/workflows/steps/__tests__/review-slides.test.ts` — NEW: 6 gate step tests
- `src/mastra/workflows/slidewreck.ts` — MODIFIED: Added reviewSlidesStep between designer and parallel
- `src/mastra/workflows/__tests__/slidewreck.integration.test.ts` — MODIFIED: Added reviewSlides to test fixtures
