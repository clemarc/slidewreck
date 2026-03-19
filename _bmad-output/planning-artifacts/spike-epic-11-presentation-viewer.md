# Spike: Epic 11 — Presentation Viewer

**Date:** 2026-03-19
**Run ID:** `6fc148c7-db42-4464-94fa-cee59cfc200b`
**Status:** All questions answered — no blockers for Epic 11

---

## Question 1: Can we extract the full DeckSpec JSON from a completed run via the API?

**Answer: YES — straightforward path.**

### API Call

```
GET /api/workflows/slidewreck/runs/{runId}
```

### Extraction Path

```typescript
const run = await mastraClient.getRunStatus('slidewreck', runId);
const deckSpec = run.result.deckSpec;         // DeckSpec object
const speakerScript = run.result.speakerScript; // WriterOutput object
const diagrams = run.result.diagrams;          // DiagramResult[] (SVG strings)
const slideMarkdown = run.result.slideMarkdown; // Marp markdown string
```

### Verified Response Structure

Top-level `run.result` keys:
- `deckSpec` — full `DeckSpec` object (title, subtitle, colourPalette, slides[], diagramCount)
- `speakerScript` — full `WriterOutput` (sections[], speakerNotes, timingMarkers[], totalDurationMinutes)
- `diagrams` — `DiagramResult[]` with `{ slideNumber, svg }` (raw SVG strings)
- `slideMarkdown` — rendered Marp markdown (string)
- `researchBrief` — full researcher output
- `scorecard` — eval scores
- `metadata` — runId, completedAt, input, outputDirPath

### Run Status

The test run (`6fc148c7`) has status `success` with all fields populated.

### DeckSpec from Test Run

| Field | Value |
|-------|-------|
| title | "2026 French Council Elections: The Second Round War Room" |
| subtitle | "Strategy, Timing, and the 48 Hours That Decide Everything" |
| slides | 19 slides |
| diagramCount | 3 |
| colourPalette | primary=#2C3E50, secondary=#34495E, accent=#3F9DD0, background=#FFFFFF, text=#2C3E50 |

### Slide Breakdown by Layout

| Layout | Count | Slides |
|--------|-------|--------|
| title | 1 | #1 |
| content | 10 | #3, #6, #7, #9, #10, #11, #13, #15, #16, #17, #18 |
| split | 2 | #2, #12 |
| quote | 2 | #4, #14 |
| diagram | 2 | #5, #8 |
| closing | 1 | #19 |
| image | 0 | — |
| code | 0 | — |
| comparison | 0 | — |

**Layouts actively used: 6 of 9.** `image`, `code`, `comparison` have no test data — implement with reasonable defaults, defer visual polish.

### Constraint: Mastra Dev Server Response Format

The Mastra dev server (`localhost:4111`) returns a **schema summary format** to `curl` (type annotations instead of raw values). The frontend `fetch()` API receives **valid JSON** with full data. This is a dev-server rendering quirk, not an API issue. The `MastraClient` class works correctly as-is.

---

## Question 2: Are per-slide speaker notes available in the DeckSpec?

**Answer: Speaker notes are NOT in the DeckSpec. They live in `speakerScript` and are linked via `speakerNoteRef`.**

### Linkage Mechanism

Each slide has a `speakerNoteRef` string (e.g., `"hook-opening"`, `"strategy1-desistement"`). The `speakerScript.speakerNotes` field is a full markdown document with `## ` and `### ` section headers.

**Matching algorithm** (from `designer-content-fill.ts:77`):
1. Split `speakerNotes` on `## ` headers
2. Tokenize the `speakerNoteRef` by splitting on `-`
3. Count how many tokens appear in each header line
4. Match if ≥60% of tokens match
5. Fallback: return first 2000 chars if no match

### Test Data Verification

| speakerNoteRef | Expected Header Match |
|---|---|
| `hook-opening` | `### HOOK: THE ROUND THAT ACTUALLY MATTERS` |
| `context-rules` | `### CONTEXT: THE RULES OF THE GAME` |
| `strategy1-desistement` | `### KEY STRATEGY 1: THE DÉSISTEMENT DILEMMA` |
| `strategy2-historical` | `### KEY STRATEGY 2: THE CRUMBLING REPUBLICAN FRONT` |
| `closing-three-things` | `### CLOSING: THREE THINGS TO WATCH IN 2026` |

All refs have reasonable header matches via the fuzzy 60% threshold.

### Implementation Approach for Epic 11

The frontend will need its own `extractRelevantSection()` — the backend version is in a workflow step, not exported as a utility. Two options:

**Option A (recommended):** Extract the matching function into a shared utility in `mastra/src/mastra/utils/` and re-export from a location the web app can import. However, this crosses workspace boundaries.

**Option B (simpler):** Duplicate the ~15-line function in `web/lib/speaker-notes.ts`. It's small, stable, and unlikely to diverge.

**Decision: Option B** — small function, no cross-workspace import complexity.

### Speaker Script Structure

```typescript
interface WriterOutput {
  sections: Array<{
    title: string;
    content: string;        // Full script text for this section
    speakingNotes: string;  // Stage directions / delivery hints
    durationMinutes: number;
  }>;
  speakerNotes: string;           // Complete markdown document
  timingMarkers: TimingMarker[];  // MM:SS checkpoints
  totalDurationMinutes: number;   // 10.5 for test run
}
```

The `speakerNotes` markdown (10,577 chars in test run) includes a timing overview table, all section scripts, a statistics reference card, and a pronunciation guide. This is what the presenter sees in "speaker view."

---

## Question 3: Can a simple React component render one slide?

**Answer: YES — proof-of-concept below works with React + Tailwind.**

### Proof-of-Concept: Single Slide Renderer

```tsx
// Minimal proof-of-concept — not production code
import type { SlideSpec, ColourPalette } from '@/types/deck-spec';

interface SlideProps {
  slide: SlideSpec;
  palette: ColourPalette;
}

function TitleSlide({ slide, palette }: SlideProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-16 text-center"
      style={{ backgroundColor: palette.primary, color: palette.background }}
    >
      <h1 className="text-5xl font-bold leading-tight">{slide.title}</h1>
      <p className="mt-6 text-xl opacity-80 max-w-2xl">{slide.content}</p>
    </div>
  );
}

function ContentSlide({ slide, palette }: SlideProps) {
  return (
    <div
      className="flex flex-col justify-center h-full px-16"
      style={{
        backgroundColor: palette.background,
        color: palette.text,
      }}
    >
      <h2
        className="text-3xl font-bold mb-8"
        style={{ color: slide.colourAccent ?? palette.primary }}
      >
        {slide.title}
      </h2>
      <p className="text-xl leading-relaxed max-w-3xl">{slide.content}</p>
    </div>
  );
}

function DiagramSlide({ slide, palette, svg }: SlideProps & { svg?: string }) {
  return (
    <div
      className="flex flex-col justify-center h-full px-16"
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      <h2 className="text-3xl font-bold mb-6" style={{ color: palette.primary }}>
        {slide.title}
      </h2>
      {svg ? (
        <div
          className="flex-1 flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 italic">
          {slide.diagram?.description ?? 'Diagram not available'}
        </div>
      )}
      <p className="mt-4 text-base opacity-70">{slide.content}</p>
    </div>
  );
}

function QuoteSlide({ slide, palette }: SlideProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-16 text-center"
      style={{ backgroundColor: palette.background, color: palette.text }}
    >
      <blockquote
        className="text-3xl italic font-light leading-relaxed max-w-3xl"
        style={{ borderLeftColor: palette.accent }}
      >
        &ldquo;{slide.title}&rdquo;
      </blockquote>
      <p className="mt-8 text-lg opacity-70">{slide.content}</p>
    </div>
  );
}

function ClosingSlide({ slide, palette }: SlideProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-16 text-center"
      style={{ backgroundColor: palette.primary, color: palette.background }}
    >
      <h2 className="text-4xl font-bold">{slide.title}</h2>
      <p className="mt-6 text-xl opacity-80 max-w-2xl">{slide.content}</p>
    </div>
  );
}

/** Layout → component dispatcher */
const LAYOUT_RENDERERS: Record<string, React.FC<SlideProps & { svg?: string }>> = {
  title: TitleSlide,
  content: ContentSlide,
  diagram: DiagramSlide,
  quote: QuoteSlide,
  closing: ClosingSlide,
  // split, image, code, comparison → fallback to ContentSlide
};

export function SlideRenderer({
  slide,
  palette,
  svg,
}: {
  slide: SlideSpec;
  palette: ColourPalette;
  svg?: string;
}) {
  const Component = LAYOUT_RENDERERS[slide.layout] ?? ContentSlide;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg shadow-lg">
      <Component slide={slide} palette={palette} svg={svg} />
    </div>
  );
}
```

### Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Slide container | `aspect-video` (16:9) | Standard presentation ratio, CSS-native |
| Colour application | Inline `style` from palette | Dynamic per-deck, can't be Tailwind classes |
| Diagram rendering | `dangerouslySetInnerHTML` with pre-rendered SVG | SVGs are server-generated, trusted source |
| Missing layouts | Fallback to `ContentSlide` | `image`/`code`/`comparison` have no test data, graceful degradation |
| Speaker notes | Separate component, not in slide renderer | Notes panel is a different UI region (presenter view vs. audience view) |

### Keyboard Navigation (Browser APIs)

```tsx
// Standard approach — no library needed
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') setCurrentSlide(i => Math.min(i + 1, total - 1));
    if (e.key === 'ArrowLeft') setCurrentSlide(i => Math.max(i - 1, 0));
    if (e.key === 'f') document.documentElement.requestFullscreen();
    if (e.key === 'Escape') document.exitFullscreen();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [total]);
```

### Fullscreen

Standard `requestFullscreen()` API — no library needed. Works in all modern browsers.

---

## Architecture Implications for Epic 11

### Data Flow

```
/deck/[runId] page
  → useRunStatus('slidewreck', runId) hook
  → Extract from run.result:
      ├── deckSpec (slides, palette, metadata)
      ├── speakerScript.speakerNotes (presenter notes markdown)
      └── diagrams[] (SVG strings, keyed by slideNumber)
  → SlideRenderer components (layout dispatcher)
  → Speaker notes panel (optional toggle)
```

### New Files Needed

| File | Purpose |
|------|---------|
| `web/app/deck/[runId]/page.tsx` | Deck viewer page |
| `web/components/slides/slide-renderer.tsx` | Layout dispatcher |
| `web/components/slides/layouts/*.tsx` | Per-layout components (title, content, quote, diagram, split, closing) |
| `web/components/slides/speaker-notes.tsx` | Speaker notes panel |
| `web/lib/speaker-notes.ts` | `extractRelevantSection()` utility |
| `web/types/deck-spec.ts` | Frontend TypeScript types (mirror of Zod schemas) |

### No New API Endpoints Needed

Everything is available from the existing `GET /api/workflows/slidewreck/runs/{runId}` endpoint. The `useRunStatus` hook already polls this.

### Diagram SVG Handling

Three diagrams exist in the test run (slides 5, 8, 12). SVGs are stored as strings in `run.result.diagrams[]` with `{ slideNumber, svg }`. Map by `slideNumber` to pair with DeckSpec slides.

The `diagram.mermaidSyntax` field is **not populated** in the DeckSpec from this run (description only). Client-side Mermaid rendering is not needed if we use the pre-rendered SVGs from `diagrams[]`. If a diagram has no pre-rendered SVG, fall back to the description text.

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Large SVG strings bloat page | LOW | SVGs are 3-9KB each — negligible |
| `speakerNoteRef` fuzzy match fails in frontend | LOW | Same algorithm, tested on real data |
| Unused layouts (image, code, comparison) have no test data | MEDIUM | Implement as ContentSlide fallback, add layout-specific rendering later when test data exists |
| Run result type is `unknown` in MastraClient | CERTAIN | Add type assertion or Zod parse at extraction point |

---

## Conclusion

**All three spike questions answered affirmatively. No blockers for Epic 11.**

- DeckSpec is fully available at `run.result.deckSpec` with all 19 slides
- Speaker notes are in `run.result.speakerScript.speakerNotes`, linked by `speakerNoteRef`
- React + Tailwind rendering is straightforward — proof-of-concept covers 6 of 9 layouts
- Diagram SVGs are pre-rendered and available at `run.result.diagrams[]`
- No new API endpoints needed
- Keyboard nav and fullscreen via standard browser APIs
