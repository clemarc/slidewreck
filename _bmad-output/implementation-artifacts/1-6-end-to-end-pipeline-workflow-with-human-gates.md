# Story 1.6: End-to-End Pipeline Workflow with Human Gates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a speaker,
I want to run the full pipeline from topic input to speaker notes, with review points where I can provide feedback,
so that I maintain creative control and the output reflects my guidance.

## Acceptance Criteria

1. **Given** the workflow is defined in `src/mastra/workflows/slidewreck.ts` **When** I inspect the workflow **Then** it composes Researcher and Writer as steps via `createStep(agent, { structuredOutput: { schema } })` **And** it uses `.then()` for sequential composition **And** it uses `.map()` to transform data between steps (AC: #1)

2. **Given** the review gate logic exists in `src/mastra/workflows/gates/review-gate.ts` **When** the Researcher completes **Then** the workflow suspends at Gate 1 (`review-research`) with the research brief in the suspend payload **And** the suspend payload follows `GateSuspendSchema` (AC: #2)

3. **Given** the workflow is suspended at Gate 1 **When** the speaker resumes with `{ approved: true, feedback: "Focus on resilience patterns" }` **Then** the feedback is passed as input context to the Writer step (FR-9) **And** the workflow continues to the Writer agent (AC: #3)

4. **Given** the Writer completes **When** the workflow reaches Gate 3 (`review-script`) **Then** the workflow suspends with the full speaker notes in the suspend payload (AC: #4)

5. **Given** the speaker resumes Gate 3 with approval **When** the pipeline completes **Then** the final output contains the speaker notes document with timing annotations and markers (FR-14) (AC: #5)

6. **Given** the workflow is suspended at a gate **When** the process restarts **Then** the workflow state is preserved in PostgreSQL and the speaker can resume from the last gate without re-running prior steps (FR-8, NFR-5) (AC: #6)

7. **Given** an LLM call fails during a generation step **When** the system retries **Then** it retries up to 3 times with exponential backoff before reporting failure (NFR-6) (AC: #7)

8. **Given** the workflow is registered in `src/mastra/index.ts` **When** I open Mastra Studio **Then** the workflow is visible with step visualization and can be started via the UI (AC: #8)

## Tasks / Subtasks

- [x] Task 0: Rename TalkForge to Slidewreck in existing source code
  - [x] 0.1 Update `src/mastra/index.ts`: change storage id from `'talkforge-storage'` to `'slidewreck-storage'`
  - [x] 0.2 Update `src/mastra/schemas/workflow-output.ts`: rename comment "TalkForge pipeline" to "Slidewreck pipeline"
  - [x] 0.3 Update `src/mastra/config/models.ts`: rename comment "TalkForge agents" to "Slidewreck agents"
  - [x] 0.4 Update `docker-compose.yml`: change `POSTGRES_DB: talkforge` to `POSTGRES_DB: slidewreck`
  - [x] 0.5 Update `.env.example`: change database name in `DATABASE_URL` from `talkforge` to `slidewreck`
  - [x] 0.6 Update `.github/workflows/ci.yml`: change `POSTGRES_DB` and `DATABASE_URL` from `talkforge` to `slidewreck`
  - [x] 0.7 Update `CLAUDE.md`: change database name reference from `talkforge` to `slidewreck`
  - [x] 0.8 Run `pnpm test` to verify no breakage from rename

- [x] Task 1: Create review gate step factory (AC: #2, #3, #4)
  - [x] 1.1 Create `src/mastra/workflows/gates/review-gate.ts`
  - [x] 1.2 Implement `createReviewGateStep(config)` factory function that returns a `createStep()` with suspend/resume logic
  - [x] 1.3 Factory accepts `{ gateId, agentId, summary }` config and produces a step with `GateSuspendSchema`/`GateResumeSchema`
  - [x] 1.4 Execute function: if `resumeData` exists, return it; otherwise `return await suspend({ agentId, gateId, output: inputData, summary })`
  - [x] 1.5 Input schema: `z.unknown()` (receives previous step's output), output schema: `GateResumeSchema`
  - [x] 1.6 Write tests: gate suspends on first execution, gate returns resumeData on resume, gate validates suspend payload shape, gate validates resume payload shape

- [x] Task 2: Create researcher workflow step (AC: #1)
  - [x] 2.1 In `src/mastra/workflows/slidewreck.ts`, create `researcherStep` via `createStep(researcher, { structuredOutput: { schema: ResearcherOutputSchema }, retries: 3 })`
  - [x] 2.2 Verify step input is `{ prompt: string }` and output is `ResearcherOutput`

- [x] Task 3: Create writer workflow step (AC: #1)
  - [x] 3.1 In `src/mastra/workflows/slidewreck.ts`, create `writerStep` via `createStep(writer, { structuredOutput: { schema: WriterOutputSchema }, retries: 3 })`
  - [x] 3.2 Verify step input is `{ prompt: string }` and output is `WriterOutput`

- [x] Task 4: Create slidewreck workflow with step composition (AC: #1, #5, #7)
  - [x] 4.1 `createWorkflow({ id: 'slidewreck', inputSchema: WorkflowInputSchema, outputSchema: WorkflowOutputSchema })`
  - [x] 4.2 Chain: `.map()` (input -> researcher prompt) `.then(researcherStep)` `.then(reviewResearchGate)` `.map()` (gate output + research -> writer prompt) `.then(writerStep)` `.then(reviewScriptGate)` `.map()` (assemble final output) `.commit()`
  - [x] 4.3 First `.map()`: transform `WorkflowInput` into `{ prompt: string }` for researcher -- include topic, audienceLevel, format in prompt
  - [x] 4.4 Middle `.map()`: after Gate 1 resume, combine research output (via `getStepResult`) + gate feedback into `{ prompt: string }` for writer -- include FORMAT_DURATION_RANGES for target duration
  - [x] 4.5 Final `.map()`: assemble `WorkflowOutput` from step results (researchBrief, speakerScript, metadata)
  - [x] 4.6 Export workflow as `slidewreck`

- [x] Task 5: Register workflow in Mastra instance (AC: #8)
  - [x] 5.1 Update `src/mastra/index.ts`: import `slidewreck` from `./workflows/slidewreck`
  - [x] 5.2 Add `workflows: { slidewreck }` to `new Mastra({...})`

- [x] Task 6: Write tests for workflow and gates
  - [x] 6.1 Create `src/mastra/workflows/__tests__/slidewreck.test.ts`
  - [x] 6.2 Create `src/mastra/workflows/gates/__tests__/review-gate.test.ts`
  - [x] 6.3 Test gate factory: returns step with correct id, suspendSchema, resumeSchema
  - [x] 6.4 Test workflow: exports slidewreck workflow with correct id, inputSchema, outputSchema
  - [x] 6.5 Test workflow: has committed steps (no "uncommitted" error)
  - [x] 6.6 Remove `.gitkeep` files from `src/mastra/workflows/` and `src/mastra/workflows/gates/` once real files exist

## Dev Notes

### Architecture Compliance

**CRITICAL -- Follow these patterns exactly:**

- **Workflow composition:** Use `createWorkflow` + `createStep` from `@mastra/core/workflows` (sub-path import). Chain steps with `.then()`, transform data with `.map()`. MUST call `.commit()` at the end. [Source: architecture.md#Workflow Composition Pattern]
- **Agent steps:** `createStep(agent, { structuredOutput: { schema } })` produces a step where input is always `{ prompt: string }` and output matches the schema. Each `.map()` before an agent step MUST return `{ prompt: string }`. [Source: @mastra/core type definitions, createStep overload 3]
- **Gate steps:** Use `createStep({ id, inputSchema, outputSchema, suspendSchema, resumeSchema, execute })` for human gates. Execute checks `resumeData` -- if present, return it; if absent, `return await suspend(payload)`. [Source: architecture.md#Human Gate Payload Structure]
- **Schema boundary:** Import shared schemas from `src/mastra/schemas/`. Import agent output schemas from agent files. One-way imports only. [Source: architecture.md#Schema Boundary]
- **Registration:** Workflows registered in `src/mastra/index.ts` via `workflows: { slidewreck }` in the Mastra constructor. [Source: architecture.md#Single Registration Point]
- **TDD mandatory:** Write failing tests first, then implement. [Source: CLAUDE.md#Testing]

### Technical Requirements

**Verified Mastra Workflow API (@mastra/core 1.6.0):**

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows';
```

**createWorkflow signature:**
```typescript
createWorkflow({
  id: string,                               // 'slidewreck'
  description?: string,
  inputSchema: ZodSchema,                   // WorkflowInputSchema
  outputSchema: ZodSchema,                  // WorkflowOutputSchema
  steps?: Step[],                           // For TS type inference only
  retryConfig?: { attempts?: number, delay?: number },
  options?: {
    validateInputs?: boolean,
    onFinish?: (result) => void,
    onError?: (error) => void,
  },
})
```

**createStep from agent (structured output):**
```typescript
const researcherStep = createStep(researcher, {
  structuredOutput: { schema: ResearcherOutputSchema },
  retries: 3,
});
// Result: input = { prompt: string }, output = ResearcherOutput
```

**createStep for human gate:**
```typescript
const reviewGate = createStep({
  id: 'review-research',
  inputSchema: z.unknown(),                 // Receives previous step output
  outputSchema: GateResumeSchema,           // Produces resume data
  suspendSchema: GateSuspendSchema,         // Validates suspend payload
  resumeSchema: GateResumeSchema,           // Validates resume data
  execute: async ({ inputData, suspend, resumeData, getStepResult, getInitData }) => {
    if (resumeData) {
      return resumeData;                    // Resume path: return user's response
    }
    return await suspend({                  // Suspend path: pause for review
      agentId: 'researcher',
      gateId: 'review-research',
      output: inputData,
      summary: 'Research brief ready for review',
    });
  },
});
```

**Step composition chain:**
```typescript
const workflow = createWorkflow({ ... })
  .map(inputToPromptTransform)              // WorkflowInput -> { prompt: string }
  .then(researcherStep)                     // Execute researcher agent
  .then(reviewResearchGate)                 // Suspend at Gate 1
  .map(researchToWriterPromptTransform)     // Gate output -> { prompt: string }
  .then(writerStep)                         // Execute writer agent
  .then(reviewScriptGate)                   // Suspend at Gate 3
  .map(assembleOutputTransform)             // Assemble WorkflowOutput
  .commit();                                // REQUIRED: build execution graph
```

**CRITICAL: `.commit()` is mandatory.** Without it, `createRun()` throws "Uncommitted step flow changes detected."

**CRITICAL: `.map()` functions receive `{ inputData, getStepResult, getInitData }` as params.** Use `getStepResult('step-id')` to access any prior step's output and `getInitData()` to access workflow-level input.

**ExecuteFunction params (available in gate steps):**
```typescript
{
  runId: string,
  inputData: TStepInput,          // Output from previous step
  resumeData?: TResume,           // Present only on resume
  suspend: (payload) => InnerOutput,
  getStepResult: (stepId) => any, // Access any prior step result
  getInitData: () => TInput,      // Access workflow input
  mastra: Mastra,                 // Mastra instance
  retryCount: number,
}
```

**Workflow execution and resume:**
```typescript
// Start
const run = await slidewreck.createRun();
const result = await run.start({ inputData: { topic, audienceLevel, format } });
// result.status === 'suspended', result.suspended === [['review-research']]

// Resume
const nextResult = await run.resume({
  step: 'review-research',
  resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
});
```

**WorkflowResult discriminated union:**
- `{ status: 'success', result: TOutput }` -- pipeline completed
- `{ status: 'suspended', suspendPayload, suspended: string[][] }` -- waiting at gate
- `{ status: 'failed', error: Error }` -- step failed after retries

### Architecture Compliance

**Phase 1 Pipeline (from architecture.md):**

```
WorkflowInput (topic, audienceLevel, format)
    │
    ▼
[.map() → { prompt }]
    │
    ▼
┌─────────────┐
│ Researcher  │ ← web-search, web-fetch (Anthropic built-in tools)
│   Agent     │
└──────┬──────┘
       ▼
┌──────────────────┐
│ Gate 1: Research  │ ← suspend with GateSuspendPayload
│ (review-research) │ ← resume with GateResumePayload
└──────┬───────────┘
       ▼
[.map() → { prompt }]  ← include feedback + research output + FORMAT_DURATION_RANGES
       │
       ▼
┌─────────────┐
│   Writer    │ ← word-count-to-time, check-jargon tools
│   Agent     │
└──────┬──────┘
       ▼
┌──────────────────┐
│ Gate 3: Script   │ ← suspend/resume (Gate 2 is Phase 2, Architect)
│ (review-script)  │
└──────┬───────────┘
       ▼
[.map() → WorkflowOutput]  ← assemble from getStepResult + getInitData
       │
       ▼
Final Output: { researchBrief, speakerScript, metadata }
```

**Phase 1 scope constraints:**
- Only 2 agents: Researcher (Sonnet) + Writer (Opus) -- no Architect (Phase 2)
- Only 2 gates: Gate 1 (`review-research`) + Gate 3 (`review-script`) -- Gate 2 is Phase 2, Gate 4 is Phase 5
- No branching (Phase 2), no parallel (Phase 5), no loopback (Phase 2)
- Sequential only: `.then()` and `.map()`

**Gate naming:** The architecture numbers gates 1-4 across all phases. Phase 1 has Gate 1 (after Researcher) and Gate 3 (after Writer). Gate 2 (after Architect) and Gate 4 (after Designer) are added in later phases. The gate IDs are `review-research` and `review-script`.

### Library & Framework Requirements

**Existing dependencies (no new packages needed):**
| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | ^1.6.0 | `createWorkflow`, `createStep` from `@mastra/core/workflows` |
| `@mastra/pg` | (installed) | PostgresStore for workflow state persistence |
| `zod` | ^4.3.6 | Schema definitions (already created in story 1.5) |

**No new dependencies required.** All workflow APIs come from `@mastra/core/workflows`.

### File Structure Requirements

```
src/mastra/
  workflows/
    slidewreck.ts                   # NEW -- main pipeline workflow
    gates/
      review-gate.ts               # NEW -- reusable gate step factory
      __tests__/
        review-gate.test.ts        # NEW -- gate factory tests
    __tests__/
      slidewreck.test.ts            # NEW -- workflow composition tests
  schemas/
    workflow-input.ts              # EXISTING -- WorkflowInputSchema, FORMAT_DURATION_RANGES
    gate-payloads.ts               # EXISTING -- GateSuspendSchema, GateResumeSchema
    workflow-output.ts             # EXISTING -- WorkflowOutputSchema
  agents/
    researcher.ts                  # EXISTING -- researcher agent + ResearcherOutputSchema
    writer.ts                      # EXISTING -- writer agent + WriterOutputSchema
  config/
    models.ts                      # EXISTING -- SONNET_MODEL, OPUS_MODEL
  index.ts                         # MODIFY -- add workflows: { slidewreck }
```

**IMPORTANT:** Remove `.gitkeep` files from `src/mastra/workflows/` and `src/mastra/workflows/gates/` when real files are added.

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **Pattern:** `describe`/`it`/`expect`, co-located in `__tests__/`
- **Run:** `pnpm test` must pass all tests including existing stories (currently 86 tests)

**Testing strategy for workflow story:**

Workflow and agent integration tests require LLM calls, which are expensive and non-deterministic. Focus tests on:

1. **Gate factory unit tests** -- test the `createReviewGateStep` factory produces correct step structure (id, schemas, etc.). These are pure unit tests, no LLM calls.
2. **Workflow structure tests** -- test the workflow exports correctly, has the right id, inputSchema, outputSchema, and is committed.
3. **Registration tests** -- verify the workflow is registered in the Mastra instance.

**Do NOT attempt to `run.start()` in unit tests** -- that requires a running PostgresStore and LLM API calls. Integration testing with live agents happens via `pnpm dev` and Mastra Studio.

**Test patterns:**
```typescript
// Gate factory test
describe('createReviewGateStep', () => {
  it('should create a step with the correct gate id', () => {
    const gate = createReviewGateStep({
      gateId: 'review-research',
      agentId: 'researcher',
      summary: 'Research brief ready',
    });
    expect(gate.id).toBe('review-research');
  });

  it('should have GateSuspendSchema as suspendSchema', () => {
    const gate = createReviewGateStep({ ... });
    expect(gate.suspendSchema).toBeDefined();
  });
});

// Workflow structure test
describe('slidewreck workflow', () => {
  it('should export a workflow with id "slidewreck"', () => {
    expect(slidewreck.id).toBe('slidewreck');
  });
});
```

### Previous Story Intelligence

**Patterns established in stories 1.1, 1.2, 1.4, 1.5:**
- Zod schemas use `.describe()` on all fields for LLM readability
- `z.enum()` for known value sets
- Schema + inferred type exported together
- Test files co-located in `__tests__/` subdirectories
- `safeParse()` for schema validation tests
- `.gitkeep` files removed when real files added

**Debug learnings from story 1.5:**
- `z.unknown()` accepts `undefined` in Zod v4 -- gate `output` field is effectively optional
- `FORMAT_DURATION_RANGES` is typed as `Record<WorkflowInput['format'], FormatDurationRange>` for compile-time safety
- Gate string fields (`agentId`, `gateId`, `summary`) use `.min(1)` to reject empty strings

**Key from story 1.4 (Writer agent):**
- Writer agent id is `'script-writer'` (not `'writer'`)
- Writer uses OPUS_MODEL for highest quality output
- WriterOutputSchema has `sections`, `timingMarkers`, `totalDurationMinutes`, `speakerNotes`
- `speakerNotes` is the full formatted markdown script (FR-14)

**Key from story 1.2 (Researcher agent):**
- Researcher agent id is `'researcher'`
- Researcher uses SONNET_MODEL
- Researcher uses Anthropic provider-defined tools: `webSearch`, `webFetch`
- ResearcherOutputSchema has `keyFindings`, `sources`, `existingTalks`, `statistics`, `suggestedAngles`

### Git Intelligence

**Recent commits:**
- `95f9e06` Story 1.5: Pipeline Input Schema & Validation (#6) -- schemas ready for workflow consumption
- `df1f26b` Story 1.4: Writer Agent & Writing Tools (#5) -- WriterOutputSchema, writer agent
- `2df6b8a` Anthropic-Only Provider & Built-in Tools Realignment (#4) -- ResearcherOutputSchema, researcher agent
- `7ab9f1b` Story 1.2: Researcher Agent & Core Web Tools (#3) -- initial agent patterns

**Code conventions:**
- Agents export both the agent instance and the output schema
- Tools export the tool instance directly
- Config exports model constants and tier mapping
- Registration in `index.ts` uses short-hand object property syntax: `agents: { researcher, writer }`

**Current `src/mastra/index.ts`:**
```typescript
import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';
import { researcher } from './agents/researcher';
import { writer } from './agents/writer';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required.');
}

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: 'slidewreck-storage',
    connectionString: process.env.DATABASE_URL,
  }),
  agents: { researcher, writer },
});
```
Story 1.6 renames `talkforge-storage` to `slidewreck-storage` (Task 0) and adds `workflows: { slidewreck }` to this registration.

### Project Structure Notes

- `src/mastra/workflows/` and `src/mastra/workflows/gates/` directories exist with `.gitkeep` -- this story populates them
- `src/mastra/workflows/__tests__/` exists with `.gitkeep`
- Workflow file imports from `../schemas/` (shared schemas) and `../agents/` (agent instances + output schemas) -- one-way imports, no circular deps
- Gate logic in `gates/review-gate.ts` is a reusable factory so Phase 2 (Gate 2) and Phase 5 (Gate 4) can reuse it

### References

- [Source: architecture.md#Workflow Composition Pattern] -- .then(), .map(), suspend()/resume(), .commit()
- [Source: architecture.md#Human Gate Payload Structure] -- GateSuspendSchema/GateResumeSchema fields
- [Source: architecture.md#Pipeline Data Flow] -- Full pipeline diagram with gates
- [Source: architecture.md#Phase-to-File Mapping] -- workflows/slidewreck.ts, workflows/gates/review-gate.ts
- [Source: architecture.md#Agent vs Workflow Step Distinction] -- 5 agents + 1 workflow step
- [Source: epics.md#Story 1.6] -- All 8 acceptance criteria with BDD scenarios
- [Source: PRD.md#FR-7,FR-8,FR-9,FR-14] -- Pipeline execution + speaker notes requirements
- [Source: PRD.md#NFR-5,NFR-6] -- Persistent state + retry requirements
- [Source: @mastra/core type definitions] -- createWorkflow, createStep, ExecuteFunctionParams, WorkflowResult
- [Source: implementation-artifacts/1-5-pipeline-input-schema-validation.md] -- Schema definitions, debug learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- TypeScript circular reference: `typeof slidewreck` in `getInitData<typeof slidewreck>()` caused TS7022 because the workflow is self-referential during definition. Fixed by using `getInitData<WorkflowInput>()` with the explicit input type.
- `.map()` callbacks must be async (return `Promise`) — `ExecuteFunction` type requires async signature, not sync.
- `mastra.getWorkflows()` does not exist — the correct API is `mastra.getWorkflow('slidewreck')`.
- Registration test requires `DATABASE_URL` env var — used `vi.stubEnv` to set it for the test.

### Completion Notes List

- Task 0: Renamed all TalkForge references to Slidewreck across source code, infrastructure, and documentation (8 files). 86 existing tests pass.
- Task 1: Created `createReviewGateStep` factory in `src/mastra/workflows/gates/review-gate.ts`. Factory accepts `{ gateId, agentId, summary }` and produces a `createStep` with suspend/resume logic, `GateSuspendSchema` for suspend payload, and `GateResumeSchema` for resume/output. 6 unit tests.
- Tasks 2-4: Created `src/mastra/workflows/slidewreck.ts` with full pipeline composition: `researcherStep` (Sonnet, retries: 3) → Gate 1 (`review-research`) → `writerStep` (Opus, retries: 3) → Gate 3 (`review-script`) → final output assembly. Three `.map()` transforms handle data flow: input-to-prompt, research+feedback-to-prompt, and results-to-output. All `.map()` callbacks are async per Mastra API requirements.
- Task 5: Registered `slidewreck` workflow in `src/mastra/index.ts` with `workflows: { slidewreck }`.
- Task 6: 11 new tests (6 gate factory + 5 workflow structure including registration). `.gitkeep` files already removed in prior stories.

### Implementation Plan

Sequential TDD: Task 0 (rename) → Task 1 (gate factory with tests) → Tasks 2-4 (workflow file with tests) → Task 5 (registration) → Task 6 (remaining tests and cleanup)

### File List

- `src/mastra/index.ts` — MODIFIED (storage id rename, workflow import + registration)
- `src/mastra/schemas/workflow-output.ts` — MODIFIED (comment rename)
- `src/mastra/config/models.ts` — MODIFIED (comment rename)
- `src/mastra/workflows/gates/review-gate.ts` — NEW (reusable gate step factory)
- `src/mastra/workflows/gates/__tests__/review-gate.test.ts` — NEW (6 gate factory tests)
- `src/mastra/workflows/slidewreck.ts` — NEW (main pipeline workflow)
- `src/mastra/workflows/__tests__/slidewreck.test.ts` — NEW (5 workflow structure tests)
- `docker-compose.yml` — MODIFIED (POSTGRES_DB rename)
- `.env.example` — MODIFIED (DATABASE_URL rename)
- `.github/workflows/ci.yml` — MODIFIED (POSTGRES_DB + DATABASE_URL rename)
- `CLAUDE.md` — MODIFIED (database name reference rename)

## Change Log

- 2026-02-26: Code review fixes — M1: use Mastra `runId` instead of `Date.now()`, M2: added gate behavioral tests (suspend/resume), M3: `vi.resetModules()` in registration test, L2: exported `ReviewGateConfig` interface (99 total tests)
- 2026-02-25: Story 1.6 implementation complete — end-to-end pipeline workflow with human gates, TalkForge→Slidewreck rename, 11 new tests (97 total)
