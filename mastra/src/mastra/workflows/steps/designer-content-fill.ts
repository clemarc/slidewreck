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

    // Process slides in batches to avoid rate limiting
    const BATCH_SIZE = 5;
    const filledSlides = [];

    for (let i = 0; i < deckOutline.slides.length; i += BATCH_SIZE) {
      const batch = deckOutline.slides.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (slide: SlideOutline) => {
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
        }),
      );
      filledSlides.push(...batchResults);
    }

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

/**
 * Extract the speaker script section matching a speakerNoteRef.
 * Falls back to the full script if no match is found.
 */
function extractRelevantSection(speakerScript: string, speakerNoteRef: string): string {
  // Split on markdown H2 headers (## Section ...)
  const sections = speakerScript.split(/(?=^## )/m);

  // Normalize the ref for matching: "section-1-opening" → ["section", "1", "opening"]
  const refTokens = speakerNoteRef.toLowerCase().split('-');

  for (const section of sections) {
    const headerLine = section.split('\n')[0].toLowerCase();
    // Check if enough ref tokens appear in the header to consider it a match
    const matchCount = refTokens.filter((t) => headerLine.includes(t)).length;
    if (matchCount >= Math.ceil(refTokens.length * 0.6)) {
      return section.trim();
    }
  }

  // Fallback: return a truncated version to stay within token budget
  return speakerScript.slice(0, 2000) + '\n\n[... truncated for brevity ...]';
}

function buildSlideContentPrompt(
  slide: SlideOutline,
  speakerScript: string,
  deckTitle: string,
): string {
  const diagramNote = slide.diagram
    ? `\nThis is a DIAGRAM slide (${slide.diagram.type}). Also refine the diagram description if needed.`
    : '';

  const relevantScript = extractRelevantSection(speakerScript, slide.speakerNoteRef);

  return `You are writing content for slide ${slide.slideNumber} of the presentation "${deckTitle}".

## Slide Details
- Title: ${slide.title}
- Layout: ${slide.layout}
- Speaker Note Reference: ${slide.speakerNoteRef}${diagramNote}

## Relevant Speaker Script Section
${relevantScript}

## Design Rules
- ONE idea per slide — never pack multiple concepts
- NO bullet points — express as full statements, visuals, or code
- Keep text minimal — the depth lives in the speaker notes

Write the slide content. Return a JSON with:
- "content": the primary slide text (concise, one idea, no bullets)${slide.diagram ? '\n- "diagramDescription": refined natural language description for Mermaid diagram generation' : ''}`;
}
