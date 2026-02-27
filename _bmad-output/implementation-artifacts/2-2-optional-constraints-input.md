# Story 2.2: Optional Constraints Input

Status: done

## Story

As a speaker,
I want to provide optional constraints to guide content generation,
so that the system respects my preferences for angles, exclusions, or emphasis areas.

## Acceptance Criteria

1. **Given** the workflow input schema in `src/mastra/schemas/workflow-input.ts` **When** I inspect the updated schema **Then** it includes an optional `constraints` field as a free-text string (FR-4) (AC: #1)

2. **Given** a speaker provides constraints (e.g., "Focus on observability, avoid Kubernetes examples") **When** the pipeline executes **Then** the constraints are passed as context to the Researcher agent's prompt **And** the constraints are passed as context to the Architect agent's prompt (AC: #2)

3. **Given** a speaker provides no constraints **When** the pipeline executes **Then** the Researcher and Architect proceed without constraint context **And** no validation error occurs (AC: #3)

## Tasks / Subtasks

- [x] Task 1: Update WorkflowInputSchema with optional constraints field (AC: #1)
  - [x] 1.1 Add `constraints: z.string().min(1).optional().describe(...)` to `WorkflowInputSchema`
  - [x] 1.2 Update tests in `workflow-input.test.ts` — TDD first (3 failing → 0)
  - [x] 1.3 Tests: valid with constraints, valid without (undefined), reject empty string, accept long text, reject non-string

- [x] Task 2: Pass constraints to Researcher prompt (AC: #2, #3)
  - [x] 2.1 Modified first `.map()` in `slidewreck.ts` to destructure `constraints` and conditionally include in prompt
  - [x] 2.2 Graceful handling: constraints section only rendered when provided

- [x] Task 3: Pass constraints to Architect prompt (AC: #2, #3)
  - [x] 3.1 Architect is NOT yet in workflow pipeline (that's Story 2.3). No changes needed now.
  - [x] 3.2 Constraints will be passed to Architect when it's wired into the pipeline in Story 2.3.

- [x] Task 4: Update integration tests (AC: #2, #3)
  - [x] 4.1 Updated integration test's `.map()` transform to match production constraints handling
  - [x] 4.2 Added `testInputWithConstraints` fixture and test verifying pipeline completion with constraints
  - [x] 4.3 Existing tests (without constraints) continue to pass — confirms AC #3

- [x] Task 5: Verify all tests pass
  - [x] 5.1 `pnpm test` — all 147 tests pass (141 existing + 5 schema + 1 integration)

## Dev Notes

### Architecture Compliance

**Schema change — defensive validation:**
```typescript
// In WorkflowInputSchema:
constraints: z.string().min(1).optional()
  .describe('Free-text speaker constraints for content generation (e.g., "Focus on observability, avoid Kubernetes"). Absent when speaker has no preferences.'),
```

Key rules:
- `.min(1)` per Defensive Validation Checklist — reject empty strings
- `.optional()` per AC #3 — no error when omitted
- `.describe()` per checklist — explain when/why absent
- Type becomes `string | undefined` in `WorkflowInput`

**Workflow prompt modification:**
```typescript
// In first .map() callback:
const { topic, audienceLevel, format, constraints } = inputData;
// ...
${constraints ? `\nSpeaker Constraints: ${constraints}` : ''}
```

**Architect integration note:** Story 2.3 will wire the Architect into the workflow pipeline. At that point, constraints must also be passed to the Architect's prompt. The current story prepares the schema and passes constraints to the Researcher. The Architect agent already exists (`talk-architect.ts`) but is not yet in the workflow pipeline.

### File Structure Requirements

```
src/mastra/
  schemas/
    workflow-input.ts              # MODIFY — add constraints field
    __tests__/
      workflow-input.test.ts       # MODIFY — add constraints tests
  workflows/
    slidewreck.ts                  # MODIFY — pass constraints to researcher prompt
    __tests__/
      slidewreck.integration.test.ts  # MODIFY — test with/without constraints
```

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **TDD:** Write failing tests first
- **Schema tests:** valid with constraints, valid without (undefined), reject empty string, accept long text
- **Integration tests:** pipeline works with constraints in testInput, pipeline works without
- **Run:** `pnpm test` must pass ALL tests

### Previous Story Intelligence

**From story 2-1 (Architect Agent & Timing Tool):**
- 141 tests passing as baseline
- `TalkFormatEnum` extracted and shared between workflow-input.ts and estimate-timing.ts
- Architect agent exists at `src/mastra/agents/talk-architect.ts` but NOT in workflow pipeline yet
- Registration in index.ts: `agents: { researcher, architect, writer }`

**From story 2-0 (Integration Tests):**
- Integration test uses `InMemoryStore` and mock `createStep()` pattern
- Test pipeline mirrors real workflow with identical `.map()` transforms
- Changes to `.map()` transforms in slidewreck.ts must also be reflected in the integration test's `testPipeline`

**Persistent issue:** `researcher.ts` model tier fix (OPUS→SONNET) has been lost during squash merge rebases multiple times. Fixed directly on main with commit `57413b8`.

### Git Intelligence

**Recent commits:**
- `57413b8` fix: researcher model tier — OPUS_MODEL → SONNET_MODEL (persistent fix)
- `26be025` Story 2.1: Architect Agent & Timing Tool (#10)
- Previous: Story 2.0 integration tests

### References

- [Source: epics.md#Story 2.2] — Acceptance criteria with BDD scenarios
- [Source: architecture.md#Input Handling] — FR-4: optional constraints
- [Source: architecture.md#Defensive Validation Checklist] — .min(1), .optional(), .describe()
- [Source: implementation-artifacts/2-1-architect-agent-timing-tool.md] — Previous story context
- [Source: implementation-artifacts/2-0-pipeline-integration-tests.md] — Integration test patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- No issues encountered — straightforward schema extension

### Completion Notes List

- All 3 ACs satisfied: optional constraints in schema (AC#1), passed to Researcher prompt (AC#2), no error without constraints (AC#3)
- Architect prompt handling deferred to Story 2.3 when Architect is wired into pipeline
- 6 new tests (5 schema + 1 integration), 147 total passing
- TDD approach: wrote 3 failing tests first, then implemented field

### File List

- `src/mastra/schemas/workflow-input.ts` — MODIFIED: added optional constraints field
- `src/mastra/schemas/__tests__/workflow-input.test.ts` — MODIFIED: 5 new constraints tests
- `src/mastra/workflows/slidewreck.ts` — MODIFIED: constraints in researcher prompt
- `src/mastra/workflows/__tests__/slidewreck.integration.test.ts` — MODIFIED: constraints in test transform + new test case
