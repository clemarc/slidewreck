# Story 8.1: Marp Templating from DeckSpec

Status: done

## Story

As a developer,
I want a function that converts a DeckSpec JSON into Marp-flavoured markdown,
so that the structured slide data can be rendered by the Marp engine.

## Acceptance Criteria

1. **Given** a valid DeckSpec JSON **When** the templating function is invoked **Then** it produces a Marp markdown string with frontmatter (`marp: true`, `theme: deckspec-custom`) and each slide separated by `---` (AC: #1)

2. **Given** a DeckSpec with slides of various layouts **When** the templating function processes each slide **Then** it applies the correct Marp directive per the layout→class mapping: `title`/`closing` → `<!-- _class: lead -->`, `code` → `<!-- _class: invert -->`, `quote` → `<!-- _class: lead -->` + blockquote, `comparison` → `<!-- _class: comparison -->`, `split` → `![bg right:40%](image)`, `diagram` → `![bg right:50%](svg)` or inline, `image` → `![bg](image)`, `content` → no directive (AC: #2)

3. **Given** a DeckSpec with diagram slides containing `diagram.svgPath` values **When** the markdown is generated **Then** SVG files are read from disk and inlined as `data:image/svg+xml;base64,...` URIs so they render correctly in the PDF pipeline (AC: #3)

4. **Given** a DeckSpec with speaker notes (`speakerNoteRef`) on slides **When** the markdown is generated **Then** speaker notes are emitted as HTML comments (`<!-- notes -->`) per Marp convention (AC: #4)

5. **Given** a DeckSpec slide with `content` field **When** the markdown is generated **Then** the slide title is rendered as `## title` and content is placed below, preserving markdown formatting (AC: #5)

## Tasks / Subtasks

- [x] Task 1: Create `scripts/lib/deck-to-marp.ts` with `deckToMarp()` function (AC: #1, #2, #4, #5)
  - [x] 1.1 Write TDD tests in `scripts/__tests__/deck-to-marp.test.ts`:
    - Frontmatter: output starts with `---\nmarp: true\ntheme: deckspec-custom\n---`
    - Slide separation: N slides → N-1 `---` separators between slide sections
    - Title mapping: `## slideTitle` per slide
    - Content mapping: content appears below title
    - Speaker notes: `speakerNoteRef` → `<!-- speakerNoteRef -->` comment block
    - Layout directives: test each of the 9 layout types maps to correct `_class` or bg syntax
  - [x] 1.2 Implement `deckToMarp(deck: DeckSpec): string` — pure function, no side effects, no I/O
  - [x] 1.3 Run tests green

- [x] Task 2: SVG diagram inlining (AC: #3)
  - [x] 2.1 Write TDD tests in `scripts/__tests__/deck-to-marp.test.ts`:
    - Diagram slide with `svgPath` → content includes `![diagram](data:image/svg+xml;base64,...)` data URI
    - Diagram slide without `svgPath` → placeholder text (diagram not yet rendered)
    - Missing SVG file on disk → graceful error message in slide content
  - [x] 2.2 Implement SVG inlining: `readFileSync(svgPath)` → base64 data URI. Use the presentation directory as base path for relative `svgPath` resolution.
  - [x] 2.3 Signature update: `deckToMarp(deck: DeckSpec, opts?: { basePath?: string }): string` — `basePath` is the directory containing the DeckSpec JSON (for resolving relative SVG paths)
  - [x] 2.4 Run tests green

- [x] Task 3: Integration test with realistic fixture (AC: #1–#5)
  - [x] 3.1 Create a fixture DeckSpec JSON (`scripts/__tests__/fixtures/sample-deck.json`) with title slide, content slides, diagram slide, quote slide, code slide, closing slide (6+ slides covering key layouts)
  - [x] 3.2 Write integration test: load fixture → `deckToMarp()` → snapshot test of full markdown output
  - [x] 3.3 Run all tests green

## Dev Notes

### Architecture — standalone scripts, no Mastra dependency

Epic 8 lives in `scripts/` — completely independent from `src/mastra/`. The only import from the main codebase is `DeckSpecSchema` from `src/mastra/schemas/deck-spec.ts` for type validation. No agents, workflows, or tools.

```
scripts/
  lib/
    deck-to-marp.ts       # DeckSpec → Marp markdown (this story)
    generate-theme.ts     # Story 8.3 — ColourPalette → CSS
    render-pdf.ts         # Story 8.2 — markdown → PDF via Puppeteer
  __tests__/
    deck-to-marp.test.ts
    fixtures/
      sample-deck.json
  render-deck.ts          # Story 8.2 — CLI entry point
```

### DeckSpec schema (from `src/mastra/schemas/deck-spec.ts`)

```typescript
DeckSpec = { title, subtitle?, colourPalette: ColourPalette, slides: SlideSpec[], diagramCount }
SlideSpec = { slideNumber, title, layout: SlideLayout, content, speakerNoteRef, diagram?: DiagramSpec, colourAccent? }
DiagramSpec = { type, description, mermaidSyntax?, svgPath? }
ColourPalette = { primary, secondary, accent, background, text } // all hex strings
SlideLayout = 'title' | 'content' | 'split' | 'image' | 'quote' | 'code' | 'comparison' | 'diagram' | 'closing'
```

### Layout → Marp class mapping (from spike)

| DeckSpec Layout | Marp Directive | Notes |
|----------------|----------------|-------|
| `title` | `<!-- _class: lead -->` | Centered, primary bg |
| `content` | (none) | Default slide |
| `split` | `![bg right:40%](image)` | Auto-shrinks content left |
| `image` | `![bg](image)` | Full-bleed background |
| `quote` | `<!-- _class: lead -->` + `>` content | Centered blockquote |
| `code` | `<!-- _class: invert -->` | Dark bg for code |
| `comparison` | `<!-- _class: comparison -->` | Custom CSS grid (Story 8.3) |
| `diagram` | SVG as base64 data URI inline image | Pre-rendered from pipeline |
| `closing` | `<!-- _class: lead -->` | Same as title |

### SVG inlining strategy (from spike §2)

Puppeteer's `page.setContent()` loads from `data:` URI and cannot resolve relative file paths. SVG diagrams must be inlined as `data:image/svg+xml;base64,...` URIs before passing to Marp.

The workflow saves diagrams to `presentations/<slug>/diagrams/diagram-<N>.svg`. The `basePath` option lets the CLI resolve these relative paths.

### Marp frontmatter (from spike §1)

First `---` block is YAML frontmatter, not a slide separator. Must contain `marp: true`. Theme reference: `theme: deckspec-custom`.

### Speaker notes (from spike §5)

Speaker notes go as HTML comments: `<!-- speakerNoteRef text here -->`. Spike recommendation: **no speaker notes in PDF** (Option A) — notes exist as separate deliverable. But they should still appear in the markdown for completeness; they simply won't render visually in the PDF.

### Testing

- Vitest (project standard), co-located at `scripts/__tests__/`
- Snapshot test for full markdown output from fixture
- Unit tests per layout type
- Mock `fs.readFileSync` for SVG inlining tests (avoid disk dependency in unit tests)

### References

- [Source: spike-epic-8-cli-deck-rendering.md#1 — Marp Core API]
- [Source: spike-epic-8-cli-deck-rendering.md#4 — Layout→Marp Class Mapping]
- [Source: spike-epic-8-cli-deck-rendering.md#5 — Speaker Notes]
- [Source: spike-epic-8-cli-deck-rendering.md#7 — Story Adjustments]
- [Source: src/mastra/schemas/deck-spec.ts — DeckSpec schema]
- [Source: src/mastra/workflows/slidewreck.ts:480-519 — Presentation output structure]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — clean implementation.

### Completion Notes List

- `deckToMarp()` pure function converts DeckSpec → Marp markdown with frontmatter, slide separation, layout directives, speaker notes, and SVG inlining
- All 9 layout types mapped: title/closing → lead, code → invert, quote → lead+blockquote, comparison → comparison class, split/image → bg image syntax, diagram → base64 data URI, content → no directive
- SVG inlining reads files from disk relative to `basePath`, graceful fallback for missing files
- 20 tests: 15 unit (frontmatter, separation, titles, content, notes, all 9 layouts, multiline quote, subtitle), 3 SVG inlining (base64, placeholder, missing file), 1 integration fixture (6-slide deck)
- Updated vitest.config.ts to include `scripts/__tests__/` pattern
- Zero regressions (2 pre-existing DATABASE_URL failures unchanged)

### Change Log

- 2026-03-16: Implemented Story 8.1 — deckToMarp function, SVG inlining, integration fixture, 19 tests
- 2026-03-16: Code review fixes — removed unused imports (dirname, vi), fixed multiline quote blockquoting, removed unused variable, added multiline quote test (20 tests)

### File List

- `scripts/lib/deck-to-marp.ts` — NEW: DeckSpec → Marp markdown converter
- `scripts/__tests__/deck-to-marp.test.ts` — NEW: 20 tests (unit + integration)
- `scripts/__tests__/fixtures/sample-deck.json` — NEW: 6-slide fixture DeckSpec
- `vitest.config.ts` — MODIFIED: Added scripts/__tests__ to include pattern
