import { createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { DeckSpecSchema } from '../../schemas/deck-spec';
import { GateSuspendSchema, GATE_DECISIONS } from '../../schemas/gate-payloads';
import type { WorkflowInput } from '../../schemas/workflow-input';

const ReviewSlidesOutputSchema = z.object({
  decision: z.enum(GATE_DECISIONS),
  feedback: z.string().optional(),
  deckSpec: DeckSpecSchema,
});

const ReviewSlidesResumeSchema = z.object({
  decision: z.enum(GATE_DECISIONS),
  feedback: z.string().optional(),
  deckSpec: DeckSpecSchema.optional(),
});

export const reviewSlidesStep = createStep({
  id: 'review-slides',
  inputSchema: z.object({
    deckSpec: DeckSpecSchema,
  }),
  outputSchema: ReviewSlidesOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: ReviewSlidesResumeSchema,
  execute: async ({ inputData, suspend, resumeData, getInitData }) => {
    // On resume, pass through the approval with deckSpec
    if (resumeData) {
      return {
        decision: resumeData.decision,
        feedback: resumeData.feedback,
        deckSpec: resumeData.deckSpec ?? inputData.deckSpec,
      };
    }

    const initData = getInitData<WorkflowInput>();

    // Auto-approve when reviewSlides is false or undefined (default)
    if (!initData.reviewSlides) {
      return {
        decision: 'approve' as const,
        deckSpec: inputData.deckSpec,
      };
    }

    // Manual review: suspend with DeckSpec in payload
    const slideCount = inputData.deckSpec.slides.length;
    return await suspend({
      agentId: 'designer',
      gateId: 'review-slides',
      output: inputData.deckSpec,
      summary: `Slide deck ready for review: ${inputData.deckSpec.title} (${slideCount} slides)`,
    });
  },
});
