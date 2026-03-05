# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mastra agents to build presentations using BMAD and Claude Code. This is a Node.js/TypeScript project using pnpm with strict TypeScript enabled.

## Project Status

Epics 1-3 complete. Epic 4 (Quality Evaluation & Insights) sprint open — evals API spike done, story 4-1 ready for dev.

## Development Commands

- `docker compose up -d` — Start PostgreSQL + pgvector (required before dev)
- `pnpm dev` — Start Mastra dev server (auto-inits PostgresStore)
- `pnpm build` — Production build via Mastra CLI
- `pnpm test` — Run Vitest suite
- `pnpm typecheck` — TypeScript type checking (no emit)
- `pnpm eval` — Run eval scorers (`npx tsx src/eval.ts`)

## Environment

- Copy `.env.example` to `.env` and fill in values
- Required: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` (embeddings only), `DATABASE_URL`
- Default DB: `postgresql://postgres:postgres@localhost:5432/slidewreck`
- PostgresStore is mandatory (no in-memory fallback)
- `OPENAI_API_KEY` is used only for `text-embedding-3-small` (1536-dim, cosine) in pgvector — all LLM inference uses Anthropic

## Project Structure

- `src/mastra/index.ts` — Single registration point for all agents, workflows, and tools
- `src/mastra/agents/` — AI agent definitions
- `src/mastra/workflows/` — Multi-step workflows with gates
- `src/mastra/rag/` — RAG indexing (best practices KB, user reference materials)
- `src/mastra/tools/` — Tool functions for agents
- `src/mastra/schemas/` — Zod validation schemas
- `src/mastra/config/` — Model tiers, shared PgVector instance, and configuration
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
- Follow the **Defensive Validation Checklist** in `_bmad-output/planning-artifacts/architecture.md` for all new schemas and tools
- Follow the **Mastra API Verification Checklist** in `_bmad-output/planning-artifacts/architecture.md` when introducing any new Mastra API
- Follow the **Suspend/Resume Path Checklist** in `_bmad-output/planning-artifacts/architecture.md` for all steps using `suspend()`/`resume()` — test all 4 resume paths
- Follow the **No Unsafe Type Coercion Rule** in `_bmad-output/planning-artifacts/architecture.md` — no `as unknown as` patterns, use Zod `.parse()` or explicit throws
- Review **Known Limitations** in `_bmad-output/planning-artifacts/architecture.md` before assuming Mastra API behaviour

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

## Sprint Process

- **One epic per sprint** — finish epic → retro → execute action items → sprint planning → next epic. No back-to-back epics without executing retro action items.
- **API Verification Spike before sprint planning** — when introducing a new Mastra API surface (evals, memory, etc.), run a focused spike to verify API shape, imports, constructor params, and return types against the installed version. Story specs must reference verified behaviour, not assumed behaviour.
- **Fixes to main go direct** — bugs found in shared code (e.g., model tier in `researcher.ts`) are fixed on `main` first. Feature branches rebase onto updated `main`. Never fix main-level bugs on feature branches that get squash-merged — the fix will revert.

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
