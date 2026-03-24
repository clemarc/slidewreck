# Story 10b.3: Completed Step Output Viewer

Status: done

## Story

As a speaker,
I want to click on any completed step in the run status page and see its full output,
So that I can revisit research, structure, script, or slides at any point after approval.

## Acceptance Criteria

1. **Given** a workflow run with completed steps **When** the speaker views the run status page (`/run/:runId`) **Then** each completed step is clickable or expandable
2. **Given** a completed step is clicked **When** the output panel opens **Then** the step's full output is rendered using the same components from Story 10b.2 (formatted markdown, structured sections, slide thumbnails — not raw JSON)
3. **Given** a step that is pending or in-progress **When** the speaker views the run status page **Then** that step is not clickable and shows only its status indicator

## Tasks / Subtasks

- [x] Task 1: Make completed steps clickable in `StepProgress` (AC: #1, #3)
  - [x] 1.1: Add `onStepClick` callback prop to `StepProgress` component
  - [x] 1.2: Add `expandedStepId` prop to track which step is expanded
  - [x] 1.3: Make completed steps (`status === 'success'`) clickable with cursor-pointer and hover effect
  - [x] 1.4: Pending/running/failed steps remain non-clickable
  - [x] 1.5: Write tests for clickable vs non-clickable state
- [x] Task 2: Create `StepOutputPanel` component (AC: #2)
  - [x] 2.1: Create `web/components/step-output-panel.tsx` that renders step output using gate-content renderers
  - [x] 2.2: Map step IDs to gate content components: `review-research` → ResearchGate, `architect-structure` → StructureGate, `review-script` → ScriptGate, `review-slides`/`designer-outline`/`designer-content-fill` → SlidesGate, others → raw JSON fallback
  - [x] 2.3: Extract step output from `StepState.output` or `StepState.payload`
  - [x] 2.4: Render panel inline below the clicked step (collapsible)
  - [x] 2.5: Write tests for step-to-renderer mapping
- [x] Task 3: Wire up in run page (AC: #1, #2)
  - [x] 3.1: Add `expandedStepId` state in run page
  - [x] 3.2: Pass `onStepClick` and `expandedStepId` to `StepProgress`
  - [x] 3.3: When a step is expanded, render `StepOutputPanel` below it
  - [x] 3.4: Clicking an already-expanded step collapses it (toggle)
  - [x] 3.5: Write integration test for expand/collapse flow
- [x] Task 4: Verify no regressions
  - [x] 4.1: Run all existing tests
  - [x] 4.2: Verify suspended gate display is unaffected (separate from step output viewer)

## Dev Notes

### Step Output Data

The Mastra API returns `StepState.output` (Record<string, unknown>) for completed steps. The output shape depends on the step:

- Gate steps (review-research, architect-structure, review-script, review-slides): output contains the agent's structured output in `suspendPayload.output`
- Non-gate steps (script-writer, designer-outline, designer-content-fill, build-slides, render-diagrams): output is the step's return value

For gate steps that have completed (approved), the output is in `StepState.output` after resume. For the viewer, we use whatever is in the `output` field.

### Step ID → Renderer Mapping

| Step ID | Renderer | Notes |
|---------|----------|-------|
| `collect-references` | None (no output to display) | Skip |
| `review-research` | `ResearchGate` | Research brief |
| `architect-structure` | `StructureGate` (read-only, no selection) | Structure options |
| `script-writer` | `ScriptGate` | Writer output |
| `review-script` | `ScriptGate` | Script after review |
| `designer-outline` | `SlidesGate` | DeckSpec outline |
| `designer-content-fill` | `SlidesGate` | Filled DeckSpec |
| `review-slides` | `SlidesGate` | Final slides |
| `build-slides` | Raw JSON fallback | Build output |
| `render-diagrams` | Raw JSON fallback | Diagram paths |

### Reusable Components from 10b.2

- `CollapsibleSection` from `content-renderers/` — used inside gate renderers
- `LayoutBadge` from `content-renderers/` — used inside SlidesGate
- Gate content components: `ResearchGate`, `StructureGate`, `ScriptGate`, `SlidesGate` — all accept `{ output: unknown }` prop

### Existing Step Progress Component

`web/components/step-progress.tsx` currently renders a vertical step list with status icons. Changes:
- Add click handler for completed steps
- Show expanded output panel inline below the step
- Keep vertical timeline layout intact

### Testing Standards

- Tests in `web/__tests__/`
- Test step-to-renderer mapping
- Test that only completed steps are clickable
- Test toggle behaviour

### References

- [Source: web/components/step-progress.tsx] — step list component
- [Source: web/lib/workflow-steps.ts] — step metadata
- [Source: web/lib/mastra-client.ts] — StepState type with output field
- [Source: web/components/gate-content/] — renderers from 10b.2

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created `StepOutputPanel` component with step-to-renderer mapping for 7 step types + JSON fallback
- `extractStepOutput` prefers `suspendPayload.output` for gate steps, falls back to direct `output`
- `SKIP_STEPS` set excludes `collect-references` (no output to display)
- Updated `StepProgress` with `expandedStepId` + `onStepClick` props — completed steps get cursor-pointer, hover bg, and expand/collapse arrow
- Inline output panel renders below expanded step using the same renderers from Story 10b.2
- Timeline connector hidden when step is expanded (cleaner visual)
- Toggle behaviour: clicking expanded step collapses it
- All 144 tests pass (12 new in this story), no regressions

### Change Log

- 2026-03-23: Story 10b.3 implementation — completed step output viewer

### File List

- web/components/step-output-panel.tsx (new — step output panel with renderer mapping)
- web/components/step-progress.tsx (modified — expandable completed steps)
- web/app/run/[runId]/page.tsx (modified — expandedStepId state + handleStepClick)
- web/__tests__/step-output-panel.test.ts (new — 12 tests for output extraction and mapping)
