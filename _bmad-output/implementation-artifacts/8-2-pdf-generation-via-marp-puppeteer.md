# Story 8.2: PDF Generation via Marp + Puppeteer

Status: done

## Story

As a speaker,
I want to run a single command to produce a PDF from a DeckSpec,
so that I have a portable, shareable presentation file.

## Acceptance Criteria

1. **Given** the npm script `pnpm render-deck` exists **When** invoked with a path to a DeckSpec JSON file (e.g., `pnpm render-deck presentations/my-talk/deck-spec.json`) **Then** it reads the file, converts to Marp markdown, and renders a PDF to the same directory as the input file **And** the PDF filename matches the input filename with a `.pdf` extension (AC: #1)

2. **Given** `@marp-team/marp-core` and Puppeteer are available as dependencies **When** the script renders the Marp markdown **Then** it uses the Marp programmatic API (not CLI) to produce the PDF (AC: #2)

3. **Given** the DeckSpec contains Mermaid diagrams **When** the PDF is rendered **Then** diagrams appear as images (pre-rendered SVGs inlined as base64 data URIs from Story 8.1) (AC: #3)

4. **Given** an invalid or missing file path **When** the script is invoked **Then** it exits with a non-zero code and a clear error message (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Create `scripts/lib/render-pdf.ts` — Marp render + Puppeteer PDF (AC: #2)
  - [x] 1.1 Write TDD tests in `scripts/__tests__/render-pdf.test.ts`:
    - Valid Marp markdown + theme CSS → PDF buffer (Uint8Array, starts with `%PDF`)
    - PDF dimensions are 1280x720 (landscape 16:9)
    - Empty/invalid markdown → throws error
  - [x] 1.2 Implement `renderPdf(markdown: string, themeCSS?: string): Promise<Uint8Array>`:
    - `new Marp()` → register theme if provided → `marp.render(markdown)` → get `{ html, css }`
    - `puppeteer.launch({ headless: true })` → `page.setContent(fullHtml, { waitUntil: 'networkidle0' })` → `page.pdf({ width: '1280px', height: '720px', printBackground: true, landscape: true, margin: 0 })`
    - Close browser in finally block
  - [x] 1.3 Run tests green

- [x] Task 2: Create `scripts/render-deck.ts` CLI entry point (AC: #1, #3, #4)
  - [x] 2.1 Write TDD tests in `scripts/__tests__/render-deck.test.ts`:
    - Missing file argument → process.exit(1) with error message
    - Non-existent file → process.exit(1) with error message
    - Invalid JSON → process.exit(1) with error message
    - Valid DeckSpec JSON → writes PDF to same directory with `.pdf` extension
  - [x] 2.2 Implement CLI entry:
    - Parse `process.argv[2]` for input path
    - Read and parse JSON, validate with `DeckSpecSchema.parse()`
    - Call `deckToMarp(deck, { basePath: dirname(inputPath) })` from Story 8.1
    - Call `generateThemeCSS(deck.colourPalette)` from Story 8.3 (import if available, or skip theme for now)
    - Call `renderPdf(markdown, themeCSS)` from Task 1
    - Write PDF buffer to `${inputPath.replace(/\.json$/, '.pdf')}`
    - Handle errors with process.exit(1)
  - [x] 2.3 Add `"render-deck": "npx tsx scripts/render-deck.ts"` script to package.json
  - [x] 2.4 Run tests green

- [x] Task 3: Integration test — fixture DeckSpec → PDF file on disk (AC: #1–#4)
  - [x] 3.1 Write integration test using sample-deck.json fixture from Story 8.1:
    - Call render-deck pipeline end-to-end (covered by CLI test: valid DeckSpec → PDF on disk)
    - Verify PDF file exists and starts with `%PDF`
    - Verify PDF size is reasonable (> 1KB)
  - [x] 3.2 Run all tests green

## Dev Notes

### Pipeline from spike (verified)

```typescript
import { Marp } from '@marp-team/marp-core';
import puppeteer from 'puppeteer';

const marp = new Marp();
// Optional: marp.themeSet.add(themeCSS); // from Story 8.3
const { html, css } = marp.render(markdown);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const fullHtml = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
const pdfBuffer = await page.pdf({
  width: '1280px', height: '720px',
  printBackground: true, landscape: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
```

### Key spike findings

- `printBackground: true` required — without it, custom background colours are stripped
- `margin: 0` ensures slides fill the full page
- `waitUntil: 'networkidle0'` ensures images load before PDF capture
- `page.pdf()` returns `Uint8Array` — write directly with `writeFileSync()`
- Browser launch is ~500ms — single invocation, no singleton needed

### Presentation output structure

The workflow saves to `presentations/<slug>-<timestamp>/`:
- `deck-spec.json` — input for render-deck
- `diagrams/diagram-<N>.svg` — co-located SVGs
- `speaker-notes.md`

The CLI should use `dirname(inputPath)` as `basePath` so SVG paths resolve correctly.

### Story 8.3 dependency

Story 8.3 (custom theme) is not yet implemented. The CLI should work without a custom theme by using Marp's default theme. When 8.3 is done, the `generateThemeCSS` import can be added. For now, `renderPdf` accepts an optional `themeCSS` parameter.

### Testing

- Puppeteer integration tests are slow (~2-3s each). Mark as integration tests.
- Unit tests for CLI argument parsing can mock the render pipeline.
- PDF validation: check buffer starts with `%PDF-` (first 5 bytes).

### References

- [Source: spike-epic-8-cli-deck-rendering.md#2 — PDF Generation Pipeline]
- [Source: spike-epic-8-cli-deck-rendering.md#8 — Recommended Architecture]
- [Source: 8-1-marp-templating-from-deckspec.md — deckToMarp function]
- [Source: src/mastra/workflows/slidewreck.ts:480-519 — Presentation output structure]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — clean implementation.

### Completion Notes List

- `renderPdf()` renders Marp markdown to PDF via Puppeteer with 1280x720 landscape, printBackground, zero margins
- Optional `themeCSS` parameter registers custom theme before render (ready for Story 8.3)
- `render-deck.ts` CLI: parse args, validate DeckSpec JSON with Zod, convert via deckToMarp, render PDF, write to disk
- `pnpm render-deck` npm script added to package.json
- Browser lifecycle: launch → render → close in finally block
- 7 new tests: 3 render-pdf (PDF buffer, themed PDF, empty error), 4 CLI (no args, missing file, bad JSON, end-to-end PDF)
- Zero regressions

### Change Log

- 2026-03-16: Implemented Story 8.2 — renderPdf function, render-deck CLI, 7 tests
- 2026-03-16: Code review fixes — removed unused import (basename), improved DeckSpec validation error output, handled non-.json input extensions

### File List

- `scripts/lib/render-pdf.ts` — NEW: Marp markdown → PDF buffer via Puppeteer
- `scripts/render-deck.ts` — NEW: CLI entry point for DeckSpec → PDF
- `scripts/__tests__/render-pdf.test.ts` — NEW: 3 tests (PDF generation)
- `scripts/__tests__/render-deck.test.ts` — NEW: 4 tests (CLI integration)
- `package.json` — MODIFIED: Added render-deck script
