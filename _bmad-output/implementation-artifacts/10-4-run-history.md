# Story 10.4: Run History

Status: ready-for-dev

## Story

As a speaker,
I want to see my past workflow runs,
So that I can revisit previous talks.

## Acceptance Criteria

1. **Given** the speaker has completed one or more workflow runs **When** they navigate to the home or history page **Then** past runs are listed with topic, date, format, and status
2. **Given** each run entry **When** displayed **Then** it links to the run detail page `/run/:runId`
3. **Given** no runs exist **When** they view the history page **Then** a helpful empty state is shown

## Tasks / Subtasks

- [ ] Task 1: Add `listRuns` method to MastraClient (AC: 1)
  - [ ] 1.1 Add `listRuns(workflowId)` method to `web/lib/mastra-client.ts`
  - [ ] 1.2 Returns `{ runs: WorkflowRun[], total: number }`
  - [ ] 1.3 Calls `GET /api/workflows/{workflowId}/runs`
- [ ] Task 2: Create run history page (AC: 1, 2, 3)
  - [ ] 2.1 Create `web/app/history/page.tsx` — lists past runs
  - [ ] 2.2 Each row shows: status indicator, run ID (truncated), date, status label
  - [ ] 2.3 Each row links to `/run/:runId`
  - [ ] 2.4 Empty state when no runs exist
- [ ] Task 3: Add navigation link to history (AC: 1)
  - [ ] 3.1 Add "History" link to home page
  - [ ] 3.2 Add "History" link to run status page header
- [ ] Task 4: Tests (AC: 1, 3)
  - [ ] 4.1 Unit test `listRuns` method — correct API call and response parsing
  - [ ] 4.2 Unit test empty runs response

## Dev Notes

### API Endpoint (verified in spike)

`GET /api/workflows/slidewreck/runs` returns:
```typescript
{ runs: WorkflowRun[], total: number }
```

- Returns all runs by default (no pagination needed for local app)
- `total` field confirmed present
- Each run has: `runId`, `status`, `createdAt`, `updatedAt`, `workflowName`

### Note on topic/format extraction

The `WorkflowRun` response does NOT include the original input (topic, format, etc.) in the top-level response from the list endpoint. The `payload` field may be present on individual run detail but not necessarily on the list.

Options:
- Show `runId` (truncated) + date + status (minimal but functional)
- If `payload` is available in list response, show topic (stretch)

### Anti-Patterns to Avoid

- Do NOT poll the history page — single fetch on mount
- Do NOT create a custom hook for a single fetch — use `useEffect` + `useState` directly
- Keep it simple — no pagination, sorting, or filtering for MVP

### References

- [Source: spike-epic-10-workflow-status-review-gates.md#2.3]
- [Source: web/lib/mastra-client.ts — MastraClient base]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
