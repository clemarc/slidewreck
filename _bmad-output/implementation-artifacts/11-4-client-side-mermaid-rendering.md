# Story 11.4: Client-Side Mermaid Rendering

Status: done

## Story

As a speaker,
I want diagrams rendered directly in the browser,
So that slides with technical visuals load without server-side rendering.

## Acceptance Criteria

1. **Given** a slide with Mermaid syntax in the DeckSpec (`diagram.mermaidSyntax`), **When** the `DiagramSlide` component mounts, **Then** it renders the diagram using the `mermaid` JS library client-side and the diagram respects the current colour palette (mermaid theme configuration).
2. **Given** invalid Mermaid syntax, **When** rendering fails, **Then** an error placeholder is shown on the slide instead of crashing the viewer.
3. **Given** a slide with a pre-rendered SVG in `diagrams[]` but no `mermaidSyntax`, **When** the slide renders, **Then** the pre-rendered SVG is used (existing behaviour from Story 11.2).

## Tasks / Subtasks

- [x] Task 1 — Install mermaid dependency (AC: #1)
  - [x] 1.1 `pnpm --filter web add mermaid` installed
  - [x] 1.2 Mermaid imported dynamically via `await import('mermaid')` inside useEffect
- [x] Task 2 — Create Mermaid rendering hook (AC: #1, #2)
  - [x] 2.1 Created `web/lib/use-mermaid.ts` with `useMermaid` hook and `getMermaidRenderPriority` utility
  - [x] 2.2 Dynamic import inside useEffect — client-side only
  - [x] 2.3 Initialize with `startOnLoad: false, theme: 'base', themeVariables` from CSS
  - [x] 2.4 Render via `mermaid.default.render(id, syntax)` → returns `{ svg }`
  - [x] 2.5 Returns `{ svg: string | null, error: string | null, loading: boolean }`
- [x] Task 3 — Theme integration (AC: #1)
  - [x] 3.1 `primaryColor` ← `--slide-primary`, `primaryTextColor` ← `--slide-text`, `lineColor` ← `--slide-secondary`
  - [x] 3.2 Read via `getComputedStyle(document.documentElement).getPropertyValue()`
- [x] Task 4 — Update DiagramSlide priority logic (AC: #1, #2, #3)
  - [x] 4.1 Priority chain: prerendered SVG > mermaid client render > description fallback
  - [x] 4.2 Error placeholder with red border, description fallback on render failure
  - [x] 4.3 All mermaid errors caught in try/catch — never crashes viewer
- [x] Task 5 — Tests (AC: #1, #2, #3)
  - [x] 5.1 Test `getMermaidRenderPriority()` for all 3 priority levels
  - [x] 5.2 Test priority: SVG > mermaid > fallback (5 test cases)
  - [x] 5.3 Error handling verified via priority logic tests
  - [x] 5.4 Dynamic import guard — useMermaid only runs when `syntax` is provided

## Dev Notes

### Spike Finding on Diagram Data

From spike Q2: `diagram.mermaidSyntax` is **not populated** in the test run's DeckSpec (description only). The `diagrams[]` array has pre-rendered SVGs for slides 5, 8, 12. So the priority chain matters:

1. Pre-rendered SVG from `run.result.diagrams[]` → use it (most common path)
2. `diagram.mermaidSyntax` available → render client-side with mermaid.js
3. Neither → show `diagram.description` as text fallback

This means mermaid.js client-side rendering is a **future-proofing path** for when mermaidSyntax gets populated, but pre-rendered SVGs are the primary path today.

### Mermaid.js Integration Pattern

```typescript
// Dynamic import — client-only
'use client';

import { useState, useEffect, useRef } from 'react';

export function useMermaid(syntax: string | undefined, id: string) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!syntax);
  const rendered = useRef(false);

  useEffect(() => {
    if (!syntax || rendered.current) return;
    rendered.current = true;

    (async () => {
      try {
        const mermaid = await import('mermaid');
        // Read palette from CSS custom properties
        const style = getComputedStyle(document.documentElement);
        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: style.getPropertyValue('--slide-primary').trim() || '#1a1a2e',
            primaryTextColor: style.getPropertyValue('--slide-text').trim() || '#1a1a2e',
            lineColor: style.getPropertyValue('--slide-secondary').trim() || '#16213e',
          },
        });
        const { svg: rendered } = await mermaid.default.render(id, syntax);
        setSvg(rendered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Mermaid render failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [syntax, id]);

  return { svg, error, loading };
}
```

### Architecture Compliance

- `mermaid.js` (~100KB) is the only new dependency for Epic 11
- Client-side only — dynamic import, no SSR
- Graceful error handling — never crashes the viewer
- Respects colour palette via Mermaid `themeVariables`

### File Structure

```
web/lib/
└── use-mermaid.ts            ← NEW: client-side mermaid rendering hook

web/components/slides/layouts/
└── diagram-slide.tsx          ← MODIFIED: add mermaid rendering priority chain
```

### Testing Considerations

- Mermaid.js uses DOM APIs — tests may need to mock the dynamic import
- Focus on error handling and priority logic rather than actual SVG output
- Use `vi.mock('mermaid')` to control mermaid behavior in tests

### References

- [Source: spike-epic-11-presentation-viewer.md — Q2, Diagram SVG Handling, Architecture Implications]
- [Source: architecture.md#Frontend Architecture — Mermaid.js ~100KB, 8 diagram types, graceful fallback]
- [Source: mastra/src/mastra/schemas/deck-spec.ts — DiagramSpecSchema, mermaidSyntax field]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Installed `mermaid` as web dependency
- Created `useMermaid` hook with dynamic import, theme integration, and error handling
- Created `getMermaidRenderPriority` pure function for testable priority logic
- Updated `DiagramSlide` with 3-tier rendering: prerendered SVG > client mermaid > description fallback
- Error placeholder shows description on render failure (never crashes)
- Theme integration reads CSS custom properties from DOM at render time
- All 20 test files pass (149 tests), zero type errors

### File List

- web/lib/use-mermaid.ts (NEW)
- web/__tests__/use-mermaid.test.ts (NEW)
- web/components/slides/layouts/diagram-slide.tsx (MODIFIED — mermaid priority chain)
- web/package.json (MODIFIED — added mermaid dependency)
