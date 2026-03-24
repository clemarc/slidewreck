# Story 11.1: Slide Renderer Framework

Status: done

## Story

As a speaker,
I want to navigate through my generated slides in full-screen,
So that I can preview and present directly from the browser.

## Acceptance Criteria

1. **Given** a DeckSpec is available for a completed run, **When** the speaker navigates to `/deck/:runId`, **Then** slides are rendered as full-screen presentation frames with arrow key / click / swipe navigation and a slide counter showing current position (e.g. "3 / 15").
2. **Given** the speaker presses Escape or clicks a back button, **When** exiting the viewer, **Then** they return to the run detail page (`/run/:runId`).
3. **Given** the run status is not `success`, **When** navigating to `/deck/:runId`, **Then** an appropriate message is shown (e.g. "Run still in progress" or "Run failed") with a link back to `/run/:runId`.

## Tasks / Subtasks

- [x] Task 1 — Create deck page route and data fetching (AC: #1, #3)
  - [x] 1.1 Create `web/app/deck/[runId]/page.tsx` (client component)
  - [x] 1.2 Use existing `useRunStatus('slidewreck', runId)` hook to fetch run data
  - [x] 1.3 Extract `deckSpec`, `speakerScript`, and `diagrams` from `run.result`
  - [x] 1.4 Handle non-success states: loading spinner, error/in-progress message with link to `/run/:runId`
- [x] Task 2 — Create SlideRenderer dispatcher component (AC: #1)
  - [x] 2.1 Create `web/components/slides/slide-renderer.tsx`
  - [x] 2.2 Implement layout-to-component map (`LAYOUT_RENDERERS`) with fallback to `ContentSlide`
  - [x] 2.3 Wrap each slide in `aspect-video` container (16:9)
- [x] Task 3 — Implement initial layout components (AC: #1)
  - [x] 3.1 Create `web/components/slides/layouts/title-slide.tsx`
  - [x] 3.2 Create `web/components/slides/layouts/content-slide.tsx` (also serves as fallback)
  - [x] 3.3 Implemented all 9 layout components (ahead of Story 11.2) since SlideRenderer needs them for the dispatch map
- [x] Task 4 — Keyboard and click navigation (AC: #1)
  - [x] 4.1 Implement `useSlideNavigation(total)` hook in `web/lib/use-slide-navigation.ts`
  - [x] 4.2 ArrowRight / Space → next, ArrowLeft → prev, F → fullscreen toggle, Escape → exit
  - [x] 4.3 Click on slide advances to next
- [x] Task 5 — Slide counter and back button (AC: #1, #2)
  - [x] 5.1 Show slide counter overlay: "3 / 15" in bottom-right
  - [x] 5.2 Back button or Escape navigates to `/run/:runId` via `router.push()`
  - [x] 5.3 Fullscreen via `document.documentElement.requestFullscreen()` — standard browser API
- [x] Task 6 — Frontend TypeScript types (AC: #1)
  - [x] 6.1 Create `web/types/deck-spec.ts` — re-exports from workspace package
  - [x] 6.2 Types: `SlideSpec`, `DeckSpec`, `ColourPalette`, `DiagramSpec`, `SlideLayout`, `SlidewreckRunResult`
  - [x] 6.3 Import from `slidewreck` workspace package (workspace import, not duplication)
- [x] Task 7 — Tests (AC: #1, #2, #3)
  - [x] 7.1 Test `SlideRenderer` dispatches correct layout component per layout type (all 9)
  - [x] 7.2 Test `SlideRenderer` falls back to ContentSlide for unknown layout
  - [x] 7.3 Test `useSlideNavigation` pure functions: clampSlideIndex, getNextAction
  - [x] 7.4 Test buildDiagramMap helper for diagram SVG pairing

## Dev Notes

### Data Flow (from Spike)

```
/deck/[runId] page
  → useRunStatus('slidewreck', runId) hook
  → Extract from run.result:
      ├── deckSpec (slides, palette, metadata)
      ├── speakerScript.speakerNotes (presenter notes — Story 11.2+)
      └── diagrams[] (SVG strings, keyed by slideNumber)
  → SlideRenderer components (layout dispatcher)
```

### Type Extraction from Run Result

`run.result` is typed as `unknown` in `MastraClient`. Use type assertion at the extraction point:

```typescript
const result = run.result as {
  deckSpec: DeckSpec;
  speakerScript: { speakerNotes: string };
  diagrams: Array<{ slideNumber: number; svg: string }>;
};
```

Per spike: the `MastraClient` returns valid JSON with full data. The dev-server "schema summary" quirk only affects `curl` — `fetch()` gets real values.

### Existing Patterns to Follow

- `web/app/run/[runId]/page.tsx` — reference for client component + `useRunStatus` pattern
- `web/lib/mastra-client.ts` — `MastraClient`, `WorkflowRun` types
- `web/lib/use-run-status.ts` — polling hook (stops on terminal status)
- Tests in `web/__tests__/` — Vitest with `describe/it/expect`

### Colour Application

Inline `style` from palette, not Tailwind classes (colours are dynamic per deck). CSS custom properties come in Story 11.3.

### File Structure

```
web/
├── app/deck/[runId]/page.tsx         ← NEW: deck viewer page
├── components/slides/
│   ├── slide-renderer.tsx            ← NEW: layout dispatcher
│   └── layouts/
│       ├── title-slide.tsx           ← NEW: title layout
│       └── content-slide.tsx         ← NEW: content layout (+ fallback)
├── lib/
│   └── use-slide-navigation.ts       ← NEW: keyboard/click nav hook
└── types/
    └── deck-spec.ts                  ← NEW: frontend DeckSpec types
```

### Architecture Compliance

- Pure React + Tailwind rendering — no server-side slide rendering (architecture decision)
- 16:9 aspect ratio via `aspect-video` Tailwind class
- No new dependencies — standard browser APIs for fullscreen and keyboard
- `slidewreck` workspace package already in `web/package.json` dependencies

### Testing Standards

- Vitest with globals, node environment
- Tests in `web/__tests__/` (co-located pattern for web package)
- Test layout dispatch logic, navigation bounds, error states
- No need to test actual rendering output (no JSDOM browser tests) — test component logic and data flow

### References

- [Source: spike-epic-11-presentation-viewer.md — Q1, Q3, Architecture section]
- [Source: architecture.md#Frontend Architecture — DeckSpec Browser Rendering]
- [Source: mastra/src/mastra/schemas/deck-spec.ts — canonical Zod schemas]
- [Source: web/app/run/[runId]/page.tsx — existing page pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Implemented full deck viewer at `/deck/[runId]` with data fetching via `useRunStatus`
- Created `SlideRenderer` dispatcher with `LAYOUT_RENDERERS` map covering all 9 layout types
- All 9 layout components created (title, content, split, image, quote, code, comparison, diagram, closing) — went beyond minimal for 11.1 since the dispatcher map requires components
- Navigation hook (`useSlideNavigation`) handles keyboard (ArrowRight/Left, Space, F, Escape) and click
- Types re-exported from `slidewreck` workspace package — no duplication
- `SlidewreckRunResult` interface for typed extraction from `run.result`
- `buildDiagramMap` helper for SVG pairing by slide number
- All tests pass (15 files, 115 tests), zero type errors
- Code review: removed dead `SectionBreakSlide` component (no matching layout type in `SLIDE_LAYOUTS`), cleaned unused test imports, added trusted-source comment on `dangerouslySetInnerHTML`

### File List

- web/app/deck/[runId]/page.tsx (NEW)
- web/components/slides/slide-renderer.tsx (NEW)
- web/components/slides/layouts/title-slide.tsx (NEW)
- web/components/slides/layouts/content-slide.tsx (NEW)
- web/components/slides/layouts/diagram-slide.tsx (NEW)
- web/components/slides/layouts/quote-slide.tsx (NEW)
- web/components/slides/layouts/closing-slide.tsx (NEW)
- web/components/slides/layouts/split-slide.tsx (NEW)
- web/components/slides/layouts/image-slide.tsx (NEW)
- web/components/slides/layouts/code-slide.tsx (NEW)
- web/components/slides/layouts/comparison-slide.tsx (NEW)
- web/lib/use-slide-navigation.ts (NEW)
- web/lib/deck-helpers.ts (NEW)
- web/types/deck-spec.ts (NEW)
- web/__tests__/slide-renderer.test.ts (NEW)
- web/__tests__/use-slide-navigation.test.ts (NEW)
- web/__tests__/deck-page.test.ts (NEW)
