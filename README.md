# Slidewreck

Mastra-powered AI agents that generate conference talk scripts using Claude. Give it a topic, audience level, and talk format — it researches the subject using RAG-augmented retrieval, designs a talk structure, then writes a timed speaker script with human review gates at each stage.

Built with [Mastra](https://mastra.ai), TypeScript, and Anthropic's Claude models.

## Prerequisites

- **Node.js** 22+ recommended (minimum 18+)
- **pnpm** — enable via Corepack: `corepack enable`
- **Docker** — for PostgreSQL + pgvector
- **Anthropic API key** — [get one here](https://console.anthropic.com/) — powers all LLM inference
- **OpenAI API key** — [get one here](https://platform.openai.com/api-keys) — used for text embeddings only (RAG vector search)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/bmadcode/bmad-mastra-presentation.git
cd bmad-mastra-presentation

# Start the database
docker compose up -d

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY and OPENAI_API_KEY

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

The Mastra dev server starts at `http://localhost:4111`.

## Development Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Mastra dev server on port 4111 |
| `pnpm build` | Production build via Mastra CLI |
| `pnpm test` | Run Vitest test suite |
| `pnpm typecheck` | TypeScript type checking (no emit) |

## Project Structure

```
src/mastra/
├── index.ts                         # Mastra instance — agents, workflows, vectors, logger
├── agents/
│   ├── researcher.ts                # Research agent (Sonnet) — web search + RAG retrieval
│   ├── talk-architect.ts            # Talk structure agent (Sonnet) — 3 structure options
│   ├── writer.ts                    # Script writer agent (Opus) — timed scripts
│   └── __tests__/
├── workflows/
│   ├── slidewreck.ts                # Main workflow — RAG init → research → architect → write
│   ├── gates/
│   │   ├── review-gate.ts           # Human review gate (approve/revise/reject)
│   │   └── __tests__/
│   └── __tests__/
├── rag/
│   ├── best-practices.ts            # Best practices KB indexing (chunking + embedding)
│   ├── best-practices-content.ts    # Curated conference talk guidance (~3,000 words)
│   ├── user-references.ts           # Speaker reference material indexing (file/URL/PDF)
│   └── __tests__/
├── tools/
│   ├── web-search.ts                # Anthropic web search & fetch tools
│   ├── query-best-practices.ts      # RAG query tool — curated best practices KB
│   ├── query-user-references.ts     # RAG query tool — speaker-uploaded materials
│   ├── estimate-timing.ts           # Section timing estimation for architect
│   ├── check-jargon.ts              # Jargon detection by audience level
│   ├── word-count-to-time.ts        # Word count → speaking duration
│   └── __tests__/
├── schemas/
│   ├── workflow-input.ts            # Input validation + format duration ranges
│   ├── workflow-output.ts           # Final deliverable schema
│   ├── gate-payloads.ts             # Human gate payload schemas
│   └── __tests__/
└── config/
    ├── models.ts                    # Model tier mapping (7 roles)
    ├── database.ts                  # Shared PgVector instance
    └── __tests__/
```

## How It Works

The **slidewreck** workflow accepts these inputs:

- **topic** — what the talk is about
- **audienceLevel** — beginner, intermediate, advanced, or mixed
- **format** — lightning (5-10 min), standard (25-45 min), or keynote (45-60 min)
- **constraints** (optional) — free-text speaker preferences (e.g., "Focus on observability, avoid Kubernetes")
- **referenceMaterials** (optional) — speaker-provided files or URLs to incorporate via RAG

The workflow runs through these steps:

1. **RAG initialization** — seeds the best practices knowledge base and indexes any speaker reference materials into pgvector
2. **Researcher agent** (Sonnet) — searches the web, queries the RAG knowledge bases, and synthesizes a structured research brief with source attribution
3. **Human review gate** — approve the research, request revisions, or reject
4. **Talk Architect agent** (Sonnet) — designs 3 distinct structure options with section breakdowns and timing estimates (skipped for lightning format)
5. **Human review gate** — pick a structure or reject for new options
6. **Writer agent** (Opus) — produces a timed speaker script with section markers, jargon checks, and word-count-based timing
7. **Human review gate** — approve the script, request revisions, or reject
8. **Output assembly** — packages the final deliverable with metadata

For a detailed walkthrough of every step, the RAG pipeline, and graceful degradation behavior, see [docs/workflow.md](docs/workflow.md).

## RAG: Reference Materials and Best Practices

The workflow uses Retrieval-Augmented Generation (RAG) to ground agent output in relevant context:

**Best Practices KB** — A curated knowledge base of conference talk guidance (structure patterns, opening hooks, audience engagement, pacing, closings) is automatically indexed before each run. This ensures consistent quality guidance regardless of what the LLM "remembers" about public speaking.

**Speaker Reference Materials** — Optionally provide your own blog posts, documentation, code samples, or prior talks. These are chunked, embedded, and made available to the Researcher agent so the output reflects your voice and expertise.

Supported reference material formats:
- **PDF** files (`.pdf`) — text extracted via `unpdf`
- **Markdown** files (`.md`) — preserves heading structure
- **Plain text** files (`.txt`, etc.)
- **URLs** — fetched and parsed as HTML (30-second timeout)

The RAG system degrades gracefully — if any reference material fails to load, or if the embedding service is unavailable, the workflow continues with web search as a fallback. No single RAG failure blocks the pipeline.

Both knowledge bases use OpenAI's `text-embedding-3-small` model (1536 dimensions, cosine similarity) stored in pgvector. This is the only component that requires the `OPENAI_API_KEY` — all LLM inference uses Anthropic.

## Model Tiers

Each agent role maps to a Claude model tier based on the task complexity:

| Role | Model | Status |
| --- | --- | --- |
| writer | Claude Opus 4.6 | Implemented |
| researcher | Claude Sonnet 4.5 | Implemented |
| architect | Claude Sonnet 4.5 | Implemented |
| designer | Claude Sonnet 4.5 | Planned |
| coach | Claude Sonnet 4.5 | Planned |
| styleLearner | Claude Haiku 4.5 | Planned |
| eval | Claude Haiku 4.5 | Planned |

## Logging & Debugging

Three levels of debug output are available:

### Agent logging (`LOG_LEVEL`)

Controls Mastra's built-in ConsoleLogger output for agent runs, tool calls, and workflow steps. Set in `.env`:

```bash
LOG_LEVEL=DEBUG   # DEBUG, INFO, WARN, ERROR, or NONE
```

Set to `DEBUG` by default so agent logs are visible out of the box during development.

### CLI debug (`MASTRA_DEBUG`, `DEBUG`)

Shows Mastra CLI internals — bundler output, server startup, package detection. Useful for troubleshooting `mastra dev` or `mastra build` issues:

```bash
MASTRA_DEBUG=1
DEBUG=1
```

These are commented out in `.env.example` by default since most developers won't need CLI-level debug output.

### Telemetry (`MASTRA_TELEMETRY_DISABLED`)

Disables Mastra's PostHog analytics. Disabled by default as a privacy-first setting:

```bash
MASTRA_TELEMETRY_DISABLED=1
```

### Future

Structured tracing via `@mastra/observability` and OpenTelemetry integration are planned for a future phase.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic API key ([get one](https://console.anthropic.com/)) — all LLM inference | — |
| `OPENAI_API_KEY` | OpenAI API key ([get one](https://platform.openai.com/api-keys)) — text embeddings for RAG only | — |
| `DATABASE_URL` | PostgreSQL + pgvector connection string | `postgresql://postgres:postgres@localhost:5432/slidewreck` |
| `LOG_LEVEL` | Agent/workflow log verbosity: `DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE` | `DEBUG` |
| `MASTRA_DEBUG` | Enable Mastra CLI debug output | — |
| `DEBUG` | Enable general CLI debug output | — |
| `MASTRA_TELEMETRY_DISABLED` | Disable Mastra PostHog analytics | `1` (disabled) |
