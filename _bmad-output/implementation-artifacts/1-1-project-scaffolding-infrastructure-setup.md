# Story 1.1: Project Scaffolding & Infrastructure Setup

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a fully configured TalkForge project with all Phase 1 dependencies and infrastructure,
so that I can start building agents and workflows with a working development environment.

## Acceptance Criteria

1. **Given** a clean directory **When** I run the project initialization commands **Then** `package.json` exists with `@mastra/core`, `zod`, `mastra`, `vitest`, `typescript`, `@types/node`, and `@mastra/pg` as dependencies **And** `pnpm install` completes without errors (AC: #1)

2. **Given** the project is initialized **When** I inspect the configuration files **Then** `tsconfig.json` has ES2022 target, bundler module resolution, and strict mode enabled **And** `.env.example` contains `ANTHROPIC_API_KEY` and `DATABASE_URL` with documented defaults **And** `.gitignore` excludes `node_modules/`, `.env`, `.mastra/`, and `dist/` (AC: #2)

3. **Given** Docker is running **When** I run `docker compose up -d` **Then** PostgreSQL with pgvector starts on the configured port using `pgvector/pgvector:pg17` image (AC: #3)

4. **Given** dependencies are installed and Postgres is running **When** I run `pnpm dev` **Then** Mastra Studio UI is accessible at `localhost:4111` **And** `src/mastra/index.ts` registers a Mastra instance with PostgresStore **And** `src/mastra/config/models.ts` defines the tiered model mapping (Opus for Writer, Sonnet for Researcher, Haiku for eval/style) (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Initialize project with pnpm (AC: #1)
  - [x] 1.1 Run `pnpm init` in project root to create `package.json`
  - [x] 1.2 Install production dependencies: `pnpm add @mastra/core@latest zod@^4 @mastra/pg@latest pg`
  - [x] 1.3 Install dev dependencies: `pnpm add -D typescript @types/node mastra@latest vitest`
  - [x] 1.4 Add npm scripts to `package.json`: `"dev": "mastra dev"`, `"build": "mastra build"`, `"test": "vitest"`
  - [x] 1.5 Verify `pnpm install` completes without errors

- [x] Task 2: Create configuration files (AC: #2)
  - [x] 2.1 Create `tsconfig.json` with ES2022 target, bundler module resolution, strict mode, paths pointing to `src/`
  - [x] 2.2 Create `vitest.config.ts` with TypeScript support
  - [x] 2.3 Create `.env.example` with `ANTHROPIC_API_KEY=your-key-here` and `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/talkforge`
  - [x] 2.4 Create `.env` from `.env.example` (gitignored) with actual values
  - [x] 2.5 Create/update `.gitignore` to exclude `node_modules/`, `.env`, `.mastra/`, `dist/`

- [x] Task 3: Set up Docker Compose for PostgreSQL + pgvector (AC: #3)
  - [x] 3.1 Create `docker-compose.yml` with `pgvector/pgvector:pg17` image
  - [x] 3.2 Configure port mapping (5432:5432), volume for data persistence, environment vars (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
  - [x] 3.3 Verify `docker compose up -d` starts successfully and Postgres accepts connections

- [x] Task 4: Create Mastra entry point with PostgresStore (AC: #4)
  - [x] 4.1 Create directory structure: `src/mastra/`, `src/mastra/agents/`, `src/mastra/workflows/`, `src/mastra/tools/`, `src/mastra/schemas/`, `src/mastra/config/`, `src/mastra/agents/__tests__/`, `src/mastra/workflows/__tests__/`, `src/mastra/tools/__tests__/`
  - [x] 4.2 Create `src/mastra/index.ts` — instantiate `Mastra` with `PostgresStore` using `DATABASE_URL` from env
  - [x] 4.3 Create `src/mastra/config/models.ts` — export tiered model mapping constants
  - [x] 4.4 Verify `pnpm dev` starts Mastra Studio at `localhost:4111` without errors

- [x] Task 5: Verification tests (AC: #1-4)
  - [x] 5.1 Create `src/mastra/config/__tests__/models.test.ts` — verify model mapping exports correct tiers
  - [x] 5.2 Verify all acceptance criteria pass end-to-end

## Dev Notes

### Architecture Compliance

**CRITICAL — Follow these patterns exactly:**

- **Manual Installation path** — Do NOT use `mastra create` or `create-mastra`. The architecture explicitly selected Option B (manual installation) for learning value and exact tech stack control. [Source: architecture.md#Starter Template Evaluation]
- **PostgresStore required from Phase 1** — All Mastra state (workflow snapshots, threads, evals, traces) goes through PostgresStore. No in-memory or file-based storage. [Source: architecture.md#Data Architecture]
- **Storage auto-init** — Mastra automatically connects to DATABASE_URL, checks schema, and runs migrations on `mastra dev`. No manual migration commands needed. [Source: tessl docs - configuration.md#Storage and Database]
- **Single registration point** — `src/mastra/index.ts` is the ONLY place where agents, workflows, and storage are registered with the Mastra instance. [Source: architecture.md#Architectural Boundaries]

### Technical Requirements

**TypeScript Configuration:**
```jsonc
// tsconfig.json — MUST match these settings exactly
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".mastra"]
}
```
[Source: architecture.md#Starter Template Evaluation — Architectural Decisions Provided by Starter]

**Docker Compose:**
```yaml
# docker-compose.yml — MUST use this exact image
services:
  postgres:
    image: pgvector/pgvector:pg17
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: talkforge
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```
[Source: architecture.md#Data Architecture, epics.md#Story 1.1]

**Environment Variables:**
```bash
# .env.example
ANTHROPIC_API_KEY=your-anthropic-api-key-here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/talkforge
```
[Source: architecture.md#Authentication & Security]

### Library & Framework Requirements

**Production Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@mastra/core` | latest | Mastra framework core — agents, workflows, tools |
| `zod` | ^4 | Schema validation, structured output |
| `@mastra/pg` | latest | PostgresStore for Mastra state persistence |
| `pg` | latest | PostgreSQL client (peer dep of @mastra/pg) |

**Dev Dependencies:**
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | latest | TypeScript compiler |
| `@types/node` | latest | Node.js type definitions |
| `mastra` | latest | Mastra CLI (`mastra dev`, `mastra build`) |
| `vitest` | latest | Test framework |

[Source: architecture.md#Starter Template Evaluation — Initialization Commands]

**CRITICAL version notes:**
- Architecture references Mastra 1.3.1 but use `@latest` at install time to get current stable
- Zod v4 is specified — verify import paths match v4 API (potential breaking changes from v3)
- Node.js >= 22.13.0 is REQUIRED by Mastra
[Source: architecture.md#Technical Constraints & Dependencies]

### File Structure Requirements

```
project-root/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── docker-compose.yml
├── .env
├── .env.example
├── .gitignore
└── src/
    └── mastra/
        ├── index.ts                  # Mastra entry point — registers agents, workflows, storage
        ├── config/
        │   ├── models.ts             # Tiered model mapping per agent role
        │   └── __tests__/
        │       └── models.test.ts
        ├── agents/
        │   └── __tests__/
        ├── workflows/
        │   ├── gates/
        │   └── __tests__/
        ├── tools/
        │   └── __tests__/
        └── schemas/
```
[Source: architecture.md#Complete Project Directory Structure]

### Testing Requirements

- **Framework:** Vitest
- **Location:** Co-located `__tests__/` directories next to source
- **This story:** Create `models.test.ts` to verify model tier exports
- **Pattern:** Every story includes tests — this is the cross-cutting convention (NFR-22)
- **Running:** `pnpm test` must work after setup
[Source: architecture.md#Implementation Patterns, epics.md#Cross-Cutting Convention: Testing]

### Model Tier Mapping (models.ts)

The dev MUST create this mapping in `src/mastra/config/models.ts`:

| Role | Model ID | Constant Name |
|------|----------|---------------|
| Researcher | `anthropic/claude-sonnet-4-5` | Sonnet tier |
| Architect | `anthropic/claude-sonnet-4-5` | Sonnet tier |
| Writer | `anthropic/claude-opus-4-6` | Opus tier |
| Designer | `anthropic/claude-sonnet-4-5` | Sonnet tier |
| Coach | `anthropic/claude-sonnet-4-5` | Sonnet tier |
| Style Learner | `anthropic/claude-haiku-4-5` | Haiku tier |
| Eval judges | `anthropic/claude-haiku-4-5` | Haiku tier |

[Source: architecture.md#LLM Model Selection]

### Mastra index.ts Pattern

```typescript
// src/mastra/index.ts — PATTERN (verify exact API at implementation time)
import { Mastra } from '@mastra/core';
import { PostgresStore } from '@mastra/pg';

export const mastra = new Mastra({
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL!,
  }),
  // agents and workflows registered here as they're built in later stories
});
```

**IMPORTANT:** The exact `Mastra` constructor and `PostgresStore` API MUST be verified against current @mastra/core docs before implementation. Use the `/mastra` skill or check embedded docs in the installed package. The tessl tile covers CLI only, not the programmatic API.

[Source: architecture.md#Storage Boundary, architecture.md#Architectural Boundaries]

### Project Structure Notes

- This story creates the foundation structure — all subsequent stories add files INTO this structure
- The `src/mastra/` directory is Mastra's convention for the entry point
- Empty `__tests__/` directories created now ensure the pattern is established from the start
- `docker-compose.yml` lives at project root alongside `package.json`
- `.mastra/` directory is auto-generated by `mastra dev` / `mastra build` — MUST be gitignored

### References

- [Source: architecture.md#Starter Template Evaluation] — Manual installation decision, init commands
- [Source: architecture.md#Data Architecture] — PostgresStore, pgvector, Docker Compose
- [Source: architecture.md#LLM Model Selection] — Tiered model mapping table
- [Source: architecture.md#Implementation Patterns & Consistency Rules] — Naming conventions, project structure
- [Source: architecture.md#Complete Project Directory Structure] — Full file tree with phase annotations
- [Source: architecture.md#Architectural Boundaries] — Agent, Workflow, Tool, Storage, Schema boundaries
- [Source: architecture.md#Infrastructure & Deployment] — mastra dev, localhost:4111
- [Source: epics.md#Story 1.1] — Acceptance criteria, Docker Compose specifics
- [Source: epics.md#Cross-Cutting Convention: Testing] — Co-located tests in __tests__/

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Verified PostgresStore API against embedded docs (@mastra/pg 1.6.0) — `id` parameter now required (not in story pattern)
- Peer dependency warnings for zod v4 vs v3 expected by @ai-sdk packages — non-blocking, zod v4 specified by architecture
- pnpm enabled via corepack (v10.30.1)
- esbuild build scripts approved via `pnpm.onlyBuiltDependencies` in package.json

### Completion Notes List

- All 5 tasks and 19 subtasks completed successfully
- Manual installation path followed (no `mastra create` or `create-mastra`)
- Installed: @mastra/core 1.6.0, @mastra/pg 1.6.0, zod 4.3.6, pg 8.18.0, typescript 5.9.3, mastra CLI 1.3.3, vitest 4.0.18
- PostgresStore configured with required `id` parameter (verified against current embedded docs)
- Model tier mapping created with 7 agent roles across 3 tiers (Opus/Sonnet/Haiku)
- Docker Compose verified: pgvector/pgvector:pg17 starts and accepts connections
- Mastra Studio confirmed accessible at localhost:4111
- All 7 unit tests pass, TypeScript compilation clean

### Change Log

- 2026-02-23: Story 1.1 implementation complete — project scaffolding with all Phase 1 dependencies, configuration files, Docker Compose for PostgreSQL/pgvector, Mastra entry point with PostgresStore, tiered model mapping, and verification tests

### File List

- package.json (new)
- pnpm-lock.yaml (new)
- tsconfig.json (new)
- vitest.config.ts (new)
- docker-compose.yml (new)
- .env.example (new)
- .env (new, gitignored)
- .gitignore (modified — added .mastra/)
- src/mastra/index.ts (new)
- src/mastra/config/models.ts (new)
- src/mastra/config/__tests__/models.test.ts (new)
