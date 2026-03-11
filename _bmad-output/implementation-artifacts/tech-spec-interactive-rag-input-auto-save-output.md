---
title: 'Interactive RAG Input & Auto-Save Presentation Output'
slug: 'interactive-rag-input-auto-save-output'
created: '2026-03-11'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['typescript', 'mastra', 'zod', 'vitest', 'fs/promises', 'path']
files_to_modify:
  - 'src/mastra/schemas/workflow-input.ts'
  - 'src/mastra/schemas/workflow-output.ts'
  - 'src/mastra/schemas/collect-references.ts'
  - 'src/mastra/workflows/slidewreck.ts'
  - 'src/mastra/schemas/__tests__/workflow-input.test.ts'
  - 'src/mastra/workflows/__tests__/slidewreck.integration.test.ts'
  - '.gitignore'
code_patterns: ['suspend/resume with dedicated schemas', 'createStep with typed schemas', 'getStepResult for step-to-step data flow', 'try/catch + console.error for non-fatal failures', 'getInitData<WorkflowInput>() for original input']
test_patterns: ['vitest with vi.mock()', 'InMemoryStore for isolation', 'mock createStep with fixed output', 'dynamic import for mocked modules', 'run.start() → run.resume() for suspend/resume']
---

# Tech-Spec: Interactive RAG Input & Auto-Save Presentation Output

**Created:** 2026-03-11

## Overview

### Problem Statement

Users must provide reference materials as raw JSON in the initial workflow input — poor UX in Mastra Studio. The final presentation output only exists as an API response with no file on disk, requiring manual copy-paste to save.

### Solution

Replace the `referenceMaterials` field in `WorkflowInputSchema` with a new suspend/resume step at the start of the pipeline, allowing users to interactively provide materials (or skip). After Gate 3 approval, auto-save the speaker script and research brief to `presentations/<slug>-<timestamp>.md` and include the file path in workflow output metadata.

### Scope

**In Scope:**
- Remove `referenceMaterials` from `WorkflowInputSchema`
- New suspend/resume step (`collect-references`) with dedicated schemas
- Batch input of materials (file paths + URLs) in one resume, skip allowed
- Auto-write presentation `.md` file (speaker script + research brief)
- Add `outputFilePath` to workflow output metadata schema
- Update existing tests for schema changes and new step
- Add `presentations/` to `.gitignore`

**Out of Scope:**
- Custom frontend / file upload widget
- Scorecard in saved output
- Multiple-round "add more materials" loop
- Batch embedding fix (already shipped separately)

## Context for Development

### Codebase Patterns

- **Suspend/resume**: `createStep()` with `suspendSchema`/`resumeSchema`, then `suspend(payload)` → return `resumeData` on resume. Pattern visible in `review-gate.ts` and `architectStructureStep`.
- **Data-collection vs review gates**: Existing gates use `GateSuspendSchema`/`GateResumeSchema` (agentId, gateId, output, summary → approved, feedback). The new step is a data-collection gate needing its own schema pair.
- **Step-to-step data flow**: `.then(step)` followed by `.map()` that calls `getStepResult(step)` to read the previous step's output.
- **Error handling**: Non-fatal failures use `try/catch` + `console.error` and continue (see RAG indexing, eval suite).
- **Import style**: `import { readFile } from 'fs/promises'` and `import { join } from 'path'` (no `node:` prefix).
- **`referenceMaterials` references found in 8 files** — only 3 need code changes, rest are docs.
- **Integration tests pass without `referenceMaterials`** in fixtures (field was optional). 5 unit tests in `workflow-input.test.ts` validate the field and must be updated.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/mastra/schemas/workflow-input.ts` | Remove `referenceMaterials` field; keep `ReferenceMaterialSchema` export |
| `src/mastra/schemas/workflow-output.ts` | Add `outputFilePath` to metadata |
| `src/mastra/schemas/gate-payloads.ts` | Reference pattern for suspend/resume schemas |
| `src/mastra/workflows/slidewreck.ts` | Add collect-references step, refactor RAG indexing, add file-save |
| `src/mastra/workflows/gates/review-gate.ts` | Reference pattern for suspend/resume step factory |
| `src/mastra/rag/user-references.ts` | Unchanged — called from refactored `.map()` step |
| `src/mastra/schemas/__tests__/workflow-input.test.ts` | Remove/update 5 `referenceMaterials` tests |
| `src/mastra/workflows/__tests__/slidewreck.integration.test.ts` | Add collect-references + file-save tests |
| `.gitignore` | Add `presentations/` |

### Technical Decisions

- **Dedicated schemas over reusing GateSuspendSchema**: The collect-references step prompts for data input, not approval. Dedicated `CollectReferencesSuspendSchema` / `CollectReferencesResumeSchema` keeps concerns clean.
- **Skip = empty array resume**: User resumes with `{ materials: [] }` to skip. No separate "skip" boolean.
- **File path uses topic slug**: `presentations/<slug>-<ISO-timestamp>.md` where slug is `topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)`.
- **`presentations/` dir at project root**: Pipeline output, not BMAD artifacts.
- **Research brief as appendix**: Speaker script as main content, research brief appended as `## Research Brief` at the end.
- **File-save is non-fatal**: Wrapped in try/catch — pipeline completes even if disk write fails, with `outputFilePath` absent from metadata.

## Implementation Plan

### Tasks

#### Task 1: Add collect-references schemas
**File:** `src/mastra/schemas/collect-references.ts` (new)

Create two schemas:

```typescript
import { z } from 'zod';
import { ReferenceMaterialSchema } from './workflow-input';

export const CollectReferencesSuspendSchema = z.object({
  prompt: z.string().describe('Instructions for the user on what materials to provide'),
});

export const CollectReferencesResumeSchema = z.object({
  materials: z.array(ReferenceMaterialSchema).describe('Reference materials to index. Empty array to skip.'),
});
```

**Tests:** Unit test in `src/mastra/schemas/__tests__/collect-references.test.ts`:
- AC-T1a: Schema validates `{ materials: [{ type: 'url', path: 'https://example.com' }] }`
- AC-T1b: Schema validates `{ materials: [] }` (skip case)
- AC-T1c: Schema rejects `{ materials: [{ type: 'invalid', path: '' }] }`

#### Task 2: Remove `referenceMaterials` from WorkflowInputSchema
**File:** `src/mastra/schemas/workflow-input.ts`

- Delete the `referenceMaterials` field from `WorkflowInputSchema` (lines 19-22)
- Keep `ReferenceMaterialSchema` exported (imported by collect-references schema)

**File:** `src/mastra/schemas/__tests__/workflow-input.test.ts`

- Remove 5 tests that validate `referenceMaterials` behavior
- Add 1 test: schema rejects unknown `referenceMaterials` field (via `.strict()` if used, or just verify type no longer has it)

#### Task 3: Add `outputFilePath` to WorkflowOutputSchema
**File:** `src/mastra/schemas/workflow-output.ts`

- Add `outputFilePath: z.string().optional().describe('Absolute path to the saved presentation file. Absent if file save failed.')` to `WorkflowMetadataSchema`
- Optional because file-save is non-fatal

#### Task 4: Create the `collect-references` step
**File:** `src/mastra/workflows/slidewreck.ts`

```typescript
import { CollectReferencesSuspendSchema, CollectReferencesResumeSchema } from '../schemas/collect-references';

const collectReferencesStep = createStep({
  id: 'collect-references',
  inputSchema: z.object({}),
  outputSchema: CollectReferencesResumeSchema,
  suspendSchema: CollectReferencesSuspendSchema,
  resumeSchema: CollectReferencesResumeSchema,
  execute: async ({ suspend, resumeData }) => {
    if (resumeData) {
      return resumeData;
    }
    return await suspend({
      prompt: 'Provide reference materials (file paths or URLs) for the presentation, or resume with an empty materials array to skip.',
    });
  },
});
```

Wire into workflow chain: `.then(collectReferencesStep)` as the **first** step, before the RAG indexing `.map()`.

#### Task 5: Refactor RAG indexing to consume collect-references output
**File:** `src/mastra/workflows/slidewreck.ts`

Replace current first `.map()` step (lines 152-181):

```typescript
.then(collectReferencesStep)
.map(async ({ inputData, getInitData, getStepResult }) => {
  const initData = getInitData<WorkflowInput>();
  const { materials } = getStepResult(collectReferencesStep);

  // Seed best practices KB (unchanged)
  try {
    try { await pgVector.deleteIndex({ indexName: BEST_PRACTICES_INDEX_NAME }); } catch { /* may not exist */ }
    await createBestPracticesIndex(pgVector);
    const bpResult = await indexBestPractices(pgVector);
    console.log(`[index-best-practices] Indexed ${bpResult.chunksIndexed} best practices chunks`);
  } catch (error) {
    console.error(`[index-best-practices] Failed, continuing without best practices:`, error);
  }

  // Index speaker reference materials from collect-references step
  if (materials.length > 0) {
    try {
      await clearUserReferences(pgVector);
      const result = await indexUserReferences(pgVector, materials);
      if (result.failed.length > 0) {
        console.warn(`[index-references] Failed to index: ${result.failed.join(', ')}`);
      }
      if (result.indexed > 0) {
        console.log(`[index-references] Indexed ${result.indexed} chunks from ${materials.length - result.failed.length} materials`);
      }
    } catch (error) {
      console.error(`[index-references] Indexing failed entirely, continuing without user references:`, error);
    }
  }
  return inputData;
})
```

Key change: `initData.referenceMaterials` → `getStepResult(collectReferencesStep).materials`

#### Task 6: Add file-save logic to the final step
**File:** `src/mastra/workflows/slidewreck.ts`

Add imports at top:
```typescript
import { writeFile, mkdir } from 'fs/promises';
import { resolve, join } from 'path';
```

In the final `.map()` step, after eval/trend logic and before the return:

```typescript
// Auto-save presentation to disk (FR: auto-save output)
let outputFilePath: string | undefined;
try {
  const slug = initData.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${slug}-${timestamp}.md`;
  const dir = resolve('presentations');
  await mkdir(dir, { recursive: true });
  outputFilePath = join(dir, filename);

  const content = [
    `# ${initData.topic}`,
    '',
    speakerScript.speakerNotes,
    '',
    '---',
    '',
    '## Research Brief',
    '',
    JSON.stringify(researchBrief, null, 2),
  ].join('\n');

  await writeFile(outputFilePath, content, 'utf-8');
  console.log(`[save-presentation] Written to ${outputFilePath}`);
} catch (error) {
  console.error('[save-presentation] Failed to save presentation file:', error);
  outputFilePath = undefined;
}
```

Update the return statement to include `outputFilePath` in metadata:
```typescript
return {
  researchBrief,
  speakerScript,
  scorecard,
  metadata: {
    workflowRunId: runId,
    completedAt: new Date().toISOString(),
    input: initData,
    outputFilePath,  // ← new field
  },
};
```

#### Task 7: Update tests

**File:** `src/mastra/schemas/__tests__/collect-references.test.ts` (new)
- Schema validation: valid materials, empty array, invalid type

**File:** `src/mastra/schemas/__tests__/workflow-input.test.ts`
- Remove 5 tests for `referenceMaterials`
- Verify field no longer exists on the type

**File:** `src/mastra/workflows/__tests__/slidewreck.integration.test.ts`
- Add mock `collectReferencesStep` to the test pipeline (returns `{ materials: [] }`)
- Add test: `collect-references` suspends on start, resumes with materials
- Add test: `collect-references` resumes with empty array (skip path)
- Add test: final output includes `metadata.outputFilePath`
- Add test: presentation file written to disk with expected content (use `os.tmpdir()`)
- Clean up temp files in `afterEach`

**File:** `.gitignore`
- Add `presentations/` line

### Acceptance Criteria

**Feature A: Interactive RAG Input**

- **AC-A1:** Given a workflow run starts, when the `collect-references` step executes, then it suspends with a prompt asking for materials
- **AC-A2:** Given the step is suspended, when the user resumes with `{ materials: [{ type: 'url', path: 'https://...' }] }`, then materials are passed to `indexUserReferences` and the pipeline continues
- **AC-A3:** Given the step is suspended, when the user resumes with `{ materials: [] }`, then no indexing occurs and the pipeline continues (skip path)
- **AC-A4:** Given `WorkflowInputSchema`, when validated, then it does NOT contain a `referenceMaterials` field
- **AC-A5:** Given the `collect-references` step completes, when the RAG indexing `.map()` runs, then it reads materials from the step result (not from `getInitData()`)

**Feature B: Auto-Save Output**

- **AC-B1:** Given the pipeline completes successfully, when the final step runs, then a `.md` file is written to `presentations/<slug>-<timestamp>.md`
- **AC-B2:** Given the saved file, when opened, then it contains the speaker script as main content and the research brief as an appendix
- **AC-B3:** Given the workflow output, when inspected, then `metadata.outputFilePath` contains the absolute path to the saved file
- **AC-B4:** Given the `presentations/` directory does not exist, when the file-save runs, then the directory is created automatically
- **AC-B5:** Given a topic with special characters (e.g., "Building Resilient µServices!"), when the slug is generated, then it produces a valid filename (lowercase, hyphens only, no special chars)
- **AC-B6:** Given a file-save failure, when the final step runs, then the pipeline still completes with `outputFilePath` absent from metadata

## Additional Context

### Dependencies

- `fs/promises` — for `writeFile` and `mkdir`
- `path` — for `resolve` and `join`
- No new npm packages required

### Testing Strategy

- **TDD mandatory** — write failing tests first for each task
- Unit tests for schema validation (collect-references, workflow-input)
- Integration test for collect-references suspend/resume flow (materials + skip)
- Integration test for file-save (use `os.tmpdir()`, clean up in `afterEach`)
- Update existing integration tests: add mock collect-references step to test pipeline
- Slug generation edge cases tested inline (special chars, long strings, unicode)

### Notes

- The batch embedding fix (200-chunk batches in `user-references.ts`) is already shipped separately — not part of this spec
- `presentations/` added to `.gitignore`
- `ReferenceMaterialSchema` stays in `workflow-input.ts` as a shared schema — imported by `collect-references.ts`
- `docs/workflow.md` and `README.md` reference `referenceMaterials` — doc updates are out of scope for this spec but should be done as a follow-up
