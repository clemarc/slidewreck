# Story 10.3: Review Controls

Status: ready-for-dev

## Story

As a speaker,
I want approve/reject buttons with a feedback field,
So that I can interact with gates without using the API directly.

## Acceptance Criteria

1. **Given** the workflow is suspended at a gate **When** the speaker views the gate content **Then** approve and reject buttons are visible **And** a textarea for feedback/edits is available
2. **Given** the speaker approves or rejects with feedback **When** they submit the review **Then** the workflow is resumed via the Mastra API with the appropriate payload **And** the status page updates to show the pipeline continuing
3. **Given** the speaker rejects at a gate **When** the workflow regenerates and suspends again **Then** the updated content is displayed for another review round
4. **Given** the speaker double-clicks approve/reject **When** they submit **Then** only one resume call is made (button disabled after first click)

## Tasks / Subtasks

- [ ] Task 1: Create review controls component (AC: 1, 4)
  - [ ] 1.1 Create `web/components/review-controls.tsx` — approve/reject buttons + feedback textarea
  - [ ] 1.2 Disable buttons after submission to prevent double-click
  - [ ] 1.3 Show loading state during API call
  - [ ] 1.4 Show error message on API failure, re-enable buttons
- [ ] Task 2: Wire resume API call (AC: 2)
  - [ ] 2.1 On approve: call `MastraClient.resumeStep()` with `{ decision: 'approve', feedback }`
  - [ ] 2.2 On reject: call `MastraClient.resumeStep()` with `{ decision: 'reject', feedback }`
  - [ ] 2.3 After successful resume, trigger a re-fetch of run status (restart polling)
- [ ] Task 3: Integrate into run page (AC: 2, 3)
  - [ ] 3.1 Add `ReviewControls` below gate content when `run.status === 'suspended'`
  - [ ] 3.2 Pass `workflowId`, `runId`, `stepId` to the component
  - [ ] 3.3 After resume, polling auto-detects status change
- [ ] Task 4: Enable re-fetch after resume (AC: 2, 3)
  - [ ] 4.1 Add `refetch()` callback to `useRunStatus` hook return value
  - [ ] 4.2 Call `refetch()` after successful resume to immediately update status
- [ ] Task 5: Tests (AC: 1, 2, 4)
  - [ ] 5.1 Unit test ReviewControls — approve/reject calls with correct payload
  - [ ] 5.2 Unit test double-click prevention
  - [ ] 5.3 Unit test error handling on API failure

## Dev Notes

### Existing Resume API

`MastraClient.resumeStep(workflowId, runId, step, resumeData)` is already implemented and tested.

The `step` parameter must match the step ID (e.g., `review-research`). The `resumeData` shape is:
```typescript
{ decision: 'approve' | 'reject', feedback?: string, edits?: unknown }
```

### Polling Restart

After resume, the workflow status changes from `suspended` to `running`. The existing `useRunStatus` hook:
- Polls every 3s
- Already stops on terminal statuses
- Does NOT currently expose a `refetch()` callback

Need to add a `refetch` function to the hook return to trigger an immediate fetch after resume (rather than waiting up to 3s).

### Anti-Patterns to Avoid

- Do NOT create a separate API client for resume — use existing `MastraClient.resumeStep()`
- Do NOT manage run state in the component — use the existing `useRunStatus` hook
- Do NOT restart the interval — just trigger a single immediate fetch

### References

- [Source: web/lib/mastra-client.ts:88-103 — resumeStep method]
- [Source: mastra/src/mastra/schemas/gate-payloads.ts — GateResumeSchema]
- [Source: spike-epic-10-workflow-status-review-gates.md#2.2]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
