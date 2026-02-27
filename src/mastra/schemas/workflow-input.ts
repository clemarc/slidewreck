import { z } from 'zod';

export const TalkFormatEnum = z.enum(['lightning', 'standard', 'keynote']);

export const ReferenceMaterialSchema = z.object({
  type: z.enum(['file', 'url']).describe('Source type: local file path or web URL'),
  path: z.string().min(1).describe('File path (for type=file) or URL (for type=url)'),
});

export const WorkflowInputSchema = z.object({
  topic: z.string().min(1).describe('The talk topic as free-text (e.g., "Building Resilient Microservices")'),
  audienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']).describe('Target audience technical level'),
  format: TalkFormatEnum.describe('Talk format determining target duration'),
  constraints: z
    .string()
    .min(1)
    .optional()
    .describe('Free-text speaker constraints for content generation (e.g., "Focus on observability, avoid Kubernetes"). Absent when speaker has no preferences.'),
  referenceMaterials: z
    .array(ReferenceMaterialSchema)
    .optional()
    .describe('Speaker reference materials (blog posts, docs, code samples) to incorporate. Absent when speaker has no reference materials to provide.'),
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
