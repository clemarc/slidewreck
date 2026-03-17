import { z } from 'zod';
import { createStep } from '@mastra/core/workflows';
import { GateSuspendSchema, GateResumeSchema } from '../../schemas/gate-payloads';

export interface ReviewGateConfig {
  gateId: string;
  agentId: string;
  summary: string;
}

export function createReviewGateStep(config: ReviewGateConfig) {
  return createStep({
    id: config.gateId,
    inputSchema: z.unknown(),
    outputSchema: GateResumeSchema,
    suspendSchema: GateSuspendSchema,
    resumeSchema: GateResumeSchema,
    execute: async ({ inputData, suspend, resumeData }) => {
      if (resumeData) {
        return resumeData;
      }
      return await suspend({
        agentId: config.agentId,
        gateId: config.gateId,
        output: inputData,
        summary: config.summary,
      });
    },
  });
}
