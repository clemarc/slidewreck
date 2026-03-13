# Story 5.3: Parallel Asset Creation Pipeline

Status: done

## Story

As a speaker,
I want slide assets generated concurrently to minimize total generation time,
so that I receive the complete visual package quickly.

## Acceptance Criteria

1. **Given** the Designer agent has produced DeckSpec JSON **When** the asset creation phase begins **Then** the workflow uses `.parallel()` to execute slide building and Mermaid rendering concurrently (AC: #1 — FR-11)

2. **Given** the `buildSlides` tool exists in `src/mastra/tools/build-slides.ts` **When** invoked with DeckSpec JSON **Then** it produces Markdown slide output with frontmatter per slide (AC: #2)

3. **Given** parallel asset creation is running **When** I inspect observability logs **Then** execution timestamps for parallel branches overlap, confirming concurrent execution (AC: #3 — NFR-3)

4. **Given** a 30-slide deck **When** all parallel asset steps complete **Then** total asset generation time is under 30 seconds (AC: #4 — NFR-4)

5. **Given** an optional asset step fails (e.g., diagram rendering) **When** the parallel branch encounters the failure **Then** the system substitutes a placeholder and continues with remaining assets (AC: #5 — NFR-7) **And** the failure is logged with a warning

## Tasks / Subtasks

- [x] Task 1: Create `buildSlides` tool (AC: #2)
  - [x] 1.1 Write TDD tests: valid DeckSpec returns Markdown string with frontmatter per slide, output contains all slide titles, empty slides array rejected by schema
  - [x] 1.2 Implement `src/mastra/tools/build-slides.ts` — takes DeckSpec, produces Markdown with `---` separators and YAML frontmatter (slideNumber, layout, title, colourAccent, speakerNoteRef) per slide
  - [x] 1.3 Run tests green

- [x] Task 2: Create `render-diagrams` workflow step (AC: #1, #5)
  - [x] 2.1 Write TDD tests: step processes DeckSpec slides with diagrams, calls generateMermaid + renderMermaid per diagram slide, returns updated DeckSpec with svgContent populated, handles render errors gracefully with placeholder
  - [x] 2.2 Implement `src/mastra/workflows/steps/render-diagrams.ts` — createStep that iterates DeckSpec slides, calls generateMermaid tool for description→syntax, then renderMermaid tool for syntax→SVG. On failure per diagram: log warning, set placeholder SVG.
  - [x] 2.3 Run tests green

- [x] Task 3: Create `build-slides` workflow step wrapping the tool (AC: #1)
  - [x] 3.1 Write TDD tests: step takes DeckSpec, calls buildSlides tool, returns slide Markdown output
  - [x] 3.2 Implement `src/mastra/workflows/steps/build-slides.ts` — createStep wrapping the buildSlides tool
  - [x] 3.3 Run tests green

- [x] Task 4: Integrate parallel block into slidewreck workflow (AC: #1, #3, #4)
  - [x] 4.1 Write TDD tests: parallel execution produces result keyed by step ID, total time < sum of individual step times (timing assertion), both branches produce valid output
  - [x] 4.2 Add Designer step → `.parallel([buildSlidesStep, renderDiagramsStep] as const)` → `.map()` merge step to `slidewreck.ts` after the review-script gate
  - [x] 4.3 The merge `.map()` step combines slide Markdown with rendered diagram SVGs and calls `closeBrowser()`
  - [x] 4.4 Register any new exports in `src/mastra/index.ts` if needed
  - [x] 4.5 Run tests green

- [x] Task 5: Error handling and graceful degradation (AC: #5)
  - [x] 5.1 Write TDD tests: failing diagram render returns placeholder SVG, workflow continues to completion, warning logged
  - [x] 5.2 Ensure try/catch inside each parallel step's `execute` function (spike finding: no built-in per-branch error recovery in `.parallel()`)
  - [x] 5.3 Run tests green

## Dev Notes

### Spike Findings (Critical)

From `spike-epic-5-visual-presentation-design.md`:

- **`.parallel()` returns object keyed by step ID**, not an array. Next step receives `inputData` typed as `{ [stepId: string]: StepOutput }`.
- **`as const` required** on the steps array for tuple type inference: `.parallel([step1, step2] as const)`.
- **No suspend/resume inside parallel branches** — type inference disabled. Story 5.4 review gate must run AFTER `.parallel()`.
- **Error handling**: If any parallel step throws, the entire parallel block fails. Use try/catch *inside* each step's `execute` to handle errors gracefully.
- **No `.map()` inside `.parallel()`** — each parallel branch is a single step.
- **State writes**: Avoid concurrent `setState()` calls. Use step outputs instead.
- **Step ID uniqueness**: All step IDs across the workflow must be unique.

### buildSlides Tool Design

The `buildSlides` tool takes a `DeckSpec` and produces Markdown output. Each slide becomes a section:

```markdown
---
slideNumber: 1
layout: title
title: "Introduction to AI"
speakerNoteRef: "section-intro"
---

# Introduction to AI

AI is transforming how we build software...

---
```

No LLM needed — this is a deterministic assembler. The DeckSpec already contains all content from the Designer agent.

### render-diagrams Step Design

This step iterates over DeckSpec slides looking for those with `diagram` specs:
1. For each slide with a `diagram`, call `generateMermaid` tool (description → Mermaid syntax)
2. Call `renderMermaid` tool (Mermaid syntax → SVG)
3. Store SVG content in the step output
4. On error: log warning, substitute placeholder SVG `<svg><text>Diagram unavailable</text></svg>`

### Parallel Block Integration

```typescript
// After review-script gate, before eval/save:
.then(designerStep)           // produces DeckSpec (Story 5.1 designer agent)
.parallel([
  buildSlidesStep,            // DeckSpec → Markdown slides
  renderDiagramsStep,         // DeckSpec → SVG diagrams
] as const)
.map(async ({ inputData }) => {
  // inputData is { 'build-slides': ..., 'render-diagrams': ... }
  // merge results, close browser
})
```

### Input/Output Schema for Parallel Steps

Both parallel steps receive the same input (DeckSpec output from designer step). Each has its own output schema:
- `buildSlidesStep` output: `{ markdown: string }`
- `renderDiagramsStep` output: `{ diagrams: Array<{ slideNumber: number; svg: string }> }`

### Existing Code Context

- `DeckSpecSchema` in `src/mastra/schemas/deck-spec.ts` — the input schema for both parallel steps
- `generateMermaid` tool in `src/mastra/tools/generate-mermaid.ts` — template-based Mermaid generation
- `renderMermaidTool` in `src/mastra/tools/render-mermaid.ts` — puppeteer-based SVG rendering
- `getBrowser()`/`closeBrowser()` in `src/mastra/config/browser.ts` — browser singleton
- `designer` agent in `src/mastra/agents/designer.ts` — produces DeckSpec with Sonnet model
- `slidewreck` workflow in `src/mastra/workflows/slidewreck.ts` — main workflow to extend

### Testing Strategy

- `buildSlides` tool: Unit tests, no external deps
- `render-diagrams` step: Mock `generateMermaid` and `renderMermaid` tool calls for unit tests, integration test with real puppeteer
- Parallel execution: Timing assertions with mock steps (fast/slow pattern from spike)
- Use `InMemoryStore` from `@mastra/core/storage` for workflow tests
- Puppeteer integration tests: use `describe.skipIf` for CI environments without Chromium

### Project Structure Notes

- New files follow existing patterns: tools in `src/mastra/tools/`, workflow steps in `src/mastra/workflows/steps/`
- Tests co-located in `__tests__/` subdirectories
- No new directory structure needed — `src/mastra/workflows/steps/` may be new (check if directory exists)

### References

- [Source: spike-epic-5-visual-presentation-design.md#1 — .parallel() API]
- [Source: spike-epic-5-visual-presentation-design.md#4 — Tool Patterns]
- [Source: spike-epic-5-visual-presentation-design.md#5 — Parallel Testing Strategy]
- [Source: epics.md#Story 5.3 — Acceptance Criteria]
- [Source: architecture.md — AD-3: Human Gate Placement, NFR-3/4/7]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

### Completion Notes List

- `buildSlides` tool: deterministic Markdown assembler with YAML frontmatter per slide
- `render-diagrams` step: iterates diagram slides, calls generateMermaid + renderMermaid, graceful fallback with placeholder SVG
- `build-slides` step: thin wrapper around buildSlidesTool for workflow compatibility
- Parallel block: `.parallel([buildSlidesStep, renderDiagramsStep] as const)` in slidewreck workflow
- Designer step added: `createStep(designer, { structuredOutput: ... })` after review-script gate
- Merge map: combines slide Markdown + diagram SVGs, closes browser, runs eval suite
- WorkflowOutputSchema updated with `deckSpec`, `slideMarkdown`, `diagrams` optional fields
- 19 new tests across 4 test files, all passing (346 total)
- TypeScript typecheck clean

### Change Log

- 2026-03-12: Implemented Story 5.3 — buildSlides tool, render-diagrams step, parallel pipeline integration

### File List

- `src/mastra/tools/build-slides.ts` — NEW: DeckSpec → Markdown slide assembler
- `src/mastra/tools/__tests__/build-slides.test.ts` — NEW: 8 tool tests
- `src/mastra/workflows/steps/render-diagrams.ts` — NEW: Diagram generation + rendering step with graceful fallback
- `src/mastra/workflows/steps/__tests__/render-diagrams.test.ts` — NEW: 5 step tests
- `src/mastra/workflows/steps/build-slides.ts` — NEW: Workflow step wrapping buildSlidesTool
- `src/mastra/workflows/steps/__tests__/build-slides-step.test.ts` — NEW: 2 step tests
- `src/mastra/workflows/steps/__tests__/parallel-pipeline.test.ts` — NEW: 4 parallel execution tests
- `src/mastra/workflows/slidewreck.ts` — MODIFIED: Added designer step + parallel block + merge map
- `src/mastra/schemas/workflow-output.ts` — MODIFIED: Added deckSpec, slideMarkdown, diagrams fields
- `src/mastra/tools/__tests__/generate-mermaid.test.ts` — MODIFIED: Fixed diagramType type annotation
