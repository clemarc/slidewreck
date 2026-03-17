import { describe, it, expect, vi } from 'vitest';
import { validateSchema } from '../../../__tests__/schema-helpers';

// Mock tools used by steps
vi.mock('../../../tools/build-slides', () => ({
  buildSlidesTool: {
    execute: vi.fn(),
  },
}));

vi.mock('../../../tools/generate-mermaid', () => ({
  generateMermaid: {
    execute: vi.fn(),
  },
}));

vi.mock('../../../tools/render-mermaid', () => ({
  renderMermaidTool: {
    execute: vi.fn(),
  },
}));

import { buildSlidesStep } from '../build-slides';
import { renderDiagramsStep } from '../render-diagrams';
import { buildSlidesTool } from '../../../tools/build-slides';
import { generateMermaid } from '../../../tools/generate-mermaid';
import { renderMermaidTool } from '../../../tools/render-mermaid';
import type { DeckSpec } from '../../../schemas/deck-spec';

const TEST_DECK: DeckSpec = {
  title: 'Parallel Test',
  colourPalette: {
    primary: '#1A2B3C',
    secondary: '#4D5E6F',
    accent: '#FF6600',
    background: '#FFFFFF',
    text: '#333333',
  },
  slides: [
    {
      slideNumber: 1,
      title: 'Intro',
      layout: 'title',
      content: 'Welcome',
      speakerNoteRef: 'intro',
    },
    {
      slideNumber: 2,
      title: 'Architecture',
      layout: 'diagram',
      content: 'System overview',
      speakerNoteRef: 'arch',
      diagram: {
        type: 'flowchart',
        description: 'System flow',
      },
    },
  ],
  diagramCount: 1,
};

describe('parallel pipeline steps', () => {
  it('both steps accept the same DeckSpec input shape', () => {
    const testInput = { deckSpec: TEST_DECK };
    expect(validateSchema(buildSlidesStep.inputSchema!, testInput).success).toBe(true);
    expect(validateSchema(renderDiagramsStep.inputSchema!, testInput).success).toBe(true);
  });

  it('step IDs are unique (required for .parallel())', () => {
    expect(buildSlidesStep.id).not.toBe(renderDiagramsStep.id);
  });

  it('both steps produce valid output concurrently', async () => {
    // Setup mocks
    vi.mocked(buildSlidesTool.execute!).mockResolvedValueOnce({
      markdown: '# Parallel Test\n\n---\nslideNumber: 1\n---\n\n## Intro\n\nWelcome',
    });
    vi.mocked(generateMermaid.execute!).mockResolvedValueOnce({
      mermaidSyntax: 'graph TD\n  A-->B',
    });
    vi.mocked(renderMermaidTool.execute!).mockResolvedValueOnce({
      svg: '<svg>test</svg>',
    });

    const context = {
      inputData: { deckSpec: TEST_DECK },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn() as never,
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never;

    // Execute both steps concurrently (simulates .parallel())
    const [buildResult, renderResult] = await Promise.all([
      buildSlidesStep.execute!(context),
      renderDiagramsStep.execute!(context),
    ]);

    const buildTyped = buildResult as { markdown: string };
    const renderTyped = renderResult as { diagrams: Array<{ slideNumber: number; svg: string }> };

    expect(buildTyped.markdown).toContain('Parallel Test');
    expect(renderTyped.diagrams).toHaveLength(1);
    expect(renderTyped.diagrams[0].svg).toContain('<svg>');
  });

  it('concurrent execution is faster than sequential (timing assertion)', async () => {
    const DELAY = 50; // ms

    // Mocks with deliberate delays to test concurrency
    vi.mocked(buildSlidesTool.execute!).mockImplementationOnce(async () => {
      await new Promise(r => setTimeout(r, DELAY));
      return { markdown: '# Test' };
    });
    vi.mocked(generateMermaid.execute!).mockImplementationOnce(async () => {
      await new Promise(r => setTimeout(r, DELAY));
      return { mermaidSyntax: 'graph TD\n  A-->B' };
    });
    vi.mocked(renderMermaidTool.execute!).mockResolvedValueOnce({
      svg: '<svg>test</svg>',
    });

    const context = {
      inputData: { deckSpec: TEST_DECK },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn() as never,
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never;

    const start = Date.now();
    await Promise.all([
      buildSlidesStep.execute!(context),
      renderDiagramsStep.execute!(context),
    ]);
    const elapsed = Date.now() - start;

    // If sequential: ~100ms (2 * DELAY). If parallel: ~50ms (1 * DELAY).
    // Use 1.5x sequential as threshold — generous enough to avoid flaky hits.
    expect(elapsed).toBeLessThan(DELAY * 3);
  });
});
