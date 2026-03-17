import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { DeckSpecSchema } from '../../schemas/deck-spec';
import { DiagramResultSchema } from '../../schemas/diagram-result';
import { generateMermaid } from '../../tools/generate-mermaid';
import { renderMermaidTool } from '../../tools/render-mermaid';

const PLACEHOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#999">Diagram unavailable</text></svg>';

export const renderDiagramsStep = createStep({
  id: 'render-diagrams',
  inputSchema: z.object({
    deckSpec: DeckSpecSchema,
  }),
  outputSchema: z.object({
    diagrams: z.array(DiagramResultSchema),
  }),
  execute: async ({ inputData }) => {
    const { deckSpec } = inputData;
    const diagrams: Array<{ slideNumber: number; svg: string }> = [];

    for (const slide of deckSpec.slides) {
      if (!slide.diagram) continue;

      try {
        // Generate Mermaid syntax from description
        const genResult = await generateMermaid.execute!(
          { description: slide.diagram.description, diagramType: slide.diagram.type },
          {} as never,
        );

        if (!genResult || !('mermaidSyntax' in genResult)) {
          console.warn(`[render-diagrams] Slide ${slide.slideNumber}: generateMermaid returned unexpected result`);
          diagrams.push({ slideNumber: slide.slideNumber, svg: PLACEHOLDER_SVG });
          continue;
        }

        // Render Mermaid syntax to SVG
        const renderResult = await renderMermaidTool.execute!(
          { mermaidSyntax: genResult.mermaidSyntax },
          {} as never,
        );

        if (!renderResult || !('svg' in renderResult) || !renderResult.svg) {
          const error = renderResult && 'error' in renderResult ? renderResult.error : 'unknown error';
          console.warn(`[render-diagrams] Slide ${slide.slideNumber}: render failed — ${error}`);
          diagrams.push({ slideNumber: slide.slideNumber, svg: PLACEHOLDER_SVG });
          continue;
        }

        diagrams.push({ slideNumber: slide.slideNumber, svg: renderResult.svg });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[render-diagrams] Slide ${slide.slideNumber}: error — ${message}`);
        diagrams.push({ slideNumber: slide.slideNumber, svg: PLACEHOLDER_SVG });
      }
    }

    return { diagrams };
  },
});
