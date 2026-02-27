# Story 2.3: Structure Selection Gate with Loopback

Status: review

## Story

As a speaker,
I want to review proposed talk structures, pick one or request regeneration with feedback,
so that I have full control over the narrative arc of my talk.

## Acceptance Criteria

1. **Given** the Architect agent has produced 3 structure options **When** the workflow reaches Gate 2 (`review-structure`) **Then** the workflow suspends with all 3 options in the suspend payload following `GateSuspendSchema` **And** the summary includes a concise comparison of the 3 options (AC: #1)

2. **Given** the workflow is suspended at Gate 2 **When** the speaker resumes with `{ approved: true, feedback: "Option 2, but swap sections 3 and 4" }` **Then** the selected structure and feedback are passed as input to the Writer step **And** the workflow continues past Gate 2 (AC: #2)

3. **Given** the workflow is suspended at Gate 2 **When** the speaker resumes with `{ approved: false, feedback: "Too academic, try more conversational" }` **Then** the workflow loops back to the Architect agent **And** the rejection feedback is included in the Architect's input context **And** the Architect generates 3 new structure options (AC: #3)

4. **Given** the speaker rejects multiple times **When** the speaker eventually approves a structure **Then** the workflow proceeds to the Writer with the final approved structure (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Create composite Architect+Gate step with loopback (AC: #1, #3, #4)
  - [x] 1.1 Write TDD tests for the composite step: suspend on first run, re-suspend on rejection, return on approval
  - [x] 1.2 Create `architectStructureStep` as a custom `createStep()` that calls `architect.generate()` with structured output, then `suspend()` with the 3 options
  - [x] 1.3 On resume with `approved: false`, re-call architect with rejection feedback appended to prompt, then re-suspend with new options
  - [x] 1.4 On resume with `approved: true`, return the gate resume data (approved structure + feedback via `suspendData`)

- [x] Task 2: Wire Architect into workflow pipeline (AC: #1, #2)
  - [x] 2.1 Insert `.map()` transform after `reviewResearchGate` to build Architect prompt (research brief + constraints + audience + format)
  - [x] 2.2 Insert `architectStructureStep` after the transform
  - [x] 2.3 Update the existing `.map()` before `writerStep` to include approved structure + feedback from Gate 2 in Writer prompt
  - [x] 2.4 Final `.map()` output unchanged (research + script metadata sufficient)

- [x] Task 3: Update integration tests (AC: #1, #2, #3, #4)
  - [x] 3.1 Create mock architect step for integration test (returns fixed 3-option output with re-suspend on rejection)
  - [x] 3.2 Test: pipeline suspends at Gate 2 after research approval
  - [x] 3.3 Test: Gate 2 suspend payload contains 3 structure options and matches `GateSuspendSchema`
  - [x] 3.4 Test: approval at Gate 2 passes structure to Writer, suspends at Gate 3
  - [x] 3.5 Test: rejection at Gate 2 re-suspends with new options (loopback)
  - [x] 3.6 Test: multi-rejection (2 rejections) then approval completes pipeline
  - [x] 3.7 Updated all existing tests to account for new Gate 2 in the pipeline flow (3-gate resume sequence)

- [x] Task 4: Verify all tests pass
  - [x] 4.1 `pnpm test` — all 152 tests pass (147 baseline + 5 new integration tests)

## Dev Notes

### Architecture Compliance

**Loopback pattern — re-suspend within composite step (architectural adaptation):**

The architecture doc specifies `.dountil()` for the loopback (AD-11). However, `.dountil(step, condition)` loops a single step and re-runs it from scratch on each iteration. Combining `.dountil()` with `suspend()`/`resume()` creates unclear semantics: after a gate resumes, the condition runs, and if false, the step re-starts — but the architect AND gate must both be in the loop.

**Recommended approach: composite step with re-suspend.** Create a single custom step that:
1. Calls `architect.generate()` with structured output on every run/re-run
2. Calls `suspend()` to present the 3 options for review
3. On resume with `approved: false`: re-calls architect with feedback, then re-suspends
4. On resume with `approved: true`: returns the resume data to continue pipeline

This achieves FR-10 (rejection with regeneration) without the complexity of `.dountil()` + suspend interaction. The loopback is self-contained within the step.

**If `.dountil()` + suspend works cleanly**, the dev may use it instead. Test the API behavior in an isolation test first: does `.dountil()` properly re-execute a suspending step after condition returns false? If yes, that pattern is preferable. If not, use the composite step approach.

**Verifying re-suspend capability:** Before implementing, write an isolation test that confirms a step can call `suspend()` after being resumed (i.e., a step that suspends, gets resumed, then suspends again). This is the foundation of the loopback.

**Agent.generate() with structured output inside a custom step:**
```typescript
import { architect, ArchitectOutputSchema } from '../agents/talk-architect';

const result = await architect.generate(prompt, {
  structuredOutput: { schema: ArchitectOutputSchema },
});
// result.object contains the typed ArchitectOutput
```

**Composite step skeleton:**
```typescript
const architectStructureStep = createStep({
  id: 'architect-structure',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: GateResumeSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ inputData, suspend, resumeData }) => {
    const basePrompt = inputData.prompt;

    if (resumeData?.approved) {
      return resumeData; // Approved — continue to Writer
    }

    // Build prompt: append rejection feedback if this is a re-run
    const feedback = resumeData?.feedback;
    const fullPrompt = feedback
      ? `${basePrompt}\n\n## Previous Feedback (speaker rejected)\n${feedback}\nGenerate 3 NEW distinct structure options addressing this feedback.`
      : basePrompt;

    // Call architect directly with structured output
    const result = await architect.generate(fullPrompt, {
      structuredOutput: { schema: ArchitectOutputSchema },
    });
    const architectOutput = result.object;

    // Build comparison summary for UI
    const summary = architectOutput.options
      .map((opt, i) => `Option ${i + 1}: ${opt.title} — ${opt.description}`)
      .join('\n');

    return await suspend({
      agentId: 'talk-architect',
      gateId: 'review-structure',
      output: architectOutput,
      summary: `Structure options ready for review:\n${summary}`,
    });
  },
});
```

**Gate ID:** `review-structure` (follows `review-research`, `review-script` naming convention)

**Defensive Validation Checklist compliance:**
- `GateSuspendSchema` and `GateResumeSchema` already validated (Story 1.5/1.6)
- `ArchitectOutputSchema` already validated with `.min(1)`, `.length(3)` (Story 2.1)
- `feedback` field is `.optional()` with `.describe()` in `GateResumeSchema`

### Workflow Pipeline Change

**Before (current):**
```
.map(input → researcher prompt)
.then(researcherStep)
.then(reviewResearchGate)          ← Gate 1
.map(gate1 result → writer prompt)
.then(writerStep)
.then(reviewScriptGate)            ← Gate 3
.map(final output assembly)
.commit()
```

**After (target):**
```
.map(input → researcher prompt)
.then(researcherStep)
.then(reviewResearchGate)          ← Gate 1
.map(gate1 result → architect prompt)     ← NEW: build architect prompt
.then(architectStructureStep)             ← NEW: architect + Gate 2 composite
.map(gate2 result → writer prompt)        ← MODIFIED: include structure
.then(writerStep)
.then(reviewScriptGate)            ← Gate 3
.map(final output assembly)
.commit()
```

**Architect prompt `.map()` transform must include:**
- Research brief from `getStepResult(researcherStep)`
- Constraints from `getInitData<WorkflowInput>()`
- Audience level and format (for duration targeting)
- Gate 1 feedback (from `inputData` — the gate resume result)

**Writer prompt `.map()` transform must be updated to include:**
- Approved structure from `getStepResult(architectStructureStep)` — this is the GateResumeSchema result
- The Architect's full output can be accessed via the suspend payload or stored in state
- Structure feedback from the speaker

### File Structure Requirements

```
src/mastra/
  workflows/
    slidewreck.ts                          # MODIFY — insert architect composite step + transforms
    __tests__/
      slidewreck.integration.test.ts       # MODIFY — add Gate 2 tests, update existing gate flow
```

No new files needed. The composite step lives in `slidewreck.ts` alongside the existing step definitions.

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **TDD:** Write failing tests first, then implement
- **Integration tests must cover:**
  - Pipeline suspends at Gate 2 after Gate 1 approval (3 gates total now)
  - Gate 2 suspend payload contains `ArchitectOutput` with 3 options
  - Gate 2 suspend payload matches `GateSuspendSchema`
  - Approval at Gate 2 → pipeline continues to Writer → suspends at Gate 3
  - Rejection at Gate 2 → re-suspends at Gate 2 with new payload (loopback)
  - Multi-rejection (2+ rejections) → eventual approval → completion
  - Full pipeline completion: Gate 1 approve → Gate 2 approve → Gate 3 approve → success

**Mock for integration test:**
The composite step in the test pipeline should mock the `architect.generate()` call. Create a mock step that:
- Returns fixed `ArchitectOutput` (reuse mock from talk-architect tests)
- Handles suspend/resume like the real composite step
- On rejection, returns different mock options (can be same mock data — testing flow not content)

```typescript
// Mock architect output for integration test
const mockArchitectOutput: ArchitectOutput = {
  options: [
    {
      title: 'Problem-Solution-Demo',
      description: 'Classic problem framing with live demo',
      sections: [
        { title: 'Problem Statement', purpose: 'Frame the challenge', contentWordCount: 500, estimatedMinutes: 3 },
        { title: 'Solution Architecture', purpose: 'Present approach', contentWordCount: 2000, estimatedMinutes: 13 },
        { title: 'Live Demo', purpose: 'Show it works', contentWordCount: 500, estimatedMinutes: 4 },
      ],
      rationale: 'Builds credibility through demonstration',
    },
    // ... options 2 and 3
  ],
};
```

### Previous Story Intelligence

**From Story 2.2 (Optional Constraints Input):**
- 147 tests passing baseline
- Constraints field in `WorkflowInputSchema`: `z.string().min(1).optional().describe(...)`
- Constraints passed to Researcher prompt via conditional template: `${constraints ? \`\nSpeaker Constraints: ${constraints}\` : ''}`
- Integration test pipeline must mirror production `.map()` transforms exactly
- Story noted: "Architect prompt handling deferred to Story 2.3 when Architect is wired into pipeline"

**From Story 2.1 (Architect Agent & Timing Tool):**
- `architect` exported from `src/mastra/agents/talk-architect.ts`
- `ArchitectOutputSchema` and `ArchitectOutput` type exported
- Agent uses `SONNET_MODEL`, bound to `estimateTiming` tool
- Output: exactly 3 `StructureOption` objects with sections, rationale, timing
- Agent registered in `src/mastra/index.ts`: `agents: { researcher, architect, writer }`

**From Story 2.0 (Pipeline Integration Tests):**
- Integration test uses `InMemoryStore` and mock `createStep()` pattern
- Test pipeline mirrors real workflow with identical `.map()` transforms
- Both `testPipeline` and `errorPipeline` share single Mastra `beforeAll` instance
- Suspend payload accessed via `result.suspendPayload['step-id']`

**Persistent issue:** `researcher.ts` model tier (OPUS→SONNET) keeps reverting during squash merge rebases. Direct fix on main at commit `57413b8`. Check researcher.ts after rebase.

### Git Intelligence

**Recent commits:**
- `6e2e41f` Story 2.2: Optional Constraints Input (#11)
- `57413b8` fix: researcher model tier — OPUS_MODEL → SONNET_MODEL (persistent fix)
- `26be025` Story 2.1: Architect Agent & Timing Tool (#10)
- `12fbea4` Story 2.0: Pipeline Integration Tests (#9)

### References

- [Source: epics.md#Story 2.3] — Acceptance criteria with BDD scenarios
- [Source: architecture.md#Workflow Composition Pattern] — `.dountil()` loopback, suspend/resume
- [Source: architecture.md#Human Gate Placement AD-3] — Gate 2 mandatory, after Architect
- [Source: architecture.md#Human Gate Payload Structure] — GateSuspendSchema, GateResumeSchema
- [Source: architecture.md#Defensive Validation Checklist] — .min(1), .optional(), .describe()
- [Source: architecture.md#Mastra API Verification Checklist] — verify `.generate()` + structuredOutput
- [Source: implementation-artifacts/2-2-optional-constraints-input.md] — Previous story context
- [Source: implementation-artifacts/2-1-architect-agent-timing-tool.md] — Architect agent details

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Extensive API analysis of Mastra's `.dountil()`, `suspend()`/`resume()`, and `suspendData` params to determine optimal loopback pattern
- Verified `suspendData` param available in `ExecuteFunctionParams` for accessing previous suspend payload on resume

### Completion Notes List

- All 4 ACs satisfied: Gate 2 suspends with 3 options (AC#1), approval passes structure to Writer (AC#2), rejection re-suspends with feedback (AC#3), multi-rejection cycles work (AC#4)
- Used composite step pattern (re-suspend) instead of `.dountil()` — simpler and avoids unclear `.dountil()` + suspend interaction
- `architectStructureStep` calls `architect.generate()` with `structuredOutput`, suspends for review, and handles loopback via re-suspend on rejection
- `ArchitectStructureOutputSchema` exported for integration test mock reuse
- 5 new integration tests added (Gate 2 suspension, approval, rejection loopback, multi-rejection, error propagation updated)
- Existing tests updated for 3-gate flow (Gate 1 → Gate 2 → Gate 3)
- Error pipeline updated with architect step between Gate 1 and Writer
- 152 total tests passing

### File List

- `src/mastra/workflows/slidewreck.ts` — MODIFIED: added architect composite step, new .map() transforms, 3-gate pipeline
- `src/mastra/workflows/__tests__/slidewreck.integration.test.ts` — MODIFIED: mock architect step, Gate 2 tests, updated existing tests for 3-gate flow
