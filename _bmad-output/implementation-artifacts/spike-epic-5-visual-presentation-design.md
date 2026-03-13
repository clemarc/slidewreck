# Epic 5 API Verification Spike: Visual Presentation Design

**Date:** 2026-03-12
**Installed version:** @mastra/core 1.8.0
**Purpose:** Verify `.parallel()` workflow API, `@mermaid-js/mermaid-cli` headless rendering, DeckSpec schema design, new tool patterns, and parallel execution testing strategy before Epic 5 sprint planning.

---

## 1. Mastra `.parallel()` Workflow API

### Verified Method Signature

```typescript
// From node_modules/@mastra/core/dist/workflows/workflow.d.ts
parallel<TParallelSteps extends readonly Step<string, any, TPrevSchema, any, any, any, TEngineType, any>[]>(
  steps: TParallelSteps & { /* type constraints */ }
): Workflow<..., {
  [K in keyof StepsRecord<TParallelSteps>]:
    InferZodLikeSchema<StepsRecord<TParallelSteps>[K]["outputSchema"]>;
}, ...>
```

### Key Findings

1. **Input**: Takes a `readonly` array of `Step` objects. All steps receive the same `TPrevSchema` as input (output of the previous `.then()` / `.map()` step).

2. **Result shape**: Output is an **object keyed by step ID**, not an array. Each key is the step's `id` string, each value is the inferred output type of that step.

   ```typescript
   const buildSlidesStep = createStep({ id: 'build-slides', outputSchema: z.object({...}), ... });
   const renderDiagramsStep = createStep({ id: 'render-diagrams', outputSchema: z.object({...}), ... });

   workflow
     .then(designerStep)
     .parallel([buildSlidesStep, renderDiagramsStep] as const)
     .map(async ({ inputData }) => {
       // inputData is { 'build-slides': BuildSlidesOutput, 'render-diagrams': RenderDiagramsOutput }
       const slides = inputData['build-slides'];
       const diagrams = inputData['render-diagrams'];
       return { slides, diagrams };
     })
   ```

3. **Type constraint**: Each parallel step's `stateSchema` must be a `SubsetOf` the workflow's state schema. This is enforced at the type level — mismatches produce a compile-time error string.

4. **Suspend/Resume**: The type comments explicitly say "Don't infer TResume/TSuspend — causes issues with heterogeneous tuples." This means **suspend/resume within parallel branches has unclear type safety**. Recommendation: avoid `suspend()` inside parallel steps. Story 5.4 (optional slide review gate) should run *after* the parallel block, not inside it.

5. **Error handling**: If any parallel step throws, the entire parallel block fails. There is no built-in per-branch error recovery. For Story 5.3 AC (placeholder on optional asset failure), use try/catch *inside* each step's `execute` function.

6. **`as const` is required**: The `readonly` constraint on the steps array means you must pass `[step1, step2] as const` for TypeScript to infer the tuple types correctly. Without `as const`, step IDs collapse to `string` and result keys lose type safety.

### Result Access Pattern (StepsRecord)

```typescript
// StepsRecord maps step IDs to Step definitions:
type StepsRecord<T extends readonly Step[]> = {
  [K in T[number]['id']]: Extract<T[number], { id: K }>;
};
```

The next step after `.parallel()` receives `inputData` typed as:
```typescript
{ [stepId: string]: InferZodLikeSchema<step.outputSchema> }
```

### Composition with Existing Workflow

Current `slidewreck.ts` uses `.then()` → `.map()` → `.then()` chains. The parallel block inserts naturally:

```typescript
// After writerStep + reviewScriptGate, before eval/save:
.then(designerStep)           // produces DeckSpec
.parallel([                   // FR-11: concurrent asset creation
  buildSlidesStep,
  renderDiagramsStep,
] as const)
.map(async ({ inputData }) => {
  // merge parallel results
})
```

### Gotchas

- **No `.map()` inside `.parallel()`** — each parallel branch is a single step. If you need to transform before a parallel step, use `.map()` *before* `.parallel()`.
- **State writes in parallel**: Multiple steps calling `setState()` concurrently may race. Avoid concurrent state writes; use step outputs instead.
- **Step ID uniqueness**: All step IDs across the entire workflow must be unique. Parallel steps sharing an ID will cause runtime key collisions.

---

## 2. `@mermaid-js/mermaid-cli` Headless Rendering

### Package Info

- **Version:** 11.12.0 (latest)
- **Binary:** `mmdc`
- **Type:** ESM (`"type": "module"`)
- **Peer dependency:** `puppeteer@^23` (Chromium headless browser)

### Programmatic API (Verified from Types)

Two key exports:

#### `run()` — File-based rendering

```typescript
import { run } from '@mermaid-js/mermaid-cli';

await run(
  'input.mmd',           // input file path (or undefined for stdin)
  'output.svg',          // output file path
  {
    puppeteerConfig: {},  // Puppeteer LaunchOptions
    quiet: true,          // suppress logs
    outputFormat: 'svg',  // 'svg' | 'png' | 'pdf'
    parseMMDOptions: {
      backgroundColor: 'transparent',
      mermaidConfig: { theme: 'neutral' },
    },
  }
);
```

#### `renderMermaid()` — In-memory rendering (preferred for our tool)

```typescript
import { renderMermaid } from '@mermaid-js/mermaid-cli';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const { title, desc, data } = await renderMermaid(
  browser,
  'graph TD\n  A-->B',   // Mermaid definition string
  'svg',                  // output format
  {
    backgroundColor: 'transparent',
    mermaidConfig: { theme: 'neutral' },
  }
);
// data is Uint8Array — convert to string for SVG
const svg = new TextDecoder().decode(data);
await browser.close();
```

### Recommendations for `renderMermaid` Tool

1. **Use `renderMermaid()` (in-memory)**, not `run()` (file-based). Avoids temp file I/O and gives direct `Uint8Array` output.
2. **Browser lifecycle**: Launch puppeteer once at tool initialization, reuse across multiple diagram renders in the parallel step, close on completion. Do NOT launch a new browser per diagram.
3. **Puppeteer headless mode**: `puppeteer.launch({ headless: true })` — default "new headless" mode in puppeteer 23+. No `--no-sandbox` flag needed for local dev.
4. **Error handling**: Invalid Mermaid syntax throws from `renderMermaid()`. Wrap in try/catch and return the error message (Story 5.2 AC: "returns an error with the syntax issue identified").
5. **SVG output**: For slide specs, SVG is the right format — scalable, small, embeddable in HTML/Markdown.

### Installation Requirements

```bash
pnpm add -D @mermaid-js/mermaid-cli
# puppeteer is a peer dep — installs automatically with mermaid-cli
# puppeteer downloads Chromium on first install (~200MB)
```

### CI/Docker Considerations

- Puppeteer needs Chromium. In CI, use `puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })`.
- The project's existing `Dockerfile` (if any) would need Chromium deps. For now, local dev only.
- **Alternative considered:** `mermaid-isomorphic` (uses Playwright instead of Puppeteer). Rejected — `@mermaid-js/mermaid-cli` is the official tool and `renderMermaid()` is well-typed.

### ESM Import Caveat

`@mermaid-js/mermaid-cli` is ESM-only (`"type": "module"`). The project uses `"module": "nodenext"` in tsconfig, so ESM imports work. But the tool file must use `import`, not `require`. Verify with a quick smoke test before story dev.

---

## 3. DeckSpec Schema Design

### Requirements from Story 5.1

The Designer agent produces `DeckSpec JSON` with:
- Per-slide content
- Layout type
- Speaker note reference
- Diagram indicators

### Proposed Schema

```typescript
import { z } from 'zod';

export const SlideLayoutEnum = z.enum([
  'title',          // Title slide with subtitle
  'content',        // Main content area
  'split',          // Two-column layout
  'image',          // Full-bleed image/diagram
  'quote',          // Centered quote
  'code',           // Code snippet with syntax highlighting
  'comparison',     // Side-by-side comparison
  'diagram',        // Mermaid diagram placeholder
  'closing',        // Final slide / call to action
]);

export const DiagramSpecSchema = z.object({
  type: z.enum(['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'pie', 'mindmap']),
  description: z.string().describe('Natural language description for Mermaid generation'),
  mermaidSyntax: z.string().optional().describe('Pre-generated Mermaid syntax. Absent until diagram generation step.'),
  svgPath: z.string().optional().describe('Path to rendered SVG file. Absent until render step.'),
});

export const SlideSpecSchema = z.object({
  slideNumber: z.number().int().positive(),
  title: z.string().describe('Slide title text'),
  layout: SlideLayoutEnum,
  content: z.string().describe('Primary slide content (one idea per slide, no bullet points)'),
  speakerNoteRef: z.string().describe('Reference anchor to corresponding section in speaker notes'),
  diagram: DiagramSpecSchema.optional().describe('Diagram specification if this slide contains a visual. Absent for non-diagram slides.'),
  colourAccent: z.string().optional().describe('Hex colour accent for this slide. Absent to use palette default.'),
});

export const DeckSpecSchema = z.object({
  title: z.string().describe('Presentation title'),
  subtitle: z.string().optional().describe('Presentation subtitle. Absent if none.'),
  colourPalette: z.object({
    primary: z.string().describe('Primary colour hex'),
    secondary: z.string().describe('Secondary colour hex'),
    accent: z.string().describe('Accent colour hex'),
    background: z.string().describe('Background colour hex'),
    text: z.string().describe('Text colour hex'),
  }),
  slides: z.array(SlideSpecSchema).min(1),
  diagramCount: z.number().int().min(0).describe('Total number of slides with diagram indicators'),
});

export type DeckSpec = z.infer<typeof DeckSpecSchema>;
export type SlideSpec = z.infer<typeof SlideSpecSchema>;
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;
```

### Design Decisions

1. **`speakerNoteRef`**: A string anchor (e.g., `"section-intro"`, `"section-2-demo"`) that maps back to the writer's script sections. Avoids duplicating speaker notes in the DeckSpec.
2. **`diagram` optional field**: Only slides with `layout: 'diagram'` (or occasionally `'split'`) will have this. The diagram generation step fills in `mermaidSyntax` and the render step fills in `svgPath`.
3. **One idea per slide**: Enforced by the Designer agent's system prompt, not the schema. The schema allows flexible content but the prompt constrains it.
4. **Colour palette at deck level**: Applied globally, with optional per-slide `colourAccent` overrides.

---

## 4. New Tool Patterns

### Tools Required (from Stories 5.1 and 5.2)

| Tool | File | Input | Output | Notes |
|------|------|-------|--------|-------|
| `suggestLayout` | `suggest-layout.ts` | slide content + type | recommended `SlideLayoutEnum` value | Pure heuristic, no LLM |
| `generateColourPalette` | `generate-colour-palette.ts` | topic + tone | `ColourPalette` object | LLM-based (Haiku tier) |
| `generateMermaid` | `generate-mermaid.ts` | natural language description | Mermaid syntax string | LLM-based (Sonnet tier) |
| `renderMermaid` | `render-mermaid.ts` | Mermaid syntax string | SVG content or file path | Puppeteer-based, no LLM |
| `buildSlides` | `build-slides.ts` | DeckSpec JSON | slide output in configured format | Assembler, no LLM |

### Tool Pattern Observations

- `suggestLayout`: Follows existing heuristic tool pattern (like `wordCountToTime`, `checkJargon`). No external deps.
- `generateColourPalette`: Similar to existing agent-tool pattern but uses LLM directly. Can use `createTool` with `execute` that calls a model. Check if Mastra's `createTool` supports model calls inside `execute` (yes — tools are plain async functions).
- `generateMermaid`: LLM tool — agent generates Mermaid syntax from description. Must validate output is parseable Mermaid before returning.
- `renderMermaid`: External dep tool (puppeteer). Needs browser lifecycle management. Consider a singleton browser instance.
- `buildSlides`: Assembler — takes DeckSpec + rendered SVGs and produces final output. Format TBD (HTML, Reveal.js, Markdown).

### Browser Singleton Pattern for renderMermaid

```typescript
import puppeteer, { type Browser } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({ headless: true });
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
```

Call `closeBrowser()` after the parallel block completes (in the `.map()` step that merges results).

---

## 5. Parallel Execution Testing Strategy

### Challenge

Testing `.parallel()` requires verifying:
1. Steps execute concurrently (not sequentially)
2. Results are correctly keyed by step ID
3. Error in one branch doesn't silently corrupt other results
4. Workflow state is consistent after parallel completion

### Approach: Mock Steps with Timing Assertions

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { describe, it, expect } from 'vitest';

const slowStep = createStep({
  id: 'slow-step',
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    await new Promise(r => setTimeout(r, 200)); // 200ms
    return { result: `slow-${inputData.value}` };
  },
});

const fastStep = createStep({
  id: 'fast-step',
  inputSchema: z.object({ value: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ inputData }) => {
    await new Promise(r => setTimeout(r, 100)); // 100ms
    return { result: `fast-${inputData.value}` };
  },
});

describe('parallel execution', () => {
  it('runs steps concurrently (total time < sum of individual times)', async () => {
    const workflow = createWorkflow({ id: 'parallel-test', inputSchema: z.object({ value: z.string() }) })
      .parallel([slowStep, fastStep] as const)
      .commit();

    const start = Date.now();
    const result = await workflow.createRun().start({ inputData: { value: 'test' } });
    const elapsed = Date.now() - start;

    // If sequential: ~300ms. If parallel: ~200ms.
    expect(elapsed).toBeLessThan(280); // generous margin
    expect(result.status).toBe('completed');
    // Result keyed by step ID
    expect(result.steps['slow-step'].output).toEqual({ result: 'slow-test' });
    expect(result.steps['fast-step'].output).toEqual({ result: 'fast-test' });
  });

  it('captures error in one branch while other completes', async () => {
    const failingStep = createStep({
      id: 'failing-step',
      inputSchema: z.object({ value: z.string() }),
      outputSchema: z.object({ result: z.string() }),
      execute: async () => { throw new Error('intentional failure'); },
    });

    const workflow = createWorkflow({ id: 'parallel-error-test', inputSchema: z.object({ value: z.string() }) })
      .parallel([fastStep, failingStep] as const)
      .commit();

    const result = await workflow.createRun().start({ inputData: { value: 'test' } });
    expect(result.status).toBe('failed');
    // Verify the successful step still has output
    // (depends on Mastra's error propagation — verify during implementation)
  });
});
```

### Testing `renderMermaid` Tool

```typescript
describe('renderMermaid tool', () => {
  it('renders valid Mermaid to SVG', async () => {
    const result = await renderMermaidTool.execute({
      mermaidSyntax: 'graph TD\n  A[Start] --> B[End]',
    });
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('Start');
  });

  it('returns error for invalid syntax', async () => {
    const result = await renderMermaidTool.execute({
      mermaidSyntax: 'not valid mermaid',
    });
    expect(result.error).toBeDefined();
    expect(result.svg).toBeUndefined();
  });
});
```

### Testing Strategy Summary

| What | How | Dependencies |
|------|-----|-------------|
| `.parallel()` concurrency | Timing assertions with mock steps | InMemoryStore |
| Parallel result merging | Assert step ID keys in output | InMemoryStore |
| Error isolation in parallel | Failing step + passing step combo | InMemoryStore |
| `renderMermaid` tool | Real puppeteer (integration test) | puppeteer, @mermaid-js/mermaid-cli |
| `suggestLayout` tool | Unit test with layout heuristics | None |
| `generateMermaid` tool | Mock LLM, validate Mermaid output | Mock agent |
| DeckSpec schema | Zod `.parse()` on fixtures | None |
| Full parallel pipeline | End-to-end with mock Designer output | InMemoryStore + puppeteer |

### CI Note

Tests requiring puppeteer (renderMermaid) should be tagged or in a separate test file so they can be skipped in environments without Chromium. Use Vitest's `describe.skipIf(!process.env.PUPPETEER_AVAILABLE)` or similar.

---

## 6. Impact on Epic 5 Stories

| Story | Assumption in Spec | Verified Behaviour | Required Change |
|-------|-------------------|-------------------|-----------------|
| 5.1 | Designer produces DeckSpec JSON | Schema must be defined as Zod (project convention) | Add `DeckSpecSchema` to `src/mastra/schemas/deck-spec.ts` |
| 5.1 | `suggestLayout` and `generateColourPalette` tools | Standard tool pattern, no API surprises | None |
| 5.2 | `@mermaid-js/mermaid-cli` renders to SVG | Confirmed: `renderMermaid()` function returns `Uint8Array` | Use programmatic API, not CLI binary |
| 5.2 | Mermaid CLI is a dev dependency | It also needs `puppeteer@^23` as peer dep | Install both: `pnpm add -D @mermaid-js/mermaid-cli puppeteer` |
| 5.3 | `.parallel()` for concurrent asset creation | API exists, returns object keyed by step ID | Use `as const` for tuple inference; avoid suspend inside parallel |
| 5.3 | Optional asset failure → placeholder | No built-in per-branch error recovery | Try/catch inside each step's `execute` |
| 5.3 | Overlapping timestamps confirm concurrency | Use timing assertions in tests | Add timing-based parallel test |
| 5.4 | Review gate inside parallel block | Suspend/resume types not inferred in parallel | Move review gate AFTER parallel block |

## 7. Recommendations

1. **Story 5.4 restructure**: The optional slide review gate must run *after* `.parallel()`, not inside it. Suspend/resume type inference is explicitly disabled in parallel branches.

2. **Browser lifecycle**: Create a shared browser module (`src/mastra/config/browser.ts`) with lazy init + cleanup. The parallel step's merge `.map()` should call `closeBrowser()`.

3. **ESM compatibility**: Verify `@mermaid-js/mermaid-cli` ESM imports work with the project's tsconfig before starting Story 5.2. Quick smoke test:
   ```typescript
   import { renderMermaid } from '@mermaid-js/mermaid-cli';
   ```

4. **DeckSpec schema location**: `src/mastra/schemas/deck-spec.ts` — follows existing schema organization pattern.

5. **Model tier for Designer**: Sonnet (per architecture doc). `generateMermaid` tool can also use Sonnet. `suggestLayout` is heuristic (no model). `generateColourPalette` can use Haiku (simple creative task).

6. **Parallel step IDs**: Use descriptive, unique IDs: `'build-slides'`, `'render-diagrams'`. These become the keys in the result object.

7. **Testing**: Use `InMemoryStore` from `@mastra/core/storage` for workflow tests (existing pattern). Puppeteer-based tests are integration tests — consider a separate test file or skip flag.
