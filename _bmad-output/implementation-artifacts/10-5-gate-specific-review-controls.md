# Story 10.5: Gate-Specific Review Controls

Status: done

## Story

As a speaker,
I want each review gate to have controls tailored to what that gate needs,
so that I can provide the right kind of input at each stage (not just approve/reject).

## Acceptance Criteria

1. **Given** the workflow is suspended at the `collect-references` gate, **When** the speaker views the gate, **Then** a form allows adding/removing reference materials (file path or URL per row), **And** a "Skip" button resumes with an empty materials array, **And** a "Submit" button resumes with `{materials: ReferenceMaterial[]}`
2. **Given** the workflow is suspended at the `architect-structure` gate, **When** the speaker views the 3 structure options, **Then** each option is selectable (radio/card), **And** the selected option is communicated in the feedback field on approve, **And** reject still triggers regeneration with feedback
3. **Given** the workflow is suspended at the `review-slides` gate, **When** the speaker views the DeckSpec, **Then** approve/reject + feedback are available (as today), **And** an optional DeckSpec editor allows sending back a modified `deckSpec` on resume
4. **Given** gates that already work (`review-research`, `review-script`), **When** the speaker interacts with them, **Then** behaviour is unchanged (approve/reject + feedback textarea)
5. **Given** any gate resume payload, **When** submitted to the Mastra API, **Then** it passes the backend Zod schema validation for that gate's resume schema

## Tasks / Subtasks

- [x] Task 1: Refactor ReviewControls to accept gateId and dispatch to per-gate controls (AC: #4, #5)
  - [x] 1.1: Add `gateId` prop to `ReviewControlsProps` interface
  - [x] 1.2: Create `GateControls` dispatcher component that maps gateId to a per-gate control component, falling back to the existing generic approve/reject form for unknown gates
  - [x] 1.3: Update `run/[runId]/page.tsx` to pass `gateId` from the suspend payload to `ReviewControls`
  - [x] 1.4: Verify existing gates (`review-research`, `review-script`) still work unchanged
- [x] Task 2: Build ReferencesControls for collect-references gate (AC: #1)
  - [x] 2.1: Create `web/components/gate-controls/references-controls.tsx` — dynamic row list with type select (`file`|`url`) and path text input per row, plus add/remove buttons
  - [x] 2.2: "Submit" calls `resumeStep` with `{materials: [{type, path}, ...]}` (matches `CollectReferencesResumeSchema`)
  - [x] 2.3: "Skip" calls `resumeStep` with `{materials: []}` (empty array)
  - [x] 2.4: Write tests: submit with materials, submit with skip, add/remove row interactions
- [x] Task 3: Build StructureControls for architect-structure gate (AC: #2)
  - [x] 3.1: Create `web/components/gate-controls/structure-controls.tsx` — render selectable cards for each structure option from the gate output, radio-style selection
  - [x] 3.2: "Approve" sends `{decision: 'approve', feedback: 'Selected option: <title>'}` with optional additional feedback appended
  - [x] 3.3: "Reject" sends `{decision: 'reject', feedback: '<user feedback>'}` to trigger regeneration
  - [x] 3.4: Write tests: select option and approve, reject with feedback, no selection blocks approve
- [x] Task 4: Build SlidesControls for review-slides gate (AC: #3)
  - [x] 4.1: Create `web/components/gate-controls/slides-controls.tsx` — approve/reject + feedback (same as generic) plus a collapsible JSON editor textarea for deckSpec
  - [x] 4.2: When deckSpec textarea is non-empty, parse as JSON and include `deckSpec` field in resume payload (matches `ReviewSlidesResumeSchema`)
  - [x] 4.3: When deckSpec textarea is empty/collapsed, send standard `{decision, feedback}` without deckSpec
  - [x] 4.4: Show JSON validation error inline if deckSpec textarea content is not valid JSON
  - [x] 4.5: Write tests: approve without deckSpec edit, approve with valid deckSpec, reject, invalid JSON shows error
- [x] Task 5: Integration validation (AC: #5)
  - [x] 5.1: Write integration test verifying each gate control component produces a resume payload matching the backend Zod schema shape
  - [x] 5.2: Run full test suite and fix any regressions

## Dev Notes

### Architecture & Patterns

**Component Structure Pattern:** Follow the existing gate-content pattern — a dispatcher (`gate-content/index.tsx`) that maps gateId to per-gate components. Create an analogous `gate-controls/` directory:
```
web/components/gate-controls/
  index.tsx                    # Dispatcher: maps gateId → per-gate control component
  references-controls.tsx      # collect-references gate
  structure-controls.tsx       # architect-structure gate
  slides-controls.tsx          # review-slides gate
  generic-controls.tsx         # Extracted from current review-controls.tsx (approve/reject + feedback)
```

**Resume Payload Contracts (backend Zod schemas):**

| Gate | Schema | Payload Shape |
|------|--------|---------------|
| `collect-references` | `CollectReferencesResumeSchema` in `mastra/src/mastra/schemas/collect-references.ts` | `{materials: [{type: 'file'\|'url', path: string}]}` |
| `review-research` | `GateResumeSchema` in `mastra/src/mastra/schemas/gate-payloads.ts` | `{decision: 'approve'\|'reject', feedback?: string, edits?: unknown}` |
| `architect-structure` | `GateResumeSchema` (same) | `{decision: 'approve'\|'reject', feedback?: string, edits?: unknown}` |
| `review-script` | `GateResumeSchema` (same) | `{decision: 'approve'\|'reject', feedback?: string, edits?: unknown}` |
| `review-slides` | `ReviewSlidesResumeSchema` in `mastra/src/mastra/workflows/steps/review-slides.ts` | `{decision: 'approve'\|'reject', feedback?: string, deckSpec?: DeckSpec}` |

**Key constraint:** `collect-references` has NO `decision` field — it only accepts `{materials: [...]}`. The current generic form sends `{decision, feedback}` which will fail validation. The references control must not use approve/reject at all — just "Submit" and "Skip".

**The `gateId` is available in the suspend payload** — accessed via `gate.suspendPayload.gateId` in `run/[runId]/page.tsx`. For `collect-references`, there is no `gateId` in the suspend payload (it uses a custom suspend format); use `gate.stepId` as the fallback, which is already the pattern in `GateContent`.

### Existing Code to Reuse

- `MastraClient.resumeStep()` in `web/lib/mastra-client.ts` already accepts `resumeData: unknown` — no changes needed
- `ReviewControls` error handling pattern (MastraApiError, submitting state, disabled buttons) should be extracted into a shared hook or utility for reuse across all gate controls
- The structure gate's option data comes from `gate.suspendPayload.output` which has shape `{options: [{title, description, sections: [...], rationale}]}` — already rendered by `structure-gate.tsx`

### Previous Story Learnings (from 10.4)

- Mastra API endpoints verified in spike — all working
- `resume-async` endpoint uses query param `?runId=...` (was fixed in commit `4080fa8d`)
- Polling at 3s intervals works well — gate controls should call `onResumed()` after successful resume to trigger immediate refetch

### Testing Standards

- Test framework: Vitest with React Testing Library (already configured in `web/`)
- Test location: co-located in `web/components/gate-controls/__tests__/`
- Test pattern: render component, simulate user interaction, assert on the resume payload passed to `resumeStep`
- Mock `MastraClient.resumeStep` to capture the payload and assert schema shape
- No need for E2E tests — unit + integration tests for payload shape validation are sufficient

### Project Structure Notes

- All new files go in `web/components/gate-controls/`
- Follows existing convention: kebab-case filenames, named exports, 'use client' directive
- Tailwind CSS for styling — match existing component styles (gray borders, rounded-md, text-sm)
- No new dependencies needed — all UI is built with standard React + Tailwind

### References

- [Source: mastra/src/mastra/schemas/collect-references.ts] — CollectReferencesResumeSchema
- [Source: mastra/src/mastra/schemas/gate-payloads.ts] — GateResumeSchema, GateDecision
- [Source: mastra/src/mastra/workflows/steps/review-slides.ts] — ReviewSlidesResumeSchema
- [Source: web/components/review-controls.tsx] — Current generic form (to be refactored)
- [Source: web/components/gate-content/index.tsx] — Dispatcher pattern to follow
- [Source: web/components/gate-content/structure-gate.tsx] — Structure option rendering (data shape reference)
- [Source: web/app/run/[runId]/page.tsx] — Gate rendering integration point
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-17.md] — Change proposal with full rationale

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created `gate-controls/` component directory with dispatcher pattern matching existing `gate-content/` architecture
- `ReferencesControls`: dynamic row list (type select + path input), Submit sends `{materials: [...]}`, Skip sends `{materials: []}`
- `StructureControls`: selectable option cards, approve sends selected title in feedback, reject sends feedback for regeneration
- `SlidesControls`: approve/reject + feedback + collapsible JSON editor for DeckSpec edits with inline validation
- `GenericControls`: extracted from old `ReviewControls` for review-research and review-script gates
- `GateControls` dispatcher maps gateId → specialized component, falls back to generic for unknown gates
- Updated `run/[runId]/page.tsx` to use `GateControls` instead of `ReviewControls`, passing gateId and output
- 15 new tests covering payload builders, MastraClient integration, and GATE_CONTROLS_MAP
- All 85 web tests pass, 0 regressions. TypeScript clean.
- Pre-existing slidewreck.test.ts failure is unrelated (import issue).

### Change Log

- 2026-03-17: Implemented all gate-specific review controls (Tasks 1-5)
- 2026-03-17: Code review fixes — removed dead review-controls.tsx, added tests for slides reject path and empty feedback edge case

### File List

- web/components/gate-controls/index.tsx (new)
- web/components/gate-controls/generic-controls.tsx (new)
- web/components/gate-controls/references-controls.tsx (new)
- web/components/gate-controls/structure-controls.tsx (new)
- web/components/gate-controls/slides-controls.tsx (new)
- web/app/run/[runId]/page.tsx (modified)
- web/__tests__/gate-controls.test.ts (new)
- _bmad-output/implementation-artifacts/10-5-gate-specific-review-controls.md (new)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/planning-artifacts/epics.md (modified)
- _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-17.md (new)
