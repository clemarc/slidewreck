# Spike: Epic 10 — Workflow Status & Review Gates

**Date:** 2026-03-17
**Epic:** 10 — Workflow Status & Review Gates
**Objective:** Verify Mastra API capabilities for live step-level status, suspend payload retrieval, workflow resume from the frontend, and run history listing.

---

## 1. Existing Foundation (from Epic 9)

Epic 9 delivered a working foundation in `web/`:

| Component | File | What it does |
|-----------|------|--------------|
| `MastraClient` | `web/lib/mastra-client.ts` | `triggerWorkflow()`, `getRunStatus()`, `resumeStep()` |
| `useRunStatus` hook | `web/lib/use-run-status.ts` | Polls `getRunStatus()` every 3s, stops on terminal status |
| Run status page | `web/app/run/[runId]/page.tsx` | Shows overall status indicator + placeholder text for `suspended` |
| Input form | `web/app/new/page.tsx` | Triggers workflow, redirects to `/run/{runId}` |

The placeholder page knows the workflow is suspended but cannot show **which** step, **what** content, or **resume** the workflow.

---

## 2. API Surface Analysis

### 2.1 `GET /api/workflows/{workflowId}/runs/{runId}` — Step-Level Status

The endpoint returns `WorkflowState` (from `@mastra/core@1.13.2`):

```typescript
interface WorkflowState {
  runId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  createdAt: Date;
  updatedAt: Date;
  stepExecutionPath?: string[];          // Ordered list of executed step IDs
  serializedStepGraph?: SerializedStepFlowEntry[];  // Full workflow DAG
  steps?: Record<string, {
    status: WorkflowRunStatus;           // Per-step: 'running' | 'success' | 'suspended' | ...
    output?: Record<string, any>;        // Step output (agent result)
    payload?: Record<string, any>;       // Step input
    resumePayload?: Record<string, any>; // What was passed on resume
    suspendPayload?: Record<string, any>;// Our GateSuspendPayload: { agentId, gateId, output, summary }
    error?: SerializedError;
    startedAt: number;
    endedAt: number;
    suspendedAt?: number;
    resumedAt?: number;
  }>;
  result?: Record<string, any>;
  error?: SerializedError;
}
```

**Key finding:** The `steps` record is the goldmine for Epic 10. When a step is suspended:
- `steps["review-research"].status === "suspended"`
- `steps["review-research"].suspendPayload` contains `{ agentId, gateId, output, summary }` (our `GateSuspendPayload` schema)
- The `output` field inside `suspendPayload` holds the full agent structured output for rendering

**Live verified (2026-03-17):**
- [x] REST API returns `steps` by default — no `fields` parameter needed
- [x] REST API returns `serializedStepGraph` — 17 entries with `canSuspend` flag
- [x] `suspendPayload` serializes faithfully — `{ agentId, gateId, output, summary }` with full nested output

### 2.2 `POST /api/workflows/{workflowId}/resume-async` — Resume

Already implemented and tested in `MastraClient.resumeStep()`. Payload:

```typescript
{ runId: string; step: string; resumeData: GateResumePayload }
// where GateResumePayload = { decision: 'approve' | 'reject', feedback?: string, edits?: unknown }
```

**Step ID mapping** — the `step` parameter must match the step's `id` from the workflow definition:
- `"review-research"` — researcher gate
- `"review-structure"` — architect gate
- `"review-script"` — writer gate (simple gate via `createReviewGateStep`)
- `"review-slides"` — slide review gate (conditional — may be auto-approved)

### 2.3 Run History — `listWorkflowRuns`

`Workflow.listWorkflowRuns()` exists in `@mastra/core` with these filter params:

```typescript
interface StorageListWorkflowRunsInput {
  workflowName?: string;
  fromDate?: Date;
  toDate?: Date;
  perPage?: number | false;  // Pagination
  page?: number;             // Zero-indexed
  resourceId?: string;
  status?: WorkflowRunStatus;
}
// Returns: { runs: WorkflowRun[], total: number }
```

**Live verified (2026-03-17):**
- [x] `GET /api/workflows/{workflowId}/runs` exists — returns `{ runs: [...], total: number }`
- [x] Returns all runs by default (no explicit pagination defaults observed with 3 runs)
- [x] `total` field is present — value `3` confirmed

### 2.4 Streaming / SSE

Mastra core has rich streaming support:
- `WorkflowStreamEvent` types: `workflow-step-start`, `workflow-step-finish`, `workflow-step-suspended`, `workflow-step-result`
- `run.stream()` returns `WorkflowRunOutput` with `.fullStream` (ReadableStream)
- `run.observeStream()` for attaching to an already-running workflow

**Not verified** — streaming endpoint not tested in this spike.

**Decision:** Polling at 3s (current approach) is adequate for our scale. Steps typically run 10-60s each. Upgrade to SSE in a future epic if needed.

---

## 3. Workflow Step Graph (for Progress Visualization)

Our `slidewreck` workflow has these steps in order:

| Step ID | Type | Gate? | Content at gate |
|---------|------|-------|-----------------|
| `init-rag` | internal | No | — |
| `collect-references` | suspend | Yes (optional) | Reference material upload prompt |
| `index-references` | internal | No | — |
| `review-research` | composite + suspend | Yes | Research brief (markdown: key findings, sources) |
| `review-structure` | composite + suspend | Yes | Talk structure (sections, timing, format) |
| `write-script` | agent step | No | — |
| `review-script` | simple gate | Yes | Full speaker script |
| `designer-outline` | internal | No | — |
| `designer-content-fill` | internal | No | — |
| `build-slides` + `render-diagrams` | parallel | No | — |
| `review-slides` | conditional gate | Maybe | DeckSpec slide previews |
| `render-deck` | internal | No | — |
| `run-evals` | internal | No | — |

The `serializedStepGraph` from the API encodes this as a typed DAG:
```typescript
type SerializedStepFlowEntry =
  | { type: 'step'; step: { id, description, canSuspend? } }
  | { type: 'parallel'; steps: [...] }
  | { type: 'conditional'; steps: [...]; serializedConditions: [...] }
  | { type: 'loop'; step: ...; loopType: 'dowhile' | 'dountil' }
  | { type: 'foreach'; step: ...; opts: { concurrency } }
```

**Decision:** If `serializedStepGraph` is reliably returned, use it to dynamically render the step list. If not, hardcode the step order as a constant in the frontend (acceptable since we own the workflow).

---

## 4. Gate Content Rendering Strategy

Each gate produces different content types. The `suspendPayload.output` contains the agent's structured output:

| Gate | Agent Output Schema | Rendering approach |
|------|--------------------|--------------------|
| `review-research` | `ResearcherOutputSchema` — `{ keyFindings, suggestedAngle, sourceCount }` | Markdown list of findings, source count badge |
| `review-structure` | `ArchitectOutput` — `{ selectedOption: { sections: [{ title, minutes, bulletPoints }] }, allOptions }` | Section cards with timing, expandable alternatives |
| `review-script` | `WriterOutputSchema` — full script with sections, speaker notes, timing markers | Scrollable markdown with section headers |
| `review-slides` | `DeckSpec` — full slide deck specification | Slide previews (simplified renderer or JSON view, full renderer comes in Epic 11) |

**Approach:** Render gate content as formatted markdown/cards. The `summary` field in `GateSuspendPayload` provides a quick overview; `output` has the full data for detailed rendering.

---

## 5. Findings & Decisions

### F1: Step-level data is available via existing polling endpoint
The `steps` field in `WorkflowState` gives per-step status, timing, and suspend payloads. No new endpoint needed for Stories 10-1 and 10-2.

### F2: `MastraClient` needs expansion, not replacement
Add methods:
- `getRunDetails(workflowId, runId)` — typed wrapper returning `WorkflowState` with full `steps` (or expand existing `getRunStatus` return type)
- `listRuns(workflowId, opts?)` — for run history (Story 10-4), pending endpoint verification

### F3: Suspended step identification is deterministic
When `status === 'suspended'`, iterate `steps` to find the entry with `status: 'suspended'`. Its `suspendPayload` contains `gateId` and `output`. No ambiguity.

### F4: Resume already works — just needs UI wiring
`MastraClient.resumeStep()` is tested and working. Epic 10 needs:
- Approve/reject buttons that call `resumeStep(workflowId, runId, stepId, { decision, feedback })`
- After resume, restart polling (status changes from `suspended` to `running`)

### F5: Polling is sufficient; SSE is optional
3-second polling is fine for a single-user local app with 10-60s steps. If a streaming endpoint exists, use it as an enhancement but don't block on it.

### F6: Gate content types are well-defined
All gate schemas (`ResearcherOutputSchema`, `ArchitectOutput`, `WriterOutputSchema`, DeckSpec) are already Zod schemas in `mastra/src/mastra/schemas/`. Can import types for frontend rendering.

---

## 6. Live Verification Results

Verified against `localhost:4111` with `@mastra/core@1.13.2` on 2026-03-17:

| Check | Result |
|-------|--------|
| `steps` field in run response | **YES** — full per-step record with status, output, suspendPayload, timing |
| `suspendPayload` shape | **CONFIRMED** — `{ agentId, gateId, output, summary }` matches `GateSuspendSchema` |
| `suspendPayload.output` content | **CONFIRMED** — contains full agent structured output (research findings, structure options, script sections, etc.) |
| `serializedStepGraph` in run response | **YES** — 17 entries, includes `canSuspend` flag per step, parallel blocks |
| `GET /api/workflows/{workflowId}/runs` (list) | **YES** — returns `{ runs: [...], total: number }` with pagination support |
| `total` field for pagination | **YES** — `total: 3` confirmed |
| Run response top-level keys | `runId, workflowName, resourceId, createdAt, updatedAt, status, result, payload, steps, activeStepsPath, serializedStepGraph` |
| `stepExecutionPath` | **NOT returned** by the REST API (exists in core types but not serialized) |
| OpenAPI spec endpoint | **NOT available** — no `/openapi.json` |
| Streaming/SSE endpoint | **NOT tested** — polling is sufficient for MVP |

### Step Graph (verified)

```
collect-references (canSuspend=true)
mapping → review-research (canSuspend=true)
mapping → architect-structure (canSuspend=true)
mapping → script-writer
review-script (canSuspend=true)
mapping → designer-outline → designer-content-fill
mapping → review-slides (canSuspend=true)
mapping → [parallel: build-slides, render-diagrams]
mapping (final)
```

### Suspend Payloads (verified from real run)

| Gate step | agentId | output keys |
|-----------|---------|-------------|
| `review-research` | `researcher` | `sources, statistics, keyFindings, existingTalks, suggestedAngles` |
| `architect-structure` | `talk-architect` | `options` (array of structure options) |
| `review-script` | `script-writer` | `sections, speakerNotes, timingMarkers, totalDurationMinutes` |
| `review-slides` | (conditional) | DeckSpec |
| `collect-references` | (no agent) | empty — user upload prompt |

---

## 7. Story Refinement Impact

### Story 10-1: Live Run Status Page
- **Confirmed feasible:** Expand `WorkflowRun` type to include typed `steps` record. Render step list from `stepExecutionPath` or hardcoded step order. Show per-step status indicators.
- **No new Mastra APIs needed** — existing `getRunStatus` endpoint returns step data.

### Story 10-2: Gate Content Display
- **Confirmed feasible:** When `status === 'suspended'`, find the suspended step, extract `suspendPayload.output`, render based on `suspendPayload.gateId`.
- **Rendering complexity:** Medium — need 4 gate-specific renderers (research, structure, script, slides). Start with markdown rendering; slide preview is a stretch goal (or placeholder until Epic 11).

### Story 10-3: Review Controls
- **Confirmed feasible:** Approve/reject buttons + feedback textarea. Calls existing `resumeStep()`. After resume, refresh polling.
- **Edge case:** Handle rapid double-click (disable button after first click). Handle resume failure (show error, re-enable button).

### Story 10-4: Run History
- **Confirmed feasible:** `GET /api/workflows/slidewreck/runs` returns `{ runs, total }`. Straightforward paginated list.
- Add `listRuns(workflowId)` to `MastraClient`. Render as a table with runId, status, createdAt. Link each row to `/run/{runId}`.

---

## 8. Recommended Implementation Order

1. **10-1** (Live Run Status) — expand types + step progress UI
2. **10-2** (Gate Content Display) — gate-specific renderers
3. **10-3** (Review Controls) — approve/reject + feedback form
4. **10-4** (Run History) — depends on list endpoint verification

Stories 10-1 through 10-3 form a natural chain. 10-4 is independent and can be parallelized if the list endpoint exists.
