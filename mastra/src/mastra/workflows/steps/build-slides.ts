import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { DeckSpecSchema } from '../../schemas/deck-spec';
import { buildSlidesTool } from '../../tools/build-slides';

export const buildSlidesStep = createStep({
  id: 'build-slides',
  inputSchema: z.object({
    deckSpec: DeckSpecSchema,
  }),
  outputSchema: z.object({
    markdown: z.string().min(1),
  }),
  execute: async ({ inputData }) => {
    const result = await buildSlidesTool.execute!(
      { deckSpec: inputData.deckSpec },
      {} as never,
    );

    if (!result || !('markdown' in result)) {
      throw new Error('build-slides: buildSlidesTool returned unexpected result');
    }

    return { markdown: result.markdown };
  },
});
