# Story 3.1: RAG Infrastructure & Best Practices Knowledge Base

Status: review

## Story

As a developer,
I want RAG infrastructure configured with a talk best practices knowledge base,
so that agents can retrieve curated guidance on effective conference presentations.

## Acceptance Criteria

1. **Given** the project dependencies **When** I inspect `package.json` **Then** `@mastra/rag` is included as a dependency (AC: #1)

2. **Given** the RAG infrastructure in `src/mastra/rag/best-practices.ts` **When** I inspect the configuration **Then** it defines a knowledge base using pgvector as the vector store **And** it contains curated content on talk best practices (structure, pacing, hooks, audience engagement) **And** it uses document chunking appropriate for retrieval (AC: #2)

3. **Given** the best practices KB is populated **When** I query it with a topic like "how to open a technical talk" **Then** it returns relevant chunks from the best practices content (AC: #3)

4. **Given** the RAG configuration is registered in `src/mastra/index.ts` **When** I open Mastra Studio **Then** the knowledge base is visible and queryable (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Install `@mastra/rag` dependency and embedding provider (AC: #1)
  - [x] 1.1 Run `pnpm add @mastra/rag @ai-sdk/openai`
  - [x] 1.2 Add `OPENAI_API_KEY` to `.env.example` with comment explaining it's used for embeddings only
  - [x] 1.3 Write Mastra API verification test: confirm `MDocument`, `createVectorQueryTool` imports from `@mastra/rag` resolve correctly
  - [x] 1.4 Write Mastra API verification test: confirm `PgVector.createIndex`, `PgVector.upsert`, `PgVector.query` signatures from `@mastra/pg`

- [x] Task 2: Create best practices content and chunking infrastructure (AC: #2)
  - [x] 2.1 Write TDD test: `MDocument.fromText(content).chunk()` produces non-empty chunks array
  - [x] 2.2 Write TDD test: chunks have `.text` property with non-empty content
  - [x] 2.3 Create `src/mastra/rag/best-practices-content.ts` — export curated best practices content as string constant
  - [x] 2.4 Create `src/mastra/rag/best-practices.ts` — export functions for creating MDocument, chunking, embedding, and indexing the best practices content into pgvector

- [x] Task 3: Implement vector index creation and embedding pipeline (AC: #2, #3)
  - [x] 3.1 Write TDD test: `createBestPracticesIndex()` creates pgvector index with correct name and dimension
  - [x] 3.2 Write TDD test: `indexBestPractices()` upserts embeddings with metadata containing chunk text
  - [x] 3.3 Implement `createBestPracticesIndex()` — calls `pgVector.createIndex({ indexName: 'best_practices', dimension: 1536 })`
  - [x] 3.4 Implement `indexBestPractices()` — chunks content, generates embeddings via `embedMany`, upserts to pgvector

- [x] Task 4: Create vector query tool for agents (AC: #3)
  - [x] 4.1 Write TDD test: `bestPracticesQueryTool` is a valid Mastra tool with correct id and description
  - [x] 4.2 Create `src/mastra/tools/query-best-practices.ts` — export `bestPracticesQueryTool` using `createVectorQueryTool` from `@mastra/rag`
  - [x] 4.3 Write TDD test: tool configuration has correct vectorStoreName, indexName, and embedding model

- [x] Task 5: Register in Mastra instance (AC: #4)
  - [x] 5.1 Write TDD test: Mastra instance includes `vectors` config with pgvector store
  - [x] 5.2 Update `src/mastra/index.ts` — add `vectors` config with named pgvector store
  - [x] 5.3 Verify tool is available via agents that bind it

- [x] Task 6: Verify all tests pass
  - [x] 6.1 `pnpm test` — all 173 tests pass (157 baseline + 16 new RAG tests)

## Dev Notes

### Architecture Compliance

**Embedding Model Decision (deferred from architecture, resolved here):**

Anthropic does not provide an embedding API. The `@ai-sdk/anthropic` package has zero embedding support. For vector embeddings, use OpenAI's `text-embedding-3-small` (1536 dimensions) via `@ai-sdk/openai`. This requires:
- `pnpm add @ai-sdk/openai` as a new dependency
- `OPENAI_API_KEY` environment variable (embeddings only — all LLM inference remains Anthropic)

**Mastra RAG API pattern (verified from docs and type definitions):**

```typescript
// Document processing
import { MDocument } from '@mastra/rag';
const doc = MDocument.fromText('content here');
const chunks = await doc.chunk({
  strategy: 'recursive',
  size: 512,
  overlap: 50,
});

// Embedding generation
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
const { embeddings } = await embedMany({
  values: chunks.map(chunk => chunk.text),
  model: openai.embedding('text-embedding-3-small'),
});

// Vector storage (PgVector already available from @mastra/pg)
import { PgVector } from '@mastra/pg';
const pgVector = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.DATABASE_URL!,
});
await pgVector.createIndex({ indexName: 'best_practices', dimension: 1536 });
await pgVector.upsert({
  indexName: 'best_practices',
  vectors: embeddings,
  metadata: chunks.map(chunk => ({ text: chunk.text })),
});
```

**Vector query tool for agents:**

```typescript
import { createVectorQueryTool } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';

export const bestPracticesQueryTool = createVectorQueryTool({
  vectorStoreName: 'pgVector',    // must match the key in Mastra vectors config
  indexName: 'best_practices',
  model: openai.embedding('text-embedding-3-small'),
  description: 'Query curated conference talk best practices for structure, pacing, hooks, and audience engagement guidance',
});
```

**Mastra instance registration:**

```typescript
// src/mastra/index.ts
import { PgVector } from '@mastra/pg';

const pgVector = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.DATABASE_URL!,
});

export const mastra = new Mastra({
  // ... existing config
  vectors: { pgVector },  // key name must match vectorStoreName in tools
});
```

**Index naming constraint:** pgvector index names must start with letter/underscore, contain only letters/numbers/underscores. Use `best_practices` (NOT `best-practices`).

**PgVector databaseConfig options for tuning:**
```typescript
databaseConfig: {
  pgvector: {
    minScore: 0.7,  // filter low-relevance results
    ef: 200,        // HNSW search accuracy (higher = more accurate, slower)
    probes: 10,     // IVFFlat probes (higher = more accurate, slower)
  },
}
```

### Best Practices Content Strategy

Curate ~2000-3000 words covering these areas (based on conference talk expertise):

1. **Talk Structure & Organization** — narrative arcs (problem-solution, story arc, hot take), section transitions, time allocation by format
2. **Opening Hooks** — question hooks, statistic hooks, story hooks, controversial claim hooks, demo hooks
3. **Audience Engagement** — interaction points, call-and-response, live polls, think-pair-share, rhetorical questions
4. **Pacing & Timing** — word-per-minute targets by section type, energy curve management, strategic pauses
5. **Closing & Call to Action** — memorable endings, actionable takeaways, resource sharing

**Chunking strategy:** `recursive` with `size: 512, overlap: 50` — balances retrieval granularity with context preservation for best practices content.

### Defensive Validation Checklist

- Index name `best_practices` uses underscores (pgvector naming constraint)
- `connectionString` validated via existing `DATABASE_URL` check in `index.ts`
- `dimension: 1536` matches `text-embedding-3-small` output exactly
- All metadata fields are non-optional (every chunk gets `{ text: chunk.text }`)
- `createVectorQueryTool` description uses `.describe()` convention

### Mastra API Verification Checklist

1. **Import paths:** Verify `MDocument` from `@mastra/rag`, `createVectorQueryTool` from `@mastra/rag`, `PgVector` from `@mastra/pg`, `embedMany` from `ai`, `openai` from `@ai-sdk/openai`
2. **Constructor params:** `PgVector({ id: string, connectionString: string })`, `MDocument.fromText(string)`, `createVectorQueryTool({ vectorStoreName, indexName, model, ... })`
3. **Return types:** `doc.chunk()` returns `Chunk[]` with `.text` property, `embedMany` returns `{ embeddings: number[][] }`, `pgVector.query()` returns `QueryResult[]`
4. **Isolation test:** Write minimal test creating MDocument, chunking, and verifying chunk shape before building on it

### File Structure Requirements

```
src/mastra/
  rag/
    best-practices-content.ts          # NEW — curated content string constant
    best-practices.ts                  # NEW — MDocument + chunking + indexing functions
    __tests__/
      best-practices.test.ts           # NEW — RAG infrastructure tests
  tools/
    query-best-practices.ts            # NEW — createVectorQueryTool export
    __tests__/
      query-best-practices.test.ts     # NEW — tool configuration tests
  index.ts                             # MODIFY — add vectors config with pgVector
  config/
    models.ts                          # MODIFY — add embedding model constant (optional)
```

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **TDD:** Write failing tests first, then implement
- **Tests must cover:**
  - MDocument creation from text content
  - Chunking produces non-empty array of chunks with `.text` property
  - `createVectorQueryTool` produces valid tool with correct config
  - PgVector index creation and upsert (may need mock for DB-dependent tests)
  - Mastra instance accepts `vectors` config
- **Mocking strategy:** For tests that require database, mock `PgVector` methods. For `embedMany`, mock the embedding response to avoid API calls in tests. The `MDocument.fromText().chunk()` is pure computation — test directly without mocks.

### Previous Story Intelligence

**From Story 2.4 (Format-Based Conditional Step Skipping):**
- 157 tests passing baseline
- Schema export pattern: export schemas from source files for reuse
- Optional fields: `.optional().describe()` convention
- Integration test mock pattern well-established
- `getInitData<WorkflowInput>()` available in steps and `.map()` transforms

**Persistent issue:** `researcher.ts` model tier (OPUS→SONNET) keeps reverting during squash merge rebases. Check `researcher.ts` after rebase — must remain `SONNET_MODEL`.

### Git Intelligence

**Recent commits:**
- `0521b98` chore: mark story 2-4 done, Epic 2 complete
- `5c042ab` Story 2.4: Format-Based Conditional Step Skipping (#13)
- `9871010` Story 2.3: Structure Selection Gate with Loopback (#12)
- `6e2e41f` Story 2.2: Optional Constraints Input (#11)
- `57413b8` fix: researcher model tier — OPUS_MODEL → SONNET_MODEL (persistent fix)

### References

- [Source: epics.md#Epic 3 — Story 3.1] — Acceptance criteria with BDD scenarios
- [Source: architecture.md#RAG Infrastructure] — pgvector, deferred chunking/embedding decisions
- [Source: architecture.md#Defensive Validation Checklist] — Schema validation patterns
- [Source: architecture.md#Mastra API Verification Checklist] — 4-step API verification
- [Source: mastra.ai/en/docs/rag/overview] — Mastra RAG API: MDocument, chunking, embeddings
- [Source: mastra.ai/en/reference/tools/vector-query-tool] — createVectorQueryTool API reference
- [Source: mastra.ai/en/docs/rag/vector-databases] — PgVector setup with createIndex, upsert, query

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Verified `MDocument.chunk()` uses `maxSize` param (not `size`) — confirmed from `@mastra/rag` v2.1.2 type definitions
- Verified `Mastra` Config type accepts `vectors?: TVectors` where `TVectors extends Record<string, MastraVector<any>>`
- Confirmed `@ai-sdk/anthropic` has zero embedding support — `@ai-sdk/openai` required for `text-embedding-3-small`
- `PgVector` constructor requires `{ id: string, connectionString: string }` — confirmed from type definitions
- `createVectorQueryTool` uses `vectorStoreName` to reference stores registered in Mastra `vectors` config

### Completion Notes List

- All 4 ACs satisfied: `@mastra/rag` + `@ai-sdk/openai` installed (AC#1), best practices content + chunking + indexing functions created (AC#2), `createVectorQueryTool` configured for agent querying (AC#3), Mastra instance updated with `vectors: { pgVector }` config (AC#4)
- Curated ~3000 words of best practices content covering 5 areas: structure patterns, opening hooks, audience engagement, pacing/timing, closing techniques
- Chunking strategy: `recursive` with `maxSize: 512, overlap: 50` — API param is `maxSize` not `size` (verified from v2.1.2 types)
- Embedding model: `openai.embedding('text-embedding-3-small')` (1536 dimensions) — architectural decision resolved since Anthropic has no embedding API
- Index naming: `best_practices` uses underscores per pgvector naming constraint (no hyphens allowed)
- Updated existing `index.test.ts` mock to include `PgVector` export from `@mastra/pg`
- 16 new tests: 4 API verification, 3 MDocument chunking, 5 content validation, 2 index/pipeline (mocked), 2 tool configuration
- 173 total tests passing

### File List

- `src/mastra/rag/best-practices-content.ts` — NEW: curated content, index name, dimension constants
- `src/mastra/rag/best-practices.ts` — NEW: createBestPracticesIndex, indexBestPractices functions
- `src/mastra/rag/__tests__/best-practices.test.ts` — NEW: 14 RAG infrastructure tests
- `src/mastra/tools/query-best-practices.ts` — NEW: bestPracticesQueryTool via createVectorQueryTool
- `src/mastra/tools/__tests__/query-best-practices.test.ts` — NEW: 2 tool configuration tests
- `src/mastra/index.ts` — MODIFIED: added PgVector import, pgVector instance, `vectors` config
- `src/mastra/__tests__/index.test.ts` — MODIFIED: added PgVector to @mastra/pg mock
- `.env.example` — MODIFIED: added OPENAI_API_KEY for embeddings
- `package.json` — MODIFIED: added @mastra/rag, @ai-sdk/openai dependencies
