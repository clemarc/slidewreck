---
title: 'README & Observability Setup'
slug: 'readme-and-observability-setup'
created: '2026-02-26'
status: 'review'
stepsCompleted: [1, 2, 3, 4, 5]
tech_stack: ['Node.js', 'TypeScript (strict, ES2022)', 'pnpm', 'Mastra core 1.8.0', 'Mastra pg 1.7.0', 'Docker (pgvector/pg17)', 'Vitest']
files_to_modify: ['README.md', '.env.example', 'src/mastra/index.ts']
code_patterns: ['pnpm scripts for dev/build/test/typecheck', 'Docker Compose for DB', '.env for secrets and config', 'Mastra constructor accepts logger option']
test_patterns: ['Vitest with co-located __tests__/ dirs', 'Unit test for logger configuration']
---

# Tech-Spec: README & Observability Setup

**Created:** 2026-02-26

## Overview

### Problem Statement

The project has no meaningful README — anyone cloning the repo has zero guidance on setup, running, or understanding the project. Additionally, agent execution produces no visible logs because no logger is configured on the Mastra instance. The built-in `ConsoleLogger` defaults to INFO level in dev but is not explicitly wired up, and no log-level env var exists to control verbosity.

### Solution

Write a comprehensive README covering the full setup-to-run flow plus project overview. Configure Mastra's built-in `ConsoleLogger` with an env-var-driven log level so agent, workflow, and tool execution logs are visible. Add relevant env vars to `.env.example`.

### Scope

**In Scope:**
- README with: project overview, prerequisites, setup steps (clone → docker → env → dev), running tests, project structure, workflow explanation, model tier mapping, observability explanation
- Configure `ConsoleLogger` in `src/mastra/index.ts` with log level driven by `LOG_LEVEL` env var (default: `DEBUG` in dev)
- Add `LOG_LEVEL`, `MASTRA_DEBUG`, `DEBUG`, and `MASTRA_TELEMETRY_DISABLED` to `.env.example` with comments
- Explain where to get `ANTHROPIC_API_KEY`

**Out of Scope:**
- `@mastra/observability` package / structured span-based tracing (future improvement)
- OpenTelemetry / `@mastra/otel-bridge` integration (future improvement)
- Deployment docs
- Contributing guidelines
- CI/CD documentation

## Context for Development

### Codebase Patterns

- Project uses pnpm as package manager (`packageManager` field specifies `pnpm@10.30.1`)
- Docker Compose for Postgres+pgvector (required before dev)
- Mastra CLI for dev server (`mastra dev` on port 4111) and builds (`mastra build`)
- Strict TypeScript with ES2022 target
- Vitest for testing with co-located `__tests__/` directories
- Two implemented agents: Researcher (Sonnet) and Writer (Opus)
- Five additional planned agent roles in `models.ts`: architect, designer, coach, styleLearner, eval
- Main workflow: slidewreck (research → human gate → write → human gate)
- `Mastra` constructor accepts `logger` option — currently not set, using implicit default

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `README.md` | Current bare-bones README to be replaced |
| `.env.example` | Environment template — needs logger and debug vars added |
| `src/mastra/index.ts` | Registration point — needs logger configuration added |
| `src/mastra/config/models.ts` | Model tier mapping (7 roles, 2 implemented) |
| `docker-compose.yml` | Postgres+pgvector setup |
| `package.json` | Scripts, dependencies, and `packageManager` field |
| `src/mastra/agents/researcher.ts` | Researcher agent definition |
| `src/mastra/agents/writer.ts` | Writer agent definition |
| `src/mastra/workflows/slidewreck.ts` | Main workflow with human gates |
| `src/mastra/workflows/gates/review-gate.ts` | Human review gate logic |
| `src/mastra/schemas/workflow-input.ts` | Input schema with format/duration mapping |

### Technical Decisions

- Use Mastra's built-in `ConsoleLogger` (from `@mastra/core/logger`) rather than installing `@mastra/observability` or a third-party logger. This is the minimum viable approach — no new deps.
- Log level controlled by `LOG_LEVEL` env var, defaulting to `DEBUG` so agent logs are visible out of the box in development.
- `MASTRA_DEBUG=1` and `DEBUG=1` are CLI-level debug flags (bundler, startup, server info) — distinct from agent execution logging. Both are documented but clearly differentiated in the README.
- `MASTRA_TELEMETRY_DISABLED=1` is set by default in `.env.example` as a privacy-first default — developers can remove it to opt in to Mastra analytics.
- README targets developers familiar with Node/TypeScript but not necessarily Mastra.

### Mastra Logger API (verified from @mastra/core types)

The `Mastra` constructor accepts:
```typescript
{ logger?: TLogger | false }
```

`ConsoleLogger` is the built-in implementation supporting log levels: `DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE`.

Log types include: `AGENT`, `WORKFLOW`, `LLM`, `TOOL`, `NETWORK`, `STORAGE`, and more.

Default behavior without explicit config: INFO in development, WARN in production.

## Implementation Plan

### Tasks

- [ ] Task 1: Configure ConsoleLogger in `src/mastra/index.ts`
  - File: `src/mastra/index.ts`
  - Action:
    1. Import `createLogger` from `@mastra/core/logger` (verify exact import path from installed package before using — check `node_modules/@mastra/core/dist/logger/` exports)
    2. Create a logger instance configured with log level from `process.env.LOG_LEVEL` (default to `'DEBUG'`), mapping the string to the appropriate Mastra log level enum/type
    3. Pass the logger to the `Mastra` constructor: `logger: loggerInstance`
  - Notes: Keep the change minimal — just add logger config, don't restructure the file. Verify the exact API by reading the installed package types before implementing. The logger API may use `createLogger({ level: 'DEBUG' })` or `new ConsoleLogger({ level: 'DEBUG' })` — check the actual exports.

- [ ] Task 2: Add env vars to `.env.example`
  - File: `.env.example`
  - Action: Update the file with grouped, commented sections:
    ```
    # Anthropic — get your key at https://console.anthropic.com/
    ANTHROPIC_API_KEY=your-anthropic-api-key-here

    # Database
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/slidewreck

    # Logging — controls Mastra agent/workflow/tool log output
    # Valid levels: DEBUG, INFO, WARN, ERROR, NONE
    LOG_LEVEL=DEBUG

    # CLI Debug — enables Mastra CLI debug output (bundler, server startup)
    # MASTRA_DEBUG=1
    # DEBUG=1

    # Telemetry — uncomment to disable Mastra analytics (privacy default: disabled)
    MASTRA_TELEMETRY_DISABLED=1
    ```
  - Notes: `MASTRA_DEBUG` and `DEBUG` are commented out by default (most devs won't need CLI internals). `LOG_LEVEL=DEBUG` is active by default so agent logs appear immediately. `MASTRA_TELEMETRY_DISABLED=1` is active as a privacy-first default.

- [ ] Task 3: Rewrite `README.md` with comprehensive project documentation
  - File: `README.md`
  - Action: Replace the single-line README with a full document containing the following sections in order:
    1. **Project title + description** — What Slidewreck is (Mastra-powered agents that generate conference talk scripts using Claude)
    2. **Prerequisites** — Node.js (recommend 22+, minimum 18+), pnpm (corepack: `corepack enable`), Docker, Anthropic API key
    3. **Getting Started** — Step-by-step: clone repo, `docker compose up -d`, `cp .env.example .env`, fill in `ANTHROPIC_API_KEY` (link to https://console.anthropic.com/), `pnpm install`, `pnpm dev`, note that dev server starts at `http://localhost:4111`
    4. **Development Commands** — Table of `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck` with descriptions
    5. **Project Structure** — Directory tree of `src/mastra/` showing: `index.ts`, `agents/` (researcher, writer), `workflows/` (slidewreck, gates/), `tools/` (web-search, check-jargon, word-count-to-time), `schemas/` (workflow-input, workflow-output, gate-payloads), `config/` (models). Include `__tests__/` directories to show co-location pattern.
    6. **How It Works** — Workflow overview: input (topic, audienceLevel, format) → Researcher agent (web search + fetch, Sonnet) → human review gate (approve/revise/reject with feedback) → Writer agent (script with timing markers, Opus) → human review gate → final output with metadata. Mention format durations (lightning 5-10m, standard 25-45m, keynote 45-60m).
    7. **Model Tiers** — Table showing all 7 roles from `models.ts` with their Claude model. Note which agents are currently implemented (researcher, writer) vs planned.
    8. **Logging & Debugging** — Three tiers clearly explained:
       - **Agent logging** (`LOG_LEVEL`): Controls Mastra's built-in logger output for agent runs, tool calls, workflow steps. Set to `DEBUG` by default in `.env`.
       - **CLI debug** (`MASTRA_DEBUG=1`, `DEBUG=1`): Shows Mastra CLI internals — bundler, server startup, package detection. Useful for troubleshooting `mastra dev` / `mastra build` issues.
       - **Telemetry** (`MASTRA_TELEMETRY_DISABLED=1`): Disables Mastra's PostHog analytics. Disabled by default.
       - **Future**: Structured tracing via `@mastra/observability` and OpenTelemetry integration.
    9. **Environment Variables** — Table of all env vars from `.env.example` with descriptions and default values
  - Notes: Use concise markdown. No badges or shields. Keep it scannable. Enumerate the actual directory tree from the filesystem to ensure accuracy.

### Acceptance Criteria

- [ ] AC 1: Given a fresh clone of the repo, when a developer follows the Getting Started steps in the README, then `pnpm dev` starts the Mastra dev server at `http://localhost:4111` without errors (assuming Docker is running and `ANTHROPIC_API_KEY` is set).
- [ ] AC 2: Given `.env.example`, when a developer reads it, then every variable has a comment explaining its purpose and where to get values. `ANTHROPIC_API_KEY` links to `console.anthropic.com`.
- [ ] AC 3: Given `LOG_LEVEL=DEBUG` is set in `.env`, when running `pnpm dev` and triggering the slidewreck workflow, then agent/workflow/tool log output from Mastra's ConsoleLogger is visible in the terminal.
- [ ] AC 4: Given the README Logging & Debugging section, when a developer reads it, then they understand the difference between agent logging (`LOG_LEVEL`), CLI debug (`MASTRA_DEBUG`), and telemetry (`MASTRA_TELEMETRY_DISABLED`).
- [ ] AC 5: Given the README Project Structure section, when a developer reads it, then they can locate agents, workflows (including gates), tools, schemas, and config in the codebase.
- [ ] AC 6: Given `src/mastra/index.ts`, when `LOG_LEVEL` env var is not set, then the logger defaults to `DEBUG` level. When set to `WARN`, only warnings and errors are logged.

## Additional Context

### Dependencies

No new package dependencies required. `ConsoleLogger` / `createLogger` is built into `@mastra/core` which is already installed.

### Testing Strategy

- **Unit test** for Task 1: Verify that the Mastra instance is created with a logger configured at the expected log level based on env var. Test file: `src/mastra/__tests__/index.test.ts` (or extend existing test file if one exists).
- **Manual verification** for Tasks 2-3:
  1. Follow the README Getting Started steps to confirm accuracy
  2. Run `pnpm dev`, trigger the workflow, confirm agent logs appear in terminal with `LOG_LEVEL=DEBUG`
  3. Set `LOG_LEVEL=WARN` and confirm debug/info logs are suppressed
  4. Verify all env vars in `.env.example` have explanatory comments

### Notes

- Keep README length reasonable — comprehensive but not bloated
- The workflow is still in Phase 1 development — README should reflect current state (2 agents implemented, 5 planned)
- Future enhancements: `@mastra/observability` for structured span-based tracing, `@mastra/otel-bridge` for OpenTelemetry integration
- Verify `createLogger` / `ConsoleLogger` import path from installed `@mastra/core` package before implementing — the exact export may vary by version
