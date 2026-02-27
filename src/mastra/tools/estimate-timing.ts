import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { FORMAT_DURATION_RANGES, type WorkflowInput } from '../schemas/workflow-input';

const DEFAULT_WPM = 150;

const SectionInputSchema = z.object({
  title: z.string().min(1).describe('Section title'),
  contentWordCount: z.number().min(0).describe('Estimated word count for this section'),
});

export const estimateTiming = createTool({
  id: 'estimate-timing',
  description:
    'Calculate per-section timing estimates for a talk structure based on word counts and speaking pace. Returns whether the total fits within the target duration range for the given talk format.',
  inputSchema: z.object({
    sections: z.array(SectionInputSchema).describe('Sections with title and estimated word count'),
    format: z
      .enum(['lightning', 'standard', 'keynote'])
      .describe('Talk format determining target duration range'),
    wordsPerMinute: z
      .number()
      .positive()
      .optional()
      .describe('Speaking pace in words per minute (default: 150 for conference talks)'),
  }),
  outputSchema: z.object({
    sectionTimings: z
      .array(
        z.object({
          title: z.string().describe('Section title'),
          estimatedMinutes: z.number().describe('Estimated speaking duration for this section'),
        }),
      )
      .describe('Per-section timing breakdown'),
    totalMinutes: z.number().describe('Total estimated speaking duration in minutes'),
    targetRange: z.object({
      min: z.number().describe('Minimum target duration in minutes'),
      max: z.number().describe('Maximum target duration in minutes'),
    }),
    isWithinRange: z.boolean().describe('Whether total duration falls within the target range'),
  }),
  execute: async ({ sections, format, wordsPerMinute }) => {
    const wpm = wordsPerMinute ?? DEFAULT_WPM;
    const range = FORMAT_DURATION_RANGES[format as WorkflowInput['format']];

    const sectionTimings = sections.map((section) => ({
      title: section.title,
      estimatedMinutes: section.contentWordCount / wpm,
    }));

    const totalMinutes = sectionTimings.reduce((sum, s) => sum + s.estimatedMinutes, 0);
    const isWithinRange = totalMinutes >= range.minMinutes && totalMinutes <= range.maxMinutes;

    return {
      sectionTimings,
      totalMinutes,
      targetRange: { min: range.minMinutes, max: range.maxMinutes },
      isWithinRange,
    };
  },
});
