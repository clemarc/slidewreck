# Story 10b.2: Gate Content Rendering Polish

Status: done

## Story

As a speaker,
I want each gate to render its content in a readable, structured format,
So that I can review research, scripts, and slides without parsing raw text or JSON.

## Acceptance Criteria

1. **Given** the workflow is suspended at the `review-research` gate **When** the speaker views the gate content **Then** the research brief is rendered as formatted markdown with collapsible sections (sources, key findings, statistics, suggested angles)
2. **Given** the workflow is suspended at the `review-script` gate **When** the speaker views the gate content **Then** the speaker notes are rendered with section headings, timing annotations, and pause markers visually distinct from body text
3. **Given** the workflow is suspended at the `review-slides` gate **When** the speaker views the gate content **Then** slides are shown as thumbnail preview cards (one per slide) with layout type and title visible — not raw DeckSpec JSON
4. **Given** shared rendering components are built for gate content **When** Story 10b.3 (step output viewer) is implemented **Then** the same rendering components are reusable for displaying completed step outputs

## Tasks / Subtasks

- [x] Task 1: Polish `ResearchGate` with collapsible sections (AC: #1)
  - [x] 1.1: Add collapsible `<details>/<summary>` sections for sources, statistics, and existing talks (currently only keyFindings and suggestedAngles shown)
  - [x] 1.2: Show statistics list with value, context, and source attribution
  - [x] 1.3: Show existing talks list with title, speaker, and linked URL
  - [x] 1.4: Show sources list with title and URL
  - [x] 1.5: Write tests verifying all sections render from mock research output
- [x] Task 2: Polish `ScriptGate` with enhanced formatting (AC: #2)
  - [x] 2.1: Add total duration badge at top alongside section count
  - [x] 2.2: Style timing annotations with distinct visual treatment (monospace badge)
  - [x] 2.3: Add collapsible per-section speaking notes with visual marker
  - [x] 2.4: Write tests verifying script section rendering
- [x] Task 3: Replace `SlidesGate` raw JSON with thumbnail cards (AC: #3)
  - [x] 3.1: Parse the DeckSpec output into slide array
  - [x] 3.2: Render each slide as a compact card: slide number, title, layout type badge, content preview (truncated)
  - [x] 3.3: Show colour palette swatch strip at top of slides gate
  - [x] 3.4: Show diagram indicator on slides that have diagram specs
  - [x] 3.5: Write tests for slide card rendering and layout type badge mapping
- [x] Task 4: Extract reusable rendering utilities (AC: #4)
  - [x] 4.1: Create `web/components/content-renderers/collapsible-section.tsx` — shared `<details>` wrapper
  - [x] 4.2: Create `web/components/content-renderers/layout-badge.tsx` — slide layout type badge
  - [x] 4.3: Export content renderers from barrel `web/components/content-renderers/index.tsx`
  - [x] 4.4: Refactor gate content components to use shared renderers
  - [x] 4.5: Write tests for reusable components
- [x] Task 5: Verify no regressions
  - [x] 5.1: Run all existing tests — all must pass
  - [x] 5.2: Verify gate-content dispatcher still works for all gate IDs

## Dev Notes

### Current State of Gate Content Components

| Component | Current | Target |
|-----------|---------|--------|
| `research-gate.tsx` | Shows keyFindings + suggestedAngles, ignores sources/statistics/existingTalks | Collapsible sections for all data |
| `script-gate.tsx` | Shows sections with timing, speaking notes as blue sidebar | Enhanced timing badges, collapsible notes |
| `slides-gate.tsx` | Raw `JSON.stringify(output, null, 2)` | Thumbnail cards per slide |

### DeckSpec Shape (from `mastra/src/mastra/schemas/deck-spec.ts`)

```typescript
interface DeckSpec {
  title: string;
  subtitle?: string;
  colourPalette: { primary, secondary, accent, background, text }; // hex colours
  slides: Array<{
    slideNumber: number;
    title: string;
    layout: 'title' | 'content' | 'split' | 'image' | 'quote' | 'code' | 'comparison' | 'diagram' | 'closing';
    content: string;
    speakerNoteRef: string;
    diagram?: { type, description, mermaidSyntax?, svgPath? };
    colourAccent?: string;
  }>;
  diagramCount: number;
}
```

### Research Output Shape (from `research-gate.tsx` interfaces)

```typescript
interface ResearchOutput {
  keyFindings?: Array<{ finding, source, relevance, sourceType? }>;
  sources?: Array<{ url, title, relevance }>;
  suggestedAngles?: string[];
  statistics?: Array<{ value, context, source }>;
  existingTalks?: Array<{ title, speaker, url, summary }>;
}
```

### Reusable Components Design

- `CollapsibleSection` — wraps `<details>` with consistent header styling, open-by-default option, count badge
- `LayoutBadge` — maps slide layout type to a styled badge (colour-coded by layout category)
- These are used by gate-content components AND will be reused by Story 10b.3 step output viewer

### Styling Conventions

- Tailwind CSS v4.2.1, no external UI library
- Collapsible: use native HTML `<details>/<summary>` for zero-JS, accessible accordion
- Badges: `rounded bg-{color}-100 px-1.5 py-0.5 text-[10px] font-medium text-{color}-600`
- Cards: `rounded-lg border border-gray-200 p-3` or `p-4`
- Layout badge colours: title=purple, content=gray, diagram=blue, quote=amber, code=green, others=gray

### Previous Story Intelligence

- Story 10b.1 removed `architect-structure` from `GATE_RENDERERS` (now 3 entries). Research, script, slides still in the map.
- Story 10.2 created the initial gate-content components. Story 10b.2 polishes them.
- `max-w-4xl` container from 10b.1 review fix gives more room for slide thumbnails.

### Testing Standards

- Tests in `web/__tests__/`
- Test that components export correctly and render expected structure
- Test layout badge mapping covers all 9 layout types
- Test collapsible section renders with count badge

### References

- [Source: web/components/gate-content/research-gate.tsx] — current research display
- [Source: web/components/gate-content/script-gate.tsx] — current script display
- [Source: web/components/gate-content/slides-gate.tsx] — current raw JSON display
- [Source: mastra/src/mastra/schemas/deck-spec.ts] — DeckSpec schema with 9 layout types
- [Source: _bmad-output/planning-artifacts/epics.md#Story 10b.2] — epic spec

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created reusable `CollapsibleSection` component using native HTML `<details>/<summary>` (zero-JS, accessible)
- Created `LayoutBadge` component with colour coding for all 9 DeckSpec layout types
- Polished `ResearchGate`: now shows all 5 data sections (keyFindings, suggestedAngles, statistics, existingTalks, sources) with collapsible sections, count badges, and clickable URLs
- Polished `ScriptGate`: added duration badge, section count, monospace timing per section, collapsible speaking notes
- Replaced `SlidesGate` raw JSON with thumbnail card grid: colour palette swatches, slide number/title/layout badge/content preview/diagram indicator
- Exported `ResearchOutput` and `WriterOutput` types for reuse in Story 10b.3
- All 122 tests pass (7 new), no regressions

### Change Log

- 2026-03-23: Story 10b.2 implementation — gate content rendering polish

### File List

- web/components/content-renderers/collapsible-section.tsx (new — reusable accordion component)
- web/components/content-renderers/layout-badge.tsx (new — layout type badge with 9 colour mappings)
- web/components/content-renderers/index.tsx (new — barrel export)
- web/components/gate-content/research-gate.tsx (modified — collapsible sections for all data)
- web/components/gate-content/script-gate.tsx (modified — duration badges, collapsible notes)
- web/components/gate-content/slides-gate.tsx (modified — thumbnail cards replacing raw JSON)
- web/__tests__/content-renderers.test.ts (new — 7 tests for reusable components)
