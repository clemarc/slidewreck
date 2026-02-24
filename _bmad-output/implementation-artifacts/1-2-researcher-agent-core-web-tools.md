# Story 1.2: Researcher Agent & Core Web Tools

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a speaker,
I want the system to research my topic and produce a structured research brief,
so that my talk is grounded in current information and relevant sources.

## Acceptance Criteria

1. **Given** the Researcher agent is defined in `src/mastra/agents/researcher.ts` **When** I inspect the agent configuration **Then** it uses the Sonnet model tier **And** it has a system prompt instructing it to produce a research brief for conference talks **And** it has `ResearcherOutputSchema` (Zod) defining structured output with sections for key findings, sources, existing talks, statistics, and suggested angles **And** it is bound to the `webSearch` and `fetchPage` tools (supplementary tools added in Story 1.3) (AC: #1)

2. **Given** the `webSearch` tool exists in `src/mastra/tools/web-search.ts` **When** invoked with a search query **Then** it returns structured search results using a provider-defined web search tool (Anthropic, OpenAI, or Google) **And** the provider is configurable via `WEB_SEARCH_PROVIDER` env var (defaults to `anthropic`) (AC: #2)

3. **Given** the `fetchPage` tool exists in `src/mastra/tools/fetch-page.ts` **When** invoked with a URL **Then** it extracts and returns the page content in a structured format **And** it has explicit `inputSchema` and `outputSchema` (AC: #3)

4. **Given** the Researcher agent is registered in `src/mastra/index.ts` **When** I open Mastra Studio **Then** the Researcher agent is visible and testable in the Studio UI (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Create ResearcherOutputSchema (AC: #1)
  - [x] 1.1 Define Zod schema with sections for: keyFindings (array of finding objects), sources (array of source objects with URL, title, relevance), existingTalks (array), statistics (array of stat objects), suggestedAngles (array of strings)
  - [x] 1.2 Export schema and inferred type from `src/mastra/agents/researcher.ts`
  - [x] 1.3 Write tests validating schema accepts valid data and rejects invalid

- [x] Task 2: Create configurable webSearch tool using provider-defined tools (AC: #2)
  - [x] 2.1 Install AI SDK provider packages: `pnpm add @ai-sdk/anthropic` (required), optionally `@ai-sdk/openai` and `@ai-sdk/google`
  - [x] 2.2 Create `src/mastra/tools/web-search.ts` with a `createWebSearchTool(provider)` factory function
  - [x] 2.3 Implement provider switch: `anthropic.tools.webSearch_20250305()`, `openai.tools.webSearch()`, `google.tools.googleSearch()`
  - [x] 2.4 Default to `anthropic` provider, allow override via `WEB_SEARCH_PROVIDER` env var
  - [x] 2.5 Add `WEB_SEARCH_PROVIDER` to `.env.example` with documented options
  - [x] 2.6 Write tests verifying factory returns a tool for each supported provider and defaults to anthropic

- [x] Task 3: Create fetchPage tool (AC: #3)
  - [x] 3.1 Create `src/mastra/tools/fetch-page.ts` with `createTool()`
  - [x] 3.2 Define `inputSchema` with `url` (string URL)
  - [x] 3.3 Define `outputSchema` with `content` (extracted text), `title`, `url`, and `contentLength`
  - [x] 3.4 Implement `execute` function that fetches URL content, strips HTML, and returns structured text
  - [x] 3.5 Write tests with mocked fetch responses verifying content extraction and error handling

- [x] Task 4: Create Researcher agent (AC: #1)
  - [x] 4.1 Create `src/mastra/agents/researcher.ts` with `new Agent()`
  - [x] 4.2 Set agent ID to `researcher`, model to `SONNET_MODEL` from config/models.ts
  - [x] 4.3 Write system prompt instructing research brief production for conference talks
  - [x] 4.4 Bind `webSearch` and `fetchPage` tools to agent
  - [x] 4.5 Export agent and schema
  - [x] 4.6 Write tests verifying agent configuration (model tier, tool bindings, ID)

- [x] Task 5: Register in Mastra instance and verify (AC: #4)
  - [x] 5.1 Import researcher agent in `src/mastra/index.ts`
  - [x] 5.2 Add to `agents` map in Mastra constructor
  - [x] 5.3 Verify agent appears in Mastra Studio at localhost:4111
  - [x] 5.4 Run full test suite: `pnpm test`

## Dev Notes

### Architecture Compliance

**CRITICAL -- Follow these patterns exactly:**

- **Agent boundary:** Each agent is self-contained in its file -- system prompt, tool bindings, model selection, and output schema. Agents do NOT import other agents. [Source: architecture.md#Architectural Boundaries]
- **Tool boundary:** Tools are pure functions of input -> output. They import no agents, no workflow state, no other tools. They are bound to agents in the agent definition file, not in the tool file. [Source: architecture.md#Architectural Boundaries]
- **Naming conventions:** kebab-case IDs (`researcher`, `web-search`, `fetch-page`), camelCase exports (`researcher`, `webSearch`, `fetchPage`), PascalCase + Schema suffix for Zod schemas (`ResearcherOutputSchema`) [Source: architecture.md#Naming Conventions]
- **Single registration point:** All agents registered in `src/mastra/index.ts` [Source: architecture.md#Architectural Boundaries]
- **TDD mandatory:** Write failing tests FIRST, then implement minimal code to pass, then refactor [Source: CLAUDE.md#Testing]

### Technical Requirements

**Agent API (verified against @mastra/core 1.6.0):**
```typescript
import { Agent } from '@mastra/core';

export const researcher = new Agent({
  id: 'researcher',
  name: 'Researcher',
  description: 'Researches topics and produces structured research briefs for conference talks',
  instructions: '...system prompt...',
  model: SONNET_MODEL,  // 'anthropic/claude-sonnet-4-5' from config/models.ts
  tools: { webSearch, fetchPage },
});
```

**Key Agent API notes:**
- `instructions` is the system prompt -- can be a string, string array, or function
- `model` accepts the magic model string directly (e.g., `'anthropic/claude-sonnet-4-5'`)
- `tools` is an object mapping tool names to Tool instances
- Structured output is configured at **execution time** via `agent.generate(messages, { structuredOutput: { schema } })`, NOT in the Agent constructor
- Schema goes in the same file as the agent, exported alongside it

**Web Search Tool -- Provider-Defined (NOT custom createTool):**

The webSearch tool uses **provider-defined tools** from the Vercel AI SDK. These are server-side tools executed by the LLM provider, not custom Mastra tools. The Mastra `ToolsInput` type accepts `ProviderDefinedTool` directly.

```typescript
// src/mastra/tools/web-search.ts
import { anthropic } from '@ai-sdk/anthropic';

// Optional providers (only import if installed):
// import { openai } from '@ai-sdk/openai';
// import { google } from '@ai-sdk/google';

export type SearchProvider = 'anthropic' | 'openai' | 'google';

export function createWebSearchTool(provider: SearchProvider = 'anthropic') {
  switch (provider) {
    case 'anthropic':
      return anthropic.tools.webSearch_20250305({
        maxUses: 5,
      });
    case 'openai':
      // Requires @ai-sdk/openai + OPENAI_API_KEY
      const { openai } = require('@ai-sdk/openai');
      return openai.tools.webSearch({ searchContextSize: 'medium' });
    case 'google':
      // Requires @ai-sdk/google + GOOGLE_GENERATIVE_AI_API_KEY
      const { google } = require('@ai-sdk/google');
      return google.tools.googleSearch({});
    default:
      throw new Error(`Unsupported web search provider: ${provider}`);
  }
}

const provider = (process.env.WEB_SEARCH_PROVIDER || 'anthropic') as SearchProvider;
export const webSearch = createWebSearchTool(provider);
```

**Key differences from custom tools:**
- Provider-defined tools have NO `inputSchema`/`outputSchema` -- the provider defines the interface
- The LLM decides when and how to call the tool -- results flow back automatically
- No `execute` function to implement -- the provider handles execution server-side
- Citations are included natively in the response (Anthropic, Google)

**Provider details:**
| Provider | Tool Function | API Key Env Var | Pricing |
|----------|--------------|-----------------|---------|
| Anthropic | `anthropic.tools.webSearch_20250305({ maxUses })` | `ANTHROPIC_API_KEY` (already configured) | $10/1K searches |
| OpenAI | `openai.tools.webSearch({ searchContextSize })` | `OPENAI_API_KEY` | Per-token tool cost |
| Google | `google.tools.googleSearch({})` | `GOOGLE_GENERATIVE_AI_API_KEY` | Free tier available |

**IMPORTANT:** Anthropic web search must be **enabled in your Anthropic Console settings** before use.

**fetchPage Tool -- Custom createTool (no provider equivalent):**

The `fetchPage` tool remains a custom Mastra tool since no provider offers arbitrary URL content extraction:

```typescript
import { createTool } from '@mastra/core';
import { z } from 'zod';

export const fetchPage = createTool({
  id: 'fetch-page',
  description: 'Fetch and extract text content from a URL',
  inputSchema: z.object({
    url: z.string().url().describe('URL to fetch content from'),
  }),
  outputSchema: z.object({
    content: z.string().describe('Extracted text content'),
    title: z.string().describe('Page title'),
    url: z.string().describe('Fetched URL'),
    contentLength: z.number().describe('Character count of extracted content'),
  }),
  execute: async (inputData) => {
    // Fetch URL, strip HTML, return structured text
  },
});
```

`createTool` `execute` receives validated `inputData` as first arg (not wrapped in an object). `fetchWithRetry(url, options?, maxRetries?)` available from `@mastra/core` utils for HTTP requests with exponential backoff.

**Mastra Registration (existing pattern from story 1.1):**
```typescript
// src/mastra/index.ts
import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';
import { researcher } from './agents/researcher';

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: 'talkforge-storage',
    connectionString: process.env.DATABASE_URL!,
  }),
  agents: { researcher },
});
```

### Library & Framework Requirements

**Existing Dependencies (from story 1.1):**
| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | ^1.6.0 | Agent, createTool, Mastra instance |
| `zod` | ^4.3.6 | Schema validation for tool I/O and agent output |
| `@mastra/pg` | ^1.6.0 | PostgresStore |

**New Dependencies Required:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@ai-sdk/anthropic` | latest | Anthropic provider -- web search tool + future agent model config |
| `@ai-sdk/openai` | latest (optional) | OpenAI provider -- web search alternative |
| `@ai-sdk/google` | latest (optional) | Google provider -- web search alternative |

**New Environment Variables:**
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `WEB_SEARCH_PROVIDER` | No | `anthropic` | Which provider's web search to use (`anthropic`, `openai`, `google`) |
| `OPENAI_API_KEY` | Only if provider=openai | - | OpenAI API key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Only if provider=google | - | Google AI API key |

Add all to `.env.example` with documentation.

**CRITICAL version/API notes:**
- `@ai-sdk/anthropic` is likely already a transitive dependency of `@mastra/core` -- verify before installing to avoid version conflicts
- Zod v4 API: Use `z.object()`, `z.string()`, `z.array()`, `z.number()`, `z.enum()` -- same as v3 but import from `zod` directly
- `createTool` `execute` receives validated `inputData` as first arg (not wrapped in an object)
- `fetchWithRetry(url, options?, maxRetries?)` available from `@mastra/core` utils for HTTP requests with exponential backoff
- Provider-defined tool API signatures MUST be verified against the installed `@ai-sdk/anthropic` package types before implementation (check `.d.ts` files for exact function names)

### File Structure Requirements

```
src/mastra/
  agents/
    researcher.ts              # NEW -- Agent + ResearcherOutputSchema
    __tests__/
      researcher.test.ts       # NEW -- Agent config + schema tests
  tools/
    web-search.ts              # NEW -- Provider-defined web search factory (NOT createTool)
    fetch-page.ts              # NEW -- Custom fetchPage tool (createTool)
    __tests__/
      web-search.test.ts       # NEW -- Factory tests (provider selection, defaults)
      fetch-page.test.ts       # NEW -- Tool tests with mocked fetch
  config/
    models.ts                  # EXISTING -- imports SONNET_MODEL
  index.ts                     # MODIFIED -- register researcher agent
.env.example                   # MODIFIED -- add WEB_SEARCH_PROVIDER
```

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **Pattern from story 1.1:** `describe`/`it`/`expect`, co-located in `__tests__/`
- **Agent tests:** Verify agent ID, model tier, tool bindings, schema validation
- **Tool tests:** Mock HTTP/fetch calls, verify inputSchema validation, outputSchema compliance, error handling
- **Schema tests:** Valid data accepted, invalid data rejected with meaningful errors
- **Run:** `pnpm test` must pass all tests including existing story 1.1 tests

**Test patterns to follow:**
```typescript
// Agent config test pattern
describe('Researcher agent', () => {
  it('should have correct agent ID', () => { ... });
  it('should use Sonnet model tier', () => { ... });
  it('should have webSearch and fetchPage tools bound', () => { ... });
});

// Schema test pattern
describe('ResearcherOutputSchema', () => {
  it('should accept valid research brief', () => { ... });
  it('should reject missing required fields', () => { ... });
});

// Web search factory test pattern
describe('createWebSearchTool', () => {
  it('should default to anthropic provider', () => { ... });
  it('should return a provider-defined tool for each supported provider', () => { ... });
  it('should throw for unsupported provider', () => { ... });
});

// fetchPage tool test pattern (with mocked fetch)
describe('fetchPage tool', () => {
  it('should extract text content from HTML', async () => { ... });
  it('should handle fetch errors gracefully', async () => { ... });
});
```

### Previous Story Intelligence

**Patterns established in story 1.1 that MUST be followed:**
- PostgresStore with `id: 'talkforge-storage'` parameter (required, discovered during 1.1 implementation)
- Model tier imports: `import { SONNET_MODEL } from '../config/models'`
- Vitest test structure: `describe` blocks with `it` assertions
- `pnpm test` as test runner command
- TypeScript strict mode -- all types must be explicit, no `any` escape hatches
- Mastra 1.6.0 API patterns confirmed working

**Debug learnings from story 1.1:**
- Peer dependency warnings for zod v4 vs v3 expected by @ai-sdk packages -- non-blocking
- pnpm enabled via corepack (v10.30.1)
- `pnpm.onlyBuiltDependencies: ["esbuild"]` in package.json prevents unnecessary native builds

### Project Structure Notes

- All new files follow the architecture's directory structure exactly
- Agent output schema co-located with agent (both exported from `researcher.ts`)
- Tools in `src/mastra/tools/` -- grouped by function, not by agent
- `index.ts` is the ONLY file that imports agents for registration
- Supplementary tools (`findExistingTalks`, `extractStats`) are added in story 1.3 -- this story creates only `webSearch` and `fetchPage`

### References

- [Source: architecture.md#Agent Architecture (AD-2 Resolution)] -- Researcher uses Sonnet tier, bound to webSearch, fetchPage, findExistingTalks, extractStats
- [Source: architecture.md#Tool Implementation Standard] -- explicit inputSchema/outputSchema, single responsibility, LLM-facing description
- [Source: architecture.md#Naming Conventions] -- kebab-case IDs, camelCase exports, PascalCase schemas
- [Source: architecture.md#Phase Recipes] -- Adding an Agent recipe, Adding a Tool recipe
- [Source: architecture.md#Architectural Boundaries] -- Agent, Tool, Storage boundaries
- [Source: architecture.md#Implementation Patterns] -- Schema conventions, test patterns
- [Source: epics.md#Story 1.2] -- Full acceptance criteria and BDD scenarios
- [Source: epics.md#Story 1.3] -- Supplementary tools added later (findExistingTalks, extractStats)
- [Source: implementation-artifacts/1-1-*.md] -- Previous story patterns, debug learnings, installed versions

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- `createTool` must be imported from `@mastra/core/tools` (not `@mastra/core`) -- the top-level export only exposes `Mastra` and `Config`
- `Agent` must be imported from `@mastra/core/agent` (same sub-path pattern)
- `@ai-sdk/anthropic@3.0.46` installed as direct dependency -- was NOT a transitive dep of @mastra/core
- Agent `tools` property is private; use `agent.listTools()` (async) to inspect tool bindings in tests
- Peer dependency warnings for zod v4 vs v3 remain expected and non-blocking

### Completion Notes List

- Task 1: Created `ResearcherOutputSchema` with 5 sections (keyFindings, sources, existingTalks, statistics, suggestedAngles), each with typed sub-schemas. Exported schema and inferred `ResearcherOutput` type. 6 tests validating accept/reject behavior.
- Task 2: Created `createWebSearchTool(provider)` factory using `@ai-sdk/anthropic` provider-defined tools (`webSearch_20250305`). Supports anthropic (default), openai, google providers via env var `WEB_SEARCH_PROVIDER`. Added env var docs to `.env.example`. 5 tests covering factory behavior and defaults.
- Task 3: Created `fetchPage` custom tool with `createTool()` from `@mastra/core/tools`. Implements HTML stripping (removes script/style tags, HTML entities), title extraction, error handling for HTTP errors and network failures. 7 tests with mocked fetch.
- Task 4: Created Researcher agent with correct ID (`researcher`), Sonnet model tier, system prompt for conference talk research, and webSearch + fetchPage tool bindings. 4 tests verifying config.
- Task 5: Registered researcher agent in `src/mastra/index.ts`. Full test suite passes (29 tests, 0 failures). TypeScript type checking passes with zero errors.

### Implementation Plan

TDD red-green-refactor cycle applied to each task sequentially. Verified Mastra 1.6.0 and @ai-sdk/anthropic 3.0.46 APIs from installed type definitions before implementation. All architectural boundaries and naming conventions followed per story Dev Notes.

### File List

- `src/mastra/agents/researcher.ts` (NEW) -- Researcher agent + ResearcherOutputSchema
- `src/mastra/agents/__tests__/researcher.test.ts` (NEW) -- Schema + agent config tests (10 tests)
- `src/mastra/tools/web-search.ts` (NEW) -- Provider-defined web search factory
- `src/mastra/tools/__tests__/web-search.test.ts` (NEW) -- Web search factory tests (5 tests)
- `src/mastra/tools/fetch-page.ts` (NEW) -- Custom fetchPage tool
- `src/mastra/tools/__tests__/fetch-page.test.ts` (NEW) -- Fetch page tool tests (7 tests)
- `src/mastra/index.ts` (MODIFIED) -- Added researcher agent registration
- `.env.example` (MODIFIED) -- Added WEB_SEARCH_PROVIDER documentation
- `package.json` (MODIFIED) -- Added @ai-sdk/anthropic dependency

## Change Log

- 2026-02-24: Story 1.2 implementation complete -- Researcher agent, webSearch tool (provider-defined), fetchPage tool (custom), ResearcherOutputSchema, all registered in Mastra instance. 22 new tests added (29 total pass).
