# Story 10b.1: Side-by-Side Architect Gate Comparison

Status: done

## Story

As a speaker,
I want to see the three structure proposals side by side and click to select one,
So that I can compare options visually instead of reading sequentially and typing my choice.

## Acceptance Criteria

1. **Given** the workflow is suspended at the `architect-structure` gate **When** the speaker views the gate **Then** three cards are laid out horizontally (or responsively stacked on narrow screens), each showing the structure title, section breakdown with timing, and rationale
2. **Given** the three cards are displayed **When** the speaker clicks a card **Then** the selected card gets a highlight border (blue-500) and the other cards return to default styling
3. **Given** a card is selected **When** the speaker views below the cards **Then** a feedback textarea is available for optional notes (e.g., "but swap sections 3 and 4")
4. **Given** the speaker clicks a card and submits **When** the gate is resumed **Then** the payload includes the selected option identifier and any feedback text **And** the payload passes the backend Zod schema validation for the architect gate resume schema
5. **Given** the speaker clicks "Reject All" **When** the gate is resumed with rejection **Then** the existing regeneration flow triggers with the feedback text (unchanged behaviour)

## Tasks / Subtasks

- [x] Task 1: Merge structure display and selection into unified `StructureGate` component (AC: #1, #2)
  - [x] 1.1: Refactor `StructureGate` to accept `onSelect` callback and `selectedIndex` props alongside `output`
  - [x] 1.2: Change layout from vertical stack (`space-y-4`) to responsive horizontal grid (`grid grid-cols-1 md:grid-cols-3 gap-4`)
  - [x] 1.3: Add click handler on each card that calls `onSelect(index)`
  - [x] 1.4: Apply conditional border styling: `border-blue-500 bg-blue-50` when selected, `border-gray-200 hover:border-gray-400 cursor-pointer` otherwise
  - [x] 1.5: Write tests for `StructureGate` rendering 3 cards with click selection
- [x] Task 2: Update `StructureControls` to use unified display+selection (AC: #3, #4, #5)
  - [x] 2.1: Remove duplicated option card buttons from `StructureControls` — selection now lives in `StructureGate`
  - [x] 2.2: Lift `selectedIndex` state to the run page so `StructureGate` and `StructureControls` share it
  - [x] 2.3: `StructureControls` receives `selectedIndex` as a prop; Approve button disabled when `selectedIndex === null`
  - [x] 2.4: Keep feedback textarea and Approve/Reject buttons in `StructureControls`
  - [x] 2.5: Write tests for approve payload shape (`buildStructureApprovePayload`) and reject flow
- [x] Task 3: Integration wiring in run page (AC: #1, #2, #3)
  - [x] 3.1: In `run/[runId]/page.tsx`, add `selectedStructureIndex` state for the architect gate case
  - [x] 3.2: Pass `selectedIndex` and `onSelect` to `GateContent` → `StructureGate` when `gateId === 'architect-structure'`
  - [x] 3.3: Pass `selectedIndex` to `GateControls` → `StructureControls` when `gateId === 'architect-structure'`
  - [x] 3.4: Update `GateContent` and `GateControls` dispatcher interfaces to accept optional selection props
  - [x] 3.5: Write integration test verifying the full select → approve flow
- [x] Task 4: Verify no regressions on other gates (AC: #5)
  - [x] 4.1: Run existing gate-content and gate-controls tests — all must pass
  - [x] 4.2: Verify `GateContent`/`GateControls` dispatchers still work for all other gate IDs

## Dev Notes

### Architecture Patterns

- **Dispatcher pattern:** `gate-content/index.tsx` maps `gateId` → component. `gate-controls/index.tsx` maps `gateId` → control type. Both must be updated to forward optional selection props.
- **State lifting:** Selection state lives in the run page (`page.tsx`), passed down through dispatchers. This is cleaner than trying to communicate between sibling components.
- **No backend changes:** The resume payload shape is unchanged — `buildStructureApprovePayload` already sends `"Selected option: <title>"` in the feedback field. No Zod schema change needed.

### Existing Component Inventory

| File | Current Role | Changes Needed |
|------|-------------|---------------|
| `web/components/gate-content/structure-gate.tsx` | Displays 3 option cards vertically | Add grid layout, click handler, selected state styling |
| `web/components/gate-controls/structure-controls.tsx` | Duplicates option buttons + approve/reject | Remove option buttons, receive `selectedIndex` as prop |
| `web/components/gate-content/index.tsx` | Dispatcher | Forward selection props to StructureGate |
| `web/components/gate-controls/index.tsx` | Dispatcher | Forward `selectedIndex` to StructureControls |
| `web/app/run/[runId]/page.tsx` | Page | Add `selectedStructureIndex` state, pass to both dispatchers |

### Styling Conventions (from Epic 10)

- Tailwind CSS v4.2.1, no external UI library
- Selected state: `border-2 border-blue-500 bg-blue-50` (already used in current `StructureControls`)
- Default card: `rounded-lg border border-gray-200 p-4`
- Hover: `hover:border-gray-400`
- Buttons: green bg for approve, red bg for reject
- Responsive: use `grid grid-cols-1 md:grid-cols-3` for side-by-side on desktop, stacked on mobile

### Data Shape

The architect output shape (from `ArchitectOutputSchema`):
```typescript
{
  options: Array<{
    title: string;
    description: string;
    sections: Array<{ title: string; purpose: string; contentWordCount: number; estimatedMinutes: number }>;
    rationale: string;
  }>;
}
```

### Previous Story Intelligence

- Story 10.5 added `StructureControls` with selectable cards — but display and interaction are split across two components. Story 10b.1 unifies them.
- Story 10.2 established the gate-content dispatcher pattern. Story 10b.1 extends it to support interactive content (not just display).
- Epic 10 retro: Story 10.3 missed per-gate resume schemas. This story preserves the existing payload shape — no risk.

### Testing Standards

- Tests co-located in `web/__tests__/`
- Use `vi.stubGlobal('fetch', mockFetch)` for API mocking
- Test component rendering with expected DOM structure
- Test payload shape assertions for approve/reject
- Test that other gates remain unaffected by dispatcher changes

### Project Structure Notes

- All changes within `web/` workspace
- No backend (`mastra/`) changes required
- No new dependencies needed

### References

- [Source: web/components/gate-content/structure-gate.tsx] — current vertical layout
- [Source: web/components/gate-controls/structure-controls.tsx] — current selection buttons
- [Source: web/components/gate-content/index.tsx] — dispatcher
- [Source: web/components/gate-controls/index.tsx] — controls dispatcher
- [Source: web/app/run/[runId]/page.tsx] — run status page integration point
- [Source: _bmad-output/planning-artifacts/epics.md#Story 10b.1] — epic spec
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — frontend patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Refactored `StructureGate` from vertical stack to responsive 3-column grid layout with click-to-select interaction
- Removed duplicated option card buttons from `StructureControls`, now receives `selectedIndex` as prop
- Lifted selection state (`selectedStructureIndex`) to run page, passed through dispatchers to both content and controls
- Updated both `GateContent` and `GateControls` dispatcher interfaces with optional `selectedIndex`/`onSelect` props
- Approve button shows selected option title; disabled until selection made
- Added hint text "Click a structure option above to select it" when nothing selected
- Added total minutes display on each card for quick comparison
- No backend schema changes — payload shape preserved (`buildStructureApprovePayload` unchanged)
- All 110 tests pass (10 new in this story), no regressions

### Change Log

- 2026-03-23: Story 10b.1 implementation — side-by-side architect gate comparison

### File List

- web/components/gate-content/structure-gate.tsx (modified — grid layout, selection props, StructureOption export)
- web/components/gate-controls/structure-controls.tsx (modified — removed option buttons, accepts selectedIndex)
- web/components/gate-content/index.tsx (modified — forwards selection props for architect gate)
- web/components/gate-controls/index.tsx (modified — forwards selectedIndex for architect gate)
- web/app/run/[runId]/page.tsx (modified — selectedStructureIndex state, passed to dispatchers)
- web/__tests__/structure-gate-selection.test.ts (new — 10 tests for selection integration)
