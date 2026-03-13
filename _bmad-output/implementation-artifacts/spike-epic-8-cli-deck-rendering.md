# Epic 8 API Verification Spike: CLI Deck Rendering

**Date:** 2026-03-13
**Purpose:** Verify Marp programmatic API for DeckSpec → Markdown → PDF pipeline, custom theme generation from colour palettes, layout class mapping, and SVG diagram embedding before Epic 8 sprint planning.

---

## 1. Marp Core Programmatic API

### Verified Package

- **Package:** `@marp-team/marp-core` v4.3.0 (installed as devDependency)
- **Import:** `import { Marp } from '@marp-team/marp-core'` (named export, NOT default)
- **Puppeteer:** Already installed (`puppeteer@^24.39.0`)
- **No `@marp-team/marp-cli` needed** — the core package + Puppeteer is sufficient

### Verified Constructor & Render

```typescript
import { Marp } from '@marp-team/marp-core';

const marp = new Marp();
const { html, css, comments } = marp.render(markdownString);
// html: string — rendered HTML with <section> per slide
// css: string — full stylesheet (theme + Marp internals)
// comments: string[][] — speaker notes per slide (from <!-- ... --> blocks)
```

**Constructor options** (all optional): `html`, `emoji`, `math`, `minifyCSS`, `script`, `slug`. None needed for our PDF pipeline — defaults are fine.

### Key Findings

1. **Slide separation:** `---` (markdown HR) splits slides into `<section>` elements
2. **Frontmatter:** First `---` block is YAML frontmatter, not a slide separator. Must contain `marp: true`.
3. **Speaker notes:** HTML comments (`<!-- note text -->`) are extracted into the `comments` array, indexed by slide position. Multi-line comments work.
4. **Image references:** `![alt](path)` renders as `<img src="path" alt="alt" />` — standard markdown images. SVG paths from DeckSpec `diagram.svgPath` embed naturally.
5. **Section count matches slide count:** Verified: 5 `---` separators → 5 sections.

---

## 2. PDF Generation Pipeline

### Verified Approach: Marp.render() → Puppeteer page.pdf()

```typescript
import { Marp } from '@marp-team/marp-core';
import puppeteer from 'puppeteer';

const marp = new Marp();
const { html, css } = marp.render(markdown);

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

const fullHtml = `<!DOCTYPE html>
<html><head><style>${css}</style></head>
<body>${html}</body></html>`;

await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
const pdfBuffer = await page.pdf({
  width: '1280px',
  height: '720px',
  printBackground: true,
  landscape: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();
```

### Key Findings

1. **PDF dimensions:** `1280x720` matches Marp's default 16:9 slide size. Each slide renders as one PDF page.
2. **`printBackground: true`** is required — without it, custom background colours are stripped.
3. **`margin: 0`** ensures slides fill the full page (Marp handles internal padding via theme CSS).
4. **`waitUntil: 'networkidle0'`** ensures images (including SVG diagrams) load before PDF capture.
5. **Output:** `page.pdf()` returns a `Uint8Array` buffer — write directly with `fs.writeFileSync()`.
6. **No marp-cli dependency needed.** The `marpCli()` API is file-based and adds unnecessary indirection. Our pipeline is simpler: render in-memory → inject into Puppeteer → export PDF.

### Browser Lifecycle

Puppeteer launch is ~500ms. For a single CLI invocation this is fine (launch once, render, close). No singleton needed unlike Epic 5's multi-diagram renders.

### Local File Access for SVG Diagrams

Marp images reference local file paths (`./output/diagram-3.svg`). When using `page.setContent()`, the browser loads from a `data:` URI and **cannot resolve relative file paths**. Two solutions:

- **Option A (recommended):** Read SVG files and inline as `data:image/svg+xml;base64,...` URIs before passing to Marp
- **Option B:** Write the full HTML to a temp file, use `page.goto('file:///tmp/...')` with `--allow-file-access-from-files` Chromium flag

Recommendation: **Option A** — keeps everything in-memory, no temp files, simpler error handling.

---

## 3. Custom Theme from Colour Palette

### Verified Theme Registration

```typescript
const themeCSS = `
/* @theme deckspec-custom */
@import 'default';

section { background-color: #ECF0F1; color: #2C3E50; }
section h1, section h2 { color: #2C3E50; }
section.lead { background-color: #2C3E50; color: #ECF0F1; text-align: center; }
`;

const marp = new Marp();
const theme = marp.themeSet.add(themeCSS);
// theme.name === 'deckspec-custom'
```

### Key Findings

1. **`/* @theme name */` comment is mandatory** — Marp uses this to register the theme. Without it, `themeSet.add()` throws.
2. **`@import 'default'`** inherits Marp's default theme (typography, pagination, code highlighting). Can also import `'gaia'` or `'uncover'`.
3. **CSS selectors target `section` elements** — each slide is a `<section>`. Class-based selectors (`.lead`, `.invert`) style layout variants.
4. **Standalone themes work** (without `@import`), but you lose Marp's built-in typography and code highlighting. Recommendation: always `@import 'default'`.
5. **Theme is set in frontmatter:** `theme: deckspec-custom` in the markdown YAML block.

### Colour Palette → Theme CSS Mapping

```typescript
function generateThemeCSS(palette: ColourPalette, themeName: string): string {
  return `
/* @theme ${themeName} */
@import 'default';

section {
  background-color: ${palette.background};
  color: ${palette.text};
  font-family: 'Segoe UI', system-ui, sans-serif;
}
section h1, section h2, section h3 { color: ${palette.primary}; }
section a { color: ${palette.secondary}; }
section strong { color: ${palette.accent}; }
section blockquote { border-left: 4px solid ${palette.accent}; color: ${palette.secondary}; }
section code { background-color: ${palette.primary}; color: ${palette.background}; }

/* Title / closing slides */
section.lead {
  background-color: ${palette.primary};
  color: ${palette.background};
  text-align: center;
}
section.lead h1, section.lead h2 { color: ${palette.background}; }

/* Dark emphasis slides */
section.invert {
  background-color: ${palette.primary};
  color: ${palette.background};
}
`;
}
```

---

## 4. DeckSpec Layout → Marp Class Mapping

### Verified Directive Behaviour

- `<!-- _class: lead -->` — applies `lead` class to current slide only (underscore prefix = scoped)
- `<!-- _class: invert -->` — dark variant for current slide
- Multiple classes: `<!-- _class: lead invert -->` or `<!-- _class: [lead, invert] -->`
- No directive = default content layout

### Proposed Mapping

| DeckSpec Layout | Marp Directive | Marp CSS Class | Notes |
|----------------|----------------|----------------|-------|
| `title` | `<!-- _class: lead -->` | `.lead` | Centered, primary bg, large title |
| `content` | (none) | default `section` | Standard content slide |
| `split` | `![bg right:40%](image)` | default + bg image | Marp auto-shrinks content to left |
| `image` | `![bg](image)` | default + full bg | Full-bleed background image |
| `quote` | `<!-- _class: lead -->` + `>` | `.lead` | Centered blockquote |
| `code` | `<!-- _class: invert -->` | `.invert` | Dark bg for code emphasis |
| `comparison` | Two-column CSS class | `.comparison` | Custom CSS grid (2-col) |
| `diagram` | `![bg right:50%](svg)` or inline | default + bg image | Pre-rendered SVG from pipeline |
| `closing` | `<!-- _class: lead -->` | `.lead` | Same as title — centered, primary bg |

### Custom Classes Needed

Only `comparison` needs a custom CSS class (two-column grid). All other layouts map to Marp built-ins (`lead`, `invert`, bg image syntax).

```css
section.comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2em;
}
```

---

## 5. Speaker Notes in PDF

### Verified Extraction

Speaker notes are extracted via `comments` array from `marp.render()`. However, **Puppeteer's `page.pdf()` does not embed PDF annotations**.

Options:
- **Option A:** Ignore speaker notes in PDF (they exist in the speaker notes document from Epic 1)
- **Option B:** Use `--pdf-notes` marp-cli feature (requires marp-cli dependency)
- **Option C:** Append speaker notes as extra pages at the end

Recommendation: **Option A** — the PDF is for visual slides only. Speaker notes are a separate deliverable from the writer pipeline. Keep Epic 8 scope minimal.

---

## 6. Dependency Summary

| Package | Version | Type | Already Installed? |
|---------|---------|------|-------------------|
| `@marp-team/marp-core` | 4.3.0 | devDependency | Yes (installed during spike) |
| `puppeteer` | ^24.39.0 | devDependency | Yes (from Epic 5) |

No additional dependencies needed. `@marp-team/marp-cli` is **not required**.

---

## 7. Impact on Epic 8 Stories

| Story | Assumption in Spec | Verified Behaviour | Required Change |
|-------|-------------------|-------------------|-----------------|
| 8.1 | Marp templating from DeckSpec | `Marp.render()` converts markdown → HTML/CSS. `---` separates slides. `_class` directives map layouts. | None — spec aligns with API |
| 8.1 | Diagram images referenced by path | `![](path)` renders as `<img src="path">`. Must inline SVGs as data URIs for PDF. | Spec should note SVG inlining requirement |
| 8.2 | Marp programmatic API for PDF | Confirmed: Marp.render() + Puppeteer page.pdf(). No marp-cli needed. | Spec says "Marp programmatic API (not CLI)" — correct |
| 8.2 | `pnpm render-deck` script | Standard npm script pointing to a TypeScript entry. Works with `npx tsx`. | None |
| 8.3 | Colour palette → custom Marp theme | `themeSet.add()` with `@theme` comment + CSS variables. `@import 'default'` for base. | None — spec aligns |
| 8.3 | Fallback without colourPalette | Generate default theme CSS (Marp's `default` theme) when palette absent. | None |

### Story Adjustments Needed

1. **Story 8.1:** Add acceptance criterion: "Given a DeckSpec with diagram SVG paths, When the markdown is generated, Then SVG files are read and inlined as base64 data URIs so they render in the PDF."

2. **Story 8.2:** The `comparison` layout needs a custom CSS class in the theme — this is a cross-cutting concern between 8.1 (templating) and 8.3 (theming). Recommend handling the comparison grid CSS in Story 8.3.

---

## 8. Recommended Architecture

### File Structure

```
scripts/
  render-deck.ts          # CLI entry point (npx tsx scripts/render-deck.ts <path>)
  lib/
    deck-to-marp.ts       # DeckSpec JSON → Marp markdown string
    generate-theme.ts     # ColourPalette → CSS theme string
    render-pdf.ts         # Marp markdown + theme → PDF buffer via Puppeteer
```

### No Mastra Dependency

Epic 8 is standalone — `scripts/` directory, not `src/mastra/`. Imports only from `src/mastra/schemas/deck-spec.ts` for the Zod schema (type validation). No agents, workflows, or tools.

### CLI Interface

```bash
pnpm render-deck output/my-talk.json
# → reads DeckSpec JSON
# → validates with DeckSpecSchema.parse()
# → converts to Marp markdown with custom theme
# → renders PDF via Puppeteer
# → writes output/my-talk.pdf
```

---

## 9. Testing Strategy

| What | How | Dependencies |
|------|-----|-------------|
| DeckSpec → Marp markdown | Unit test: fixture JSON → snapshot markdown output | None |
| Colour palette → theme CSS | Unit test: palette → CSS string assertions | None |
| Layout class mapping | Unit test: each layout type → correct `_class` directive | None |
| SVG inlining | Unit test: mock SVG file path → base64 data URI in markdown | fs mock |
| PDF rendering | Integration test: markdown → PDF buffer (check size > 0, starts with `%PDF`) | Puppeteer |
| CLI entry point | Integration test: fixture JSON file → PDF file on disk | Puppeteer + fs |
| Missing/invalid input | Unit test: error messages and exit codes | None |

### Test Location

`scripts/__tests__/` — co-located with source (project convention). The `scripts/` directory is independent from `src/mastra/`.
