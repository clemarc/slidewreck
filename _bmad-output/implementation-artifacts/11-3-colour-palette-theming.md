# Story 11.3: Colour Palette Theming

Status: done

## Story

As a speaker,
I want slides to use the colour palette generated for my talk,
So that the visual output matches the design intent.

## Acceptance Criteria

1. **Given** a DeckSpec with a `colourPalette` field, **When** the deck viewer loads, **Then** palette colours are injected as CSS custom properties (`--slide-primary`, `--slide-secondary`, `--slide-accent`, `--slide-bg`, `--slide-text`) and all layout components consume these properties for headings, backgrounds, accents, and text.
2. **Given** a DeckSpec without a `colourPalette`, **When** the deck viewer loads, **Then** a sensible default palette is applied without error.

## Tasks / Subtasks

- [x] Task 1 — CSS custom properties injection (AC: #1)
  - [x] 1.1 In deck page component, inject palette as CSS custom properties on the slide container element
  - [x] 1.2 Property mapping: `primary` → `--slide-primary`, `secondary` → `--slide-secondary`, `accent` → `--slide-accent`, `background` → `--slide-bg`, `text` → `--slide-text`
  - [x] 1.3 Apply via inline `style` on the deck container wrapping all slides
- [x] Task 2 — Default palette fallback (AC: #2)
  - [x] 2.1 Define `DEFAULT_PALETTE` constant in `web/lib/palette.ts`
  - [x] 2.2 Use sensible defaults: dark primary, light background, readable text
  - [x] 2.3 Apply fallback when `colourPalette` is missing or undefined via `paletteToCustomProperties()`
- [x] Task 3 — Refactor layout components to use CSS custom properties (AC: #1)
  - [x] 3.1 All layout components now use `var(--slide-primary)`, `var(--slide-bg)`, etc.
  - [x] 3.2 Applied across all 9 layout components — `palette` prop removed from `SlideProps`
  - [x] 3.3 Per-slide `colourAccent` override via `--slide-accent` on `SlideRenderer` container
- [x] Task 4 — Tests (AC: #1, #2)
  - [x] 4.1 Test `paletteToCustomProperties()` maps palette fields to correct CSS property names
  - [x] 4.2 Test default palette is applied when colourPalette is undefined
  - [x] 4.3 Test per-slide colourAccent via `SlideRenderer` (uses direct `colourAccent` from slide schema)

## Dev Notes

### CSS Custom Properties Approach

Architecture says: "ColourPalette (5 hex values) injected as CSS custom properties." This is cleaner than passing palette as prop to every component — set once at container level, consume everywhere via `var()`.

### Transition from Story 11.1/11.2

Stories 11.1 and 11.2 used inline `style={{ backgroundColor: palette.primary }}` directly. This story refactored to CSS custom properties. The `palette` prop was removed from `SlideProps` entirely.

### Default Palette

```typescript
export const DEFAULT_PALETTE: ColourPalette = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  background: '#ffffff',
  text: '#1a1a2e',
};
```

### File Structure

```
web/lib/
└── palette.ts               ← NEW: DEFAULT_PALETTE, paletteToCustomProperties()

web/components/slides/layouts/  ← MODIFIED: all 9 layouts to use var(--slide-*)
web/components/slides/slide-renderer.tsx ← MODIFIED: removed palette prop, added slideAccent
web/app/deck/[runId]/page.tsx   ← MODIFIED: inject CSS variables via paletteToCustomProperties()
```

### Architecture Compliance

- CSS custom properties for dynamic per-deck theming (architecture decision)
- `colourAccent` per-slide override support
- No Tailwind classes for dynamic colours — must be inline styles or CSS variables

### References

- [Source: architecture.md#Frontend Architecture — Colour theming via CSS custom properties]
- [Source: spike-epic-11-presentation-viewer.md — Q3, colour application decision]
- [Source: mastra/src/mastra/schemas/deck-spec.ts — ColourPaletteSchema]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created `web/lib/palette.ts` with `DEFAULT_PALETTE` and `paletteToCustomProperties()` utility
- Refactored all 9 layout components to consume CSS custom properties (`var(--slide-*)`) instead of palette prop
- Removed `palette` from `SlideProps` interface — colours now come from CSS inheritance
- Updated deck page to inject CSS variables via `paletteToCustomProperties()` on slide container
- Per-slide `colourAccent` override via `SlideRenderer` container `--slide-accent` property
- All 19 test files pass (144 tests), zero type errors

### File List

- web/lib/palette.ts (NEW)
- web/__tests__/palette.test.ts (NEW)
- web/components/slides/slide-renderer.tsx (MODIFIED — removed palette prop, added slideAccent)
- web/components/slides/layouts/title-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/content-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/diagram-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/quote-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/closing-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/split-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/image-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/code-slide.tsx (MODIFIED — CSS variables)
- web/components/slides/layouts/comparison-slide.tsx (MODIFIED — CSS variables)
- web/app/deck/[runId]/page.tsx (MODIFIED — paletteToCustomProperties injection)
