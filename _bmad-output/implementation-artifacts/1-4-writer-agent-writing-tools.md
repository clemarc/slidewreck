# Story 1.4: Writer Agent & Writing Tools

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a speaker,
I want the system to produce a complete speaker notes document with timing annotations and markers,
so that I have a ready-to-use script for my talk.

## Acceptance Criteria

1. **Given** the Writer agent is defined in `src/mastra/agents/writer.ts` **When** I inspect the agent configuration **Then** it uses the Opus model tier **And** it has a system prompt instructing it to produce a speaker script with timing cues, pause markers, and audience interaction prompts **And** it has `WriterOutputSchema` (Zod) defining structured output with sections, timing markers, total duration estimate, and formatted speaker notes markdown **And** it is bound to the `wordCountToTime` and `checkJargon` tools (AC: #1)

2. **Given** the `wordCountToTime` tool exists in `src/mastra/tools/word-count-to-time.ts` **When** invoked with text content and a speaking pace (WPM) **Then** it returns the estimated speaking duration **And** it has explicit `inputSchema` and `outputSchema` (AC: #2)

3. **Given** the `checkJargon` tool exists in `src/mastra/tools/check-jargon.ts` **When** invoked with text content and an audience level **Then** it returns flagged jargon terms that may not be appropriate for the target audience (AC: #3)

4. **Given** the Writer agent is registered in `src/mastra/index.ts` **When** I open Mastra Studio **Then** the Writer agent is visible and testable in the Studio UI (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Create WriterOutputSchema (AC: #1)
  - [x] 1.1 Define Zod schema with: `sections` (array of section objects with title, content, speakingNotes, durationMinutes), `timingMarkers` (array of marker objects with timestamp, instruction), `totalDurationMinutes` (number), `speakerNotes` (formatted markdown string with the full script)
  - [x] 1.2 Export schema and inferred `WriterOutput` type from `src/mastra/agents/writer.ts`
  - [x] 1.3 Write tests validating schema accepts valid data and rejects invalid

- [x] Task 2: Create `wordCountToTime` tool (AC: #2)
  - [x] 2.1 Create `src/mastra/tools/word-count-to-time.ts` with `createTool()` from `@mastra/core/tools`
  - [x] 2.2 Define `inputSchema`: `text` (string, the content to measure), `wordsPerMinute` (number, optional, default 150 WPM for conference speaking)
  - [x] 2.3 Define `outputSchema`: `wordCount` (number), `estimatedMinutes` (number), `estimatedSeconds` (number), `wordsPerMinute` (number, the WPM used)
  - [x] 2.4 Implement `execute` function: count words in text, calculate duration at given WPM
  - [x] 2.5 Write tests verifying word counting accuracy, duration calculation, default WPM, custom WPM, and edge cases (empty string, single word)

- [x] Task 3: Create `checkJargon` tool (AC: #3)
  - [x] 3.1 Create `src/mastra/tools/check-jargon.ts` with `createTool()` from `@mastra/core/tools`
  - [x] 3.2 Define `inputSchema`: `text` (string, the content to check), `audienceLevel` (enum: `beginner`, `intermediate`, `advanced`, `mixed`)
  - [x] 3.3 Define `outputSchema`: `flaggedTerms` (array of objects with `term`, `reason`, `suggestion`), `audienceLevel` (string echo), `totalFlagged` (number)
  - [x] 3.4 Implement `execute` function: scan text for technical jargon based on audience level, flag terms that may need simplification or explanation for the target audience
  - [x] 3.5 Write tests verifying jargon detection at different audience levels, empty text, text with no jargon, and that advanced audience flags fewer terms than beginner

- [x] Task 4: Create Writer agent (AC: #1)
  - [x] 4.1 Create `src/mastra/agents/writer.ts` with `new Agent()` from `@mastra/core/agent`
  - [x] 4.2 Set agent ID to `script-writer`, model to `OPUS_MODEL` from `config/models.ts`
  - [x] 4.3 Write system prompt instructing speaker script production with timing cues, pause markers (`[PAUSE]`), audience interaction prompts (`[ASK AUDIENCE]`), section transitions, and emphasis markers
  - [x] 4.4 Bind `wordCountToTime` and `checkJargon` tools to agent
  - [x] 4.5 Export agent and schema
  - [x] 4.6 Write tests verifying agent configuration (model tier, tool bindings, ID, name)

- [x] Task 5: Register in Mastra instance and verify (AC: #4)
  - [x] 5.1 Import writer agent in `src/mastra/index.ts`
  - [x] 5.2 Add to `agents` map in Mastra constructor: `agents: { researcher, writer }`
  - [x] 5.3 Verify agent appears in Mastra Studio at localhost:4111
  - [x] 5.4 Run full test suite: `pnpm test` -- all tests pass including existing story 1.1 + 1.2 tests

## Dev Notes

### Architecture Compliance

**CRITICAL -- Follow these patterns exactly:**

- **Agent boundary:** Each agent is self-contained in its file -- system prompt, tool bindings, model selection, and output schema. Agents do NOT import other agents. [Source: architecture.md#Architectural Boundaries]
- **Tool boundary:** Tools are pure functions of input -> output. They import no agents, no workflow state, no other tools. They are bound to agents in the agent definition file, not in the tool file. [Source: architecture.md#Architectural Boundaries]
- **Naming conventions:** Agent ID `script-writer` (kebab-case), export `writer` (camelCase), schema `WriterOutputSchema` (PascalCase + Schema suffix), tool IDs `word-count-to-time` and `check-jargon` (kebab-case), tool exports `wordCountToTime` and `checkJargon` (camelCase) [Source: architecture.md#Naming Conventions]
- **Single registration point:** All agents registered in `src/mastra/index.ts` [Source: architecture.md#Architectural Boundaries]
- **TDD mandatory:** Write failing tests FIRST, then implement minimal code to pass, then refactor [Source: CLAUDE.md#Testing]

### Technical Requirements

**Agent API (verified against @mastra/core 1.6.0):**
```typescript
import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { OPUS_MODEL } from '../config/models';
import { wordCountToTime } from '../tools/word-count-to-time';
import { checkJargon } from '../tools/check-jargon';

export const writer = new Agent({
  id: 'script-writer',
  name: 'Script Writer',
  description: 'Produces complete speaker scripts with timing annotations, pause markers, and audience interaction prompts',
  instructions: '...system prompt...',
  model: OPUS_MODEL,  // 'anthropic/claude-opus-4-6' from config/models.ts
  tools: { wordCountToTime, checkJargon },
});
```

**Key Agent API notes (confirmed from story 1.2 implementation):**
- `Agent` must be imported from `@mastra/core/agent` (NOT `@mastra/core`)
- `instructions` is the system prompt -- string, string array, or function
- `model` accepts the magic model string directly (e.g., `'anthropic/claude-opus-4-6'`)
- `tools` is an object mapping tool names to Tool instances
- Structured output is configured at **execution time** via `agent.generate(messages, { structuredOutput: { schema } })`, NOT in the Agent constructor
- Schema goes in the same file as the agent, exported alongside it
- Agent `tools` property is private; use `agent.listTools()` (async) to inspect tool bindings in tests

**Tool API (verified against @mastra/core 1.6.0):**
```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const wordCountToTime = createTool({
  id: 'word-count-to-time',
  description: 'Calculate estimated speaking duration from word count at a given speaking pace',
  inputSchema: z.object({
    text: z.string().describe('The text content to measure'),
    wordsPerMinute: z.number().optional().default(150).describe('Speaking pace in words per minute (default: 150 for conference talks)'),
  }),
  outputSchema: z.object({
    wordCount: z.number().describe('Total number of words'),
    estimatedMinutes: z.number().describe('Estimated speaking duration in minutes'),
    estimatedSeconds: z.number().describe('Estimated speaking duration in seconds'),
    wordsPerMinute: z.number().describe('The WPM rate used for calculation'),
  }),
  execute: async (inputData) => {
    // inputData is the validated input (not wrapped)
    // Return object matching outputSchema
  },
});
```

**CRITICAL createTool notes:**
- `createTool` must be imported from `@mastra/core/tools` (NOT `@mastra/core`)
- `execute` receives validated `inputData` as first arg (not wrapped in an object)
- Both `inputSchema` and `outputSchema` are required per architecture's Tool Implementation Standard
- Tool IDs use kebab-case, exports use camelCase

**checkJargon tool implementation approach:**
The `checkJargon` tool performs heuristic text analysis -- it does NOT call an LLM. It maintains a curated list of technical/jargon terms categorized by complexity level. For a given `audienceLevel`, it scans the text and flags terms that exceed the audience's expected familiarity:
- **beginner:** Flags most technical terms, acronyms, and domain-specific language
- **intermediate:** Flags advanced/specialized terms and uncommon acronyms
- **advanced:** Flags only highly specialized or ambiguous terms
- **mixed:** Uses intermediate-level filtering (safe middle ground)

Each flagged term includes: the `term` itself, a `reason` (why it may be problematic for the audience), and a `suggestion` (simpler alternative or recommendation to define it).

### Library & Framework Requirements

**Existing Dependencies (no new packages needed):**
| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | ^1.6.0 | Agent, createTool, Mastra instance |
| `zod` | ^4.3.6 | Schema validation for tool I/O and agent output |
| `@mastra/pg` | ^1.6.0 | PostgresStore |
| `@ai-sdk/anthropic` | ^3.0.46 | Anthropic provider (for model strings) |

**No new dependencies required.** Both `wordCountToTime` and `checkJargon` are pure computation tools with no external API calls. The Writer agent uses the already-configured `OPUS_MODEL` from `config/models.ts`.

### File Structure Requirements

```
src/mastra/
  agents/
    writer.ts                  # NEW -- Agent + WriterOutputSchema
    researcher.ts              # EXISTING -- no changes
    __tests__/
      writer.test.ts           # NEW -- Agent config + schema tests
      researcher.test.ts       # EXISTING -- no changes
  tools/
    word-count-to-time.ts      # NEW -- WPM duration calculator tool
    check-jargon.ts            # NEW -- Audience-level jargon checker tool
    web-search.ts              # EXISTING -- no changes
    __tests__/
      word-count-to-time.test.ts  # NEW -- Duration calculation tests
      check-jargon.test.ts        # NEW -- Jargon detection tests
      web-search.test.ts       # EXISTING -- no changes
  config/
    models.ts                  # EXISTING -- imports OPUS_MODEL (already defined)
  index.ts                     # MODIFIED -- register writer agent
```

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **Pattern from story 1.2:** `describe`/`it`/`expect`, co-located in `__tests__/`
- **Agent tests:** Verify agent ID, model tier, tool bindings (via `agent.listTools()`), name, schema validation
- **Tool tests:** Verify inputSchema validation, outputSchema compliance, computation correctness, edge cases
- **Schema tests:** Valid data accepted, invalid data rejected with meaningful errors
- **Run:** `pnpm test` must pass all tests including existing story 1.1 + 1.2 tests

**Test patterns to follow (established in story 1.2):**
```typescript
// Agent config test pattern
describe('Writer agent', () => {
  it('should have correct agent ID', () => {
    expect(writer.id).toBe('script-writer');
  });
  it('should use Opus model tier', () => {
    expect(writer.model).toBe(OPUS_MODEL);
  });
  it('should have wordCountToTime and checkJargon tools bound', async () => {
    const tools = await writer.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('wordCountToTime');
    expect(toolKeys).toContain('checkJargon');
  });
  it('should have a name', () => {
    expect(writer.name).toBe('Script Writer');
  });
});

// Schema test pattern
describe('WriterOutputSchema', () => {
  it('should accept valid writer output', () => { ... });
  it('should reject missing required fields', () => { ... });
});

// Tool test pattern (pure computation, no mocking needed)
describe('wordCountToTime tool', () => {
  it('should count words and calculate duration', async () => {
    const result = await wordCountToTime.execute({ text: 'one two three four five', wordsPerMinute: 150 });
    expect(result.wordCount).toBe(5);
    expect(result.estimatedMinutes).toBeCloseTo(5 / 150);
  });
  it('should use default WPM of 150', async () => { ... });
  it('should handle empty text', async () => { ... });
});

describe('checkJargon tool', () => {
  it('should flag technical terms for beginner audience', async () => { ... });
  it('should flag fewer terms for advanced audience', async () => { ... });
  it('should return empty flaggedTerms for text with no jargon', async () => { ... });
});
```

### Previous Story Intelligence

**Patterns established in stories 1.1 and 1.2 that MUST be followed:**
- `Agent` imported from `@mastra/core/agent` (sub-path import)
- `createTool` imported from `@mastra/core/tools` (sub-path import)
- PostgresStore with `id: 'talkforge-storage'` parameter (required)
- Model tier imports: `import { OPUS_MODEL } from '../config/models'`
- Agent `tools` property is private; use `agent.listTools()` (async) to inspect tool bindings in tests
- Vitest test structure: `describe` blocks with `it` assertions
- `pnpm test` as test runner command
- TypeScript strict mode -- all types must be explicit, no `any` escape hatches
- `@mastra/core` 1.6.0 API patterns confirmed working
- Peer dependency warnings for zod v4 vs v3 remain expected and non-blocking
- `pnpm.onlyBuiltDependencies: ["esbuild"]` in package.json prevents unnecessary native builds

**Debug learnings from story 1.2:**
- Top-level `@mastra/core` export only exposes `Mastra` and `Config` -- use sub-path imports for `Agent`, `createTool`
- `@ai-sdk/anthropic@3.0.46` installed as direct dependency
- Anthropic provider-defined tools (webSearch, webFetch) are bound in the same `tools` object as custom tools
- Researcher agent pattern is the exact template to follow for Writer agent

### Git Intelligence

**Recent commits (relevant to current story):**
- `2df6b8a` Anthropic-Only Provider & Built-in Tools Realignment (#4) -- simplified web-search.ts to Anthropic-only, replaced fetchPage with webFetch, updated researcher bindings
- `7ab9f1b` Story 1.2: Researcher Agent & Core Web Tools (#3) -- established the Agent + Tool creation patterns we follow
- `435ef7b` Add GitHub Actions CI pipeline with type-checking and tests -- CI runs `pnpm test` and `pnpm typecheck`, must stay green

**Code conventions from recent commits:**
- Agent files export both the agent instance and the output schema
- Tools are in separate files, one tool per file
- Tests verify agent config properties (ID, model, tools, name) and schema accept/reject
- Registration in `index.ts` is a single-line addition to the `agents` map

### Project Structure Notes

- All new files follow the architecture's directory structure exactly
- Agent output schema co-located with agent (both exported from `writer.ts`)
- Tools in `src/mastra/tools/` -- one tool per file, grouped by function not by agent
- `index.ts` is the ONLY file that imports agents for registration
- Writer agent follows the same structural pattern as Researcher agent

### References

- [Source: architecture.md#Agent Architecture (AD-2 Resolution)] -- Writer uses Opus tier, bound to wordCountToTime and checkJargon tools
- [Source: architecture.md#LLM Model Selection] -- Writer: `anthropic/claude-opus-4-6` (highest quality -- creative long-form output)
- [Source: architecture.md#Tool Implementation Standard] -- explicit inputSchema/outputSchema, single responsibility, LLM-facing description
- [Source: architecture.md#Naming Conventions] -- kebab-case IDs, camelCase exports, PascalCase schemas
- [Source: architecture.md#Phase Recipes] -- Adding an Agent recipe, Adding a Tool recipe
- [Source: architecture.md#Architectural Boundaries] -- Agent, Tool, Storage boundaries
- [Source: architecture.md#Data Flow] -- Writer receives research brief (via workflow), produces speaker script
- [Source: epics.md#Story 1.4] -- Full acceptance criteria and BDD scenarios
- [Source: PRD.md#FR-14] -- System can produce speaker notes with full script, timing annotations, and markers
- [Source: PRD.md#Phase 1] -- Writer agent is Phase 1 scope
- [Source: implementation-artifacts/1-2-researcher-agent-core-web-tools.md] -- Previous story patterns, debug learnings, API verification
- [Source: implementation-artifacts/tech-spec-anthropic-provider-realignment.md] -- Anthropic-only alignment, simplified tool architecture

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- `createTool` `execute` signature is `(inputData, context)` -- context is a required second argument. Tests use `{} as never` for the context parameter.
- `execute` return type is a union `ValidationError | OutputType` -- tests cast the result to the expected output type.
- `z.number().optional()` in inputSchema works but the default value must be handled in the execute function (not via `.default()` on the schema), since Zod validation passes `undefined` through.
- Schema-only exports work fine in writer.ts before agent is added -- allows Task 1 schema tests to pass independently before tools exist.

### Completion Notes List

- Task 1: Created `WriterOutputSchema` with 4 top-level fields (sections, timingMarkers, totalDurationMinutes, speakerNotes). Sections have title/content/speakingNotes/durationMinutes. TimingMarkers have timestamp/instruction. Exported schema and `WriterOutput` type. 6 tests validating accept/reject behavior.
- Task 2: Created `wordCountToTime` tool with `createTool()`. Counts words by splitting on whitespace, calculates duration at given WPM (default 150). inputSchema: text + optional wordsPerMinute. outputSchema: wordCount, estimatedMinutes, estimatedSeconds, wordsPerMinute. 7 tests covering calculation accuracy, defaults, edge cases.
- Task 3: Created `checkJargon` tool with `createTool()`. Maintains a curated dictionary of ~30 jargon terms with complexity thresholds (intermediate/advanced/expert). Scans text case-insensitively and flags terms exceeding audience familiarity. inputSchema: text + audienceLevel enum. outputSchema: flaggedTerms array, audienceLevel echo, totalFlagged count. 8 tests covering audience levels, empty text, case insensitivity.
- Task 4: Added Writer agent to writer.ts with Agent from `@mastra/core/agent`. ID: `script-writer`, model: OPUS_MODEL, tools: wordCountToTime + checkJargon. System prompt instructs script writing with [PAUSE], [ASK AUDIENCE], [EMPHASIS] markers, timing cues, and tool usage guidance. 4 additional tests verifying agent config (total 10 writer tests).
- Task 5: Registered writer agent in `src/mastra/index.ts` alongside researcher. Full test suite passes (50 tests, 0 failures). TypeScript type checking passes with zero errors.

### Implementation Plan

TDD red-green-refactor cycle applied to each task sequentially. Schema created first (Task 1), then tools (Tasks 2-3), then agent with tool bindings (Task 4), then registration (Task 5). This order ensures each import resolves correctly.

### File List

- `src/mastra/agents/writer.ts` (NEW) -- Writer agent + WriterOutputSchema
- `src/mastra/agents/__tests__/writer.test.ts` (NEW) -- Schema + agent config tests (10 tests)
- `src/mastra/tools/word-count-to-time.ts` (NEW) -- WPM duration calculator tool
- `src/mastra/tools/__tests__/word-count-to-time.test.ts` (NEW) -- Duration calculation tests (7 tests)
- `src/mastra/tools/check-jargon.ts` (NEW) -- Audience-level jargon checker tool
- `src/mastra/tools/__tests__/check-jargon.test.ts` (NEW) -- Jargon detection tests (8 tests)
- `src/mastra/index.ts` (MODIFIED) -- Added writer agent import and registration

## Change Log

- 2026-02-25: Story 1.4 implementation complete -- Writer agent, wordCountToTime tool, checkJargon tool, WriterOutputSchema, all registered in Mastra instance. 25 new tests added (50 total pass). TypeScript clean.
- 2026-02-25: Code review fixes -- Added .positive() validation to wordCountToTime WPM input (M1), added plural jargon matching with s? suffix and removed duplicate microservices entry (M2), corrected test count in Change Log (M3). 2 new tests added.
