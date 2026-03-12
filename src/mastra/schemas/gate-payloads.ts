import { z } from 'zod';

/**
 * Schema for the payload sent when a workflow suspends at a human gate.
 * Contains the agent output for review and a human-readable summary.
 */
export const GateSuspendSchema = z.object({
  agentId: z.string().min(1).describe('ID of the agent that produced the output (e.g., "researcher", "script-writer")'),
  gateId: z.string().min(1).describe('Gate identifier (e.g., "review-research", "review-script")'),
  output: z.unknown().describe("Agent's full structured output for review"),
  summary: z.string().min(1).describe('Human-readable summary for quick review in Studio UI'),
});

export type GateSuspendPayload = z.infer<typeof GateSuspendSchema>;

/**
 * Schema for the data provided when a user resumes a suspended gate.
 * Contains approval decision and optional feedback/edits.
 */
export const GATE_DECISIONS = ['approve', 'reject'] as const;
export type GateDecision = (typeof GATE_DECISIONS)[number];

export const GateResumeSchema = z.object({
  decision: z.enum(GATE_DECISIONS).describe('Whether the speaker approved or rejected the output'),
  feedback: z.string().optional().describe('Optional freetext guidance for the next generation step'),
  edits: z.unknown().optional().describe('Optional modified output (diff captured at Gate 3 for style learning)'),
});

export type GateResumePayload = z.infer<typeof GateResumeSchema>;
