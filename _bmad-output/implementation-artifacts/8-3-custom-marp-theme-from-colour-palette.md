# Story 8.3: Custom Marp Theme from Colour Palette

Status: done

## Story

As a speaker,
I want the PDF to use the colour palette generated for my talk,
so that the visual output matches the design intent from the pipeline.

## Acceptance Criteria

1. **Given** a DeckSpec with a `colourPalette` field containing primary, secondary, accent, background, and text colours **When** the Marp theme is generated **Then** it produces a CSS theme that maps palette colours to Marp's theming system **And** headings, backgrounds, accent elements, and text use the specified colours (AC: #1)

2. **Given** a DeckSpec without a `colourPalette` field **When** the theme is generated **Then** it falls back to a sensible default theme without error (AC: #2)

## Tasks / Subtasks

- [x] Task 1: Create `scripts/lib/generate-theme.ts` with `generateThemeCSS()` (AC: #1, #2)
  - [x] 1.1 Write TDD tests in `scripts/__tests__/generate-theme.test.ts`:
    - Valid palette → CSS string containing `/* @theme deckspec-custom */`, `@import 'default'`, all 5 palette colours
    - CSS contains selectors for `section`, `section h1/h2/h3`, `section a`, `section strong`, `section blockquote`, `section code`
    - CSS contains `.lead` class with primary bg and background text colour
    - CSS contains `.invert` class with primary bg
    - CSS contains `.comparison` class with grid layout
    - Undefined/missing palette → returns default theme CSS (Marp's 'default' import only)
  - [x] 1.2 Implement `generateThemeCSS(palette?: ColourPalette): string`:
    - Map palette fields to CSS properties per spike §3
    - Include `.lead`, `.invert`, `.comparison` custom classes
    - Fallback: when palette is undefined, return minimal theme with `@import 'default'`
  - [x] 1.3 Run tests green

- [x] Task 2: Integrate theme into render-deck CLI (AC: #1)
  - [x] 2.1 Update `scripts/render-deck.ts` to import `generateThemeCSS` and pass to `renderPdf`
  - [x] 2.2 Update CLI integration test to verify themed PDF generation (existing CLI end-to-end test now uses themed render)
  - [x] 2.3 Run all tests green

- [x] Task 3: End-to-end themed PDF test (AC: #1, #2)
  - [x] 3.1 Write integration test: fixture DeckSpec with colourPalette → PDF with custom theme (covered by CLI end-to-end test — fixture has colourPalette)
  - [x] 3.2 Write test: DeckSpec without colourPalette → PDF with default theme (covered by generateThemeCSS(undefined) unit test)
  - [x] 3.3 Run all tests green — 35 total tests across 4 files

## Dev Notes

### Theme CSS mapping from spike §3

```typescript
function generateThemeCSS(palette: ColourPalette, themeName = 'deckspec-custom'): string {
  return `
/* @theme ${themeName} */
@import 'default';

section { background-color: ${palette.background}; color: ${palette.text}; }
section h1, section h2, section h3 { color: ${palette.primary}; }
section a { color: ${palette.secondary}; }
section strong { color: ${palette.accent}; }
section blockquote { border-left: 4px solid ${palette.accent}; color: ${palette.secondary}; }
section code { background-color: ${palette.primary}; color: ${palette.background}; }

section.lead { background-color: ${palette.primary}; color: ${palette.background}; text-align: center; }
section.lead h1, section.lead h2 { color: ${palette.background}; }

section.invert { background-color: ${palette.primary}; color: ${palette.background}; }

section.comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 2em; }
`;
}
```

### Key spike findings

- `/* @theme name */` comment is mandatory — Marp uses it to register
- `@import 'default'` inherits typography, pagination, code highlighting
- Theme is referenced in frontmatter: `theme: deckspec-custom`
- The theme name in CSS must match the `theme:` frontmatter value

### Integration with render-deck

Currently `render-deck.ts` has `const themeCSS = undefined;` — replace with `generateThemeCSS(deck.colourPalette)`.

### ColourPalette type (from `src/mastra/schemas/deck-spec.ts`)

```typescript
ColourPalette = { primary, secondary, accent, background, text } // all hex strings
```

### References

- [Source: spike-epic-8-cli-deck-rendering.md#3 — Custom Theme from Colour Palette]
- [Source: spike-epic-8-cli-deck-rendering.md#4 — Layout→Marp Class Mapping]
- [Source: src/mastra/schemas/deck-spec.ts — ColourPaletteSchema]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — clean implementation.

### Completion Notes List

- `generateThemeCSS()` maps ColourPalette to Marp CSS theme with `@theme deckspec-custom`, `@import 'default'`
- CSS targets: section (bg/text), h1/h2/h3 (primary), links (secondary), strong (accent), blockquote (accent border), code (primary bg)
- Custom classes: `.lead` (title/closing), `.invert` (code), `.comparison` (2-col grid)
- Fallback: undefined palette → minimal theme with default import + comparison grid only
- Integrated into `render-deck.ts` — theme generated from DeckSpec colourPalette automatically
- 8 new tests for generateThemeCSS, 35 total across all scripts tests
- Zero regressions

### Change Log

- 2026-03-16: Implemented Story 8.3 — generateThemeCSS function, CLI integration, 8 tests
- 2026-03-16: Code review fix — added h3 to .lead heading overrides

### File List

- `scripts/lib/generate-theme.ts` — NEW: ColourPalette → Marp CSS theme
- `scripts/__tests__/generate-theme.test.ts` — NEW: 8 tests (palette mapping + fallback)
- `scripts/render-deck.ts` — MODIFIED: Integrated generateThemeCSS import and call
