# Story 10.2: Gate Content Display

Status: ready-for-dev

## Story

As a speaker,
I want to see the content produced at each review gate,
So that I can make an informed approve/reject decision.

## Acceptance Criteria

1. **Given** the workflow is suspended at a review gate **When** the speaker views the run page **Then** the gate content is rendered in a readable format
2. Gate-specific rendering:
   - Gate `review-research`: Key findings list, source count, suggested angles
   - Gate `architect-structure`: 3 structure options with sections and timing
   - Gate `review-script`: Full speaker script with section headings
   - Gate `review-slides`: Slide preview (DeckSpec JSON or placeholder until Epic 11)
   - Gate `collect-references`: Prompt to provide reference materials
3. **Given** the workflow is NOT suspended **When** viewing the run page **Then** no gate content panel is shown

## Tasks / Subtasks

- [ ] Task 1: Create gate content renderer components (AC: 1, 2)
  - [ ] 1.1 Create `web/components/gate-content/research-gate.tsx` — renders `ResearcherOutput`
  - [ ] 1.2 Create `web/components/gate-content/structure-gate.tsx` — renders `ArchitectOutput` (3 options)
  - [ ] 1.3 Create `web/components/gate-content/script-gate.tsx` — renders `WriterOutput`
  - [ ] 1.4 Create `web/components/gate-content/slides-gate.tsx` — renders DeckSpec (JSON preview)
  - [ ] 1.5 Create `web/components/gate-content/references-gate.tsx` — reference upload prompt
  - [ ] 1.6 Create `web/components/gate-content/index.tsx` — dispatcher that maps gateId to renderer
- [ ] Task 2: Extract suspend payload from run data (AC: 1)
  - [ ] 2.1 Create `web/lib/gate-helpers.ts` — `findSuspendedStep(steps)` returns `{ stepId, suspendPayload }` or null
- [ ] Task 3: Integrate gate content into run page (AC: 1, 3)
  - [ ] 3.1 When `run.status === 'suspended'`, call `findSuspendedStep(run.steps)`, render gate content
  - [ ] 3.2 When NOT suspended, show only step progress (no gate panel)
- [ ] Task 4: Tests (AC: 1, 2, 3)
  - [ ] 4.1 Unit test `findSuspendedStep` — finds correct step and payload
  - [ ] 4.2 Unit test gate dispatcher — maps gateId to correct component

## Dev Notes

### Suspend Payload Shape (verified from spike)

When a step is suspended, `steps[stepId].suspendPayload` contains:
```typescript
{ agentId: string; gateId: string; output: unknown; summary: string }
```

The `output` field contains the full agent structured output. The `gateId` determines which renderer to use.

### Gate-Specific Output Schemas

| Gate ID | Agent Output | Key Fields |
|---------|-------------|------------|
| `review-research` | `ResearcherOutput` | `keyFindings[], sources[], statistics[], suggestedAngles[], existingTalks[]` |
| `architect-structure` | `ArchitectOutput` | `options[3]` each with `title, description, sections[], rationale` |
| `review-script` | `WriterOutput` | `sections[], timingMarkers[], totalDurationMinutes, speakerNotes` |
| `review-slides` | `DeckSpec` | Full slide deck specification |
| `collect-references` | empty | No agent output — just prompt to upload |

### Rendering Approach

- **Research gate**: Bulleted list of key findings with source type badges, source count
- **Structure gate**: Card per option with section breakdown table (title, minutes, word count)
- **Script gate**: Scrollable markdown-like view with section headers and speaking notes
- **Slides gate**: JSON code block (full renderer comes in Epic 11)
- **References gate**: Simple message prompt

### Existing Code to Extend

- `web/lib/mastra-client.ts` — `StepSuspendPayload` and `StepState` types already defined in 10-1
- `web/components/step-progress.tsx` — step list component, does NOT need modification
- `web/app/run/[runId]/page.tsx` — add gate content panel below step progress

### Anti-Patterns to Avoid

- Do NOT import Zod schemas from mastra backend — define lightweight TypeScript interfaces for rendering
- Do NOT validate gate output at render time — trust the API response shape
- Keep renderers simple — styled HTML, no complex state management

### References

- [Source: spike-epic-10-workflow-status-review-gates.md#4]
- [Source: mastra/src/mastra/agents/researcher.ts — ResearcherOutputSchema]
- [Source: mastra/src/mastra/agents/talk-architect.ts — ArchitectOutputSchema]
- [Source: mastra/src/mastra/agents/writer.ts — WriterOutputSchema]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
