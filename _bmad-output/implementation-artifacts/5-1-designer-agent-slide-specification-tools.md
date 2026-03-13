# Story 5.1: Designer Agent & Slide Specification Tools

Status: done

## Story

As a speaker,
I want the system to produce slide specifications following opinionated design rules,
so that my slides are clean, focused, and visually consistent without manual design work.

## Acceptance Criteria

1. **Given** the Designer agent is defined in `src/mastra/agents/designer.ts` **When** I inspect the agent configuration **Then** it uses the Sonnet model tier **And** has a system prompt for opinionated slide specs (one idea per slide, no bullet points, visual-first) **And** has `DesignerOutputSchema` (Zod) defining structured output as DeckSpec JSON with per-slide content, layout type, speaker note reference, and diagram indicators **And** is bound to `suggestLayout` and `generateColourPalette` tools (AC: #1)

2. **Given** the `suggestLayout` tool exists in `src/mastra/tools/suggest-layout.ts` **When** invoked with slide content and type **Then** it returns a recommended layout from the available templates **And** has explicit `inputSchema` and `outputSchema` (AC: #2)

3. **Given** the `generateColourPalette` tool exists in `src/mastra/tools/generate-colour-palette.ts` **When** invoked with a topic and tone **Then** it returns a colour palette suitable for the presentation theme **And** has explicit `inputSchema` and `outputSchema` (AC: #3)

4. **Given** the Designer agent is registered in `src/mastra/index.ts` **When** I open Mastra Studio **Then** the Designer agent is visible and testable (AC: #4)

## Tasks / Subtasks

- [x] Task 1: Define DeckSpec schema (AC: #1)
  - [x] 1.1 Write TDD tests for DeckSpec, SlideSpec, DiagramSpec, SlideLayoutEnum, ColourPalette schemas — valid/invalid parse cases
  - [x] 1.2 Implement `src/mastra/schemas/deck-spec.ts` with all schemas exported
  - [x] 1.3 Run tests green

- [x] Task 2: Implement `suggestLayout` tool (AC: #2)
  - [x] 2.1 Write TDD tests: content with code → 'code' layout, content with diagram indicator → 'diagram', title-like → 'title', closing-like → 'closing', default → 'content', split when two distinct sections
  - [x] 2.2 Implement `src/mastra/tools/suggest-layout.ts` — heuristic (no LLM), returns `SlideLayoutEnum` value
  - [x] 2.3 Run tests green

- [x] Task 3: Implement `generateColourPalette` tool (AC: #3)
  - [x] 3.1 Write TDD tests: valid topic+tone returns ColourPalette matching schema, all hex strings are valid, palette has all required keys
  - [x] 3.2 Implement `src/mastra/tools/generate-colour-palette.ts` — heuristic palette generator based on topic/tone keywords (no LLM needed for deterministic output)
  - [x] 3.3 Run tests green

- [x] Task 4: Implement Designer agent (AC: #1)
  - [x] 4.1 Write TDD tests: agent exists, uses SONNET_MODEL, has expected tools bound, structured output schema matches DeckSpecSchema
  - [x] 4.2 Implement `src/mastra/agents/designer.ts` — agent with opinionated system prompt, bound to suggestLayout + generateColourPalette, outputs DesignerOutputSchema (alias for DeckSpecSchema)
  - [x] 4.3 Run tests green

- [x] Task 5: Register in index.ts (AC: #4)
  - [x] 5.1 Import `designer` in `src/mastra/index.ts` and add to agents map
  - [x] 5.2 Verify `pnpm typecheck` passes
  - [x] 5.3 Verify `pnpm test` passes

## Dev Notes

### Schema Design (from Spike)

DeckSpec schema goes in `src/mastra/schemas/deck-spec.ts` following project convention (schemas co-located in schemas/).

```typescript
// Key types from spike (verified):
SlideLayoutEnum = z.enum(['title', 'content', 'split', 'image', 'quote', 'code', 'comparison', 'diagram', 'closing'])
DiagramSpecSchema = z.object({ type, description, mermaidSyntax?, svgPath? })
SlideSpecSchema = z.object({ slideNumber, title, layout, content, speakerNoteRef, diagram?, colourAccent? })
DeckSpecSchema = z.object({ title, subtitle?, colourPalette: { primary, secondary, accent, background, text }, slides: SlideSpecSchema[], diagramCount })
```

**Defensive Validation Checklist compliance:**
- All strings: `.min(1)` — no bare `z.string()`
- `slideNumber`: `.int().positive()`
- `diagramCount`: `.int().min(0)`
- All optional fields: `.optional().describe()`
- Hex colours: validate with `.regex(/^#[0-9a-fA-F]{6}$/)` for `colourPalette` and `colourAccent`

### suggestLayout Tool Pattern

Pure heuristic — follows `word-count-to-time.ts` pattern (no LLM). Logic:
- Content contains code block markers → `'code'`
- Content references diagram/flowchart/architecture → `'diagram'`
- Slide is first in deck or content is title-like → `'title'`
- Slide is last or content is CTA/closing → `'closing'`
- Content has quote markers → `'quote'`
- Content has two distinct sections/comparison → `'split'` or `'comparison'`
- Default → `'content'`

### generateColourPalette Tool Pattern

Deterministic heuristic based on topic/tone keywords — map keywords to curated palettes. Returns `ColourPalette` object with 5 hex values. Follows `createTool` pattern from existing tools.

### Designer Agent Pattern

Follows `researcher.ts` agent pattern:
- Import `Agent` from `@mastra/core/agent`
- Use `SONNET_MODEL` from `../config/models`
- Export `DesignerOutputSchema` (same as `DeckSpecSchema` — re-export)
- System prompt: opinionated rules (one idea per slide, no bullet points, visual-first, etc.)
- Tools: `{ suggestLayout, generateColourPalette }`
- No `structuredOutput` in Agent constructor — that's applied when wrapping as workflow step via `createStep(agent, { structuredOutput: { schema } })`

### Project Structure

```
src/mastra/
├── schemas/deck-spec.ts           # NEW — DeckSpecSchema + related
├── tools/suggest-layout.ts        # NEW — heuristic layout suggestion
├── tools/generate-colour-palette.ts # NEW — heuristic palette generation
├── agents/designer.ts             # NEW — Designer agent
├── index.ts                       # MODIFY — add designer import/registration
└── tools/__tests__/               # NEW tests
    ├── suggest-layout.test.ts
    └── generate-colour-palette.test.ts
└── agents/__tests__/
    └── designer.test.ts
└── schemas/__tests__/
    └── deck-spec.test.ts
```

### References

- [Source: spike-epic-5-visual-presentation-design.md#3 — DeckSpec Schema Design]
- [Source: spike-epic-5-visual-presentation-design.md#4 — Tool Patterns]
- [Source: architecture.md — Defensive Validation Checklist]
- [Source: architecture.md — Model Tiers]
- [Source: epics.md#Story 5.1 — Acceptance Criteria]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — clean implementation.

### Completion Notes List

- DeckSpec schema with 9 layout types, hex colour validation, diagram spec, and defensive validation (`.min(1)`, `.int().positive()`, `.regex()` for hex)
- suggestLayout: pure heuristic tool with rule-based pattern matching (8 rules including 'split' + default), no LLM required
- generateColourPalette: topic-aware palette selection from 6 curated presets with topic-based accent shift
- Designer agent: Sonnet tier, opinionated system prompt (one idea/slide, no bullets, visual-first), bound to both tools
- DesignerOutputSchema is a direct re-export of DeckSpecSchema (same object reference)
- 60 new tests across 4 test files, all passing. Zero regressions (2 pre-existing workflow integration failures due to missing DATABASE_URL)

### Change Log

- 2026-03-12: Implemented Story 5.1 — DeckSpec schema, suggestLayout tool, generateColourPalette tool, Designer agent, index.ts registration
- 2026-03-12: Code review fixes — added 'split' layout rule, topic-based accent shift in palette, fixed DesignerOutput type, fixed regex, added 3 tests

### File List

- `src/mastra/schemas/deck-spec.ts` — NEW: DeckSpec, SlideSpec, DiagramSpec, ColourPalette, SlideLayoutEnum schemas
- `src/mastra/schemas/__tests__/deck-spec.test.ts` — NEW: 32 schema validation tests
- `src/mastra/tools/suggest-layout.ts` — NEW: Heuristic layout suggestion tool
- `src/mastra/tools/__tests__/suggest-layout.test.ts` — NEW: 12 tool tests
- `src/mastra/tools/generate-colour-palette.ts` — NEW: Deterministic colour palette tool
- `src/mastra/tools/__tests__/generate-colour-palette.test.ts` — NEW: 8 tool tests
- `src/mastra/agents/designer.ts` — NEW: Designer agent with opinionated system prompt
- `src/mastra/agents/__tests__/designer.test.ts` — NEW: 8 agent tests
- `src/mastra/index.ts` — MODIFIED: Added designer import and registration
