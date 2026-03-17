---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - 'PRD.md'
  - 'PRD-validation-report.md'
  - 'architecture.md (pre-existing reference)'
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-20'
project_name: 'bmad-mastra-presentation'
user_name: 'Clément'
date: '2026-02-20'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
27 FRs across 5 categories, phased over 7 increments:

- **Input Handling (FR-1–6):** Free-text topic, audience level selection, format selection, optional constraints, reference material upload, input validation. Architecturally straightforward — form inputs passed as workflow `inputData`.
- **Pipeline Execution (FR-7–12):** End-to-end generation, suspend/resume at human gates, structured feedback passthrough, rejection with loopback, parallel asset creation, conditional step skipping. This is the architectural core — a Mastra workflow with suspend/resume gates, branching, and parallel steps.
- **Output Generation (FR-13–17):** Slide specs + diagrams, speaker notes with timing markers, prep package, eval scorecard, downloadable ZIP. Multiple output formats produced by different agents, assembled at the end.
- **Memory & Learning (FR-18–22):** Cold start without style data, edit diff detection at gates, style insight persistence by category, style-augmented prompt retrieval, cross-session talk metadata. Requires Mastra memory integration with a style learning feedback loop.
- **Evals (FR-24–27):** Automated eval suite post-generation, result storage for trends, scorecard display, meta-evals after 3+ sessions. Mastra eval registry with both LLM-as-judge and heuristic scorers.

**Non-Functional Requirements:**
24 NFRs across 6 categories that shape architecture:

- **Performance:** <5min total generation, <60s per step, parallel execution for assets, <30s slide generation. Implies async/parallel workflow steps and efficient tool implementations.
- **Reliability:** Suspend state survives restarts (requires persistent storage provider), 3x retry with backoff, graceful degradation for optional features, non-blocking reference indexing failures.
- **Observability:** Per-step logging (tokens, latency, model), step status tracking, queryable eval results, memory operation logging. Mastra's built-in tracing + Studio Observability tab covers most of this.
- **Extensibility:** New agents via config only, new evals via registry entry, pluggable tool registry, template-driven slide layouts. Architecture must be registry-based, not hardcoded.
- **Data & Privacy:** All data local/user-controlled, no third-party data sharing beyond LLM provider, user can view/delete personal data, data export as JSON.
- **Developer Experience:** Single install + start command, agents testable in isolation, eval suite runnable independently, single `.env` config file.

**Scale & Complexity:**

- Primary domain: **Backend/CLI with Studio UI** (Node.js/TypeScript, Mastra framework)
- Complexity level: **Medium-high** — multi-agent orchestration with memory, RAG, and evals, but single-user, no multi-tenancy
- Estimated architectural components: ~15 (up to 6 agents, 1 workflow, up to 13 tools, up to 3 RAG knowledge bases, 1 memory system, 1 eval suite, 1 storage layer)

### Architectural Decision: Runtime Model

**Decision:** Server-based with Mastra Studio UI as primary development and interaction interface.

**Rationale:**
- `mastra dev` serves both the Studio UI (workflow visualization, agent testing, observability traces) and the REST API on `localhost:4111`
- Human gates handled via Studio UI: workflow suspends, user reviews output in the UI, resumes with feedback
- API endpoints available for all workflow operations (`start-async`, `resume`, `runs/:runId`)
- Storage-backed state persistence ensures suspend/resume survives process restarts
- Studio provides built-in observability, eval scorecard display, and tool testing — reducing custom UI work
- Learning goal: hands-on experience with Studio as part of the Mastra ecosystem

**Flow:** User starts run via Studio UI or API -> agents execute with real-time trace visibility -> workflow suspends at human gates -> user reviews/provides feedback in Studio -> resume -> repeat until pipeline completes.

### First Principles — Key Architectural Constraints

The following principles were derived from first-principles analysis and should guide all downstream decisions:

**1. Agent vs. workflow step distinction**
Not every role needs to be a Mastra Agent. An "agent" should be used when the role requires *autonomous reasoning with distinct tool access*. Roles that perform structured transformation on existing content (e.g., Style Learner analysing diffs) may be better modelled as workflow steps with specific LLM prompts. Each role should be evaluated individually during architecture decisions.

**2. Human gates must earn their place**
Each suspend/resume gate adds friction and complexity. Gates should exist where *the cost of proceeding with bad output exceeds the cost of pausing*. Research and structure selection are high-leverage (shape everything downstream). Script review is medium. Slide review is lower. Gate count is a design decision to be made explicitly, not inherited from the prior draft.

**3. Learning breadth over production depth**
Success criteria are learning-oriented (exercise all 7 Mastra capabilities, be able to demo/present Mastra). Each phase should introduce one new Mastra capability with enough depth to understand it thoroughly, but avoid front-loading complexity that belongs in later phases. The pre-existing architecture's full detail (13 tools, 3 RAG KBs, 10+4 evals) represents the end-state vision, not the per-phase target.

**4. Storage strategy resolved**
PostgreSQL + pgvector from Phase 1. Consistent infrastructure throughout all phases. Docker Compose makes setup a one-liner. See Core Architectural Decisions for details.

**5. Pre-existing architecture is a proposal, not a spec**
The prior `architecture.md` contains useful ideas (agent roles, pipeline structure, TypeScript interfaces, memory key patterns) but predates this decision-making process. Each element should be evaluated and decided fresh. Interfaces and schemas should emerge from architectural decisions, not precede them.

### Technical Constraints & Dependencies

- **Mastra framework** as the orchestration layer — all agents, tools, workflows, RAG, memory, and evals built on Mastra APIs
- **Anthropic Claude** as the exclusive LLM provider for all agents (AD-5) — enables use of Anthropic's built-in provider-defined tools (web search, web fetch with dynamic filtering, programmatic tool calling)
- **Storage provider** — PostgreSQL + pgvector from Phase 1 via Docker Compose (AD-1 resolved)
- **Node.js >= 22.13.0** required by Mastra
- **TypeScript with ES2022 modules** — Mastra requirement (no CommonJS)
- **pnpm** as package manager (per PRD tech stack)
- **Phased delivery** — each phase must be independently runnable; architecture must support incremental agent/tool/eval addition without modifying core

### Cross-Cutting Concerns Identified

1. **Suspend/resume state management** — every human gate needs consistent suspend payload structure, storage-backed persistence, and Studio UI compatibility
2. **Observability** — Mastra auto-traces all agent runs, model calls (with token breakdown), tool invocations, and workflow step transitions (NFR-9, NFR-10) via the `wrapMastra()` proxy — no manual instrumentation or conventions required. Requires `@mastra/observability` package with explicit `Mastra` constructor config; without it, all tracing is no-op. Dual-export pattern: `DefaultExporter` (Postgres → Studio) + `OtelExporter` (OTLP → Grafana Tempo)
3. **Style learning integration** — spans the Writer, human gate diff capture, style analysis, memory persistence, and dynamic prompt augmentation; touches 4 of 7 phases
4. **Registry-based extensibility** — agents, tools, evals, and slide layouts must all be addable via config/registry without modifying existing code (NFR-13–16)
5. **Graceful degradation** — optional features (image generation, reference indexing) must fail without blocking the pipeline (NFR-7, NFR-8)
6. **Data locality** — all user data stays local; only LLM API calls leave the machine (NFR-17, NFR-18)
7. **Agent vs. step evaluation** — each role in the pipeline should be assessed for whether it warrants a full Mastra Agent (autonomous + tools) or a simpler workflow step with an LLM call

### Resolved Architectural Decisions (from Context Analysis)

All pending decisions from context analysis have been resolved in Core Architectural Decisions:

- **AD-1: Storage Strategy** — Resolved: PostgreSQL + pgvector from Phase 1
- **AD-2: Agent vs. Workflow Step** — Resolved: 5 Agents + 1 workflow step (Style Learner)
- **AD-3: Human Gate Placement** — Resolved: 4 gates, Gate 4 optional (auto-approve by default)
- **AD-4: Pre-existing Architecture** — Confirmed: treated as proposals, not specs
- **AD-5: LLM Provider Strategy** — Resolved: Anthropic-only with built-in provider-defined tools (web search, web fetch with dynamic filtering, programmatic tool calling)
- **AD-6: Observability Architecture** — Resolved: `@mastra/observability` with dual-export (DefaultExporter for Studio, OtelExporter for Grafana LGTM). Epic 7 (external OTEL) absorbed into Epic 6. See spike: `_bmad-output/implementation-artifacts/spike-epic-6-mastra-observability.md`

## Starter Template Evaluation

### Primary Technology Domain

**Mastra framework project** (Node.js/TypeScript backend with Studio UI) — based on project requirements for multi-agent orchestration with workflows, RAG, memory, and evals.

### Starter Options Considered

**Option A: `create-mastra` CLI (Official Scaffolding)**
```bash
npx create-mastra@latest -c agents,workflows,tools -l anthropic
```
- Generates standard project structure with example agent, workflow, and tool
- Sets up `mastra dev` and `mastra build` scripts
- Current version: mastra 1.3.1
- **Pros:** Official path, Studio-ready out of the box, example code shows Mastra patterns
- **Cons:** Example code needs cleanup, may not set up pnpm (defaults to npm), no Vitest config, no workflows/evals/RAG packages pre-installed (only `@mastra/core`)

**Option B: Manual Installation**
```bash
mkdir talkforge && cd talkforge
pnpm init
pnpm add -D typescript @types/node mastra@latest
pnpm add @mastra/core@latest zod@^4
```
- Full control over project structure, package manager, and configuration
- Set up pnpm, Vitest, exact tsconfig from the start
- No example code to clean up
- **Pros:** Clean slate matching our exact tech stack, no leftover scaffolding
- **Cons:** More manual setup, need to know the right Mastra file structure conventions

**Option C: Template-Based (`deep-research` or similar)**
- Closest existing template to our use case (web browsing + research synthesis)
- But designed for a specific use case, not a multi-agent workflow pipeline
- **Pros:** Working example of web search + agent patterns
- **Cons:** Significant modification needed, template structure may fight our architecture

### Selected Starter: Manual Installation (Option B)

**Rationale for Selection:**

1. **Exact tech stack control** — pnpm as package manager (PRD requirement), Vitest for testing, precise tsconfig matching Mastra's ES2022 requirements
2. **No cleanup overhead** — `create-mastra` generates example weather agent/tool code that we'd immediately delete; manual setup starts clean
3. **Learning value** — manually wiring up `@mastra/core`, registering agents and workflows, and configuring `mastra dev` teaches the framework fundamentals better than scaffolded code
4. **Incremental dependency addition** — Phase 1 needs only `@mastra/core` + `zod`; RAG packages, memory packages, and eval packages added phase-by-phase as needed
5. **Project structure matches our architecture** — we design the folder structure around our agents/workflows/tools, not around an example app

**Initialization Commands:**

```bash
mkdir talkforge && cd talkforge
pnpm init
pnpm add -D typescript @types/node mastra@latest vitest
pnpm add @mastra/core@latest zod@^4
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript with ES2022 target
- `moduleResolution: "bundler"`
- Strict mode enabled
- Node.js >= 22.13.0

**Build Tooling:**
- `mastra dev` — development server with hot reload + Studio UI
- `mastra build` — production build
- No additional bundler needed (Mastra handles compilation)

**Testing Framework:**
- Vitest (per PRD tech stack) — configured manually
- Agents testable in isolation via Studio UI + programmatic tests

**Code Organization:**
```
src/
├── mastra/
│   ├── index.ts          # Mastra entry point (registers agents, workflows)
│   ├── agents/           # Agent definitions (1 file per agent)
│   ├── workflows/        # Workflow definitions
│   └── tools/            # Tool definitions
```

**Development Experience:**
- `pnpm dev` → `mastra dev` (Studio UI on localhost:4111)
- `pnpm build` → `mastra build`
- `pnpm test` → `vitest`
- `.env` for API keys (ANTHROPIC_API_KEY)

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Storage provider (AD-1): PostgreSQL + pgvector from Phase 1
- Agent vs. step split (AD-2): 5 Agents + 1 workflow step
- Human gate placement (AD-3): 4 gates, Gate 4 optional
- LLM provider strategy (AD-5): Anthropic-only with built-in provider-defined tools
- LLM model selection: Tiered by role complexity
- Workflow composition pattern: Mastra's `.then()` / `.parallel()` / `.branch()` / `.dountil()`

**Important Decisions (Shape Architecture):**
- Output schema approach: Strict per-phase, evolve as phases are built
- Error handling: 3x retry with backoff, graceful degradation for optional features

**Deferred Decisions (Per-Phase):**
- RAG chunking strategy and embedding model (Phase 3)
- Eval scorer definitions and registry structure (Phase 4)
- Slide output format — PPTX, reveal.js, Slidev, or other (Phase 5)
- Memory key patterns and prompt augmentation mechanics (Phase 6)
- Output packaging and download format (Phase 7)

### Data Architecture

**Storage Provider:** PostgreSQL + pgvector
- Package: `@mastra/pg` + `pg`
- pgvector v0.8.1
- Docker Compose with `pgvector/pgvector:pg17` image
- Connection: `DATABASE_URL` env var
- Rationale: Consistent infrastructure from Phase 1. Covers workflow state, RAG vectors, memory, eval results, and traces. Docker Compose makes setup a one-liner.

**Observability Infrastructure:** Grafana LGTM (AD-6)
- Docker Compose: `grafana/otel-lgtm:latest` — Loki (logs), Grafana (UI), Tempo (traces), Mimir (metrics) in a single container
- Ports: `3000` (Grafana UI), `4317` (OTLP gRPC), `4318` (OTLP HTTP), `3100` (Loki)
- Packages: `@mastra/observability` (Observability entrypoint + DefaultExporter), `@mastra/otel-exporter` (OTLP export), `@mastra/otel-bridge` (bidirectional OTEL context)
- Dual-export: `DefaultExporter` persists to Postgres for Studio traces; `OtelExporter` ships to Grafana Tempo via OTLP HTTP
- `OtelBridge` enables OTEL-instrumented code (HTTP clients, DB queries) inside agents to nest correctly in Grafana trace trees
- Env: `OTEL_EXPORTER_OTLP_ENDPOINT` (defaults to `http://localhost:4318`)

**Mastra Tables (auto-created):**
- `mastra_workflow_snapshot` — suspend/resume state
- `mastra_threads` / `mastra_messages` — conversation memory
- `mastra_evals` / `mastra_scorers` — eval results
- `mastra_traces` — observability data (populated by `DefaultExporter`, not auto-populated by `@mastra/core`)
- `mastra_resources` — working memory

**Output Schemas:** Zod structured output per agent, defined phase-by-phase. Pre-existing TypeScript interfaces from prior architecture used as reference, not as given.

### LLM Model Selection

Tiered by role complexity to balance quality, speed, and cost:

| Role | Model | Rationale |
|------|-------|-----------|
| Researcher | `anthropic/claude-sonnet-4-5` | Breadth + tool use, moderate complexity |
| Architect | `anthropic/claude-sonnet-4-5` | Structural thinking, moderate complexity |
| Writer | `anthropic/claude-opus-4-6` | Highest quality — creative long-form output |
| Designer | `anthropic/claude-sonnet-4-5` | Structured spec generation, tool-heavy |
| Coach | `anthropic/claude-sonnet-4-5` | Synthesis from existing content |
| Style Learner (step) | `anthropic/claude-haiku-4-5` | Narrow diff analysis, structured output |
| Eval judges | `anthropic/claude-haiku-4-5` | Cost-efficient for repetitive scoring |

### LLM Provider Strategy (AD-5 Resolution)

**Decision:** Anthropic as the exclusive LLM provider, leveraging built-in provider-defined tools.

**Rationale:**
- Anthropic's built-in `web_search` and `web_fetch` (with dynamic filtering) eliminate the need for custom fetch-page tools — Claude reads pages and programmatically extracts only relevant content before it enters the context window
- Programmatic tool calling enables Claude to batch search→fetch→extract cycles in a single orchestration script, reducing API round-trips and latency for research-heavy workflows
- Multi-provider abstractions add complexity without value — the model tiers are already 100% Anthropic
- Dynamic filtering keeps context budgets under control when compiling research across many sources

**Tradeoff:** Full vendor lock-in to Anthropic. Acceptable for this project's scope and learning goals.

**Impact on Researcher Agent:**
- Custom `fetchPage` tool removed — replaced by Anthropic's built-in `web_fetch` with dynamic filtering
- Custom `findExistingTalks` and `extractStats` tools removed — the search→fetch→filter pipeline handles these use cases natively via agent reasoning
- Multi-provider web search factory simplified to Anthropic-only provider-defined tool
- Story 1.3 (Supplementary Research Tools) scope eliminated — agent handles existing talk discovery and stat extraction natively through built-in tool orchestration

**Provider-Defined Tools:**
| Tool | Capability | Replaces |
|------|-----------|----------|
| `web_search` | Server-side web search with structured results | Custom `webSearch` factory |
| `web_fetch` | URL content retrieval with dynamic code-based filtering | Custom `fetchPage` tool |

**Model Capability Leveraged:**
- **Multi-step tool orchestration** — Claude chains search→fetch→extract cycles autonomously, eliminating the need for dedicated `findExistingTalks` and `extractStats` tools

### Agent Architecture (AD-2 Resolution)

**5 Agents + 1 Workflow Step:**

All agents composed into workflow via `createStep(agent, { structuredOutput: { schema } })`.

| Role | Type | Phase | Tools | Model Tier |
|------|------|-------|-------|------------|
| Researcher | Agent | 1 | webSearch (provider-defined), webFetch (provider-defined) | Sonnet |
| Architect | Agent | 2 | estimateTiming | Sonnet |
| Writer | Agent | 1 | wordCountToTime, checkJargon | Opus |
| Designer | Agent | 5 | generateMermaid, suggestLayout, generateColourPalette | Sonnet |
| Coach | Agent | 7 | queryPastTalks (RAG) | Sonnet |
| Style Learner | Workflow step | 6 | None — direct LLM call with Zod output | Haiku |

### Human Gate Placement (AD-3 Resolution)

| Gate | After | Phase | Behaviour |
|------|-------|-------|-----------|
| Gate 1 | Researcher output | Phase 1 | **Mandatory** — user reviews research brief, provides feedback |
| Gate 2 | Architect output | Phase 2 | **Mandatory** — user picks/mixes from 3 structure options |
| Gate 3 | Writer output | Phase 1 | **Mandatory** — user reviews script; diff captured for style learning (Phase 6) |
| Gate 4 | Designer output | Phase 5 | **Optional** — auto-approve by default, user can opt-in to review via input config |

Each gate uses Mastra's `suspend()` with a payload containing the agent's output for review. Resume passes `resumeData` with approval status and feedback.

### Workflow Composition Pattern

| Pattern | Mastra API | TalkForge Usage |
|---------|-----------|-----------------|
| Sequential | `.then()` | Agent → gate → agent → gate chain |
| Transform | `.map()` | Reshape agent output between steps |
| Human gate | `suspend()` / `resume()` | Simple review gates (research, script) |
| **Composite step** | `createStep()` + manual `suspend()`/`resume()` | **Preferred for loopback + conditional + gate logic** (architect structure step) |
| Parallel | `.parallel()` | Asset creation: slides + Mermaid + images (Phase 5) |
| Structured output | `createStep(agent, { structuredOutput })` | All agent steps |

> **Architecture Note (Epic 2 Learning):** `.dountil()` and `.branch()` have unclear semantics when combined with `suspend()`/`resume()`. The **composite step pattern** — a single `createStep()` that internally calls the agent, suspends for review, and handles loopback on rejection — is simpler and proven. Use composite steps for any flow that combines human gates with conditional logic or loopback. See `architectStructureStep` in `slidewreck.ts` for the reference implementation.

### Error Handling Strategy

| Concern | Strategy |
|---------|----------|
| LLM call failure | 3 retries with exponential backoff (provider-level) |
| Tool failure | 3 retries. On persistent failure, return partial result with warning. |
| Optional feature failure | Catch, log warning, substitute placeholder, continue pipeline (NFR-7) |
| Human gate timeout | No timeout — workflow stays suspended until user resumes |
| Workflow-level failure | Fail run, preserve state in Postgres. User inspects in Studio and can retry. |
| Reference indexing failure | Warn user, proceed without reference context (NFR-8) |

### Authentication & Security

- **Single-user local tool** — no authentication layer needed
- **API keys** managed via `.env` file (`ANTHROPIC_API_KEY`, `DATABASE_URL`)
- **Data locality** — all data stored in local Postgres; only LLM API calls leave the machine (NFR-17, NFR-18)
- **No third-party data sharing** beyond configured LLM provider

### Infrastructure & Deployment

- **Runtime:** `mastra dev` on `localhost:4111` (Studio UI + REST API)
- **Database:** Docker Compose with PostgreSQL + pgvector
- **No cloud deployment** — local-only learning project
- **Environment:** Single `.env` file with documented defaults (NFR-24)

### Frontend Architecture (Epic 9+ Spike Finding, 2026-03-13)

**Decision:** Next.js 16 frontend in a pnpm workspace alongside the existing Mastra backend.

**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui components.

**Project Structure — pnpm Workspace:**

```
bmad-mastra-presentation/
├── package.json              ← root workspace config
├── pnpm-workspace.yaml       ← packages: [".", "web"]
├── src/mastra/               ← existing backend (unchanged)
└── web/                      ← Next.js 16 app
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    └── app/                  ← App Router pages
```

- Single `pnpm dev` at root runs both Mastra (`:4111`) and Next.js (`:3000`) via `concurrently` or turbo
- Zod schemas from `src/mastra/schemas/` shared via workspace reference or TypeScript path alias (whichever is simpler at implementation time)
- No authentication — local-only, single-user

**Mastra REST API Integration:**

The frontend communicates with the Mastra backend via REST on `localhost:4111`:

| Operation | Endpoint | Method | Request | Response | Notes |
|-----------|----------|--------|---------|----------|-------|
| Create run | `/api/workflows/{workflowId}/create-run` | POST | `{}` | `{ runId: string }` | Step 1 of trigger flow — allocates a run ID before execution starts |
| Start async | `/api/workflows/{workflowId}/start-async?runId={runId}` | POST | `{ inputData: Record<string, unknown> }` | `{ status, result, error }` | Step 2 of trigger flow — kicks off execution. Does NOT return `runId` |
| Get run status | `/api/workflows/{workflowId}/runs/{runId}` | GET | — | `WorkflowRun` (see below) | Poll this endpoint for status updates |
| Resume suspended step | `/api/workflows/{workflowId}/resume-async` | POST | `{ runId, step, resumeData }` | `{}` | `runId` is in the body, not a path param |
| Query agents | `/api/agents/{agentId}` | POST | `{ messages }` | Agent response | Direct agent calls if needed |

**`WorkflowRun` response shape:**
```typescript
{
  runId: string;
  workflowName?: string;
  status: 'pending' | 'running' | 'waiting' | 'suspended' | 'success' | 'failed' | 'canceled' | 'paused' | 'bailed' | 'tripwire';
  createdAt: string;
  updatedAt: string;
  resourceId?: string;
  result?: unknown;
  error?: unknown;
  steps?: Record<string, unknown>;
}
```

**Canonical trigger pattern:** Two-step `create-run` → `start-async`. Never call `start-async` alone expecting a `runId` in the response — it returns execution status, not the run identifier. See `web/lib/mastra-client.ts` for the reference implementation.

**Verified against:** `@mastra/server@1.8.0` (Epic 9, 2026-03-16). OpenAPI spec from `localhost:4111` is the authoritative source — re-verify on Mastra upgrades.

**Spike note:** Exact endpoint shapes for run status polling must be verified against the installed Mastra version during the Epic 9 pre-sprint spike.

**DeckSpec Browser Rendering (Epic 11):**

The frontend renders DeckSpec JSON as an interactive slide viewer:

- **9 layout components** — one React component per `SlideLayout` enum value (`title`, `content`, `split`, `image`, `quote`, `code`, `comparison`, `diagram`, `closing`)
- **Colour theming** — `ColourPalette` (5 hex values) injected as CSS custom properties
- **Mermaid diagrams** — 8 diagram types rendered client-side via `mermaid.js` (~100KB); graceful fallback on render failure
- **Navigation** — keyboard (arrow keys), click, optional fullscreen
- **Speaker notes** — parallel panel or toggle view (referenced via `speakerNoteRef`)
- **No server-side rendering of slides** — DeckSpec is pre-computed, browser renders from JSON

**Spike note:** Mermaid.js client-side integration and slide navigation UX to be verified in Epic 11 pre-sprint spike.

### Decision Impact Analysis

**Implementation Sequence:**
1. Docker Compose + Postgres setup
2. Project scaffolding (pnpm, tsconfig, Mastra entry point)
3. Phase 1 agents (Researcher + Writer) with Zod output schemas
4. Phase 1 workflow (sequential + 2 gates with suspend/resume)
5. Studio verification (agents testable, workflow visualised, traces visible)

**Cross-Component Dependencies:**
- All agents depend on Postgres (workflow state persistence)
- Writer depends on memory system (Phase 6) for style augmentation
- Coach depends on RAG (Phase 3/7) for past talk queries
- Evals depend on all agents completing (Phase 4)
- Style Learner depends on Gate 3 diff capture (Phase 6)

## Implementation Patterns & Consistency Rules

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Agent IDs | kebab-case | `researcher`, `talk-architect`, `script-writer` |
| Agent files | kebab-case `.ts` | `src/mastra/agents/researcher.ts` |
| Agent exports | camelCase | `export const researcher = new Agent({...})` |
| Tool IDs | kebab-case | `web-search`, `word-count-to-time` |
| Tool files | kebab-case `.ts` | `src/mastra/tools/web-search.ts` |
| Tool exports | camelCase | `export const webSearch = createTool({...})` |
| Workflow IDs | kebab-case | `talkforge-pipeline` |
| Zod schemas | PascalCase + `Schema` suffix | `ResearcherOutputSchema` |
| Types | PascalCase, inferred from Zod | `type ResearcherOutput = z.infer<typeof ResearcherOutputSchema>` |
| Variables/functions | camelCase | `const researchBrief = ...` |
| Constants | UPPER_SNAKE_CASE | `const MAX_RETRIES = 3` |
| Env vars | UPPER_SNAKE_CASE | `ANTHROPIC_API_KEY`, `DATABASE_URL` |

### Project Structure

```
src/
├── mastra/
│   ├── index.ts
│   ├── agents/
│   │   ├── researcher.ts
│   │   ├── writer.ts
│   │   └── __tests__/
│   │       ├── researcher.test.ts
│   │       └── writer.test.ts
│   ├── workflows/
│   │   ├── talkforge.ts
│   │   ├── gates/
│   │   │   └── review-gate.ts
│   │   └── __tests__/
│   │       └── talkforge.test.ts
│   ├── tools/
│   │   ├── web-search.ts
│   │   ├── word-count-to-time.ts
│   │   └── __tests__/
│   ├── schemas/
│   │   └── gate-payloads.ts
│   └── config/
│       └── models.ts
├── docker-compose.yml
├── .env.example
└── .env
```

- Tests co-located in `__tests__/` directories
- Agent system prompts inline (separate file if >50 lines)
- Zod output schemas co-located with agent that produces them
- Shared schemas in `src/mastra/schemas/`
- Tools grouped by function, not by agent

### Agent Output Schema Conventions

- Schema exported from same file as agent
- Named `{AgentName}OutputSchema`
- Flat where possible, nested only for logical grouping
- All arrays typed with item schema
- Optional fields explicit with `.optional()` and `.describe()`
- `.describe()` on all non-obvious fields
- `z.enum()` over `z.string()` for known value sets

### Human Gate Payload Structure

All gates use shared schemas from `src/mastra/schemas/gate-payloads.ts`:

**Suspend payload:**
- `agentId` — which agent produced the output
- `gateId` — gate identifier (e.g., `review-research`)
- `output` — agent's full structured output
- `summary` — human-readable summary for quick review

**Resume data:**
- `approved` — boolean
- `feedback` — optional freetext guidance for next step
- `edits` — optional modified output (diff captured at Gate 3 for style learning)

Gate 4 (slides) auto-resumes with `{ approved: true }` when user opts out of review.

### Tool Implementation Standard

Every tool must:
- Define explicit `inputSchema` and `outputSchema`
- Have single responsibility
- Write `description` as LLM-facing explanation
- Throw on unrecoverable errors; return partial result with warning for recoverable
- Be testable in isolation with mocked external APIs

### Phase Recipes

**Adding an Agent:** Create file → define output schema → define agent → export both → register in index.ts → add test → verify in Studio

**Adding a Tool:** Create file → follow standard template → export → bind to agent(s) → add test → verify in Studio

**Adding a Workflow Step:** Add to workflow file → use shared gate schemas if gate → use `.map()` for schema transforms → test full path

**Adding an Eval:** Create scorer file → register in Mastra config → verify in Studio Scorers tab

### Defensive Validation Checklist

All Zod schemas and tool implementations MUST apply these validation patterns. Failure to follow this checklist was the primary source of MEDIUM code review findings in Epic 1.

1. **String inputs:** Always use `.min(1)` to reject empty strings. Never accept bare `z.string()` for user-facing or agent-facing inputs.
2. **Numeric inputs:** Always use `.positive()` or `.min(0)` as appropriate. Durations, counts, and indices must not accept negative values.
3. **Fetch operations:** All HTTP requests (tool-level `fetch`, not provider-defined tools) must specify a timeout (default 30s) and a response size limit. Use `AbortController` for timeout enforcement. Note: this does not apply to Anthropic provider-defined tools (`web_search`, `web_fetch`). Applies when custom tools perform direct HTTP calls (e.g., Phase 5 `render-mermaid`, or any future tool hitting external APIs).
4. **Optional fields:** Every `.optional()` field must include `.describe()` explaining when/why it would be absent. This aids both LLM structured output and developer comprehension.
5. **Error path strategy:** Every tool and schema must define its error behaviour upfront — does it throw (unrecoverable), return partial result with warning (recoverable), or substitute a default? Document this in the tool's `description` field.

### Mastra API Verification Checklist

Mastra documentation lags behind installed versions. Every story introducing a new Mastra API MUST follow this 4-step verification process before implementing.

1. **Import paths:** Verify the exact import path from installed `.d.ts` files (e.g., `@mastra/core/agent` vs `@mastra/core`). Do not trust documentation examples — check `node_modules/@mastra/core/dist/` type exports.
2. **Constructor params:** Read the constructor or factory function signature from type definitions. Pay attention to required vs optional params, param naming (e.g., `id` vs `name`), and param types.
3. **Return types:** Verify return types of key methods (e.g., `mastra.getWorkflow()` returns a single workflow, not an array). Check for `undefined` return possibilities.
4. **Minimal isolation test:** Write a focused test that exercises the specific Mastra API surface (import path, constructor, key methods) in isolation. This is distinct from TDD business-logic tests — the goal here is to verify API compatibility with the installed Mastra version before building on it.
5. **Context payload size estimation:** For agent steps in workflows, estimate the accumulated context passed to the agent (prior step outputs, workflow state, system prompt). If payload approaches model context limits, design the flow to trim unnecessary state before the agent step. Test with realistic data volumes, not minimal fixtures.
6. **Structured output schema compatibility:** Verify that Zod schemas intended for LLM structured output are compatible with the Anthropic API. The schema passed to the LLM may need simplification compared to the in-app validation schema (e.g., removing complex refinements, nested discriminated unions, or transforms that the API doesn't support). Test the actual `generate()` call with the structured output schema, not just Zod `.parse()`.
7. **Fetch OpenAPI spec from running dev server:** Start the dev server (`mastra dev`), fetch the OpenAPI spec from `http://localhost:4111/openapi.json` (or Swagger UI at `/swagger-ui`), and document the actual request/response shapes for every endpoint the epic will use. Do not reverse-engineer bundled source code — the OpenAPI spec is the authoritative source. Update the Mastra REST API table in this document with verified endpoints and response schemas.

### Suspend/Resume Path Checklist

Every composite step or gate using `suspend()`/`resume()` MUST handle all four resume paths. Missing paths were the primary source of HIGH code review findings in Epic 2.

| Path | `resumeData.approved` | `resumeData.feedback` | Required Behaviour |
|------|----------------------|----------------------|-------------------|
| Approval + feedback | `true` | present | Apply feedback, return approved output |
| Approval + no feedback | `true` | absent/empty | Return approved output as-is |
| Rejection + feedback | `false` | present | Re-execute with feedback appended to prompt |
| Rejection + no feedback | `false` | absent/empty | Re-execute with generic "try again" prompt |

**Testing requirement:** Each path MUST have a dedicated test case. Use the mock `createStep()` pattern to simulate `resumeData` for each path.

**Common pitfalls:**
- Forgetting to check `suspendData.output` on approval resume (data was stored in the suspend payload)
- Not distinguishing between `undefined` feedback and empty string feedback
- Assuming rejection always has feedback — handle the no-feedback rejection path

### No Unsafe Type Coercion Rule

**BANNED:** `as unknown as T` pattern. This bypasses TypeScript's type system entirely and masks real type errors.

```typescript
// ANTI-PATTERN — never do this
const result = someValue as unknown as ExpectedType;

// CORRECT — explicit validation
const parsed = ExpectedTypeSchema.parse(someValue); // throws ZodError if invalid

// CORRECT — explicit error
if (!isExpectedType(someValue)) {
  throw new Error(`Expected ExpectedType, got ${typeof someValue}`);
}
```

**Exception:** The only acceptable use of `as` is for narrowing from a known-compatible type (e.g., `as WorkflowInput` when `getInitData()` returns a generic type that is known to be `WorkflowInput` by workflow context). Even then, prefer `getInitData<WorkflowInput>()` if the API supports generics.

### Known Limitations

| Limitation | Impact | Workaround | Status |
|-----------|--------|------------|--------|
| `Agent.instructions` not publicly accessible | Cannot read agent instructions in tests | Read source file with `readFileSync()` and assert content | Permanent |
| `MDocument` has no `fromPDF()` method | PDF reference materials cannot be indexed directly | Pre-process with `unpdf` library, feed extracted text to `MDocument.fromText()` | Resolved (Epic 3 retro) |
| `pgVector.upsert()` creates duplicates without IDs | Re-indexing accumulates duplicate vectors | Use `deleteFilter` parameter for atomic source-level replacement (see below) | Resolved (Epic 3 retro) |
| `MastraScorer.getSteps()` crashes for prompt-based steps | Cannot introspect scorer steps at runtime | Use `readFileSync()` source inspection in tests; verify step names via source text | Open (still broken in @mastra/core@1.13.1) |
| `ListScoresResponse.scores` array elements typed as `any` in `@mastra/core@1.8.0` | Eval score access requires explicit type annotation | Use `(s: { score: number }) => s.score` cast at access site | Fixed in @mastra/core@1.13.1 — workaround removed |
| Workflow steps cannot statically import `mastra` instance (circular dep) | `index.ts` registers workflows that reference `mastra` | Use `await import('../index')` inside step `execute` blocks | Permanent (by design) |

### PgVector Upsert Pattern (Epic 3 Retro Finding)

PgVector supports true upsert via `ON CONFLICT (vector_id)` when IDs are provided. Additionally, the `deleteFilter` parameter enables atomic per-source replacement:

```typescript
// Atomic replace all chunks from a specific source
await pgVector.upsert({
  indexName: 'user_references',
  vectors: embeddings,
  metadata: chunks.map(c => ({ ...c, source_id: material.path })),
  deleteFilter: { source_id: material.path },
});
```

This eliminates the need for deleting/recreating the entire index. Available methods: `updateVector()`, `deleteVector()`, `deleteVectors()`, `truncateIndex()`.

### Embedding Provider Alternatives (Epic 3 Retro Finding)

Anthropic has no embedding API. Current implementation uses OpenAI `text-embedding-3-small` (1536d). Evaluated alternatives:

| Provider | Package | Dimensions | Cost | Notes |
|----------|---------|-----------|------|-------|
| OpenAI (current) | `@ai-sdk/openai` | 1536 | $0.02/1M tokens | Works but adds non-Anthropic dependency |
| Voyage AI | `voyage-ai-provider` | 1024 (configurable) | $0.06/1M tokens (200M free) | Anthropic's recommended partner. Community AI SDK provider. |
| @mastra/fastembed | `@mastra/fastembed` | 384 | Free (local ONNX) | Official Mastra package. Lower quality. ~130MB model download. |
| Ollama | `ollama-ai-provider` | 768-1024 | Free (local) | Requires Ollama server. `nomic-embed-text` (768d) or `mxbai-embed-large` (1024d). |

**Note:** Changing embedding dimensions requires recreating pgvector indexes (dimension is fixed at index creation time). The per-run delete+recreate pattern makes this a clean swap.

### Enforcement

- All AI agents implementing stories MUST check these patterns before writing code
- Naming violations caught by code review and linting
- Schema conventions enforced by TypeScript compiler (Zod inference)
- New components follow phase recipes to ensure consistency
- **Defensive Validation Checklist** must be satisfied for all new schemas and tools
- **Mastra API Verification Checklist** must be followed when introducing any new Mastra API
- **Suspend/Resume Path Checklist** must be satisfied for all steps using `suspend()`/`resume()`
- **No Unsafe Type Coercion Rule** must be followed — no `as unknown as` patterns

## Project Structure & Boundaries

### Complete Project Directory Structure

```
talkforge/
├── package.json
├── pnpm-workspace.yaml              # Epic 9+ — workspace: [".", "web"]
├── tsconfig.json
├── vitest.config.ts
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
│
├── web/                              # Epic 9+ — Next.js 16 frontend
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                  # Workflow input form
│       └── run/[runId]/
│           └── page.tsx              # Run status + review gates
│
└── src/
    └── mastra/
        ├── index.ts                          # Mastra entry point — registers all agents, workflows
        │
        ├── agents/
        │   ├── researcher.ts                 # Phase 1 — Agent + ResearcherOutputSchema
        │   ├── writer.ts                     # Phase 1 — Agent + WriterOutputSchema
        │   ├── talk-architect.ts             # Phase 2 — Agent + ArchitectOutputSchema
        │   ├── designer.ts                   # Phase 5 — Agent + DesignerOutputSchema
        │   ├── coach.ts                      # Phase 7 — Agent + CoachOutputSchema
        │   └── __tests__/
        │       ├── researcher.test.ts
        │       ├── writer.test.ts
        │       ├── talk-architect.test.ts
        │       ├── designer.test.ts
        │       └── coach.test.ts
        │
        ├── workflows/
        │   ├── talkforge.ts                  # Main pipeline workflow (grows per phase)
        │   ├── gates/
        │   │   └── review-gate.ts            # Shared suspend/resume gate step logic
        │   ├── steps/
        │   │   └── style-learner.ts          # Phase 6 — Workflow step (not an agent)
        │   └── __tests__/
        │       └── talkforge.test.ts
        │
        ├── tools/
        │   ├── web-search.ts                 # Phase 1 — Anthropic provider-defined web search
        │   ├── word-count-to-time.ts         # Phase 1 — WPM calculator
        │   ├── check-jargon.ts               # Phase 1 — Audience-level jargon checker
        │   ├── estimate-timing.ts            # Phase 2 — Section timing estimator
        │   ├── generate-mermaid.ts           # Phase 5 — NL to Mermaid syntax
        │   ├── suggest-layout.ts             # Phase 5 — Slide layout mapper
        │   ├── generate-colour-palette.ts    # Phase 5 — Colour palette from topic
        │   ├── build-slides.ts              # Phase 5 — DeckSpec to slides
        │   ├── render-mermaid.ts            # Phase 5 — Mermaid to SVG
        │   ├── query-past-talks.ts          # Phase 7 — RAG vector search
        │   └── __tests__/
        │       ├── web-search.test.ts
        │       ├── word-count-to-time.test.ts
        │       └── ...
        │
        ├── schemas/
        │   ├── gate-payloads.ts              # Shared GateSuspendSchema, GateResumeSchema
        │   ├── workflow-input.ts             # TalkForge pipeline input schema
        │   └── workflow-output.ts            # TalkForge pipeline final output schema
        │
        ├── config/
        │   └── models.ts                     # Model tier mapping per agent
        │
        ├── scorers/                          # Phase 4
        │   ├── hook-strength.ts              # LLM-as-judge
        │   ├── pacing-distribution.ts        # Heuristic
        │   ├── jargon-density.ts             # LLM-as-judge
        │   ├── narrative-coherence.ts        # LLM-as-judge
        │   └── __tests__/
        │
        └── rag/                              # Phase 3
            ├── best-practices.ts             # Ruleset KB setup
            ├── session-history.ts            # Past talks KB setup
            ├── user-references.ts            # Per-session reference KB setup
            └── __tests__/
```

### Phase-to-File Mapping

| Phase | New Files Added |
|-------|----------------|
| **1: Core Pipeline** | `agents/{researcher,writer}.ts`, `tools/{web-search,word-count-to-time,check-jargon}.ts`, `workflows/talkforge.ts`, `workflows/gates/review-gate.ts`, `schemas/*`, `config/models.ts`, `docker-compose.yml`, `.env.example` |
| **2: Workflow Complexity** | `agents/talk-architect.ts`, `tools/estimate-timing.ts` + branching/loopback logic in `talkforge.ts` |
| **3: RAG** | `rag/{best-practices,user-references}.ts` + `@mastra/rag` dependency |
| **4: Evals** | `scorers/{hook-strength,pacing-distribution,jargon-density,narrative-coherence}.ts` |
| **5: Design** | `agents/designer.ts`, `tools/{generate-mermaid,suggest-layout,generate-colour-palette,build-slides,render-mermaid}.ts` + parallel branch in `talkforge.ts` |
| **6: Memory** | `workflows/steps/style-learner.ts` + memory config in `index.ts` + prompt augmentation in `agents/writer.ts` |
| **7: Coach** | `agents/coach.ts`, `tools/query-past-talks.ts`, `rag/session-history.ts` |
| **8: CLI Deck Rendering** | PDF rendering pipeline (TBD in Epic 8 sprint) |
| **9: Frontend Foundation** | `pnpm-workspace.yaml`, `web/{package.json,next.config.ts,tsconfig.json}`, `web/app/{layout,page}.tsx`, `web/app/run/[runId]/page.tsx`, Mastra API client |
| **10: Status & Gates** | Live run status polling, gate review UI in `web/app/run/[runId]/` |
| **11: Slide Viewer** | `web/app/` slide renderer components (9 layout types), Mermaid.js integration, colour theming |

### Architectural Boundaries

**Agent Boundary:**
Each agent is self-contained in its file — system prompt, tool bindings, model selection, and output schema. Agents do not import other agents. They communicate only through the workflow (output of one feeds input of the next via `.map()` transforms).

**Workflow Boundary:**
`talkforge.ts` is the orchestration layer. It composes agents into steps, manages data flow between them, and defines gate placement. It imports agents and gate logic but contains no business logic itself.

**Tool Boundary:**
Tools are pure functions of input → output. They import no agents, no workflow state, no other tools. They are bound to agents in the agent definition file, not in the tool file.

**Storage Boundary:**
All Postgres interaction happens through Mastra's storage abstraction (`PostgresStore`). No direct SQL queries in agent or tool code. Storage is configured once in `src/mastra/index.ts`.

**Schema Boundary:**
- Agent-specific schemas: exported from the agent file
- Shared schemas (gate payloads, workflow I/O): in `src/mastra/schemas/`
- No circular schema imports — data flows one direction through the pipeline

### Data Flow

```
User Input (topic, audience, format)
    │
    ▼
┌─────────────┐     ┌──────────────────┐
│ Researcher  │────▶│ Gate 1: Research  │──── user feedback ───┐
│   Agent     │     │   (suspend)      │                      │
└─────────────┘     └──────────────────┘                      ▼
                                                    ┌─────────────────┐
                                                    │  Architect      │ (Phase 2)
                                                    │    Agent        │
                                                    └────────┬────────┘
                                                             ▼
                                                    ┌──────────────────┐
                                                    │ Gate 2: Structure│ (Phase 2)
                                                    │   (suspend)      │
                                                    └────────┬────────┘
                                                             ▼
┌─────────────┐     ┌──────────────────┐
│   Writer    │────▶│ Gate 3: Script   │──── diff → Style Learner (Phase 6)
│   Agent     │     │   (suspend)      │
└─────────────┘     └──────────────────┘
                            │
                            ▼
                    ┌─────────────────┐
                    │    Designer     │ (Phase 5)
                    │     Agent       │
                    └────────┬────────┘
                             ▼
                    ┌──────────────────┐
              ┌─────│ Parallel Assets  │─────┐ (Phase 5)
              │     └──────────────────┘     │
              ▼              ▼               ▼
        [Slides]      [Mermaid SVG]    [Images]
              │              │               │
              └──────────┬───┘───────────────┘
                         ▼
                    ┌──────────────────┐
                    │ Gate 4: Slides   │ (Phase 5, optional)
                    │   (suspend)      │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │     Coach       │ (Phase 7)
                    │     Agent       │
                    └────────┬────────┘
                             ▼
                    ┌──────────────────┐
                    │   Eval Suite    │ (Phase 4)
                    └────────┬────────┘
                             ▼
                    Final Output Package
```

### Integration Points

**Internal Communication:**
- Agent → Workflow: via `createStep(agent, { structuredOutput })` — Mastra handles invocation
- Step → Step: via `.then()` chain with `.map()` for schema transforms
- Gate → User: via `suspend()` payload → Studio UI → `resume()` with feedback
- Workflow → Storage: automatic via `PostgresStore` (snapshots, evals)
- Workflow/Agent → Observability: automatic via `wrapMastra()` proxy — spans emitted to configured exporters (DefaultExporter → Postgres, OtelExporter → Grafana Tempo)

**External Integrations:**
- Anthropic API: LLM calls for all agents and eval judges (via Mastra model router), plus provider-defined tools — web search, web fetch with dynamic filtering, and programmatic tool calling (AD-5)
- Mermaid CLI: `@mermaid-js/mermaid-cli` for SVG rendering (Phase 5)
- Grafana LGTM: OTEL trace collection and visualization (AD-6)

**Development Workflow:**
- `pnpm dev` → `mastra dev` → Studio UI on `localhost:4111`
- `pnpm test` → `vitest` → runs all `__tests__/` co-located tests
- `pnpm build` → `mastra build` → production output in `.mastra/output/`
- Docker Compose manages Postgres + Grafana LGTM lifecycle independently

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are compatible and conflict-free: PostgreSQL + pgvector via `@mastra/pg`, Mastra 1.3.1 + Node.js >= 22.13.0 + TypeScript ES2022, Anthropic Claude models (Opus 4.6, Sonnet 4.5, Haiku 4.5) via Mastra model router, Zod v4 for structured output, Vitest for testing, pnpm as package manager. `createStep(agent, { structuredOutput })` + `suspend()`/`resume()` are confirmed Mastra APIs. No contradictory decisions found.

**Pattern Consistency:**
Naming conventions (kebab-case IDs, camelCase exports, PascalCase schemas) apply uniformly across agents, tools, workflows. Gate payload structure standardised via shared schemas. Tool standard template consistent with Mastra's `createTool()` API. Phase recipes provide uniform process for all component types.

**Structure Alignment:**
Project structure enforces all five architectural boundaries (Agent, Workflow, Tool, Storage, Schema). No circular dependency paths — data flows one direction through the pipeline. Phase-to-file mapping ensures incremental growth without restructuring. `index.ts` as single registration point supports extensibility NFRs.

### Requirements Coverage Validation ✅

**Functional Requirements:** 27/27 covered.

All FRs have direct architectural support:
- Input (FR-1–6): Workflow input schema + Zod validation
- Pipeline (FR-7–12): Workflow patterns (`.then()`, `.parallel()`, `.branch()`, `.dountil()`, `suspend()`/`resume()`)
- Output (FR-13–17): Agent output schemas + tools per phase
- Memory (FR-18–22): Style Learner step + Mastra memory + prompt augmentation
- Evals (FR-24–27): Scorers directory + eval registry + Postgres eval tables

**Minor gap:** FR-17 (ZIP download) — no explicit packaging tool in structure. Straightforward addition in Phase 7.

**Non-Functional Requirements:** 24/24 addressed.

All NFRs have architectural support. Minor gaps in later phases:
- NFR-11: Eval query interface — Studio provides basic querying; custom tool if needed (Phase 4)
- NFR-19: View/delete personal data — interface deferred to Phase 6 story planning
- NFR-20: Data export as JSON — tool deferred to Phase 7
- NFR-23: Independent eval command — `pnpm eval` script added in Phase 4

### Implementation Readiness Validation ✅

**Decision Completeness:** All 7 critical decisions documented with technology versions. Implementation patterns cover 6 categories. Model tier mapping explicit per agent. Error handling covers all failure modes. Deferred decisions properly scoped to their phases.

**Structure Completeness:** Full directory tree with phase annotations. Phase-to-file mapping enables incremental delivery. All integration points specified. Component boundaries defined with clear import rules.

**Pattern Completeness:** Naming conventions, schema conventions, gate payload structure, tool template, and phase recipes all documented with examples.

### Gap Analysis Results

**Critical Gaps:** None. All decisions needed to begin Phase 1 are resolved.

**Important Gaps (deferred, non-blocking):**

| # | Gap | Phase | Resolution |
|---|-----|-------|------------|
| 1 | FR-17: No packaging tool for ZIP output | 7 | Add `package-outputs` tool |
| 2 | NFR-19: No interface for view/delete personal data | 6 | Defer to story planning — Studio or CLI commands |
| 3 | NFR-20: No tool for JSON data export | 7 | Add `export-data` tool |
| 4 | NFR-23: No explicit `pnpm eval` script | 4 | Add as npm script in Phase 4 setup |

**Nice-to-Have:** Docker Compose specifics, `.env.example` template, eval query interface — all standard patterns defined during implementation.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analysed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified (gate payloads, data flow)
- [x] Process patterns documented (error handling, phase recipes)

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements-to-structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High — all Phase 1 decisions are resolved, patterns are comprehensive, and gaps are isolated to later phases.

**Key Strengths:**
- Clean boundary definitions prevent AI agent implementation conflicts
- Phase-to-file mapping enables incremental delivery without restructuring
- Shared gate payload schemas eliminate human gate inconsistency
- Registry-based extensibility built into the architecture from Phase 1
- Tiered model selection balances quality and cost

**Areas for Future Enhancement:**
- ZIP packaging tool and data export tool (Phase 7)
- Data view/delete interface (Phase 6)
- Independent eval script (Phase 4)
- Captured as known gaps for story planning

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
1. Docker Compose + Postgres setup
2. `pnpm init` + dependency installation (`@mastra/core`, `zod`, `mastra`, `vitest`)
3. `tsconfig.json` with ES2022 target + bundler module resolution
4. `src/mastra/index.ts` Mastra entry point with PostgresStore
5. First agent (Researcher) + first tool (`web-search`) + Studio verification
