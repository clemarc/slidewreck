# Story 2.1: Architect Agent & Timing Tool

Status: review

## Story

As a speaker,
I want the system to propose multiple talk structure options with timing estimates,
so that I can choose the narrative arc that best fits my topic and style.

## Acceptance Criteria

1. **Given** the Architect agent is configured in `src/mastra/agents/talk-architect.ts` **When** the agent is instantiated **Then** it uses the Sonnet model tier (`SONNET_MODEL`) **And** its system prompt instructs generation of 3 distinct structure options (e.g., Problem-Solution-Demo, Story Arc, Hot Take) **And** it has an `ArchitectOutputSchema` (Zod) defining structured output with an array of 3 structure options, each containing: title, section breakdown, rationale, and estimated timing per section **And** it is bound to the `estimateTiming` tool (AC: #1)

2. **Given** the timing tool is defined in `src/mastra/tools/estimate-timing.ts` **When** invoked with a section breakdown and talk format **Then** it returns per-section timing estimates that sum to the target duration range **And** it has explicit `inputSchema` and `outputSchema` (AC: #2)

3. **Given** the Architect agent is implemented **When** it is registered in `src/mastra/index.ts` **Then** it is visible and testable alongside existing agents (AC: #3)

## Tasks / Subtasks

- [x] Task 1: Create `estimateTiming` tool (AC: #2)
  - [x] 1.1 Create `src/mastra/tools/estimate-timing.ts` with `createTool()` following `word-count-to-time.ts` pattern
  - [x] 1.2 Define `inputSchema`: sections array (each with `title: string`, `contentWordCount: number`), `format: enum('lightning','standard','keynote')`, optional `wordsPerMinute: number`
  - [x] 1.3 Define `outputSchema`: array of per-section timing objects (`title`, `estimatedMinutes`), plus `totalMinutes`, `targetRange { min, max }`, `isWithinRange: boolean`
  - [x] 1.4 Implement execute: calculate per-section timing using WPM, sum total, compare against `FORMAT_DURATION_RANGES[format]`
  - [x] 1.5 Create `src/mastra/tools/__tests__/estimate-timing.test.ts` — TDD first
  - [x] 1.6 Tests: 14 tests covering tool ID, calculation, default WPM, empty sections, isWithinRange true/false, schema validation

- [x] Task 2: Create Architect agent (AC: #1)
  - [x] 2.1 Create `src/mastra/agents/talk-architect.ts` following `writer.ts` pattern
  - [x] 2.2 Define `ArchitectOutputSchema` with nested schemas: `StructureOptionSchema` containing `title`, `description`, `sections` array (each with `title`, `purpose`, `contentWordCount`, `estimatedMinutes`), `rationale`; top-level schema has `options: z.array(StructureOptionSchema).length(3)`
  - [x] 2.3 Export `ArchitectOutputSchema` and inferred `ArchitectOutput` type
  - [x] 2.4 Create agent: id `talk-architect`, name `Talk Architect`, model `SONNET_MODEL`, tools `{ estimateTiming }`, instructions detailing 3-option generation strategy
  - [x] 2.5 Create `src/mastra/agents/__tests__/talk-architect.test.ts` — TDD first
  - [x] 2.6 Tests: 12 tests covering schema validation (valid, missing, wrong count), agent config (ID, model, tools, name)

- [x] Task 3: Register agent in Mastra (AC: #3)
  - [x] 3.1 Import `architect` in `src/mastra/index.ts` and add to `agents` object
  - [x] 3.2 Existing registration test pattern applies — no new test needed

- [x] Task 4: Verify all tests pass
  - [x] 4.1 Run `pnpm test` — all 139 tests pass (113 existing + 14 estimateTiming + 12 architect)

## Dev Notes

### Architecture Compliance

**Agent pattern (from writer.ts):**
```typescript
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { SONNET_MODEL } from '../config/models';
import { estimateTiming } from '../tools/estimate-timing';

// 1. Nested schemas
const SectionSchema = z.object({...});
const StructureOptionSchema = z.object({
  title: z.string().min(1).describe('...'),
  description: z.string().min(1).describe('...'),
  sections: z.array(SectionSchema).min(1).describe('...'),
  rationale: z.string().min(1).describe('...'),
});

// 2. Export schema + type
export const ArchitectOutputSchema = z.object({
  options: z.array(StructureOptionSchema).length(3).describe('Exactly 3 structure options'),
});
export type ArchitectOutput = z.infer<typeof ArchitectOutputSchema>;

// 3. Agent instance
export const architect = new Agent({
  id: 'talk-architect',
  name: 'Talk Architect',
  model: SONNET_MODEL,
  tools: { estimateTiming },
  instructions: `...`,
});
```

**Tool pattern (from word-count-to-time.ts):**
```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const estimateTiming = createTool({
  id: 'estimate-timing',
  description: 'Calculate per-section timing estimates for a talk structure...',
  inputSchema: z.object({...}),
  outputSchema: z.object({...}),
  execute: async ({ sections, format, wordsPerMinute }) => {...},
});
```

**Defensive Validation Checklist:**
- String inputs: `.min(1)` to reject empty strings
- Numeric inputs: `.positive()` or `.min(0)` as appropriate — word counts `.min(0)`, durations `.positive()`
- Optional fields: `.describe()` explaining when/why absent
- Array lengths: `.length(3)` for options, `.min(1)` for sections within options

**Naming conventions:**
- Agent ID: `talk-architect` (kebab-case)
- Agent file: `talk-architect.ts`
- Agent export: `architect` (camelCase)
- Tool ID: `estimate-timing` (kebab-case)
- Tool file: `estimate-timing.ts`
- Tool export: `estimateTiming` (camelCase)
- Schema: `ArchitectOutputSchema` (PascalCase + Schema suffix)
- Type: `ArchitectOutput` (PascalCase, inferred from Zod)

**FORMAT_DURATION_RANGES (from workflow-input.ts):**
- lightning: 5–10 min
- standard: 25–45 min
- keynote: 45–60 min

The tool should import and use these ranges directly.

### `estimateTiming` Tool Design

The tool calculates per-section speaking durations from word counts:
- Input: array of sections (title + contentWordCount), talk format, optional WPM override
- Logic: `sectionMinutes = contentWordCount / wpm` for each section; sum for total
- Output: per-section timings, total minutes, target range from FORMAT_DURATION_RANGES, boolean `isWithinRange`
- Default WPM: 150 (matching `wordCountToTime`)

**Key difference from `wordCountToTime`:** This tool works with pre-counted word counts per section (not raw text), and validates against format duration ranges.

### File Structure Requirements

```
src/mastra/
  agents/
    talk-architect.ts          # NEW — Architect agent + ArchitectOutputSchema
    __tests__/
      talk-architect.test.ts   # NEW — Schema + agent config tests
  tools/
    estimate-timing.ts         # NEW — Section timing estimator tool
    __tests__/
      estimate-timing.test.ts  # NEW — Tool execution + schema tests
  index.ts                     # MODIFY — Add architect to agents registration
```

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **Pattern:** `describe`/`it`/`expect`, co-located in `__tests__/`
- **TDD:** Write failing tests first, then implement
- **Schema tests:** valid full output, minimal, missing fields, wrong types, wrong array length
- **Agent tests:** ID, name, model tier, tool binding via `listTools()`
- **Tool tests:** ID, calculation accuracy, default WPM, edge cases (empty sections, zero word counts), schema validation
- **Run:** `pnpm test` must pass ALL tests

### Previous Story Intelligence

**From story 2-0 (Pipeline Integration Tests):**
- `InMemoryStore` from `@mastra/core/storage` works for tests without PostgreSQL
- `createStep({ id, execute })` mock pattern for integration tests
- `result.suspendPayload['step-id']` for suspend payload access
- All 113 tests passing as baseline

**From story 1-6 (Workflow with Human Gates):**
- `createStep(agent, { structuredOutput: { schema }, retries: 3 })` for agent steps
- `.map()` callbacks must be async
- `getStepResult(step)` accesses prior step output
- `.commit()` mandatory before `createRun()`

**Established agent patterns:**
- Agents export both instance and output schema
- Writer: `id: 'script-writer'`, `model: OPUS_MODEL`, tools: `{ wordCountToTime, checkJargon }`
- Researcher: `id: 'researcher'`, `model: SONNET_MODEL`, tools: `{ webSearch, webFetch }`
- Registration in `index.ts`: `agents: { researcher, writer }` — add `architect` here

### Git Intelligence

**Recent commits:**
- `ad15c05` Story 2.0: Pipeline Integration Tests
- `3010a65` fix: code review — consolidate Mastra instances, isolate error pipeline steps
- `c246ba8` Story 1.6: End-to-End Pipeline Workflow with Human Gates (#7)

**Code conventions:**
- Agents export both agent instance and output schema
- Tools use `createTool()` from `@mastra/core/tools`
- Tests co-located in `__tests__/`
- `vi.stubEnv` for environment variables in tests

### References

- [Source: epics.md#Story 2.1] — Full acceptance criteria and BDD scenarios
- [Source: architecture.md#Agent Architecture] — Architect = Sonnet tier, estimateTiming tool
- [Source: architecture.md#Human Gate Placement] — Gate 2 after Architect (Story 2.3, not this story)
- [Source: architecture.md#Tool Implementation Standard] — inputSchema, outputSchema, description, error handling
- [Source: architecture.md#Defensive Validation Checklist] — .min(1), .positive(), .describe()
- [Source: architecture.md#Naming Conventions] — kebab-case IDs, camelCase exports, PascalCase schemas
- [Source: architecture.md#Mastra API Verification Checklist] — Verify import paths, constructor params, return types
- [Source: implementation-artifacts/2-0-pipeline-integration-tests.md] — Testing patterns, mock strategies

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Researcher model fix (OPUS→SONNET) was lost during rebase after story 2-0 merge; re-applied in this story

### Completion Notes List

- All 3 ACs satisfied: Architect agent with ArchitectOutputSchema and estimateTiming binding (AC#1), estimateTiming tool with input/output schemas (AC#2), registered in index.ts (AC#3)
- 26 new tests (14 tool + 12 agent), 139 total passing
- TDD approach followed: tests written first for both tool and agent
- Defensive validation applied: `.min(1)` on strings, `.min(0)` on numbers, `.positive()` on WPM, `.length(3)` on options array

### File List

- `src/mastra/tools/estimate-timing.ts` — NEW: estimateTiming tool
- `src/mastra/tools/__tests__/estimate-timing.test.ts` — NEW: 14 tool tests
- `src/mastra/agents/talk-architect.ts` — NEW: Architect agent + ArchitectOutputSchema
- `src/mastra/agents/__tests__/talk-architect.test.ts` — NEW: 12 agent tests
- `src/mastra/index.ts` — MODIFIED: added architect to agents registration
- `src/mastra/agents/researcher.ts` — MODIFIED: re-applied OPUS_MODEL → SONNET_MODEL fix
