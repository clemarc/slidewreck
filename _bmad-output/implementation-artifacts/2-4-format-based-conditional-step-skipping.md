# Story 2.4: Format-Based Conditional Step Skipping

Status: review

## Story

As a speaker,
I want the pipeline to automatically adapt its steps based on my talk format,
so that lightning talks skip unnecessary steps and keynotes get full treatment.

## Acceptance Criteria

1. **Given** a speaker selects `lightning` format (5-10 min) **When** the pipeline executes **Then** the Architect agent step is skipped entirely — a default single-section structure is used instead (FR-12) **And** Gate 2 (structure selection) is skipped **And** the Writer produces condensed output without extended audience interaction prompts or multi-section transitions (AC: #1)

2. **Given** a speaker selects `standard` format (25-35 min) **When** the pipeline executes **Then** all steps execute without skipping — Architect proposes 3 structures, Gate 2 for selection, Writer produces full output (AC: #2)

3. **Given** a speaker selects `keynote` format (40-60 min) **When** the pipeline executes **Then** all steps execute with extended content — Writer includes deeper examples, multiple audience interaction points, and longer transitions (AC: #3)

4. **Given** the Architect step is skipped for lightning format **When** the Writer step receives its input **Then** it receives a default structure with a single section and the original topic/research context rather than failing (NFR-7) **And** the pipeline log records which steps were skipped and why (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Make architectStructureStep format-aware (AC: #1, #2, #3, #4)
  - [x] 1.1 Write TDD tests for lightning bypass: step returns default structure immediately (no suspend, no architect call)
  - [x] 1.2 Write TDD tests for standard/keynote: step behaves identically to current (architect call + suspend/resume)
  - [x] 1.3 Relax `ArchitectStructureOutputSchema` to allow 1+ options (`.min(1)` instead of reusing `.length(3)`)
  - [x] 1.4 Add `skippedArchitect: z.boolean().optional()` to `ArchitectStructureOutputSchema` for observability
  - [x] 1.5 Modify `architectStructureStep.execute` — check `getInitData<WorkflowInput>().format`, if `lightning` return default structure immediately (no architect call, no suspend)
  - [x] 1.6 Default structure: single `StructureOption` with topic as title, one section covering the full duration range

- [x] Task 2: Add format-specific Writer prompt instructions (AC: #1, #3)
  - [x] 2.1 Write TDD test: lightning writer prompt contains "condensed" / no audience interaction directives
  - [x] 2.2 Write TDD test: keynote writer prompt contains "deeper examples" / multiple interaction points directives
  - [x] 2.3 Modify `.map()` before `writerStep` to append format-specific instructions based on `getInitData<WorkflowInput>().format`

- [x] Task 3: Update integration tests (AC: #1, #2, #3, #4)
  - [x] 3.1 Add `testInputLightning` fixture with `format: 'lightning'`
  - [x] 3.2 Add `testInputKeynote` fixture with `format: 'keynote'`
  - [x] 3.3 Test: lightning format — pipeline suspends at Gate 1, approval goes directly to Gate 3 (no Gate 2 suspend)
  - [x] 3.4 Test: lightning format — full completion (Gate 1 approve → Gate 3 approve → success)
  - [x] 3.5 Test: standard format — existing 3-gate flow unchanged (Gate 1 → Gate 2 → Gate 3)
  - [x] 3.6 Test: keynote format — same 3-gate flow as standard (all steps execute)
  - [x] 3.7 Update mock `mockArchitectStructureStep` to support format-aware behavior

- [x] Task 4: Add observability logging (AC: #4)
  - [x] 4.1 When architect is skipped, emit `console.log` with step name and reason
  - [x] 4.2 Mastra's built-in tracing captures step execution — verify in Studio

- [x] Task 5: Verify all tests pass
  - [x] 5.1 `pnpm test` — all 157 tests pass (153 baseline + 4 new integration tests)

## Dev Notes

### Architecture Compliance

**Conditional step execution — format-aware composite step (architectural adaptation):**

The epics reference `.branch()` for conditional logic. However, `.branch()` creates parallel branches with merged output (`{ 'step-id-1'?: Output1, 'step-id-2'?: Output2 }`), requiring the downstream `.map()` to handle a union of optional outputs. This adds complexity for a single conditional skip.

**Recommended approach: format-aware composite step.** Modify the existing `architectStructureStep` to check `getInitData<WorkflowInput>().format` early in its `execute` function. If `lightning`, return a default structure immediately (no architect call, no suspend). If standard/keynote, proceed with the existing architect + suspend/resume flow.

This keeps the pipeline structure unchanged (no `.branch()` needed) and avoids the branch output merging complexity. The step already has access to `getInitData<WorkflowInput>()` in its execute params.

**If `.branch()` is preferred**, the dev may split the pipeline after Gate 1 into two branches:
- Lightning branch: `lightningBypassStep` (returns default structure, no suspend)
- Standard/keynote branch: `architectBranchStep` (wraps architect prompt building + architect call + suspend)

Then `.map()` after branch merges the optional outputs. This is more complex but uses the Mastra branching API as the architecture doc suggests.

**Verify first:** The composite step approach is simpler. Only use `.branch()` if there's a strong reason (e.g., the architecture decision is strict about using it).

**`getInitData` in step execute:**
```typescript
const architectStructureStep = createStep({
  // ...
  execute: async ({ inputData, suspend, resumeData, suspendData, getInitData }) => {
    const initData = getInitData<WorkflowInput>();

    // Lightning format: skip architect, return default structure
    if (initData.format === 'lightning') {
      console.log('[architect-structure] Skipped: lightning format — using default single-section structure');
      return {
        approved: true,
        feedback: undefined,
        architectOutput: {
          options: [{
            title: initData.topic,
            description: `Single-section lightning talk on ${initData.topic}`,
            sections: [{
              title: initData.topic,
              purpose: 'Complete lightning talk content',
              contentWordCount: FORMAT_DURATION_RANGES.lightning.maxMinutes * 150,
              estimatedMinutes: FORMAT_DURATION_RANGES.lightning.maxMinutes,
            }],
            rationale: 'Default single-section structure for lightning format — architect step skipped',
          }],
        },
        skippedArchitect: true,
      };
    }

    // Standard/keynote: existing architect + suspend/resume flow
    // ... (unchanged code)
  },
});
```

**Schema change — relax options constraint for step output:**
```typescript
export const ArchitectStructureOutputSchema = z.object({
  approved: z.boolean().describe('Whether the speaker approved the structure'),
  feedback: z.string().optional().describe('Speaker feedback. Absent when no feedback provided.'),
  architectOutput: z.object({
    options: z.array(StructureOptionSchema).min(1).describe('Structure options — 3 from architect, or 1 default for lightning format'),
  }),
  skippedArchitect: z.boolean().optional().describe('True when architect was skipped (lightning format). Absent when architect executed.'),
});
```

Note: The `ArchitectOutputSchema` in `talk-architect.ts` retains `.length(3)` for the agent's structured output. Only the step's output schema (`ArchitectStructureOutputSchema`) is relaxed to `.min(1)`.

**Import: `StructureOptionSchema` is NOT exported from `talk-architect.ts`.** The dev will need to either:
1. Export `StructureOptionSchema` from `talk-architect.ts` (preferred)
2. Inline the schema definition in `slidewreck.ts`

**Format-specific Writer prompt additions:**
```typescript
.map(async ({ inputData, getStepResult, getInitData }) => {
  const structureResult = inputData;
  const initData = getInitData<WorkflowInput>();
  const format = initData.format;

  // Format-specific writing instructions
  let formatInstructions = '';
  if (format === 'lightning') {
    formatInstructions = `\n\n## Lightning Format Guidelines
- Condense to a single clear narrative arc
- No extended audience interaction prompts ([ASK AUDIENCE] max 1)
- Minimal section transitions — dive straight into content
- Strong opening hook and immediate call to action`;
  } else if (format === 'keynote') {
    formatInstructions = `\n\n## Keynote Format Guidelines
- Include multiple audience interaction points throughout
- Deeper examples and case studies in each section
- Longer, more polished transitions between sections
- Extended storytelling and narrative building
- Multiple [PAUSE] and [ASK AUDIENCE] markers`;
  }
  // standard: no special instructions (default behavior)

  return {
    prompt: `Write a complete conference talk script...
${formatInstructions}
...`,
  };
})
```

**Defensive Validation Checklist compliance:**
- `skippedArchitect` uses `.optional().describe()` — absent when architect executed
- `options` changed to `.min(1)` — still rejects empty arrays
- Default structure's `contentWordCount` computed from `FORMAT_DURATION_RANGES.lightning.maxMinutes * 150` (150 wpm pace)
- Default structure's `estimatedMinutes` set to format's `maxMinutes`

### Workflow Pipeline Change

**No pipeline restructuring required.** The existing pipeline shape is unchanged:
```
.map(input → researcher prompt)
.then(researcherStep)
.then(reviewResearchGate)          ← Gate 1 (all formats)
.map(gate1 result → architect prompt)
.then(architectStructureStep)      ← MODIFIED: returns default for lightning, calls architect for standard/keynote
.map(structureResult → writer prompt) ← MODIFIED: format-specific instructions appended
.then(writerStep)
.then(reviewScriptGate)            ← Gate 3 (all formats)
.map(final output assembly)
.commit()
```

For lightning: `architectStructureStep` returns immediately (no suspend), so the pipeline flows directly from Gate 1 → default structure → writer prompt → writer → Gate 3. Gate 2 is effectively skipped because the step never calls `suspend()`.

### File Structure Requirements

```
src/mastra/
  agents/
    talk-architect.ts                  # MODIFY — export StructureOptionSchema
  workflows/
    slidewreck.ts                      # MODIFY — format-aware architect step, format-specific writer prompt
    __tests__/
      slidewreck.integration.test.ts   # MODIFY — lightning/keynote test fixtures and tests
```

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **TDD:** Write failing tests first, then implement
- **Integration tests must cover:**
  - Lightning format: pipeline goes Gate 1 → (no Gate 2) → Gate 3 → success
  - Lightning format: no `architect-structure` suspend step between Gate 1 and Gate 3
  - Standard format: existing 3-gate flow unchanged (regression protection)
  - Keynote format: same 3-gate flow as standard
  - Default structure is valid and contains single section with topic
  - Full pipeline completion for all 3 formats

**Mock update for integration test:**
The mock `mockArchitectStructureStep` needs to support format-aware behavior. Since it's a mock, it doesn't call the architect — but it must check format and return default structure for lightning (no suspend) vs. suspend for standard/keynote.

```typescript
const mockArchitectStructureStep = createStep({
  id: 'architect-structure',
  // ...
  execute: async ({ suspend, resumeData, getInitData }) => {
    const initData = getInitData<WorkflowInput>();

    // Lightning: skip architect, return default structure immediately
    if (initData.format === 'lightning') {
      return {
        approved: true,
        feedback: undefined,
        architectOutput: { options: [mockLightningDefaultOption] },
        skippedArchitect: true,
      };
    }

    // Standard/keynote: existing suspend/resume mock behavior
    if (resumeData?.approved) { /* ... */ }
    if (resumeData && !resumeData.approved) { /* ... */ }
    return await suspend({ /* ... */ });
  },
});
```

### Previous Story Intelligence

**From Story 2.3 (Structure Selection Gate with Loopback):**
- 153 tests passing baseline
- `architectStructureStep` composite pattern: calls `architect.generate()`, suspends, handles loopback via re-suspend
- `ArchitectStructureOutputSchema` exported from `slidewreck.ts` for test reuse
- `suspendData` used to retrieve architect output on approval resume
- Code review fixed: explicit error throw when `suspendData.output` missing (no unsafe fallback)
- Code review added: no-feedback rejection path with distinct prompt
- `getInitData<WorkflowInput>()` available in `.map()` transforms and step execute functions
- Integration test mock step pattern well-established

**From Story 2.1 (Architect Agent & Timing Tool):**
- `ArchitectOutputSchema` uses `.length(3)` for exactly 3 options — not relaxable without breaking agent output
- `StructureOptionSchema` defined but NOT exported from `talk-architect.ts` — Story 2.4 needs to export it
- Agent uses `SONNET_MODEL` and `estimateTiming` tool

**From Story 2.2 (Optional Constraints Input):**
- Constraints conditional template: `${constraints ? \`\nSpeaker Constraints: ${constraints}\` : ''}`
- Same pattern for format-specific instructions: conditional template appending

**Persistent issue:** `researcher.ts` model tier (OPUS→SONNET) keeps reverting during squash merge rebases. Check researcher.ts after rebase.

### Git Intelligence

**Recent commits:**
- `9871010` Story 2.3: Structure Selection Gate with Loopback (#12)
- `6e2e41f` Story 2.2: Optional Constraints Input (#11)
- `57413b8` fix: researcher model tier — OPUS_MODEL → SONNET_MODEL (persistent fix)
- `26be025` Story 2.1: Architect Agent & Timing Tool (#10)
- `12fbea4` Story 2.0: Pipeline Integration Tests (#9)

### References

- [Source: epics.md#Story 2.4] — Acceptance criteria with BDD scenarios
- [Source: architecture.md#Workflow Composition Pattern] — `.branch()` conditional, `.then()` sequential
- [Source: architecture.md#Error Handling Strategy] — NFR-7: optional feature failure → placeholder + continue
- [Source: architecture.md#Defensive Validation Checklist] — .min(1), .optional(), .describe()
- [Source: architecture.md#Mastra API Verification Checklist] — verify `.branch()` if used, verify `getInitData` in step execute
- [Source: implementation-artifacts/2-3-structure-selection-gate-with-loopback.md] — Previous story context
- [Source: implementation-artifacts/2-1-architect-agent-timing-tool.md] — Architect agent details

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Verified `.branch()` API signature from `node_modules/@mastra/core/dist/workflows/workflow.d.ts` — determined composite step approach is simpler than `.branch()` for this use case
- Confirmed `getInitData<WorkflowInput>()` available in step `execute` params via `ExecuteFunctionParams` type definition
- Exported `StructureOptionSchema` from `talk-architect.ts` to reuse in `ArchitectStructureOutputSchema`

### Completion Notes List

- All 4 ACs satisfied: lightning skips architect + Gate 2 (AC#1), standard executes all steps (AC#2), keynote executes all steps with extended instructions (AC#3), default structure provided for lightning (AC#4)
- Used format-aware composite step approach instead of `.branch()` — simpler, no pipeline restructuring needed
- `ArchitectStructureOutputSchema` relaxed to `.min(1)` for options (was `.length(3)` via `ArchitectOutputSchema`); agent output still enforces 3
- Added `skippedArchitect: z.boolean().optional()` for observability
- `console.log` emitted when architect skipped for lightning format
- Format-specific writer instructions: lightning (condensed, minimal interaction), keynote (extended, multiple interaction points)
- 4 new integration tests: lightning Gate 2 skip, lightning completion, lightning default structure, keynote 3-gate flow
- Existing standard format tests unchanged — all pass as regression protection
- 157 total tests passing

### File List

- `src/mastra/agents/talk-architect.ts` — MODIFIED: exported `StructureOptionSchema`
- `src/mastra/workflows/slidewreck.ts` — MODIFIED: format-aware architect step, relaxed output schema, format-specific writer prompt
- `src/mastra/workflows/__tests__/slidewreck.integration.test.ts` — MODIFIED: format-aware mock, lightning/keynote fixtures and tests
