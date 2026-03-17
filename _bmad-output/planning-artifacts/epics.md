---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - '_bmad-output/planning-artifacts/PRD.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/PRD-validation-report.md'
---

# bmad-mastra-presentation - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for bmad-mastra-presentation (TalkForge), decomposing the requirements from the PRD and Architecture into implementable stories.

### Execution Order

Epics 1–5 execute sequentially. After Epic 5, the rendering and frontend epics (8, 9) take priority. Epic 6 (observability + Grafana LGTM) runs in parallel with the frontend chain. Epic 7 (external OTEL export) has been absorbed into Epic 6 — see AD-6 in architecture.md.

**1 → 2 → 3 → 4 → 5 → 8 + 9 + 6-spike (parallel) → 10 + 6 (parallel) → 11 + 12 + 7 (parallel) → 13 → 14**

- Epics 8 (CLI rendering) and 9 (FE foundation) are independent and can run in parallel
- Epic 6 spike runs during the 8+9 sprint; Epic 6 implementation runs parallel with Epic 10
- Epic 7 (Grafana dashboards) runs parallel with Epics 11+12 once traces are flowing from Epic 6
- Epics 9 → 10 → 11/12 form the frontend chain (10 and 11 are independent of each other; 12 builds on both)
- Epics 13–14 (personalization, coaching) are backend Mastra work deferred until the frontend is usable

## Requirements Inventory

### Functional Requirements

- FR-1: Speaker can provide a topic as free-text input — **Phase 1**
- FR-2: Speaker can select an audience level (beginner, intermediate, advanced, or mixed) — **Phase 1**
- FR-3: Speaker can select a talk format: lightning (5–10 min), standard (25–35 min), or keynote (40–60 min) — **Phase 1**
- FR-4: Speaker can provide optional constraints as free text to guide content generation — **Phase 2**
- FR-5: Speaker can upload reference material (PDF, MD, URL list) to inform research with user-provided context — **Phase 3**
- FR-6: System can validate all required inputs before starting generation and return error messages that identify missing fields and expected formats — **Phase 1**
- FR-7: System can execute the end-to-end generation process from input to final output — **Phase 1**
- FR-8: System can pause at each review point and resume later without losing progress — **Phase 1**
- FR-9: System can pass structured speaker feedback from each review point as input to the next generation step — **Phase 1**
- FR-10: Speaker can reject all proposed talk structures and trigger regeneration with feedback — **Phase 2**
- FR-11: System can execute asset creation steps concurrently — **Phase 5**
- FR-12: System can skip inapplicable steps based on talk format — **Phase 2**
- FR-13: System can produce slide specifications and rendered diagrams; rendered as PDF via CLI and as interactive slides in the web frontend — **Phase 5, 8, 9**
- FR-14: System can produce a speaker notes document with full script, timing annotations, and markers — **Phase 1**
- FR-15: System can produce a preparation package with Q&A, timing cheat sheet, contingencies, and social copy — **Phase 14**
- FR-16: System can produce an evaluation scorecard with full results — **Phase 4**
- FR-17: Speaker can download all outputs as a single ZIP or individually — **Phase 14**
- FR-18: System can generate output without style augmentation on first use (cold start) — **Phase 13**
- FR-19: System can detect speaker edits at review points and extract style insights — **Phase 13**
- FR-20: System can persist style insights to long-term storage, organised by category — **Phase 13**
- FR-21: System can retrieve and apply matching style insights to the generation process on subsequent runs — **Phase 13**
- FR-22: System can store completed talk metadata for cross-session awareness — **Phase 13**
- FR-23: Speaker can receive content that avoids repetition from previous talks — **Phase 14**
- FR-24: System can run the full evaluation suite automatically after generation completes — **Phase 4**
- FR-25: System can store evaluation results for trend analysis — **Phase 4**
- FR-26: Speaker can view the evaluation scorecard after generation completes — **Phase 4**
- FR-27: System can run quality assessments on learning effectiveness when at least 3 sessions exist — **Phase 4**
- FR-28: System can render a DeckSpec JSON to PDF via a standalone CLI script — **Phase 8**
- FR-29: Speaker can view and navigate generated slides in a web browser — **Phase 9**
- FR-30: Speaker can trigger the workflow and interact with review gates through a web UI — **Phase 9**

### NonFunctional Requirements

- NFR-1: The system shall complete total generation time (excluding review point wait time) in under 5 minutes for a 30-minute talk. — **Phase 1+**
- NFR-2: Each individual generation step shall complete within 60 seconds. — **Phase 1+**
- NFR-3: Parallel generation steps shall execute concurrently, not sequentially. — **Phase 5**
- NFR-4: Slide and asset generation shall complete within 30 seconds for a 30-slide deck. — **Phase 5**
- NFR-5: Session state shall be preservable so a paused session survives process restarts. — **Phase 1**
- NFR-6: Failed generation steps shall retry up to 3 times with exponential backoff before reporting failure. — **Phase 1**
- NFR-7: If an optional capability fails, the system shall continue with a placeholder rather than abort. — **Phase 2+**
- NFR-8: Reference material indexing failures shall warn the user but not block execution. — **Phase 3**
- NFR-9: Each generation step shall log: step name, input token count, output token count, latency, and model used. — **Phase 1+, Epic 6**
- NFR-10: Each step shall log: step name, status (pending/running/paused/complete/failed), and duration. — **Phase 1+, Epic 6**
- NFR-11: Evaluation results shall be queryable by date range and talk ID. — **Phase 4**
- NFR-12: Data persistence operations shall log: key, operation (read/write/delete), and payload size. — **Phase 13, Epic 6 (partial)**
- NFR-13: Adding a new generation capability shall require only defining its config without modifying core. — **Phase 2+**
- NFR-14: Adding a new evaluation shall require only adding an entry to the evaluation registry. — **Phase 4**
- NFR-15: The tool registry shall support adding custom tools without modifying existing capabilities. — **Phase 2+**
- NFR-16: The slide layout system shall be template-driven so new layouts can be added via config. — **Phase 5**
- NFR-17: All user data shall be stored locally or in user-controlled infrastructure. — **Phase 1+**
- NFR-18: No talk content shall be sent to third-party services beyond the configured LLM provider. — **Phase 1+**
- NFR-19: Users shall be able to view and delete stored personal data. — **Phase 13**
- NFR-20: Users shall be able to export all their data in a structured, portable format. — **Phase 14**
- NFR-21: The project shall be runnable locally with a single install command followed by a single start command. — **Phase 1**
- NFR-22: All generation capabilities shall be testable in isolation with mock inputs. — **Phase 1**
- NFR-23: The evaluation suite shall be runnable independently with a single command. — **Phase 4**
- NFR-24: Environment configuration shall use a single configuration file with documented defaults. — **Phase 1**

### Additional Requirements

**From Architecture — Starter Template & Project Setup:**
- Manual Installation selected: `pnpm init` + `@mastra/core`, `zod`, `mastra`, `vitest` — impacts Epic 1, Story 1
- Docker Compose with `pgvector/pgvector:pg17` image for PostgreSQL + pgvector from Phase 1
- `.env.example` with `ANTHROPIC_API_KEY` and `DATABASE_URL`
- `tsconfig.json` with ES2022 target, bundler module resolution, strict mode
- Node.js >= 22.13.0 required

**From Architecture — Agent & Workflow Decisions:**
- 5 Agents (Researcher, Architect, Writer, Designer, Coach) + 1 Workflow Step (Style Learner)
- Tiered LLM model selection: Opus for Writer, Sonnet for Researcher/Architect/Designer/Coach, Haiku for Style Learner and eval judges
- 4 Human Gates: Gate 1 (research), Gate 2 (structure), Gate 3 (script), Gate 4 (slides — optional, auto-approve by default)
- Workflow patterns: `.then()`, `.parallel()`, `.branch()`, `.dountil()`, `suspend()`/`resume()`
- All agents composed into workflow via `createStep(agent, { structuredOutput: { schema } })`

**From Architecture — Implementation Patterns:**
- Naming: kebab-case IDs, camelCase exports, PascalCase + `Schema` suffix for Zod schemas
- Co-located tests in `__tests__/` directories
- Agent output schemas co-located with agent files
- Shared gate payload schemas in `src/mastra/schemas/gate-payloads.ts`
- Tool standard: explicit `inputSchema`/`outputSchema`, single responsibility, LLM-facing `description`
- Phase recipes for adding agents, tools, workflow steps, and evals

**From Architecture — Infrastructure:**
- `mastra dev` on `localhost:4111` (Studio UI + REST API) as primary development interface
- PostgresStore for all Mastra state (workflow snapshots, threads, evals, traces)
- 3x retry with exponential backoff for LLM calls; graceful degradation for optional features
- Single-user local tool — no authentication layer

**From Architecture — Known Gaps (non-blocking):**
- FR-17: No packaging tool for ZIP output (Phase 7)
- NFR-19: No interface for view/delete personal data (Epic 13)
- NFR-20: No tool for JSON data export (Epic 14)
- NFR-23: No explicit `pnpm eval` script (Phase 4)

### FR Coverage Map

- FR-1: Epic 1 — Topic input
- FR-2: Epic 1 — Audience level selection
- FR-3: Epic 1 — Talk format selection
- FR-4: Epic 2 — Optional constraints input
- FR-5: Epic 3 — Reference material upload
- FR-6: Epic 1 — Input validation
- FR-7: Epic 1 — End-to-end pipeline execution
- FR-8: Epic 1 — Suspend/resume at review points
- FR-9: Epic 1 — Structured feedback passthrough
- FR-10: Epic 2 — Rejection with loopback regeneration
- FR-11: Epic 5 — Parallel asset creation
- FR-12: Epic 2 — Conditional step skipping by format
- FR-13: Epic 5 — Slide specifications and diagrams
- FR-14: Epic 1 — Speaker notes with timing and markers
- FR-15: Epic 14 — Prep package (Q&A, timing, contingencies, social copy)
- FR-16: Epic 4 — Evaluation scorecard
- FR-17: Epic 14 — Downloadable ZIP output
- FR-18: Epic 13 — Cold start without style data
- FR-19: Epic 13 — Edit diff detection at gates
- FR-20: Epic 13 — Style insight persistence by category
- FR-21: Epic 13 — Style-augmented prompt retrieval
- FR-22: Epic 13 — Cross-session talk metadata
- FR-23: Epic 14 — Past talk repetition avoidance
- FR-24: Epic 4 — Automated eval suite
- FR-25: Epic 4 — Eval result storage for trends
- FR-26: Epic 4 — Scorecard display
- FR-27: Epic 4 — Meta-evals after 3+ sessions

## Epic List

### Epic 1: End-to-End Talk Generation (MVP)
Speaker can provide a topic, audience level, and format — and receive a researched, human-reviewed speaker notes document through a complete pipeline with suspend/resume gates.
**FRs covered:** FR-1, FR-2, FR-3, FR-6, FR-7, FR-8, FR-9, FR-14
**NFR focus:** NFR-1, 2, 5, 6, 9, 10, 17, 18, 21, 22, 24
**Mastra capabilities:** Agents, Tools, Workflows (suspend/resume)

### Epic 2: Advanced Pipeline Control
Speaker can provide optional constraints, choose from multiple talk structure options, reject and regenerate with feedback, and have format-specific step skipping (e.g., lightning talks skip certain sections).
**FRs covered:** FR-4, FR-10, FR-12
**NFR focus:** NFR-7, 13, 15
**Mastra capabilities:** Workflow branching, conditional logic, loopback patterns

### Epic 3: Reference-Informed Research
Speaker can upload their own reference materials (blog posts, docs, code samples) to enrich the research stage with personal context via RAG.
**FRs covered:** FR-5
**NFR focus:** NFR-8
**Mastra capabilities:** RAG (indexing, chunking, retrieval)

### Epic 4: Quality Evaluation & Insights
Speaker can see automated quality scores (hook strength, pacing, jargon density) after each run and track improvement trends over multiple sessions.
**FRs covered:** FR-16, FR-24, FR-25, FR-26, FR-27
**NFR focus:** NFR-11, 14, 23
**Mastra capabilities:** Evals (LLM-as-judge, heuristic, trend analysis)

### Epic 5: Visual Presentation Design
> **API Spike:** `_bmad-output/implementation-artifacts/spike-epic-5-visual-presentation-design.md` — verified `.parallel()` API, `@mermaid-js/mermaid-cli` programmatic rendering, DeckSpec schema design, parallel testing strategy. Key impact: Story 5.4 review gate must run after parallel block (suspend unsupported in parallel branches).

Speaker can receive slide specifications and rendered Mermaid diagrams alongside the script, with parallel asset generation.
**FRs covered:** FR-11, FR-13
**NFR focus:** NFR-3, 4, 16
**Mastra capabilities:** Parallel workflows, agent addition

### Epic 6: Observability & Grafana LGTM
> **Spike complete.** See `_bmad-output/implementation-artifacts/spike-epic-6-mastra-observability.md`

Activate Mastra's built-in observability (auto-traces for agents, models, tools, workflow steps), verify NFR-9/NFR-10 coverage, and export traces to Grafana LGTM via OTEL. Absorbs former Epic 7 (OTEL export).
**NFR focus:** NFR-9, NFR-10, NFR-12 (partial)
**Mastra capabilities:** Observability, tracing, Studio integration, OTEL export
**SC-1 partial:** Delivers the "observability" capability from the 7 required Mastra core capabilities.

### Epic 7: Grafana Observability Dashboards
> **Spike required before story refinement.** Depends on Epic 6 (traces flowing into Grafana LGTM).

Grafana dashboards (provisioned as YAML) for monitoring TalkForge pipeline health, agent performance, and cost tracking. Builds on the OTEL traces from Epic 6.
**Depends on:** Epic 6 (traces in Grafana Tempo)
**Capabilities:** Grafana dashboard-as-code (YAML provisioning), Tempo queries, metrics panels

### Epic 8: CLI Deck Rendering
Standalone npm script that reads a DeckSpec JSON and produces a PDF via Marp. No Mastra dependency.
**FRs covered:** FR-28
**Capabilities:** Marp templating, Puppeteer PDF rendering, colour palette theming

### Epic 9: Frontend Foundation & Workflow Trigger
Next.js app scaffolding, Mastra API client, input form, and workflow trigger.
**FRs covered:** FR-30
**Capabilities:** Next.js App Router, typed API client, Zod schema sharing

### Epic 10: Workflow Status & Review Gates
Live run status, gate content display, review controls, and run history.
**FRs covered:** FR-30
**Capabilities:** Polling/SSE, gate interaction UI

### Epic 11: Presentation Viewer
Interactive slide deck viewer in the browser with layout components and client-side Mermaid.
**FRs covered:** FR-29
**Capabilities:** React slide renderer, CSS theming, mermaid.js

### Epic 12: Streaming, Export & Sharing
Real-time progress streaming, PDF export from browser, shareable URLs, and presenter mode.
**FRs covered:** FR-28, FR-29
**Capabilities:** SSE streaming, share tokens, presenter/audience views

### Epic 13: Style Learning & Personalization
System learns the speaker's writing style through edit diffs at review gates and produces increasingly personalized output over time, with cross-session metadata.
**FRs covered:** FR-18, FR-19, FR-20, FR-21, FR-22
**NFR focus:** NFR-12, 19
**Mastra capabilities:** Memory (persist, retrieve, prompt augmentation)

### Epic 14: Complete Talk Package & Coaching
Speaker receives a full prep package (Q&A, timing cheat sheet, contingencies, social copy) with past-talk awareness for repetition avoidance, and can download all outputs.
**FRs covered:** FR-15, FR-17, FR-23
**NFR focus:** NFR-20
**Mastra capabilities:** RAG-powered agent tools, content awareness

### Cross-Cutting Convention: Testing

Every story's definition of done includes co-located unit tests in `__tests__/` directories with mock inputs (NFR-22). Agent stories must include tests verifying structured output schema compliance. Tool stories must include tests with mocked external APIs. Workflow stories must include tests verifying step composition and gate behaviour. This applies to all stories across all epics and is not repeated in individual acceptance criteria.

## Epic 1: End-to-End Talk Generation (MVP)

Speaker can provide a topic, audience level, and format — and receive a researched, human-reviewed speaker notes document through a complete pipeline with suspend/resume gates.

### Story 1.1: Project Scaffolding & Infrastructure Setup

As a developer,
I want a fully configured TalkForge project with all Phase 1 dependencies and infrastructure,
So that I can start building agents and workflows with a working development environment.

**Acceptance Criteria:**

**Given** a clean directory
**When** I run the project initialization commands
**Then** `package.json` exists with `@mastra/core`, `zod`, `mastra`, `vitest`, `typescript`, `@types/node`, and `@mastra/pg` as dependencies
**And** `pnpm install` completes without errors

**Given** the project is initialized
**When** I inspect the configuration files
**Then** `tsconfig.json` has ES2022 target, bundler module resolution, and strict mode enabled
**And** `.env.example` contains `ANTHROPIC_API_KEY` and `DATABASE_URL` with documented defaults
**And** `.gitignore` excludes `node_modules/`, `.env`, `.mastra/`, and `dist/`

**Given** Docker is running
**When** I run `docker compose up -d`
**Then** PostgreSQL with pgvector starts on the configured port using `pgvector/pgvector:pg17` image

**Given** dependencies are installed and Postgres is running
**When** I run `pnpm dev`
**Then** Mastra Studio UI is accessible at `localhost:4111`
**And** `src/mastra/index.ts` registers a Mastra instance with PostgresStore
**And** `src/mastra/config/models.ts` defines the tiered model mapping (Opus for Writer, Sonnet for Researcher, Haiku for eval/style)

### Story 1.2: Researcher Agent & Core Web Tools

As a speaker,
I want the system to research my topic and produce a structured research brief,
So that my talk is grounded in current information and relevant sources.

**Acceptance Criteria:**

**Given** the Researcher agent is defined in `src/mastra/agents/researcher.ts`
**When** I inspect the agent configuration
**Then** it uses the Sonnet model tier
**And** it has a system prompt instructing it to produce a research brief for conference talks
**And** it has `ResearcherOutputSchema` (Zod) defining structured output with sections for key findings, sources, existing talks, statistics, and suggested angles
**And** it is bound to the `webSearch` and `fetchPage` tools (supplementary tools added in Story 1.3)

**Given** the `webSearch` tool exists in `src/mastra/tools/web-search.ts`
**When** invoked with a search query
**Then** it returns structured search results using Mastra's web search integration
**And** it has explicit `inputSchema` and `outputSchema`

**Given** the `fetchPage` tool exists in `src/mastra/tools/fetch-page.ts`
**When** invoked with a URL
**Then** it extracts and returns the page content in a structured format
**And** it has explicit `inputSchema` and `outputSchema`

**Given** the Researcher agent is registered in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** the Researcher agent is visible and testable in the Studio UI

### Story 1.3: Supplementary Research Tools

As a speaker,
I want the Researcher to find existing talks on my topic and extract key data points from sources,
So that my research brief includes competitive landscape and concrete evidence.

**Acceptance Criteria:**

**Given** the `findExistingTalks` tool exists in `src/mastra/tools/find-existing-talks.ts`
**When** invoked with a topic string
**Then** it performs targeted web searches against YouTube and conference sites (SlideShare, Confreaks)
**And** it returns a structured list of existing talks with title, speaker, URL, and date
**And** it has explicit `inputSchema` and `outputSchema`

**Given** the `extractStats` tool exists in `src/mastra/tools/extract-stats.ts`
**When** invoked with raw text content from fetched pages
**Then** it uses LLM-based extraction to identify numerical claims, data points, and quotable statistics
**And** each extracted stat includes the value, context, and source attribution
**And** it has explicit `inputSchema` and `outputSchema`

**Given** both tools are implemented
**When** they are bound to the Researcher agent in `src/mastra/agents/researcher.ts`
**Then** the Researcher can use all 4 tools (`webSearch`, `fetchPage`, `findExistingTalks`, `extractStats`)
**And** the agent is re-verified in Mastra Studio

### Story 1.4: Writer Agent & Writing Tools


As a speaker,
I want the system to produce a complete speaker notes document with timing annotations and markers,
So that I have a ready-to-use script for my talk.

**Acceptance Criteria:**

**Given** the Writer agent is defined in `src/mastra/agents/writer.ts`
**When** I inspect the agent configuration
**Then** it uses the Opus model tier
**And** it has a system prompt instructing it to produce a speaker script with timing cues, pause markers, and audience interaction prompts
**And** it has `WriterOutputSchema` (Zod) defining structured output with sections, timing markers, total duration estimate, and formatted speaker notes markdown
**And** it is bound to the `wordCountToTime` and `checkJargon` tools

**Given** the `wordCountToTime` tool exists in `src/mastra/tools/word-count-to-time.ts`
**When** invoked with text content and a speaking pace (WPM)
**Then** it returns the estimated speaking duration
**And** it has explicit `inputSchema` and `outputSchema`

**Given** the `checkJargon` tool exists in `src/mastra/tools/check-jargon.ts`
**When** invoked with text content and an audience level
**Then** it returns flagged jargon terms that may not be appropriate for the target audience

**Given** the Writer agent is registered in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** the Writer agent is visible and testable in the Studio UI

### Story 1.5: Pipeline Input Schema & Validation

As a speaker,
I want to provide my topic, audience level, and talk format with clear validation,
So that I know my inputs are correct before generation starts.

**Acceptance Criteria:**

**Given** the workflow input schema exists in `src/mastra/schemas/workflow-input.ts`
**When** I inspect the schema
**Then** it defines `topic` as a required free-text string (FR-1)
**And** it defines `audienceLevel` as a required enum of `beginner`, `intermediate`, `advanced`, `mixed` (FR-2)
**And** it defines `format` as a required enum of `lightning`, `standard`, `keynote` with duration ranges (FR-3)

**Given** a speaker provides incomplete inputs (missing topic)
**When** the system validates the input
**Then** the validation returns an error identifying the missing field and expected format (FR-6)

**Given** the gate payload schemas exist in `src/mastra/schemas/gate-payloads.ts`
**When** I inspect the schemas
**Then** `GateSuspendSchema` defines `agentId`, `gateId`, `output`, and `summary`
**And** `GateResumeSchema` defines `approved` (boolean), `feedback` (optional string), and `edits` (optional)

**Given** the workflow output schema exists in `src/mastra/schemas/workflow-output.ts`
**When** I inspect the schema
**Then** it defines the final pipeline output structure including the speaker notes document

### Story 1.6: End-to-End Pipeline Workflow with Human Gates

As a speaker,
I want to run the full pipeline from topic input to speaker notes, with review points where I can provide feedback,
So that I maintain creative control and the output reflects my guidance.

**Acceptance Criteria:**

**Given** the workflow is defined in `src/mastra/workflows/talkforge.ts`
**When** I inspect the workflow
**Then** it composes Researcher and Writer as steps via `createStep(agent, { structuredOutput: { schema } })`
**And** it uses `.then()` for sequential composition
**And** it uses `.map()` to transform data between steps

**Given** the review gate logic exists in `src/mastra/workflows/gates/review-gate.ts`
**When** the Researcher completes
**Then** the workflow suspends at Gate 1 (`review-research`) with the research brief in the suspend payload
**And** the suspend payload follows `GateSuspendSchema`

**Given** the workflow is suspended at Gate 1
**When** the speaker resumes with `{ approved: true, feedback: "Focus on resilience patterns" }`
**Then** the feedback is passed as input context to the Writer step (FR-9)
**And** the workflow continues to the Writer agent

**Given** the Writer completes
**When** the workflow reaches Gate 3 (`review-script`)
**Then** the workflow suspends with the full speaker notes in the suspend payload

**Given** the speaker resumes Gate 3 with approval
**When** the pipeline completes
**Then** the final output contains the speaker notes document with timing annotations and markers (FR-14)

**Given** the workflow is suspended at a gate
**When** the process restarts (e.g., laptop dies)
**Then** the workflow state is preserved in PostgreSQL and the speaker can resume from the last gate without re-running prior steps (FR-8, NFR-5)

**Given** an LLM call fails during a generation step
**When** the system retries
**Then** it retries up to 3 times with exponential backoff before reporting failure (NFR-6)

**Given** the workflow is registered in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** the workflow is visible with step visualization and can be started via the UI

## Epic 2: Advanced Pipeline Control

Speaker can provide optional constraints, choose from multiple talk structure options, reject and regenerate with feedback, and have format-specific step skipping.

### Story 2.0: Pipeline Integration Tests

As a developer,
I want integration tests that verify the full TalkForge pipeline data flow end-to-end with mocked LLM responses,
So that I can catch pipeline-level regressions that unit tests miss.

**Acceptance Criteria:**

**Given** the integration test suite in `src/mastra/workflows/__tests__/talkforge.integration.test.ts`
**When** I run `pnpm test`
**Then** the integration tests execute alongside existing unit tests

**Given** the integration tests mock all LLM responses (no real API calls)
**When** the pipeline executes from topic input through to final output
**Then** data flows correctly between Researcher → Gate 1 → Writer → Gate 3 steps
**And** each step receives the expected input shape from the previous step's output

**Given** the pipeline reaches Gate 1 (research review)
**When** the workflow suspends
**Then** the suspend payload matches `GateSuspendSchema` with `agentId`, `gateId`, `output`, and `summary`
**And** the workflow can be resumed with `GateResumeSchema` data (`approved`, `feedback`)
**And** the resumed workflow continues to the Writer step

**Given** the pipeline reaches Gate 3 (script review)
**When** the workflow suspends and is resumed with approval
**Then** the pipeline completes successfully
**And** the final output conforms to `WorkflowOutputSchema` including `researchBrief`, `speakerScript` (with timing annotations), and `metadata`

**Given** the workflow has successfully suspended at Gate 1 and a subsequent step fails
**When** the error propagates
**Then** the workflow run captures the error state
**And** the previously captured Gate 1 suspend state remains intact in storage (not corrupted by the failure)

**Given** the workflow fails before reaching any gate (e.g., Researcher step errors)
**When** the error propagates
**Then** the workflow run transitions to an error state
**And** the run is queryable with its error details

**Given** the mocked LLM responses return structured output matching agent output schemas
**When** I inspect the mock setup
**Then** mocks use `ResearcherOutputSchema` and `WriterOutputSchema` to generate valid typed responses

### Story 2.1: Architect Agent & Timing Tool

As a speaker,
I want the system to propose multiple talk structure options with timing estimates,
So that I can choose the narrative arc that best fits my topic and style.

**Acceptance Criteria:**

**Given** the Architect agent is defined in `src/mastra/agents/talk-architect.ts`
**When** I inspect the agent configuration
**Then** it uses the Sonnet model tier
**And** it has a system prompt instructing it to generate 3 distinct structure options (e.g., Problem→Solution→Demo, Story Arc, Hot Take)
**And** it has `ArchitectOutputSchema` (Zod) defining structured output with an array of 3 structure options, each containing title, section breakdown, rationale, and estimated timing per section
**And** it is bound to the `estimateTiming` tool

**Given** the `estimateTiming` tool exists in `src/mastra/tools/estimate-timing.ts`
**When** invoked with a section breakdown and talk format
**Then** it returns per-section timing estimates that sum to the target duration range
**And** it has explicit `inputSchema` and `outputSchema`

**Given** the Architect agent is registered in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** the Architect agent is visible and testable in the Studio UI

### Story 2.2: Optional Constraints Input

As a speaker,
I want to provide optional constraints to guide content generation,
So that the system respects my preferences for angles, exclusions, or emphasis areas.

**Acceptance Criteria:**

**Given** the workflow input schema in `src/mastra/schemas/workflow-input.ts`
**When** I inspect the updated schema
**Then** it includes an optional `constraints` field as free-text string (FR-4)

**Given** a speaker provides constraints (e.g., "Focus on observability, avoid Kubernetes examples")
**When** the pipeline executes
**Then** the constraints are passed as context to the Researcher agent's input
**And** the constraints are passed as context to the Architect agent's input

**Given** a speaker provides no constraints
**When** the pipeline executes
**Then** the Researcher and Architect proceed without constraint context and no validation error occurs

### Story 2.3: Structure Selection Gate with Loopback

As a speaker,
I want to review proposed talk structures, pick one or mix sections, and reject all options to trigger regeneration,
So that I have full control over the narrative arc of my talk.

**Acceptance Criteria:**

**Given** the Architect agent has produced 3 structure options
**When** the workflow reaches Gate 2 (`review-structure`)
**Then** the workflow suspends with all 3 options in the suspend payload following `GateSuspendSchema`
**And** the summary includes a concise comparison of the 3 options

**Given** the workflow is suspended at Gate 2
**When** the speaker resumes with `{ approved: true, feedback: "Option 2, but swap sections 3 and 4" }`
**Then** the selected structure and feedback are passed as input to the Writer step
**And** the workflow continues past Gate 2

**Given** the workflow is suspended at Gate 2
**When** the speaker resumes with `{ approved: false, feedback: "Too academic, try more conversational approaches" }`
**Then** the workflow loops back to the Architect agent using `.dountil()` (FR-10)
**And** the rejection feedback is included in the Architect's input context
**And** the Architect generates 3 new structure options

**Given** the speaker rejects multiple times
**When** the speaker eventually approves a structure
**Then** the workflow proceeds to the Writer with the final approved structure

### Story 2.4: Format-Based Conditional Step Skipping

As a speaker,
I want the pipeline to automatically adapt its steps based on my talk format,
So that lightning talks skip unnecessary steps and keynotes get full treatment.

**Acceptance Criteria:**

**Given** the workflow uses `.branch()` for conditional logic
**When** a speaker selects `lightning` format (5–10 min)
**Then** the Architect agent step is skipped entirely — a default single-section structure is used instead (FR-12)
**And** Gate 2 (structure selection) is skipped
**And** the Writer produces condensed output without extended audience interaction prompts or multi-section transitions

**Given** a speaker selects `standard` format (25–35 min)
**When** the pipeline executes
**Then** all steps execute without skipping — Architect proposes 3 structures, Gate 2 for selection, Writer produces full output

**Given** a speaker selects `keynote` format (40–60 min)
**When** the pipeline executes
**Then** all steps execute with extended content — Writer includes deeper examples, multiple audience interaction points, and longer transitions

**Given** the Architect step is skipped for lightning format
**When** the Writer step receives its input
**Then** it receives a default structure with a single section and the original topic/research context rather than failing (NFR-7)
**And** the pipeline log records which steps were skipped and why

## Epic 3: Reference-Informed Research

Speaker can upload their own reference materials (blog posts, docs, code samples) to enrich the research stage with personal context via RAG.

### Story 3.1: RAG Infrastructure & Best Practices Knowledge Base

As a developer,
I want RAG infrastructure configured with a talk best practices knowledge base,
So that agents can retrieve curated guidance on effective conference presentations.

**Acceptance Criteria:**

**Given** the project dependencies
**When** I inspect `package.json`
**Then** `@mastra/rag` is included as a dependency

**Given** the RAG infrastructure in `src/mastra/rag/best-practices.ts`
**When** I inspect the configuration
**Then** it defines a knowledge base using pgvector as the vector store
**And** it contains curated content on talk best practices (structure, pacing, hooks, audience engagement)
**And** it uses document chunking appropriate for retrieval

**Given** the best practices KB is populated
**When** I query it with a topic like "how to open a technical talk"
**Then** it returns relevant chunks from the best practices content

**Given** the RAG configuration is registered in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** the knowledge base is visible and queryable

### Story 3.2: Reference Material Upload & Indexing

As a speaker,
I want to upload my own reference materials (blog posts, docs, code samples) for the system to use during research,
So that my talk incorporates my existing knowledge and perspective.

**Acceptance Criteria:**

**Given** the user references KB is defined in `src/mastra/rag/user-references.ts`
**When** I inspect the configuration
**Then** it accepts PDF, Markdown, and URL list inputs (FR-5)
**And** it chunks and indexes documents into pgvector

**Given** the workflow input schema in `src/mastra/schemas/workflow-input.ts`
**When** I inspect the updated schema
**Then** it includes an optional `referenceMaterials` field accepting file paths and URLs

**Given** a speaker provides reference materials
**When** the pipeline begins
**Then** the materials are indexed into the user references KB before the Researcher agent runs

**Given** a reference material fails to index (e.g., corrupt PDF, unreachable URL)
**When** the indexing step encounters the failure
**Then** the system logs a warning identifying the failed material
**And** the pipeline continues without the failed material (NFR-8)
**And** the speaker is informed which materials could not be indexed

**Given** no reference materials are provided
**When** the pipeline executes
**Then** the Researcher proceeds without user reference context and no error occurs

### Story 3.3: RAG-Augmented Research

As a speaker,
I want the Researcher to incorporate my uploaded references and best practices alongside web search,
So that the research brief blends external sources with my personal context and proven techniques.

**Acceptance Criteria:**

**Given** the Researcher agent in `src/mastra/agents/researcher.ts`
**When** a speaker has provided reference materials
**Then** the Researcher retrieves relevant chunks from the user references KB
**And** the Researcher retrieves relevant chunks from the best practices KB
**And** the retrieved context is combined with web search results in the research brief

**Given** the Researcher produces a research brief with RAG augmentation
**When** I inspect the output
**Then** the brief identifies which findings came from user references vs web search vs best practices
**And** user-provided context is prioritised where relevant

**Given** no reference materials were uploaded
**When** the Researcher executes
**Then** it still retrieves from the best practices KB
**And** it performs web search as before
**And** the output quality is not degraded compared to the non-RAG pipeline

## Epic 4: Quality Evaluation & Insights

> **API Spike:** See `_bmad-output/implementation-artifacts/spike-mastra-evals-api.md` for verified scorer API shape, registration pattern, and storage findings that supersede assumptions in stories below.

Speaker can see automated quality scores (hook strength, pacing, jargon density) after each run and track improvement trends over multiple sessions.

### Story 4.1: Eval Scorers — Hook Strength & Narrative Coherence

As a speaker,
I want my talk's opening hook and narrative flow evaluated automatically,
So that I get actionable feedback on the two most impactful aspects of audience engagement.

**Acceptance Criteria:**

**Given** the hook strength scorer exists in `src/mastra/scorers/hook-strength.ts`
**When** invoked with a speaker script
**Then** it uses an LLM-as-judge (Haiku model tier) to rate the opening hook on a 1–5 scale
**And** it returns a score, rating label, and specific improvement suggestions

**Given** the narrative coherence scorer exists in `src/mastra/scorers/narrative-coherence.ts`
**When** invoked with a speaker script
**Then** it uses an LLM-as-judge (Haiku model tier) to evaluate logical flow, transitions, and thematic consistency
**And** it returns a score, rating label, and specific improvement suggestions

**Given** both scorers are registered in the Mastra eval registry in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** both scorers are visible in the Scorers tab and can be run independently

**Given** adding a new scorer
**When** I add an entry to the eval registry
**Then** no modifications to existing scorers or core code are required (NFR-14)

### Story 4.2: Eval Scorers — Pacing Distribution & Jargon Density

As a speaker,
I want my talk's pacing and jargon level evaluated automatically,
So that I can ensure the talk fits the time slot and is accessible to my target audience.

**Acceptance Criteria:**

**Given** the pacing distribution scorer exists in `src/mastra/scorers/pacing-distribution.ts`
**When** invoked with a speaker script and target format duration
**Then** it uses heuristic analysis (word count per section, timing markers) to evaluate pacing balance
**And** it returns a score, per-section timing breakdown, and flags for sections that are too long or too short

**Given** the jargon density scorer exists in `src/mastra/scorers/jargon-density.ts`
**When** invoked with a speaker script and audience level
**Then** it uses an LLM-as-judge (Haiku model tier) to identify jargon relative to the audience level
**And** it returns a score, list of flagged terms, and suggested simplifications

**Given** both scorers are registered in the Mastra eval registry
**When** I open Mastra Studio
**Then** both scorers are visible in the Scorers tab and can be run independently

### Story 4.3: Automated Eval Suite & Scorecard

As a speaker,
I want all quality evaluations to run automatically after generation completes and see a unified scorecard,
So that I get immediate quality feedback without manual steps.

**Acceptance Criteria:**

**Given** the pipeline completes successfully (speaker approves final output)
**When** the eval step executes
**Then** all 4 scorers (hook strength, narrative coherence, pacing distribution, jargon density) run automatically against the final output (FR-24)

**Given** all scorers have completed
**When** the eval suite produces results
**Then** a scorecard is generated containing each scorer's name, score, rating, and recommendations (FR-16)
**And** the scorecard is included in the pipeline's final output

**Given** the scorecard is produced
**When** the speaker views the results
**Then** the scorecard is displayed in Mastra Studio (FR-26)
**And** the scorecard is available as structured data in the pipeline output

**Given** one scorer fails during evaluation
**When** the eval suite encounters the failure
**Then** the remaining scorers still execute
**And** the scorecard notes which scorer failed and why

### Story 4.4: Eval Result Storage & Trend Analysis

As a speaker,
I want evaluation results stored and queryable over time, with meta-analysis when enough data exists,
So that I can track how my talks improve across sessions.

**Acceptance Criteria:**

**Given** the eval suite produces a scorecard
**When** the results are saved
**Then** they are stored in PostgreSQL with talk ID, date, and per-scorer results (FR-25)

**Given** stored evaluation results
**When** I query by date range or talk ID
**Then** the correct results are returned (NFR-11)

**Given** at least 3 completed sessions exist with eval results
**When** the meta-eval runs after a new session
**Then** it produces a trend analysis showing score progression across sessions (FR-27)
**And** it identifies improving and declining metrics

**Given** fewer than 3 sessions exist
**When** the pipeline completes
**Then** the meta-eval step is skipped without error
**And** the scorecard notes that trend analysis requires more sessions

**Given** the `pnpm eval` script is configured in `package.json`
**When** I run `pnpm eval`
**Then** the eval suite runs independently against a specified talk output without requiring a full pipeline run (NFR-23)

## Epic 5: Visual Presentation Design

Speaker can receive slide specifications and rendered Mermaid diagrams alongside the script, with parallel asset generation.

### Story 5.1: Designer Agent & Slide Specification Tools

As a speaker,
I want the system to produce slide specifications following opinionated design rules,
So that my slides are clean, focused, and visually consistent without manual design work.

**Acceptance Criteria:**

**Given** the Designer agent is defined in `src/mastra/agents/designer.ts`
**When** I inspect the agent configuration
**Then** it uses the Sonnet model tier
**And** it has a system prompt instructing it to produce slide specifications following opinionated rules (one idea per slide, no bullet points, visual-first)
**And** it has `DesignerOutputSchema` (Zod) defining structured output as DeckSpec JSON with per-slide content, layout type, speaker note reference, and diagram indicators
**And** it is bound to the `suggestLayout` and `generateColourPalette` tools

**Given** the `suggestLayout` tool exists in `src/mastra/tools/suggest-layout.ts`
**When** invoked with slide content and type
**Then** it returns a recommended layout from the available templates
**And** it has explicit `inputSchema` and `outputSchema`

**Given** the `generateColourPalette` tool exists in `src/mastra/tools/generate-colour-palette.ts`
**When** invoked with a topic and tone
**Then** it returns a colour palette suitable for the presentation theme

**Given** the Designer agent is registered in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** the Designer agent is visible and testable in the Studio UI

### Story 5.2: Mermaid Diagram Generation & Rendering

As a speaker,
I want architecture and flow diagrams generated and rendered as SVGs,
So that my slides include professional visuals for technical concepts.

**Acceptance Criteria:**

**Given** the `generateMermaid` tool exists in `src/mastra/tools/generate-mermaid.ts`
**When** invoked with a natural language description of a diagram
**Then** it returns valid Mermaid syntax
**And** it has explicit `inputSchema` and `outputSchema`

**Given** the `renderMermaid` tool exists in `src/mastra/tools/render-mermaid.ts`
**When** invoked with Mermaid syntax
**Then** it renders the diagram to SVG using `@mermaid-js/mermaid-cli`
**And** it returns the SVG file path or content

**Given** `@mermaid-js/mermaid-cli` is included in project dependencies
**When** I inspect `package.json`
**Then** the dependency is present as a dev dependency

**Given** invalid Mermaid syntax is provided
**When** the `renderMermaid` tool attempts rendering
**Then** it returns an error with the syntax issue identified rather than crashing

### Story 5.3: Parallel Asset Creation Pipeline

As a speaker,
I want slide assets generated concurrently to minimize total generation time,
So that I receive the complete visual package quickly.

**Acceptance Criteria:**

**Given** the Designer agent has produced DeckSpec JSON
**When** the asset creation phase begins
**Then** the workflow uses `.parallel()` to execute slide building, Mermaid rendering, and any image steps concurrently (FR-11)

**Given** the `buildSlides` tool exists in `src/mastra/tools/build-slides.ts`
**When** invoked with DeckSpec JSON
**Then** it produces the slide output in the configured format

**Given** parallel asset creation is running
**When** I inspect observability logs
**Then** execution timestamps for parallel branches overlap, confirming concurrent execution (NFR-3)

**Given** a 30-slide deck
**When** all parallel asset steps complete
**Then** total asset generation time is under 30 seconds (NFR-4)

**Given** an optional asset step fails (e.g., image generation)
**When** the parallel branch encounters the failure
**Then** the system substitutes a placeholder and continues with remaining assets (NFR-7)
**And** the failure is logged with a warning

### Story 5.4: Optional Slide Review Gate

As a speaker,
I want the option to review slide specifications before final output, with auto-approval as the default,
So that I can skip review for speed or opt-in for control when needed.

**Acceptance Criteria:**

**Given** the workflow input schema in `src/mastra/schemas/workflow-input.ts`
**When** I inspect the updated schema
**Then** it includes an optional `reviewSlides` boolean field defaulting to `false`

**Given** `reviewSlides` is `false` (default)
**When** the Designer output is ready
**Then** Gate 4 auto-resumes with `{ approved: true }` without suspending
**And** the pipeline proceeds to the next step without user intervention

**Given** `reviewSlides` is `true`
**When** the Designer output is ready
**Then** the workflow suspends at Gate 4 (`review-slides`) with the DeckSpec in the suspend payload
**And** the speaker can review and provide feedback before the pipeline continues

**Given** the slide layout system
**When** I add a new layout template via configuration
**Then** the Designer can use the new layout without modifying existing code (NFR-16)

## Epic 6: Observability & Grafana LGTM

> **Spike complete (2026-03-17).** See `_bmad-output/implementation-artifacts/spike-epic-6-mastra-observability.md` for full findings. Absorbs former Epic 7 (OTEL export).

Activate Mastra's built-in observability and export traces to Grafana LGTM. The spike confirmed that Mastra auto-traces all agent runs, model calls (with full token breakdown), tool invocations, and workflow step transitions via the `wrapMastra()` proxy — no manual instrumentation needed. NFR-9 and NFR-10 are satisfied out of the box. This epic is configuration + verification + Grafana, not instrumentation from scratch.

**Depends on:** Epics 1–5 (working pipeline to observe). Independent of Epics 8–12 (frontend/rendering).

**NFRs addressed:** NFR-9, NFR-10, NFR-12 (partially — persistence logging)

**Success criteria (SC-1 partial):** Observability is one of the 7 Mastra core capabilities required by SC-1. This epic delivers a working implementation with both Studio and Grafana visibility.

**Packages:** `@mastra/observability` (^1.5.0), `@mastra/otel-exporter` (^1.0.7), `@mastra/otel-bridge` (^1.0.7)

### Story 6.1: [Spike] Mastra Observability Surface Exploration — DONE

> **Completed 2026-03-17.** Findings in `_bmad-output/implementation-artifacts/spike-epic-6-mastra-observability.md`. Confirmed: observability is opt-in via `@mastra/observability`, all tracing is automatic, NFR-9/NFR-10 fully covered, OTEL export is config-level via `@mastra/otel-exporter` + `@mastra/otel-bridge`. Epic 7 absorbed.

### Story 6.2: Mastra-Native Observability Setup

As a developer,
I want the TalkForge pipeline to produce structured traces visible in Mastra Studio,
So that I can see the full execution flow of agents, model calls, tools, and workflow steps.

**Scope:**
- Install `@mastra/observability`
- Wire `Observability` entrypoint with `DefaultExporter` in the `Mastra` constructor (`src/mastra/index.ts`)
- Verify traces appear in Studio for a full workflow run

**Acceptance Criteria:**

**Given** the Mastra constructor has `observability` configured with `DefaultExporter`
**When** a full TalkForge workflow run completes via `mastra dev`
**Then** Studio's traces tab shows a nested span tree: workflow run → steps → agent runs → model generations → tool calls

**Given** a completed workflow trace in Studio
**When** I inspect a model generation span
**Then** it shows: model name, provider, input tokens, output tokens (with cache/reasoning breakdown), latency, finish reason (NFR-9)

**Given** a completed workflow trace in Studio
**When** I inspect workflow step spans
**Then** each shows: step name, status (pending/running/paused/complete/failed), duration (NFR-10)

**Given** the observability config uses `DefaultExporter`
**When** spans are exported
**Then** they are persisted to the `mastra_traces` Postgres table and queryable via `mastra.getTrace(traceId)`

### Story 6.3: Grafana LGTM & OTEL Export

As a developer,
I want TalkForge traces to flow into Grafana via OpenTelemetry,
So that I can visualise and query traces in Grafana Tempo alongside the Mastra Studio view.

> **Absorbs former Epic 7** — OTEL export is config-level work, not a separate epic.

**Scope:**
- Add `grafana/otel-lgtm:latest` container to `docker-compose.yml` (ports: 3000 Grafana UI, 4317 OTLP gRPC, 4318 OTLP HTTP)
- Add `@mastra/otel-exporter` with custom endpoint (`http://localhost:4318`, `http/protobuf` protocol)
- Add `@mastra/otel-bridge` for bidirectional OTEL context propagation
- Add `OTEL_EXPORTER_OTLP_ENDPOINT` to `.env.example`

**Acceptance Criteria:**

**Given** `docker compose up -d` starts both Postgres and LGTM containers
**When** I navigate to `http://localhost:3000` (Grafana)
**Then** the Grafana UI loads with Tempo as a pre-configured data source

**Given** the Mastra constructor has both `DefaultExporter` and `OtelExporter` configured
**When** a full TalkForge workflow run completes
**Then** the same trace is visible in both Mastra Studio and Grafana Tempo (Explore > Tempo)

**Given** a trace in Grafana Tempo
**When** I expand the trace view
**Then** spans show the same hierarchy as Studio: workflow run → steps → agent runs → model generations → tool calls

**Given** `OtelBridge` is configured
**When** OTEL-instrumented code (e.g., HTTP requests, DB queries) executes inside a Mastra agent
**Then** those spans are nested under the correct parent Mastra span in Grafana

### Story 6.4: NFR-12 Gap-Fill & Trace Verification

As a developer,
I want to verify that persistence operations are traced and fill any gaps,
So that NFR-12 (persistence operation logging) is addressed and trace coverage is tested.

**Scope:**
- Verify whether storage operations (snapshot writes, resume reads) produce spans automatically
- If not auto-traced: add manual spans for key persistence operations using `getOrCreateSpan()` from `@mastra/core/observability`
- Write integration tests that trigger a workflow run and assert the expected span tree structure via `mastra.getTrace(traceId)`

**Acceptance Criteria:**

**Given** a workflow run that suspends and resumes
**When** I inspect the trace
**Then** suspend/resume operations are visible as spans (either auto-captured or manually instrumented)

**Given** a completed workflow run
**When** I call `mastra.getTrace(traceId)` programmatically
**Then** I can traverse the span tree via `rootSpan` → `children` and find spans for each pipeline phase

**Given** the trace integration tests
**When** `pnpm test` runs
**Then** tests assert: correct span count, expected span types present (WORKFLOW_RUN, WORKFLOW_STEP, AGENT_RUN, MODEL_GENERATION, TOOL_CALL), and NFR-9/NFR-10 attributes populated

---

## Epic 7: Grafana Observability Dashboards

> **Pre-requisite: Spike required before story refinement.** Depends on Epic 6 delivering traces to Grafana LGTM. The spike should explore Tempo query capabilities, Grafana dashboard provisioning (YAML), and identify which panels are most valuable for TalkForge pipeline monitoring.

> **History:** This epic replaces the original Epic 7 (External Observability & OTEL Export), which was absorbed into Epic 6 as Story 6.3. The OTEL plumbing is config-level work; dashboarding is where the real value lives.

Build Grafana dashboards provisioned as YAML (dashboard-as-code) for monitoring the TalkForge pipeline. Dashboards are version-controlled and auto-loaded by the LGTM container on startup.

**Depends on:** Epic 6 (traces flowing into Grafana Tempo via OtelExporter). Independent of frontend epics.

**Potential dashboard candidates** (to be refined by spike):
- Pipeline overview: workflow run success/failure rates, p50/p95 latency
- Agent performance: per-agent token usage, model call latency, tool call frequency
- Cost tracking: token consumption by model tier (Opus/Sonnet/Haiku), estimated cost per run
- Step-level drilldown: individual step durations, suspend/resume wait times
- Error analysis: failure rates by step, error categories

### Story 7.1: [Spike] Grafana Dashboard Design & Provisioning Exploration

As a developer,
I want to understand Grafana's dashboard provisioning capabilities and Tempo query patterns,
So that I can scope the dashboard stories with precision.

**Spike Goals:**
- Explore Grafana dashboard provisioning via YAML (`/etc/grafana/provisioning/dashboards/`)
- Test Tempo TraceQL queries for TalkForge span types (AGENT_RUN, MODEL_GENERATION, WORKFLOW_STEP, etc.)
- Identify which metrics/aggregations are available from traces (RED metrics, token histograms)
- Evaluate whether Mimir metrics (from OtelExporter) add value beyond trace-derived panels
- Prototype one dashboard panel (e.g., workflow run latency histogram) to validate the provisioning pipeline
- Produce refined stories 7.2–7.N with concrete panel specifications

**Acceptance Criteria:**

**Given** a running LGTM container with TalkForge traces
**When** the spike is complete
**Then** a spike document exists with: verified provisioning approach, sample TraceQL queries, recommended dashboard layout, and refined story breakdown

> **Placeholder stories 7.2–7.N** to be defined after spike.

---

## Epic 8: CLI Deck Rendering

Standalone npm script that reads a DeckSpec JSON file from disk and produces a PDF. No Mastra dependency — pure rendering pipeline. Can run in parallel with Epic 9.

### Story 8.1: Marp Templating from DeckSpec

As a developer,
I want a function that converts a DeckSpec JSON into Marp-flavoured markdown,
So that the structured slide data can be rendered by the Marp engine.

**Acceptance Criteria:**

**Given** a valid DeckSpec JSON file on disk
**When** the templating function is invoked with the parsed JSON
**Then** it produces a Marp markdown string with frontmatter (`marp: true`, theme)
**And** each slide is separated by `---`
**And** slide titles, content, and speaker notes (`<!-- notes -->`) are correctly mapped
**And** the colour palette from the DeckSpec is applied as CSS custom properties in the theme

**Given** a DeckSpec with diagram indicators on certain slides
**When** the templating function encounters a diagram slide
**Then** it embeds the pre-rendered diagram image (PNG/SVG path from the DeckSpec) as a markdown image reference

**Given** a DeckSpec with different layout types (title, content, diagram, quote, section-break)
**When** the templating function processes each slide
**Then** it applies Marp directives or classes matching the layout type

### Story 8.2: PDF Generation via Marp + Puppeteer

As a speaker,
I want to run a single command to produce a PDF from a DeckSpec,
So that I have a portable, shareable presentation file.

**Acceptance Criteria:**

**Given** the npm script `pnpm render-deck` exists
**When** invoked with a path to a DeckSpec JSON file (e.g., `pnpm render-deck output/my-talk.json`)
**Then** it reads the file, converts to Marp markdown, and renders a PDF to the same directory as the input file
**And** the PDF filename matches the input filename with a `.pdf` extension

**Given** `@marp-team/marp-core` and Puppeteer are available as dependencies
**When** the script renders the Marp markdown
**Then** it uses the Marp programmatic API (not CLI) to produce the PDF

**Given** the DeckSpec contains Mermaid diagrams
**When** the PDF is rendered
**Then** diagrams appear as images (pre-rendered during Epic 5 pipeline, referenced by path in the DeckSpec)

**Given** an invalid or missing file path
**When** the script is invoked
**Then** it exits with a non-zero code and a clear error message

### Story 8.3: Custom Marp Theme from Colour Palette

As a speaker,
I want the PDF to use the colour palette generated for my talk,
So that the visual output matches the design intent from the pipeline.

**Acceptance Criteria:**

**Given** a DeckSpec with a `colourPalette` field containing primary, secondary, accent, background, and text colours
**When** the Marp theme is generated
**Then** it produces a CSS theme that maps palette colours to Marp's theming system
**And** headings, backgrounds, accent elements, and text use the specified colours

**Given** a DeckSpec without a `colourPalette` field
**When** the theme is generated
**Then** it falls back to a sensible default theme without error

## Epic 9: Frontend Foundation & Workflow Trigger

Speaker can start a TalkForge workflow from a web browser. Minimum viable frontend.

### Story 9.1: Next.js Project Scaffolding

As a developer,
I want a Next.js application scaffolded alongside the existing Mastra backend,
So that there is a frontend capable of calling the Mastra API.

**Acceptance Criteria:**

**Given** the Next.js app is initialised in a `web/` directory (or as a pnpm workspace)
**When** I inspect the project structure
**Then** it uses Next.js App Router, TypeScript, and Tailwind CSS
**And** `pnpm dev --filter web` starts the frontend on a separate port from Mastra

**Given** the project structure
**When** I inspect shared types
**Then** the Zod schemas from `src/mastra/schemas/` are importable by the frontend (shared package or path alias)

### Story 9.2: Mastra API Client

As a developer,
I want a typed client for the Mastra REST API,
So that the frontend can trigger workflows and query run status with type safety.

**Acceptance Criteria:**

**Given** the Mastra dev server is running on `localhost:4111`
**When** the client is configured
**Then** it exposes typed methods for: trigger workflow, get run status, resume suspended step
**And** the base URL is configurable via environment variable

**Given** the Mastra API returns an error
**When** the client receives a non-2xx response
**Then** it throws a typed error with status code and message

### Story 9.3: Workflow Input Form

As a speaker,
I want a web form to enter my talk details and start generation,
So that I can use the system through a browser instead of the API directly.

**Acceptance Criteria:**

**Given** the speaker navigates to the app
**When** the input form is displayed
**Then** it includes fields for topic, audience level, talk format, and optional constraints (matching the workflow input schema)
**And** client-side validation matches the Zod input schema

**Given** the speaker submits valid input
**When** the workflow is triggered via the Mastra API client
**Then** the speaker is redirected to a run status page (`/run/:runId`) showing a placeholder status

### Story 9.4: Run Status Page (Placeholder)

As a speaker,
I want to see that my workflow has started after submitting the form,
So that I know generation is in progress.

**Acceptance Criteria:**

**Given** the speaker has triggered a workflow
**When** they land on `/run/:runId`
**Then** the page displays the run ID and a "Generation in progress" indicator
**And** when the run completes, a link to the results is shown (results page is a placeholder at this stage)

## Epic 10: Workflow Status & Review Gates

Speaker can track pipeline progress and interact with human review gates in the browser. Full workflow loop without leaving the web UI.

### Story 10.1: Live Run Status Page

As a speaker,
I want to see which step the pipeline is on in real time,
So that I know how far along my talk generation is.

**Acceptance Criteria:**

**Given** a workflow run is in progress
**When** the speaker views `/run/:runId`
**Then** the page polls (or receives SSE) for step completion updates
**And** each step is shown with its status (pending, running, complete, failed)
**And** the currently active step is visually highlighted

**Given** the workflow completes
**When** all steps are done
**Then** a link to view the generated deck is displayed

### Story 10.2: Gate Content Display

As a speaker,
I want to see the content produced at each review gate,
So that I can make an informed approve/reject decision.

**Acceptance Criteria:**

**Given** the workflow is suspended at a review gate
**When** the speaker views the run page
**Then** the gate content is rendered in a readable format:
- Gate 1 (research): markdown-rendered research summary
- Gate 2 (structure): talk structure with sections and timing
- Gate 3 (script): full speaker script with section headings
- Gate 4 (slides): slide previews (DeckSpec rendered inline)

### Story 10.3: Review Controls

As a speaker,
I want approve/reject buttons with a feedback field,
So that I can interact with gates without using the API directly.

**Acceptance Criteria:**

**Given** the workflow is suspended at a gate
**When** the speaker views the gate content
**Then** approve and reject buttons are visible
**And** a textarea for feedback/edits is available

**Given** the speaker approves or rejects with feedback
**When** they submit the review
**Then** the workflow is resumed via the Mastra API with the appropriate payload
**And** the status page updates to show the pipeline continuing

**Given** the speaker rejects at a gate
**When** the workflow regenerates and suspends again
**Then** the updated content is displayed for another review round

### Story 10.4: Run History

As a speaker,
I want to see my past workflow runs,
So that I can revisit previous talks.

**Acceptance Criteria:**

**Given** the speaker has completed one or more workflow runs
**When** they navigate to the home or history page
**Then** past runs are listed with topic, date, format, and status
**And** each entry links to the run detail page

## Epic 11: Presentation Viewer

Speaker can view generated slides as an interactive deck in the browser. The visual payoff.

### Story 11.1: Slide Renderer Framework

As a speaker,
I want to navigate through my generated slides in full-screen,
So that I can preview and present directly from the browser.

**Acceptance Criteria:**

**Given** a DeckSpec is available for a completed run
**When** the speaker navigates to `/deck/:runId`
**Then** slides are rendered as full-screen presentation frames
**And** the speaker can navigate with arrow keys, click, or swipe
**And** a slide counter shows current position (e.g., "3 / 15")

**Given** the speaker presses Escape or clicks a back button
**When** exiting the viewer
**Then** they return to the run detail page

### Story 11.2: Layout Components

As a developer,
I want a React component per slide layout type,
So that each slide gets appropriate visual treatment.

**Acceptance Criteria:**

**Given** the DeckSpec defines layout types
**When** a slide is rendered
**Then** the correct layout component is selected:
- `TitleSlide` — large centered title, optional subtitle
- `ContentSlide` — heading + body text (no bullet walls — follows designer agent rules)
- `DiagramSlide` — heading + diagram visual, minimal text
- `QuoteSlide` — large pull-quote with attribution
- `SectionBreakSlide` — section title, acts as a visual separator

**Given** an unknown layout type
**When** the slide renders
**Then** it falls back to `ContentSlide` without error

### Story 11.3: Colour Palette Theming

As a speaker,
I want slides to use the colour palette generated for my talk,
So that the visual output matches the design intent.

**Acceptance Criteria:**

**Given** a DeckSpec with a `colourPalette` field
**When** the deck viewer loads
**Then** palette colours are injected as CSS custom properties (`--slide-primary`, `--slide-bg`, etc.)
**And** all layout components consume these properties for headings, backgrounds, accents, and text

**Given** a DeckSpec without a `colourPalette`
**When** the deck viewer loads
**Then** a sensible default palette is applied without error

### Story 11.4: Client-Side Mermaid Rendering

As a speaker,
I want diagrams rendered directly in the browser,
So that slides with technical visuals load without server-side rendering.

**Acceptance Criteria:**

**Given** a slide with Mermaid syntax in the DeckSpec
**When** the `DiagramSlide` component mounts
**Then** it renders the diagram using the `mermaid` JS library client-side
**And** the diagram respects the current colour palette (mermaid theme configuration)

**Given** invalid Mermaid syntax
**When** rendering fails
**Then** an error placeholder is shown on the slide instead of crashing the viewer

## Epic 12: Streaming, Export & Sharing

Real-time experience polish, output portability, and shareable presentation URLs.

### Story 12.1: Streaming Workflow Progress

As a speaker,
I want to see slides and content appear as they are generated,
So that the experience feels live and responsive rather than waiting for completion.

**Acceptance Criteria:**

**Given** the workflow is running
**When** a step completes and produces output
**Then** the run page updates in real time via SSE (Server-Sent Events) without manual refresh
**And** partial results (e.g., first few slides) are viewable before the full deck is ready

### Story 12.2: PDF Export from Browser

As a speaker,
I want to download a PDF of my slides from the browser,
So that I have a portable file without running the CLI script.

**Acceptance Criteria:**

**Given** the speaker is viewing a completed deck
**When** they click "Download PDF"
**Then** a PDF is generated (via server-side Marp render endpoint or browser print-to-PDF)
**And** the PDF matches the visual styling seen in the browser viewer

### Story 12.3: Shareable Deck URLs

As a speaker,
I want to share a link to my presentation,
So that others can view my slides without needing access to my local system.

**Acceptance Criteria:**

**Given** a completed deck
**When** the speaker clicks "Share"
**Then** a URL is generated (`/deck/:runId` or a short token-based URL)
**And** the URL is viewable by anyone with the link (no auth required by default)

**Given** the speaker wants to revoke access
**When** they disable sharing for a deck
**Then** the shared URL returns a 404

### Story 12.4: Speaker Notes & Presenter Mode

As a speaker,
I want a presenter view with speaker notes alongside slide previews,
So that I can use the browser as my presentation tool.

**Acceptance Criteria:**

**Given** the speaker activates presenter mode
**When** viewing the deck
**Then** a dual-pane view shows the current slide, next slide preview, speaker notes, and elapsed time
**And** the audience-facing view (separate window/tab) stays in sync

**Given** a slide has no speaker notes
**When** presenter mode is active
**Then** the notes pane is empty but the layout is not broken

## Epic 13: Style Learning & Personalization

System learns the speaker's writing style through edit diffs at review gates and produces increasingly personalized output over time, with cross-session metadata.

### Story 13.1: Cold Start & Edit Diff Capture at Gate 3

As a speaker,
I want the system to work well on my first use and capture my edits for future learning,
So that personalization begins immediately from my first interaction.

**Acceptance Criteria:**

**Given** a speaker with no prior sessions (no style data in memory)
**When** the Writer agent generates a script
**Then** it produces output without style augmentation using its default system prompt (FR-18)
**And** the output quality is not degraded by the absence of style data

**Given** the workflow is suspended at Gate 3 (`review-script`)
**When** the speaker edits the generated script and resumes with `{ approved: true, edits: "<modified script>" }`
**Then** the system computes a diff between the original generated script and the speaker's edited version (FR-19)
**And** the diff is stored as part of the resume data for downstream processing

**Given** the speaker approves the script without edits
**When** Gate 3 resumes with `{ approved: true }` and no edits
**Then** no diff is generated
**And** the pipeline proceeds normally without triggering style learning

**Given** memory operations occur
**When** I inspect observability logs
**Then** each operation logs: key, operation type (read/write/delete), and payload size (NFR-12)

### Story 13.2: Style Learner Workflow Step

As a speaker,
I want the system to extract insights about my writing style from my edits,
So that future talks are written more in my voice from the start.

**Acceptance Criteria:**

**Given** the Style Learner step is defined in `src/mastra/workflows/steps/style-learner.ts`
**When** I inspect the configuration
**Then** it is a workflow step (not a Mastra Agent) using a direct LLM call with Haiku model tier
**And** it has a Zod output schema defining categorised style insights (e.g., sentence length preference, tone, transition style, humour usage, jargon comfort)

**Given** a diff was captured at Gate 3
**When** the Style Learner step executes
**Then** it analyses the diff and extracts style insights categorised by type
**And** each insight includes a category, description, confidence level, and example from the diff

**Given** the Style Learner produces insights
**When** they are persisted
**Then** insights are stored in Mastra memory organised by category (FR-20)
**And** new insights for an existing category merge with or update previous insights rather than duplicating

**Given** no diff was captured (speaker approved without edits)
**When** the Style Learner step is reached
**Then** the step is skipped without error

### Story 13.3: Style-Augmented Writing

As a speaker,
I want the Writer to incorporate my learned style preferences into its output,
So that each subsequent talk requires fewer edits and sounds more like me.

**Acceptance Criteria:**

**Given** a speaker with prior style insights stored in memory
**When** the Writer agent is about to execute
**Then** it retrieves matching style insights from Mastra memory (FR-21)
**And** the retrieved insights are injected into the Writer's system prompt as dynamic augmentation

**Given** style insights exist for categories like "sentence length" and "tone"
**When** the Writer generates a script
**Then** the output reflects the learned preferences (e.g., shorter sentences, casual tone)

**Given** no style insights exist in memory (first use or data deleted)
**When** the Writer agent executes
**Then** it falls back to its default system prompt without error (FR-18)

**Given** style insights from multiple sessions exist
**When** the Writer retrieves insights
**Then** more recent insights are weighted higher than older ones
**And** conflicting insights from different sessions are resolved in favour of the most recent

### Story 13.4: Cross-Session Metadata & Data Management

As a speaker,
I want the system to track my talk history and let me manage my personal data,
So that future sessions benefit from past context and I maintain control over my data.

**Acceptance Criteria:**

**Given** a pipeline run completes successfully
**When** the session ends
**Then** talk metadata is stored including topic, date, audience level, format, eval scores, and style insights generated (FR-22)

**Given** stored talk metadata from multiple sessions
**When** a new pipeline run starts
**Then** the system is aware of previous talks for cross-session context

**Given** a speaker wants to view their stored personal data
**When** they access the data management interface
**Then** they can see all stored style preferences, past talk records, and evaluation history (NFR-19)

**Given** a speaker wants to delete their stored personal data
**When** they request deletion
**Then** the specified data (style preferences, past talk records, or all data) is permanently removed from storage (NFR-19)
**And** the deletion is logged in observability

**Given** a speaker deletes all style data
**When** the next pipeline run executes
**Then** the Writer reverts to cold start behaviour without error

## Epic 14: Complete Talk Package & Coaching

Speaker receives a full prep package (Q&A, timing cheat sheet, contingencies, social copy) with past-talk awareness for repetition avoidance, and can download all outputs.

### Story 14.1: Coach Agent & Past Talk RAG Tool

As a speaker,
I want the system to be aware of my previous talks and avoid repeating content,
So that each new talk brings fresh angles even on familiar topics.

**Acceptance Criteria:**

**Given** the Coach agent is defined in `src/mastra/agents/coach.ts`
**When** I inspect the agent configuration
**Then** it uses the Sonnet model tier
**And** it has a system prompt instructing it to review the complete talk and produce a prep package with awareness of past talks
**And** it has `CoachOutputSchema` (Zod) defining structured output with Q&A, timing cheat sheet, contingencies, abstract, and social copy sections
**And** it is bound to the `queryPastTalks` tool

**Given** the session history KB is defined in `src/mastra/rag/session-history.ts`
**When** I inspect the configuration
**Then** it indexes past talk content (scripts, topics, key points) into pgvector for retrieval

**Given** the `queryPastTalks` tool exists in `src/mastra/tools/query-past-talks.ts`
**When** invoked with the current talk's topic and key points
**Then** it returns relevant content from past talks that overlaps with the current talk
**And** it has explicit `inputSchema` and `outputSchema`

**Given** past talks exist in the session history KB
**When** the Coach agent generates its output
**Then** it flags content that overlaps with previous talks (FR-23)
**And** it suggests alternative angles or fresh perspectives to avoid repetition

**Given** no past talks exist (first session)
**When** the Coach agent executes
**Then** it produces the prep package without repetition analysis and no error occurs

**Given** the Coach agent is registered in `src/mastra/index.ts`
**When** I open Mastra Studio
**Then** the Coach agent is visible and testable in the Studio UI

### Story 14.2: Preparation Package Generation

As a speaker,
I want a comprehensive prep package covering Q&A, timing, contingencies, and promotion,
So that I am fully prepared for the conference beyond just the talk content.

**Acceptance Criteria:**

**Given** the pipeline has produced an approved script and slide specifications
**When** the Coach agent executes
**Then** it produces a prep package containing all of the following sections (FR-15):

**Given** the Q&A section
**When** I inspect the output
**Then** it contains anticipated questions including technical challenges, snarky/hostile questions, and clarification requests
**And** each question has a suggested response

**Given** the timing cheat sheet section
**When** I inspect the output
**Then** it contains per-section target times, transition cues, and "running long/short" adjustment suggestions

**Given** the contingencies section
**When** I inspect the output
**Then** it contains "if the demo fails" backup plans, "if the projector dies" alternatives, and "if you run out of time" cut priorities

**Given** the promotional section
**When** I inspect the output
**Then** it contains a conference abstract suitable for submission
**And** social media copy (tweet-length and longer-form) for promoting the talk

### Story 14.3: Output Packaging & Download

As a speaker,
I want to download all outputs as a single ZIP or individually, and export my data,
So that I have everything I need in one place and maintain data portability.

**Acceptance Criteria:**

**Given** the pipeline has completed with all outputs (speaker notes, slides, diagrams, prep package, scorecard)
**When** the speaker requests a ZIP download
**Then** all outputs are packaged into a single downloadable ZIP file (FR-17)
**And** the ZIP contains organised folders (e.g., `script/`, `slides/`, `diagrams/`, `prep/`, `eval/`)

**Given** the pipeline has completed
**When** the speaker requests individual file downloads
**Then** each output is available for individual download (FR-17)

**Given** a speaker wants to export all their data
**When** they run the export command
**Then** all data (style preferences, past talk records, evaluation history) is exported as structured JSON (NFR-20)
**And** the export includes a schema description for portability

**Given** the pipeline output
**When** I inspect the final workflow output
**Then** it contains references to all generated files and their locations
