import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { DeckOutlineSchema } from '../../schemas/deck-spec';
import { designer } from '../../agents/designer';
import { ANTHROPIC_STRUCTURED_OUTPUT_OPTIONS } from '../../config/models';

export const DesignerOutlineOutputSchema = z.object({
  deckOutline: DeckOutlineSchema,
  speakerScript: z.string().min(1),
});
export type DesignerOutlineOutput = z.infer<typeof DesignerOutlineOutputSchema>;

export const designerOutlineStep = createStep({
  id: 'designer-outline',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: DesignerOutlineOutputSchema,
  execute: async ({ inputData }) => {
    const result = await designer.generate(
      `${inputData.prompt}

IMPORTANT: In this phase, produce ONLY the deck outline — the skeleton structure.
For each slide, provide: slideNumber, title, layout, speakerNoteRef, and optionally diagram type/description and colourAccent.
Do NOT write slide content yet — that will be filled in a separate parallel step.
Return a DeckOutline JSON with title, subtitle, colourPalette, slides (without content), and diagramCount.`,
      {
        structuredOutput: { schema: DeckOutlineSchema },
        providerOptions: ANTHROPIC_STRUCTURED_OUTPUT_OPTIONS,
      },
    );

    // Extract speaker script from the original prompt for downstream content-fill
    const speakerScriptMatch = inputData.prompt.match(/## Speaker Script\n([\s\S]*?)(?=\n## (?:Talk Structure|Requirements))/);
    const speakerScript = speakerScriptMatch?.[1]?.trim() ?? '';

    return {
      deckOutline: result.object,
      speakerScript,
    };
  },
});
