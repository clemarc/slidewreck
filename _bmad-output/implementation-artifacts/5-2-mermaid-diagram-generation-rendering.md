# Story 5.2: Mermaid Diagram Generation & Rendering

Status: done

## Story

As a speaker,
I want architecture and flow diagrams generated and rendered as SVGs,
so that my slides include professional visuals for technical concepts.

## Acceptance Criteria

1. **Given** the `generateMermaid` tool exists in `src/mastra/tools/generate-mermaid.ts` **When** invoked with a natural language description of a diagram **Then** it returns valid Mermaid syntax **And** has explicit `inputSchema` and `outputSchema` (AC: #1)

2. **Given** the `renderMermaid` tool exists in `src/mastra/tools/render-mermaid.ts` **When** invoked with Mermaid syntax **Then** it renders the diagram to SVG using `@mermaid-js/mermaid-cli` **And** returns the SVG content (AC: #2)

3. **Given** `@mermaid-js/mermaid-cli` is included in project dependencies **When** I inspect `package.json` **Then** the dependency is present (AC: #3)

4. **Given** invalid Mermaid syntax is provided **When** the `renderMermaid` tool attempts rendering **Then** it returns an error with the syntax issue identified rather than crashing (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Install mermaid-cli and puppeteer dependencies (AC: #3)
  - [x] 1.1 Run `pnpm add -D @mermaid-js/mermaid-cli puppeteer`
  - [x] 1.2 Verify imports work: `import { renderMermaid } from '@mermaid-js/mermaid-cli'`

- [x] Task 2: Create browser singleton module (AC: #2)
  - [x] 2.1 Write TDD tests for browser singleton: getBrowser returns connected browser, closeBrowser cleans up
  - [x] 2.2 Implement `src/mastra/config/browser.ts` with lazy getBrowser() and closeBrowser()
  - [x] 2.3 Run tests green

- [x] Task 3: Implement `generateMermaid` tool (AC: #1)
  - [x] 3.1 Write TDD tests: valid description returns Mermaid syntax string, output contains Mermaid keywords (graph/flowchart/sequenceDiagram etc.), inputSchema/outputSchema defined
  - [x] 3.2 Implement `src/mastra/tools/generate-mermaid.ts` — template-based Mermaid generation from description keywords (heuristic for now, LLM integration in workflow step)
  - [x] 3.3 Run tests green

- [x] Task 4: Implement `renderMermaid` tool (AC: #2, #4)
  - [x] 4.1 Write TDD tests: valid Mermaid syntax returns SVG string containing `<svg`, invalid syntax returns error object (not throw), tool has inputSchema/outputSchema
  - [x] 4.2 Implement `src/mastra/tools/render-mermaid.ts` using `renderMermaid()` from `@mermaid-js/mermaid-cli` with browser singleton
  - [x] 4.3 Run tests green (integration tests requiring puppeteer)

## Dev Notes

### Spike Findings (Critical)

From `spike-epic-5-visual-presentation-design.md`:

- **Use `renderMermaid()` programmatic API**, not `run()` (file-based). Avoids temp file I/O.
- **Browser singleton pattern**: Launch puppeteer once, reuse across renders, close on completion.
- **`@mermaid-js/mermaid-cli` is ESM-only** — must use `import`, not `require`.
- **`renderMermaid()` returns `{ title, desc, data }` where `data` is `Uint8Array`** — convert to string with `new TextDecoder().decode(data)` for SVG.
- **Error handling**: Invalid Mermaid syntax throws from `renderMermaid()`. Wrap in try/catch and return error.

### Browser Singleton Pattern (from Spike)

```typescript
// src/mastra/config/browser.ts
import puppeteer, { type Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({ headless: true });
  }
  return browserInstance;
}

async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
```

### renderMermaid Tool Pattern

```typescript
import { renderMermaid } from '@mermaid-js/mermaid-cli';
import { getBrowser } from '../config/browser';

const { data } = await renderMermaid(browser, mermaidSyntax, 'svg', {
  backgroundColor: 'transparent',
  mermaidConfig: { theme: 'neutral' },
});
const svg = new TextDecoder().decode(data);
```

### generateMermaid Tool

Template-based approach: given a diagram type and description, generate simple Mermaid syntax using templates. This is a simple heuristic tool — the LLM-powered generation happens when the Designer agent calls this tool with its intelligence.

### Testing Strategy

- `generateMermaid`: Unit tests with mock inputs, no external deps
- `renderMermaid`: Integration tests requiring puppeteer/Chromium — use `describe.skipIf` for CI environments without Chromium
- Browser singleton: Test lifecycle (init, reuse, cleanup)

### References

- [Source: spike-epic-5-visual-presentation-design.md#2 — Mermaid CLI API]
- [Source: spike-epic-5-visual-presentation-design.md#4 — Tool Patterns]
- [Source: epics.md#Story 5.2 — Acceptance Criteria]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- ESM import issue: `@mermaid-js/mermaid-cli` is ESM-only, required dynamic `import()` in render-mermaid.ts
- Puppeteer peer dep: mermaid-cli expects ^23 but puppeteer 24 installed — works fine at runtime

### Completion Notes List

- Installed `@mermaid-js/mermaid-cli@11.12.0` and `puppeteer@24.39.0` as dev deps
- Added puppeteer to pnpm `onlyBuiltDependencies` for Chromium download
- Browser singleton at `src/mastra/config/browser.ts` — lazy init, reuse, cleanup
- `generateMermaid` tool: template-based Mermaid syntax generation for 8 diagram types
- `renderMermaid` tool: uses dynamic `import()` for ESM-only mermaid-cli, returns SVG or error (no throw)
- 17 new tests across 3 test files, all passing

### Change Log

- 2026-03-12: Implemented Story 5.2 — mermaid-cli setup, browser singleton, generateMermaid tool, renderMermaid tool

### File List

- `package.json` — MODIFIED: Added @mermaid-js/mermaid-cli, puppeteer deps; puppeteer to onlyBuiltDependencies
- `src/mastra/config/browser.ts` — NEW: Puppeteer browser singleton
- `src/mastra/config/__tests__/browser.test.ts` — NEW: 5 browser lifecycle tests
- `src/mastra/tools/generate-mermaid.ts` — NEW: Template-based Mermaid syntax generator
- `src/mastra/tools/__tests__/generate-mermaid.test.ts` — NEW: 8 tool tests
- `src/mastra/tools/render-mermaid.ts` — NEW: Mermaid-to-SVG renderer via mermaid-cli
- `src/mastra/tools/__tests__/render-mermaid.test.ts` — NEW: 4 integration tests
