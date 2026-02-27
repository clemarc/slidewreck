import { z } from 'zod';

export const TalkFormatEnum = z.enum(['lightning', 'standard', 'keynote']);

export const WorkflowInputSchema = z.object({
  topic: z.string().min(1).describe('The talk topic as free-text (e.g., "Building Resilient Microservices")'),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']).describe('Target audience technical level'),
  format: TalkFormatEnum.describe('Talk format determining target duration'),
});

export type WorkflowInput = z.infer<typeof WorkflowInputSchema>;

type FormatDurationRange = { readonly minMinutes: number; readonly maxMinutes: number };

/**
 * Duration ranges for each talk format, in minutes.
 * Used by agents (Writer, Architect) to target correct script length.
 */
export const FORMAT_DURATION_RANGES: Record<WorkflowInput['format'], FormatDurationRange> = {
  lightning: { minMinutes: 5, maxMinutes: 10 },
  standard: { minMinutes: 25, maxMinutes: 45 },
  keynote: { minMinutes: 45, maxMinutes: 60 },
} as const;
