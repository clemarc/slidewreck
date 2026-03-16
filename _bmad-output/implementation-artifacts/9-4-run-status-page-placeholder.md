# Story 9.4: Run Status Page (Placeholder)

Status: done

## Story

As a speaker,
I want to see that my workflow has started after submitting the form,
So that I know generation is in progress.

## Acceptance Criteria

1. **AC-1: Run page route** — `/run/:runId` displays the run ID and a "Generation in progress" indicator.
2. **AC-2: Status polling** — The page polls `MastraClient.getRunStatus` to check the workflow status. While running, it shows "Generation in progress". When complete, it shows a success message with the run result.
3. **AC-3: Error state** — If the workflow fails or the run is not found, the page shows an error message.
4. **AC-4: Tests** — Unit tests cover the status polling logic.

## Tasks / Subtasks

- [x] Task 1: Upgrade run status page to client component with polling (AC: 1, 2)
  - [x] 1.1 Convert `web/app/run/[runId]/page.tsx` to a `'use client'` component with `useParams`
  - [x] 1.2 Created `web/lib/use-run-status.ts` hook with `useEffect` + `setInterval` polling every 3s
  - [x] 1.3 Display current run status with colored indicators and labels for all 10 statuses
  - [x] 1.4 Show "Generation in progress" with animated yellow pulse while running/pending
  - [x] 1.5 Show success state with completion message
  - [x] 1.6 Stop polling on terminal states (success, failed, canceled, bailed, tripwire)
- [x] Task 2: Error handling (AC: 3)
  - [x] 2.1 Show error state if getRunStatus throws (MastraApiError details or generic message)
  - [x] 2.2 Show failed state with red indicator and error details from `run.error`
- [x] Task 3: Tests (AC: 4)
  - [x] 3.1 Test TERMINAL_STATUSES includes correct statuses and excludes non-terminal
  - [x] 3.2 Test terminal state detection with parameterized tests for all 10 statuses
  - [x] 3.3 Test getRunStatus integration with mocked fetch (success + error)

## Dev Notes

### Previous Story Intelligence

- `web/app/run/[runId]/page.tsx` already exists as a server component placeholder (Story 9-1)
- Need to convert to `'use client'` component for polling
- `MastraClient` from `web/lib/mastra-client.ts` has `getRunStatus(workflowId, runId)` returning `WorkflowRun` with status field
- Terminal statuses: `success`, `failed`, `canceled`, `bailed`, `tripwire`
- The `useParams` hook from `next/navigation` extracts `runId` in client components

### Implementation Notes

- Extract polling logic into a custom hook `useRunStatus(workflowId, runId)` for testability
- Poll every 3 seconds, stop on terminal state
- Display status using a simple state machine: loading → polling → terminal (success/failed)
- Use `useEffect` cleanup to clear interval on unmount

### Terminal Statuses

```typescript
const TERMINAL_STATUSES = ['success', 'failed', 'canceled', 'bailed', 'tripwire'] as const;
```

### File Structure

```
web/app/run/[runId]/page.tsx  ← convert to client component
web/lib/use-run-status.ts     ← custom hook for polling (testable)
```

### Anti-patterns to Avoid

- Do NOT use SSE or WebSockets — simple polling is sufficient for this placeholder
- Do NOT show detailed step-by-step progress — that's Epic 10 (Story 10.1)
- Do NOT render results content — just show "complete" with a placeholder link

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 9.4]
- [Source: web/lib/mastra-client.ts — MastraClient.getRunStatus]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Converted server component to client component with `useParams` for runId
- Extracted `useRunStatus` custom hook: polling, terminal state detection, error handling
- Status indicators: yellow pulse (running), green (success), red (failed), blue (suspended)
- Labels for all 10 Mastra run statuses
- Stops polling on terminal states and API errors
- Added "New Talk" link for navigation
- 15 tests for status logic and API integration
- 452 total tests pass, Next.js build verified

### File List

- `web/app/run/[runId]/page.tsx` (modified — converted to client component with polling)
- `web/lib/use-run-status.ts` (new — custom hook)
- `web/__tests__/use-run-status.test.ts` (new)

## Senior Developer Review (AI)

**Date:** 2026-03-16
**Outcome:** Approve (with fix applied)

### Findings

- [x] [MEDIUM] Fixed: MastraClient was instantiated per poll cycle — moved to `useRef` for single instance
- [x] [LOW] `'use client'` directive on hook file is fine — prevents accidental server import
- [x] [LOW] Polling stops on transient errors — acceptable for placeholder, Epic 10 can add retry
- [x] [LOW] Workflow ID hardcoded to 'slidewreck' — only workflow, fine for now
