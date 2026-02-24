# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mastra agents to build presentations using BMAD and Claude Code. This is a Node.js/TypeScript project using pnpm with strict TypeScript enabled.

## Project Status

Phase 1 in progress — project scaffolding complete (story 1.1), building agents and workflows.

## Development Commands

- `docker compose up -d` — Start PostgreSQL + pgvector (required before dev)
- `pnpm dev` — Start Mastra dev server (auto-inits PostgresStore)
- `pnpm build` — Production build via Mastra CLI
- `pnpm test` — Run Vitest suite

## Environment

- Copy `.env.example` to `.env` and fill in values
- Required: `ANTHROPIC_API_KEY`, `DATABASE_URL`
- Default DB: `postgresql://postgres:postgres@localhost:5432/talkforge`
- PostgresStore is mandatory (no in-memory fallback)

## Project Structure

- `src/mastra/index.ts` — Single registration point for all agents, workflows, and tools
- `src/mastra/agents/` — AI agent definitions
- `src/mastra/workflows/` — Multi-step workflows with gates
- `src/mastra/tools/` — Tool functions for agents
- `src/mastra/schemas/` — Zod validation schemas
- `src/mastra/config/` — Model tiers and shared configuration
- `_bmad-output/` — BMAD planning & implementation artifacts (do not edit manually)

## Testing

- **TDD is mandatory** — always write failing tests first, then implement minimal code to pass, then refactor (red-green-refactor)
- Never write implementation code without a corresponding test
- File pattern: `src/**/__tests__/**/*.test.ts`
- Tests are co-located with source in `__tests__/` subdirectories
- Vitest with globals enabled, node environment
- Run `pnpm test` to verify before marking any task complete

## Mastra Conventions

- Manual installation (not `mastra create`) — do not use scaffolding commands
- Register all agents, workflows, and tools in `src/mastra/index.ts`
- Use `query_library_docs` MCP tool before implementing Mastra features to verify current APIs

## Model Tiers

Agent roles map to model tiers in `src/mastra/config/models.ts`:

- Opus: writer (highest quality)
- Sonnet: researcher, architect, designer, coach
- Haiku: styleLearner, eval (fast/cheap)

## Key References

- Architecture decisions: `_bmad-output/planning-artifacts/architecture.md`
- Epic/story breakdown: `_bmad-output/planning-artifacts/epics.md`
- PRD: `_bmad-output/planning-artifacts/PRD.md`
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Git & PR Workflow

### Story completions (`dev-story`)

When the `dev-story` workflow completes and a story moves to **review** status:

1. **Create a feature branch** from main named `story/<story-key>` (e.g., `story/1-1-project-scaffolding-infrastructure-setup`)
2. **Stage and commit** all implementation files with a message referencing the story
3. **Create a GitHub PR** using `gh pr create`:
   - Title: `Story <X.Y>: <story title>`
   - Body: the full content of the story implementation artifact markdown file (`_bmad-output/implementation-artifacts/<story-key>.md`)
4. The PR becomes the review surface for the Code Review step (`/bmad-bmm-code-review`)

### Quick-dev completions (`quick-dev`)

When the `quick-dev` workflow completes (step 6 resolve-findings done):

1. **Create a feature branch** from main named `quick/<slug>` (e.g., `quick/github-actions-ci-pipeline`)
2. **Stage and commit** all implementation files with a message referencing the tech-spec title
3. **Create a GitHub PR** using `gh pr create`:
   - Title: the tech-spec title
   - Body: the full content of the tech-spec file (`_bmad-output/implementation-artifacts/tech-spec-<slug>.md`)

@AGENTS.md
