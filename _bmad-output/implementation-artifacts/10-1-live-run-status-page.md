# Story 10.1: Live Run Status Page

Status: ready-for-dev

## Story

As a speaker,
I want to see which step the pipeline is on in real time,
So that I know how far along my talk generation is.

## Acceptance Criteria

1. **Given** a workflow run is in progress **When** the speaker views `/run/:runId` **Then** the page polls for step completion updates every 3s **And** each step is shown with its status (pending, running, complete, failed, suspended) **And** the currently active step is visually highlighted
2. **Given** the workflow completes **When** all steps are done **Then** a link to view the generated deck is displayed
3. **Given** a run does not exist **When** the speaker navigates to `/run/:badId` **Then** a clear error message is shown

## Tasks / Subtasks

- [ ] Task 1: Expand `WorkflowRun` type and `MastraClient` (AC: 1)
  - [ ] 1.1 Add typed `steps` record to `WorkflowRun` interface in `web/lib/mastra-client.ts`
  - [ ] 1.2 Add `StepStatus` type matching Mastra's per-step status shape: `{ status, output?, suspendPayload?, error?, startedAt, endedAt, suspendedAt?, resumedAt? }`
  - [ ] 1.3 Add `serializedStepGraph` to `WorkflowRun` (optional, for dynamic step ordering)
- [ ] Task 2: Define step metadata constant (AC: 1)
  - [ ] 2.1 Create `web/lib/workflow-steps.ts` with ordered step list and display labels
  - [ ] 2.2 Step order from spike: `collect-references` → `review-research` → `review-structure` → `write-script` → `review-script` → `designer-outline` → `designer-content-fill` → `build-slides` + `render-diagrams` (parallel) → `review-slides` → `render-deck` → `run-evals`
  - [ ] 2.3 Include `canSuspend` flag per step for gate indicator
- [ ] Task 3: Build step progress component (AC: 1)
  - [ ] 3.1 Create `web/components/step-progress.tsx` — vertical step list with status icons
  - [ ] 3.2 Status icon mapping: pending=gray, running=yellow pulse, success=green, failed=red, suspended=blue
  - [ ] 3.3 Highlight the currently active step (first non-success step)
  - [ ] 3.4 Show gate badge on steps where `canSuspend=true`
- [ ] Task 4: Update run page to show step progress (AC: 1, 2, 3)
  - [ ] 4.1 Replace placeholder text in `web/app/run/[runId]/page.tsx` with `StepProgress` component
  - [ ] 4.2 Pass `run.steps` to the component
  - [ ] 4.3 On success: show link to deck view (placeholder URL `/deck/:runId`)
  - [ ] 4.4 Handle error state gracefully
- [ ] Task 5: Tests (AC: 1, 2, 3)
  - [ ] 5.1 Unit test `workflow-steps.ts` — correct order and metadata
  - [ ] 5.2 Unit test step status derivation logic
  - [ ] 5.3 Unit test expanded `WorkflowRun` type compatibility

## Dev Notes

### Existing Foundation (from Epic 9)

- `web/lib/mastra-client.ts` — `MastraClient` with `getRunStatus()`, `resumeStep()`, `triggerWorkflow()`
- `web/lib/use-run-status.ts` — `useRunStatus` hook: polls every 3s, stops on terminal status
- `web/app/run/[runId]/page.tsx` — Shows overall status indicator + placeholder for suspended state
- `WorkflowRun.steps` already typed as `Record<string, unknown>` — needs proper typing

### API Shape (verified in spike, 2026-03-17)

`GET /api/workflows/slidewreck/runs/{runId}` returns:

```typescript
{
  runId: string;
  workflowName: string;
  status: RunStatus;
  steps: Record<string, {
    status: RunStatus;
    output?: Record<string, any>;
    suspendPayload?: { agentId: string; gateId: string; output: unknown; summary: string };
    error?: { message: string; stack?: string };
    startedAt: number;
    endedAt: number;
    suspendedAt?: number;
    resumedAt?: number;
  }>;
  serializedStepGraph?: Array<{ type: string; step?: { id: string; description?: string; canSuspend?: boolean }; steps?: any[] }>;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: unknown;
}
```

- `steps` is always returned — no extra params needed
- `serializedStepGraph` is also returned (17 entries with `canSuspend` flag)
- `stepExecutionPath` is NOT returned by the REST API

### Step Order (hardcoded constant, verified from serializedStepGraph)

```
collect-references (gate) → review-research (gate) → review-structure (gate) →
write-script → review-script (gate) → designer-outline → designer-content-fill →
[parallel: build-slides, render-diagrams] → review-slides (conditional gate) →
render-deck → run-evals
```

Plus internal `mapping` steps between composites — these should be hidden from the UI.

### Key Decisions

- **Hardcode step order** as a constant rather than parsing `serializedStepGraph` at runtime. We own the workflow, and the graph parsing would add complexity for no benefit.
- **Polling stays at 3s** — adequate for local single-user app with 10-60s steps.
- **Hide internal steps** like `mapping`, `init-rag`, `index-references` — only show user-facing pipeline stages.

### Anti-Patterns to Avoid

- Do NOT create a new polling mechanism — extend the existing `useRunStatus` hook
- Do NOT parse `serializedStepGraph` dynamically — use hardcoded step list
- Do NOT import Mastra types directly — define frontend-specific interfaces (the backend Zod schemas have transforms the frontend doesn't need)

### Project Structure Notes

- New files go in `web/lib/` (utilities) and `web/components/` (React components)
- Tests in `web/__tests__/` (following existing pattern from `web/__tests__/use-run-status.test.ts`)
- Import paths use `@/` alias (mapped to `web/` root in tsconfig.json)

### References

- [Source: spike-epic-10-workflow-status-review-gates.md#2.1, #3, #7]
- [Source: architecture.md#Frontend Architecture]
- [Source: web/lib/mastra-client.ts — existing WorkflowRun interface]
- [Source: web/app/run/[runId]/page.tsx — current run status page]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
