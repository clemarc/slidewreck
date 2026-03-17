import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the tools before importing the step
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

import { renderDiagramsStep } from '../render-diagrams';
import { generateMermaid } from '../../../tools/generate-mermaid';
import { renderMermaidTool } from '../../../tools/render-mermaid';
import type { DeckSpec } from '../../../schemas/deck-spec';

const DECK_WITH_DIAGRAMS: DeckSpec = {
  title: 'Test',
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
        description: 'System architecture flow',
      },
    },
    {
      slideNumber: 3,
      title: 'Data Flow',
      layout: 'diagram',
      content: 'How data moves',
      speakerNoteRef: 'data',
      diagram: {
        type: 'sequence',
        description: 'API request sequence',
      },
    },
  ],
  diagramCount: 2,
};

const DECK_NO_DIAGRAMS: DeckSpec = {
  title: 'Simple',
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
  ],
  diagramCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('renderDiagramsStep', () => {
  it('should have id and schemas', () => {
    expect(renderDiagramsStep.id).toBe('render-diagrams');
    expect(renderDiagramsStep.inputSchema).toBeDefined();
    expect(renderDiagramsStep.outputSchema).toBeDefined();
  });

  it('should render diagrams for slides that have diagram specs', async () => {
    vi.mocked(generateMermaid.execute!).mockResolvedValueOnce({
      mermaidSyntax: 'graph TD\n  A-->B',
    });
    vi.mocked(generateMermaid.execute!).mockResolvedValueOnce({
      mermaidSyntax: 'sequenceDiagram\n  A->>B: msg',
    });
    vi.mocked(renderMermaidTool.execute!).mockResolvedValueOnce({
      svg: '<svg>flowchart</svg>',
    });
    vi.mocked(renderMermaidTool.execute!).mockResolvedValueOnce({
      svg: '<svg>sequence</svg>',
    });

    const result = await renderDiagramsStep.execute!({
      inputData: { deckSpec: DECK_WITH_DIAGRAMS },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn() as never,
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    expect(result).toBeDefined();
    const typed = result as { diagrams: Array<{ slideNumber: number; svg: string }> };
    expect(typed.diagrams).toHaveLength(2);
    expect(typed.diagrams[0].slideNumber).toBe(2);
    expect(typed.diagrams[0].svg).toContain('<svg>flowchart</svg>');
    expect(typed.diagrams[1].slideNumber).toBe(3);
    expect(typed.diagrams[1].svg).toContain('<svg>sequence</svg>');
  });

  it('should return empty diagrams array when no diagram slides exist', async () => {
    const result = await renderDiagramsStep.execute!({
      inputData: { deckSpec: DECK_NO_DIAGRAMS },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn() as never,
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    const typed = result as { diagrams: Array<{ slideNumber: number; svg: string }> };
    expect(typed.diagrams).toHaveLength(0);
    expect(generateMermaid.execute).not.toHaveBeenCalled();
    expect(renderMermaidTool.execute).not.toHaveBeenCalled();
  });

  it('should substitute placeholder SVG on render failure', async () => {
    vi.mocked(generateMermaid.execute!).mockResolvedValueOnce({
      mermaidSyntax: 'graph TD\n  A-->B',
    });
    vi.mocked(renderMermaidTool.execute!).mockResolvedValueOnce({
      error: 'Parse error in Mermaid syntax',
    });

    const singleDiagramDeck: DeckSpec = {
      ...DECK_WITH_DIAGRAMS,
      slides: [DECK_WITH_DIAGRAMS.slides[1]],
      diagramCount: 1,
    };

    const result = await renderDiagramsStep.execute!({
      inputData: { deckSpec: singleDiagramDeck },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn() as never,
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    const typed = result as { diagrams: Array<{ slideNumber: number; svg: string }> };
    expect(typed.diagrams).toHaveLength(1);
    expect(typed.diagrams[0].svg).toContain('Diagram unavailable');
  });

  it('should substitute placeholder SVG when generateMermaid fails', async () => {
    vi.mocked(generateMermaid.execute!).mockRejectedValueOnce(
      new Error('Generation failed'),
    );

    const singleDiagramDeck: DeckSpec = {
      ...DECK_WITH_DIAGRAMS,
      slides: [DECK_WITH_DIAGRAMS.slides[1]],
      diagramCount: 1,
    };

    const result = await renderDiagramsStep.execute!({
      inputData: { deckSpec: singleDiagramDeck },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn() as never,
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    const typed = result as { diagrams: Array<{ slideNumber: number; svg: string }> };
    expect(typed.diagrams).toHaveLength(1);
    expect(typed.diagrams[0].svg).toContain('Diagram unavailable');
  });
});
