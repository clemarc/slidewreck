import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { DeckSpecSchema, type DeckOutline, type SlideOutline, type DeckSpec } from '../../schemas/deck-spec';
import { designer } from '../../agents/designer';
import { ANTHROPIC_STRUCTURED_OUTPUT_OPTIONS } from '../../config/models';

// API-safe: no minLength — Anthropic output_format rejects it
const SlideContentResultSchema = z.object({
  content: z.string().describe('Primary slide content (non-empty, one idea per slide, no bullet points)'),
  diagramDescription: z.string().optional().describe('Updated diagram description if this is a diagram slide'),
});

export const DesignerContentFillInputSchema = z.object({
  deckOutline: z.custom<DeckOutline>(),
  speakerScript: z.string(),
});

export const DesignerContentFillOutputSchema = DeckSpecSchema;

export const designerContentFillStep = createStep({
  id: 'designer-content-fill',
  inputSchema: DesignerContentFillInputSchema,
  outputSchema: DesignerContentFillOutputSchema,
  execute: async ({ inputData }) => {
    const { deckOutline, speakerScript } = inputData;

    // Generate content for all slides in parallel
    const slidePromises = deckOutline.slides.map(async (slide: SlideOutline) => {
      const slidePrompt = buildSlideContentPrompt(slide, speakerScript, deckOutline.title);
      const result = await designer.generate(slidePrompt, {
        structuredOutput: { schema: SlideContentResultSchema },
        providerOptions: ANTHROPIC_STRUCTURED_OUTPUT_OPTIONS,
      });
      const { content, diagramDescription } = result.object;

      return {
        slideNumber: slide.slideNumber,
        title: slide.title,
        layout: slide.layout,
        content,
        speakerNoteRef: slide.speakerNoteRef,
        diagram: slide.diagram
          ? {
              ...slide.diagram,
              description: diagramDescription ?? slide.diagram.description,
            }
          : undefined,
        colourAccent: slide.colourAccent,
      };
    });

    const filledSlides = await Promise.all(slidePromises);

    const deckSpec: DeckSpec = {
      title: deckOutline.title,
      subtitle: deckOutline.subtitle,
      colourPalette: deckOutline.colourPalette,
      slides: filledSlides,
      diagramCount: deckOutline.diagramCount,
    };

    return DeckSpecSchema.parse(deckSpec);
  },
});

function buildSlideContentPrompt(
  slide: SlideOutline,
  speakerScript: string,
  deckTitle: string,
): string {
  const diagramNote = slide.diagram
    ? `\nThis is a DIAGRAM slide (${slide.diagram.type}). Also refine the diagram description if needed.`
    : '';

  return `You are writing content for slide ${slide.slideNumber} of the presentation "${deckTitle}".

## Slide Details
- Title: ${slide.title}
- Layout: ${slide.layout}
- Speaker Note Reference: ${slide.speakerNoteRef}${diagramNote}

## Speaker Script (for context)
${speakerScript}

## Design Rules
- ONE idea per slide — never pack multiple concepts
- NO bullet points — express as full statements, visuals, or code
- Keep text minimal — the depth lives in the speaker notes

Write the slide content. Return a JSON with:
- "content": the primary slide text (concise, one idea, no bullets)${slide.diagram ? '\n- "diagramDescription": refined natural language description for Mermaid diagram generation' : ''}`;
}
