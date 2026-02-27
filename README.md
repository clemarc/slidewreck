# Slidewreck

Mastra-powered AI agents that generate conference talk scripts using Claude. Give it a topic, audience level, and talk format — it researches the subject, then writes a timed speaker script with human review gates at each stage.

Built with [Mastra](https://mastra.ai), TypeScript, and Anthropic's Claude models.

## Prerequisites

- **Node.js** 22+ recommended (minimum 18+)
- **pnpm** — enable via Corepack: `corepack enable`
- **Docker** — for PostgreSQL + pgvector
- **Anthropic API key** — [get one here](https://console.anthropic.com/)

## Getting Started

```bash
# Clone the repo
git clone https://github.com/bmadcode/bmad-mastra-presentation.git
cd bmad-mastra-presentation

# Start the database
docker compose up -d

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

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
├── index.ts                         # Mastra instance — agents, workflows, logger
├── agents/
│   ├── researcher.ts                # Research agent (Sonnet) — web search & fetch
│   ├── writer.ts                    # Script writer agent (Opus) — timed scripts
│   └── __tests__/
├── workflows/
│   ├── slidewreck.ts                # Main workflow — research → review → write → review
│   ├── gates/
│   │   ├── review-gate.ts           # Human review gate (approve/revise/reject)
│   │   └── __tests__/
│   └── __tests__/
├── tools/
│   ├── web-search.ts                # Anthropic web search & fetch tools
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
    └── __tests__/
```

## How It Works

The **slidewreck** workflow takes three inputs:

- **topic** — what the talk is about
- **audienceLevel** — beginner, intermediate, or advanced
- **format** — lightning (5–10 min), standard (25–45 min), or keynote (45–60 min)

The workflow runs through five steps:

1. **Researcher agent** (Sonnet) — searches the web and synthesizes a structured research brief
2. **Human review gate** — approve the research, request revisions, or reject
3. **Writer agent** (Opus) — produces a timed speaker script with section markers, jargon checks, and word-count-based timing
4. **Human review gate** — approve the script, request revisions, or reject
5. **Output assembly** — packages the final deliverable with metadata

## Model Tiers

Each agent role maps to a Claude model tier based on the task complexity:

| Role | Model | Status |
| --- | --- | --- |
| writer | Claude Opus 4.6 | Implemented |
| researcher | Claude Sonnet 4.5 | Implemented |
| architect | Claude Sonnet 4.5 | Planned |
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
| `ANTHROPIC_API_KEY` | Anthropic API key ([get one](https://console.anthropic.com/)) | — |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/slidewreck` |
| `LOG_LEVEL` | Agent/workflow log verbosity: `DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE` | `DEBUG` |
| `MASTRA_DEBUG` | Enable Mastra CLI debug output | — |
| `DEBUG` | Enable general CLI debug output | — |
| `MASTRA_TELEMETRY_DISABLED` | Disable Mastra PostHog analytics | `1` (disabled) |
