# Story 11.2: Layout Components

Status: done

## Story

As a developer,
I want a React component per slide layout type,
So that each slide gets appropriate visual treatment.

## Acceptance Criteria

1. **Given** the DeckSpec defines layout types, **When** a slide is rendered, **Then** the correct layout component is selected: `TitleSlide`, `ContentSlide`, `DiagramSlide`, `QuoteSlide`, `SectionBreakSlide` (and `ClosingSlide`, `SplitSlide`, `ImageSlide`, `CodeSlide`, `ComparisonSlide` for the full 9).
2. **Given** an unknown layout type, **When** the slide renders, **Then** it falls back to `ContentSlide` without error.
3. **Given** a `DiagramSlide` with a pre-rendered SVG in `diagrams[]`, **When** the slide renders, **Then** it shows the SVG inline via `dangerouslySetInnerHTML` (trusted source — server-generated). If no SVG is available, show the diagram description as fallback text.

## Tasks / Subtasks

- [x] Task 1 — Complete all 9 layout components (AC: #1)
  - [x] 1.1 `web/components/slides/layouts/title-slide.tsx` — large centered title, optional subtitle (implemented in 11.1)
  - [x] 1.2 `web/components/slides/layouts/content-slide.tsx` — heading + body text, no bullet walls (implemented in 11.1)
  - [x] 1.3 `web/components/slides/layouts/diagram-slide.tsx` — heading + SVG visual, fallback to description text (implemented in 11.1)
  - [x] 1.4 `web/components/slides/layouts/quote-slide.tsx` — large pull-quote with attribution (implemented in 11.1)
  - [x] 1.5 N/A — `section-break` is not a valid `SLIDE_LAYOUTS` value; removed dead component in 11.1 review
  - [x] 1.6 `web/components/slides/layouts/closing-slide.tsx` — closing message, CTA (implemented in 11.1)
  - [x] 1.7 `web/components/slides/layouts/split-slide.tsx` — two-column layout (implemented in 11.1)
  - [x] 1.8 `web/components/slides/layouts/image-slide.tsx` — placeholder with description (implemented in 11.1)
  - [x] 1.9 `web/components/slides/layouts/code-slide.tsx` — heading + code block with monospace styling (implemented in 11.1)
  - [x] 1.10 `web/components/slides/layouts/comparison-slide.tsx` — side-by-side comparison layout (implemented in 11.1)
- [x] Task 2 — Update SlideRenderer dispatcher (AC: #1, #2)
  - [x] 2.1 All 9 components registered in `LAYOUT_RENDERERS` map (implemented in 11.1)
  - [x] 2.2 Fallback to `ContentSlide` via `getLayoutComponent()` (implemented in 11.1)
- [x] Task 3 — Diagram SVG pairing (AC: #3)
  - [x] 3.1 `buildDiagramMap()` creates `Map<number, string>` lookup (implemented in 11.1)
  - [x] 3.2 SVG passed to `DiagramSlide` via `svg` prop (implemented in 11.1)
  - [x] 3.3 `undefined` SVG → DiagramSlide shows `diagram.description` fallback (implemented in 11.1)
- [x] Task 4 — Speaker notes utility (AC: relates to presenter view, prep for 11.3+)
  - [x] 4.1 Created `web/lib/speaker-notes.ts` with `extractRelevantSection()` fuzzy matching function
  - [x] 4.2 Algorithm: split on `## ` headers, tokenize ref by `-`, count token matches, threshold ≥60%, fallback to first 2000 chars
- [x] Task 5 — Tests (AC: #1, #2, #3)
  - [x] 5.1 All layout components covered by LAYOUT_RENDERERS map test (11.1)
  - [x] 5.2 Test `LAYOUT_RENDERERS` has exactly 9 entries (11.1)
  - [x] 5.3 Test unknown layout falls back to ContentSlide (11.1)
  - [x] 5.4 Test diagram SVG pairing via buildDiagramMap (11.1)
  - [x] 5.5 Test `extractRelevantSection()` with 7 test cases including spike refs

## Dev Notes

### Layout Usage from Test Run

| Layout | Count | Notes |
|--------|-------|-------|
| title | 1 | Slide #1 |
| content | 10 | Most common |
| split | 2 | Two-column |
| quote | 2 | Pull-quotes |
| diagram | 2 | SVG-rendered |
| closing | 1 | Final slide |
| image | 0 | No test data — implement with placeholder |
| code | 0 | No test data — implement with monospace styling |
| comparison | 0 | No test data — implement reasonable two-column |

### Common SlideProps Interface

All layout components receive the same props:

```typescript
interface SlideProps {
  slide: SlideSpec;
  palette: ColourPalette;
  svg?: string;  // Only meaningful for DiagramSlide
}
```

### Diagram SVG Handling

Three diagrams exist in test run (slides 5, 8, 12). SVGs are 3-9KB each — no bloat concern. Use `dangerouslySetInnerHTML={{ __html: svg }}` — SVGs are server-generated, trusted.

### Speaker Notes Matching Algorithm (from Spike Q2)

```typescript
function extractRelevantSection(speakerNotes: string, ref: string): string {
  const sections = speakerNotes.split(/^## /m);
  const tokens = ref.split('-');
  let bestMatch = { score: 0, content: '' };
  for (const section of sections) {
    const header = section.split('\n')[0].toLowerCase();
    const matches = tokens.filter(t => header.includes(t.toLowerCase())).length;
    const score = matches / tokens.length;
    if (score > bestMatch.score) bestMatch = { score, content: section };
  }
  return bestMatch.score >= 0.6
    ? bestMatch.content.trim()
    : speakerNotes.slice(0, 2000);
}
```

### Dependencies on Story 11.1

- `slide-renderer.tsx` and its `LAYOUT_RENDERERS` map
- `SlideProps` interface pattern
- `web/types/deck-spec.ts` types
- `web/app/deck/[runId]/page.tsx` page component

### File Structure

```
web/components/slides/layouts/
├── title-slide.tsx          ← enhance from 11.1
├── content-slide.tsx        ← enhance from 11.1
├── diagram-slide.tsx        ← NEW
├── quote-slide.tsx          ← NEW
├── section-break-slide.tsx  ← NEW
├── closing-slide.tsx        ← NEW
├── split-slide.tsx          ← NEW
├── image-slide.tsx          ← NEW
├── code-slide.tsx           ← NEW
└── comparison-slide.tsx     ← NEW

web/lib/
└── speaker-notes.ts         ← NEW
```

### Architecture Compliance

- One component per layout type (architecture: "9 layout components")
- All layout components consume `ColourPalette` for dynamic theming
- No bullet walls in ContentSlide (designer agent rule)
- Pure React + Tailwind, no external UI libraries for slide rendering

### References

- [Source: spike-epic-11-presentation-viewer.md — Q2, Q3, Layout Breakdown]
- [Source: architecture.md#Frontend Architecture — 9 layout components]
- [Source: mastra/src/mastra/schemas/deck-spec.ts — SLIDE_LAYOUTS enum]
- [Source: mastra/src/mastra/workflows/steps/designer-content-fill.ts:77 — original speakerNoteRef matching]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Tasks 1-3, 5.1-5.4 were completed as part of Story 11.1 (layout components, dispatcher, diagram pairing, tests)
- New in this story: `extractRelevantSection()` speaker notes utility with fuzzy matching algorithm
- Removed `section-break-slide.tsx` — no `section-break` layout type exists in `SLIDE_LAYOUTS` enum
- All 17 test files pass (129 tests), zero type errors

### File List

- web/lib/speaker-notes.ts (NEW)
- web/__tests__/speaker-notes.test.ts (NEW)
