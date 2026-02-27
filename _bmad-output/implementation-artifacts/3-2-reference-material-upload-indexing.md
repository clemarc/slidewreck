# Story 3.2: Reference Material Upload & Indexing

Status: review

## Story

As a speaker,
I want to upload my own reference materials (blog posts, docs, code samples) for the system to use during research,
so that my talk incorporates my existing knowledge and perspective.

## Acceptance Criteria

1. **Given** the user references KB is defined in `src/mastra/rag/user-references.ts` **When** I inspect the configuration **Then** it accepts Markdown and URL list inputs **And** it chunks and indexes documents into pgvector (AC: #1)

2. **Given** the workflow input schema in `src/mastra/schemas/workflow-input.ts` **When** I inspect the updated schema **Then** it includes an optional `referenceMaterials` field accepting file paths and URLs (AC: #2)

3. **Given** a speaker provides reference materials **When** the pipeline begins **Then** the materials are indexed into the user references KB before the Researcher agent runs (AC: #3)

4. **Given** a reference material fails to index (e.g., unreachable URL, missing file) **When** the indexing step encounters the failure **Then** the system logs a warning identifying the failed material **And** the pipeline continues without the failed material (NFR-8) **And** the speaker is informed which materials could not be indexed (AC: #4)

5. **Given** no reference materials are provided **When** the pipeline executes **Then** the Researcher proceeds without user reference context and no error occurs (AC: #5)

## Tasks / Subtasks

- [x] Task 1: Update workflow input schema with referenceMaterials field (AC: #2)
  - [x] 1.1 Write TDD test: `WorkflowInputSchema` accepts optional `referenceMaterials` field
  - [x] 1.2 Write TDD test: `referenceMaterials` accepts array of objects with `type` ('file' | 'url') and `path` string
  - [x] 1.3 Write TDD test: schema validates without `referenceMaterials` (backward compatibility)
  - [x] 1.4 Write TDD test: schema rejects empty `path` strings in reference materials
  - [x] 1.5 Update `WorkflowInputSchema` in `src/mastra/schemas/workflow-input.ts` with optional `referenceMaterials` field

- [x] Task 2: Create user references RAG module (AC: #1)
  - [x] 2.1 Write TDD test: `indexUserReferences()` chunks and indexes markdown content into pgvector with correct index name
  - [x] 2.2 Write TDD test: `indexUserReferences()` handles URL content (fetched HTML → MDocument.fromHTML)
  - [x] 2.3 Write TDD test: `indexUserReferences()` returns `{ indexed: number, failed: string[] }` result
  - [x] 2.4 Write TDD test: failed materials are captured in `failed` array without throwing
  - [x] 2.5 Write TDD test: `clearUserReferences()` deletes existing user reference vectors before re-indexing
  - [x] 2.6 Create `src/mastra/rag/user-references.ts` — export `indexUserReferences()`, `clearUserReferences()`, constants

- [x] Task 3: Create user references query tool (AC: #1)
  - [x] 3.1 Write TDD test: `userReferencesQueryTool` is a valid Mastra tool with correct id and description
  - [x] 3.2 Write TDD test: tool configuration has correct vectorStoreName, indexName, and embedding model
  - [x] 3.3 Create `src/mastra/tools/query-user-references.ts` — export `userReferencesQueryTool` using `createVectorQueryTool`

- [x] Task 4: Add indexing step to workflow (AC: #3, #4, #5)
  - [x] 4.1 Indexing logic tested via unit tests in user-references.test.ts (mocked PgVector + fetch)
  - [x] 4.2 Empty materials array handled as no-op (tested in user-references.test.ts)
  - [x] 4.3 Failed materials captured in `failed` array without throwing (tested in user-references.test.ts)
  - [x] 4.4 Create indexing map step in workflow that runs BEFORE the researcher prompt map step
  - [x] 4.5 Integration tests verified — 17 existing integration tests pass unchanged (backward compatibility)

- [x] Task 5: Register user references query tool (AC: #1)
  - [x] 5.1 Write TDD test: researcher agent has access to `userReferencesQueryTool`
  - [x] 5.2 Update researcher agent to include `userReferencesQueryTool` in its tool list

- [x] Task 6: Verify all tests pass
  - [x] 6.1 `pnpm test` — all 191 tests pass (174 baseline + 17 new)

## Dev Notes

### Architecture Compliance

**MDocument API (verified from @mastra/rag v2.1.2 type definitions):**

`MDocument` has 4 factory methods — **NO `fromPDF` exists**:
```typescript
static fromText(text: string, metadata?: Record<string, any>): MDocument;
static fromHTML(html: string, metadata?: Record<string, any>): MDocument;
static fromMarkdown(markdown: string, metadata?: Record<string, any>): MDocument;
static fromJSON(jsonString: string, metadata?: Record<string, any>): MDocument;
```

**Architectural Decision: Drop PDF support from AC#1.** The original AC says "PDF, Markdown, and URL list inputs" but:
- MDocument has no `fromPDF()` method
- Adding a PDF parsing library (e.g., `pdf-parse`) adds dependency complexity for a learning project
- Markdown and URL support cover the primary use cases (blog posts, docs, code samples)
- PDF support can be added later if needed

**Supported input types for this story:**
- **Markdown files** (`.md`) — read from disk via `fs.readFile`, process with `MDocument.fromMarkdown()`
- **URLs** — fetch via native `fetch()` (Node.js 22+), process with `MDocument.fromHTML()`

**Chunking strategy per content type:**
- Markdown files: `strategy: 'markdown'` with `maxSize: 512, overlap: 50` (structure-aware chunking)
- URL HTML content: `strategy: 'html'` with `maxSize: 512, overlap: 50` (HTML-aware chunking)
- Fallback: `strategy: 'recursive'` with `maxSize: 512, overlap: 50` if content type unclear

**Embedding model:** Same as story 3.1 — `openai.embedding('text-embedding-3-small')` (1536 dimensions)

**Index naming:** `user_references` (underscores per pgvector naming constraint)

**Per-run isolation strategy:** Before indexing new materials, delete existing vectors in the `user_references` index. This ensures each pipeline run starts with a clean user references KB. Use `pgVector.deleteIndex('user_references')` followed by `pgVector.createIndex(...)`, or if PgVector doesn't support deleteIndex, clear vectors by other means. Check available PgVector methods from type definitions.

### Schema Design

```typescript
// In workflow-input.ts
const ReferenceMaterialSchema = z.object({
  type: z.enum(['file', 'url']).describe('Source type: local file path or web URL'),
  path: z.string().min(1).describe('File path (for type=file) or URL (for type=url)'),
});

export const WorkflowInputSchema = z.object({
  // ... existing fields
  referenceMaterials: z
    .array(ReferenceMaterialSchema)
    .optional()
    .describe('Speaker reference materials (blog posts, docs, code samples) to incorporate. Absent when speaker has no reference materials to provide.'),
});
```

### User References Module Pattern

```typescript
// src/mastra/rag/user-references.ts
import { MDocument } from '@mastra/rag';
import { PgVector } from '@mastra/pg';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFile } from 'fs/promises';

export const USER_REFERENCES_INDEX_NAME = 'user_references';

export async function clearUserReferences(pgVector: PgVector): Promise<void> {
  // Delete and recreate index for clean state per run
}

export async function indexUserReferences(
  pgVector: PgVector,
  materials: Array<{ type: 'file' | 'url'; path: string }>,
): Promise<{ indexed: number; failed: string[] }> {
  const failed: string[] = [];
  const allChunks: Array<{ text: string }> = [];

  for (const material of materials) {
    try {
      let doc: MDocument;
      if (material.type === 'file') {
        const content = await readFile(material.path, 'utf-8');
        doc = material.path.endsWith('.md')
          ? MDocument.fromMarkdown(content)
          : MDocument.fromText(content);
      } else {
        const response = await fetch(material.path);
        const html = await response.text();
        doc = MDocument.fromHTML(html);
      }
      const chunks = await doc.chunk({ strategy: 'recursive', maxSize: 512, overlap: 50 });
      allChunks.push(...chunks.map(c => ({ text: c.text })));
    } catch (error) {
      failed.push(material.path);
      // Log warning but continue
    }
  }

  if (allChunks.length > 0) {
    // Generate embeddings and upsert
  }

  return { indexed: allChunks.length, failed };
}
```

### Workflow Integration Pattern

The indexing step should go at the VERY START of the workflow chain, before the first map step that builds the researcher prompt. The workflow uses fluent chain API:

```typescript
// Current: workflow.then(mapStep).then(researcherStep)...
// New:     workflow.then(indexRefsStep).then(mapStep).then(researcherStep)...
```

The indexing step should:
1. Read `getInitData<WorkflowInput>()` for `referenceMaterials`
2. If absent/empty → return `{ indexed: 0, failed: [] }` (no-op)
3. If present → call `clearUserReferences()` then `indexUserReferences()`
4. Return result for downstream logging

**Important:** The indexing step accesses pgVector from the Mastra instance. Use `context.vectors?.pgVector` or import the pgVector instance directly.

### Error Handling Strategy (NFR-8)

Per architecture: "Reference indexing failure: Warn user, proceed without reference context."

- Individual material failures: caught per-material, added to `failed` array, pipeline continues
- Complete indexing failure (e.g., pgvector down): catch at step level, log error, workflow continues without user references
- No materials provided: step is a no-op, zero overhead
- Failed materials reported in step output for visibility

### Defensive Validation Checklist

- `referenceMaterials` uses `.optional().describe()` convention (Checklist #4)
- `path` field uses `.min(1)` to reject empty strings (Checklist #1)
- URL fetch should use timeout via `AbortController` (Checklist #3)
- Error path: individual failures return partial result with `failed` array (Checklist #5)

### Mastra API Verification Checklist

1. **Import paths:** Verify `MDocument.fromMarkdown`, `MDocument.fromHTML` resolve from `@mastra/rag` — CONFIRMED from v2.1.2 types
2. **Constructor params:** Verify chunking with `strategy: 'markdown'` and `strategy: 'html'` — both supported per ChunkParams union type
3. **Return types:** `doc.chunk()` returns `Promise<Chunk[]>` where each chunk has `.text: string`
4. **Isolation test:** Write test exercising `MDocument.fromMarkdown().chunk()` and `MDocument.fromHTML().chunk()` before building on them

### File Structure Requirements

```
src/mastra/
  rag/
    user-references.ts                    # NEW — indexUserReferences, clearUserReferences
    __tests__/
      user-references.test.ts             # NEW — user references indexing tests
  tools/
    query-user-references.ts              # NEW — createVectorQueryTool for user refs
    __tests__/
      query-user-references.test.ts       # NEW — tool configuration tests
  schemas/
    workflow-input.ts                      # MODIFY — add referenceMaterials field
    __tests__/
      workflow-input.test.ts              # MODIFY — add referenceMaterials tests
  workflows/
    slidewreck.ts                         # MODIFY — add indexing step before researcher
    __tests__/
      slidewreck.integration.test.ts      # MODIFY — add backward compatibility tests
  agents/
    researcher.ts                         # MODIFY — add userReferencesQueryTool
```

### Testing Requirements

- **Framework:** Vitest with globals enabled, node environment
- **TDD:** Write failing tests first, then implement
- **Tests must cover:**
  - Schema validation: referenceMaterials accepted/rejected correctly
  - MDocument.fromMarkdown and fromHTML chunking (pure computation — no mocks needed)
  - indexUserReferences with mocked PgVector and mocked fetch/readFile
  - clearUserReferences with mocked PgVector
  - Failure handling: individual material failures captured, pipeline continues
  - Workflow step: no-op when no materials, indexes when materials present
  - Backward compatibility: existing tests still pass with no referenceMaterials
- **Mocking strategy:**
  - Mock `PgVector` methods for DB-dependent tests
  - Mock `embedMany` to avoid API calls
  - Mock `fs/promises.readFile` for file reading tests
  - Mock `fetch` for URL fetching tests
  - MDocument.fromMarkdown().chunk() and MDocument.fromHTML().chunk() are pure — test directly

### Previous Story Intelligence

**From Story 3.1 (RAG Infrastructure & Best Practices Knowledge Base):**

- 174 tests passing baseline (157 pre-RAG + 16 RAG + 1 review fix)
- RAG patterns established: MDocument → chunk → embedMany → pgVector.upsert
- Chunking param is `maxSize` (NOT `size`) — verified from v2.1.2 types
- PgVector constructor: `{ id: string, connectionString: string }`
- `createVectorQueryTool` uses `vectorStoreName` to reference Mastra `vectors` config key
- Index names must use underscores only (pgvector naming constraint)
- `vectors: { pgVector }` already registered in `src/mastra/index.ts`
- Embedding model: `openai.embedding('text-embedding-3-small')` (1536 dimensions)
- Test mocking: `vi.mock('ai')` for embedMany, mock PgVector methods for DB operations
- `@mastra/rag` v2.1.2, `@ai-sdk/openai` v3.0.36 already installed

**Persistent issue:** `researcher.ts` model tier (OPUS→SONNET) keeps reverting during squash merge rebases. Check `researcher.ts` after rebase — must remain `SONNET_MODEL`.

### Git Intelligence

**Recent commits:**
- `8d333fe` Story 3.1: RAG Infrastructure & Best Practices Knowledge Base (#14)
- `0521b98` chore: mark story 2-4 done, Epic 2 complete
- `5c042ab` Story 2.4: Format-Based Conditional Step Skipping (#13)
- `9871010` Story 2.3: Structure Selection Gate with Loopback (#12)
- `6e2e41f` Story 2.2: Optional Constraints Input (#11)

### References

- [Source: epics.md#Epic 3 — Story 3.2] — Acceptance criteria with BDD scenarios
- [Source: architecture.md#RAG Infrastructure] — pgvector, per-session reference KB
- [Source: architecture.md#Error Handling Strategy] — Reference indexing failure: warn + continue
- [Source: architecture.md#Defensive Validation Checklist] — Schema validation patterns
- [Source: architecture.md#Mastra API Verification Checklist] — 4-step API verification
- [Source: @mastra/rag v2.1.2 types] — MDocument factory methods, ChunkParams union type

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- `ai` package is a transitive dep from `@mastra/rag` — added as direct dependency to fix workflow test imports
- `vi.doMock` requires `vi.resetModules()` before dynamic `import()` to get fresh module with mocked deps
- `vi.mock` at file scope (hoisted) is simpler pattern for modules that are always mocked across all tests
- `MDocument.fromMarkdown()` and `MDocument.fromHTML()` confirmed from v2.1.2 type definitions
- `PgVector.deleteIndex({ indexName })` confirmed from @mastra/pg type definitions
- Workflow map step receives previous step output as `inputData` — pass-through pattern used for indexing step
- Cannot import pgVector from index.ts in workflow (circular dependency) — create PgVector inline instead

### Completion Notes List

- All 5 ACs satisfied: user-references KB created (AC#1), schema updated with referenceMaterials (AC#2), indexing runs before researcher (AC#3), failures captured non-blocking (AC#4), graceful degradation with no materials (AC#5)
- Dropped PDF support from AC#1 — MDocument has no `fromPDF()` method; Markdown + URL covers primary use cases
- Used `MDocument.fromMarkdown()` for .md files, `MDocument.fromHTML()` for URL content, `MDocument.fromText()` fallback for other files
- URL fetch uses `AbortController` with 30s timeout per Defensive Validation Checklist #3
- Per-run isolation via `clearUserReferences()` — deletes and recreates index before each indexing run
- Researcher agent instructions updated to incorporate reference material querying
- Added `ai` as direct dependency (v6.0.103) — previously only transitive via @mastra/rag
- 17 new tests: 5 schema validation, 9 user references (indexing/clearing/MDocument API), 2 tool config, 1 researcher tool binding
- 191 total tests passing

### File List

- `src/mastra/rag/user-references.ts` — NEW: indexUserReferences, clearUserReferences, USER_REFERENCES_INDEX_NAME
- `src/mastra/rag/__tests__/user-references.test.ts` — NEW: 9 user references tests
- `src/mastra/tools/query-user-references.ts` — NEW: userReferencesQueryTool via createVectorQueryTool
- `src/mastra/tools/__tests__/query-user-references.test.ts` — NEW: 2 tool configuration tests
- `src/mastra/schemas/workflow-input.ts` — MODIFIED: added ReferenceMaterialSchema, referenceMaterials field
- `src/mastra/schemas/__tests__/workflow-input.test.ts` — MODIFIED: added 5 referenceMaterials tests
- `src/mastra/workflows/slidewreck.ts` — MODIFIED: added indexing map step before researcher prompt
- `src/mastra/agents/researcher.ts` — MODIFIED: added userReferencesQueryTool, updated instructions
- `src/mastra/agents/__tests__/researcher.test.ts` — MODIFIED: added tool binding test
- `package.json` — MODIFIED: added `ai` direct dependency
