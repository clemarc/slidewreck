import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const DEFAULT_WPM = 150;

export const wordCountToTime = createTool({
  id: 'word-count-to-time',
  description: 'Calculate estimated speaking duration from word count at a given speaking pace. Use this to verify a script fits within the target talk duration.',
  inputSchema: z.object({
    text: z.string().describe('The text content to measure'),
    wordsPerMinute: z.number().positive().optional().describe('Speaking pace in words per minute (default: 150 for conference talks)'),
  }),
  outputSchema: z.object({
    wordCount: z.number().describe('Total number of words'),
    estimatedMinutes: z.number().describe('Estimated speaking duration in minutes'),
    estimatedSeconds: z.number().describe('Estimated speaking duration in seconds'),
    wordsPerMinute: z.number().describe('The WPM rate used for calculation'),
  }),
  execute: async ({ text, wordsPerMinute }) => {
    const wpm = wordsPerMinute ?? DEFAULT_WPM;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = text.trim() === '' ? 0 : words.length;
    const estimatedMinutes = wordCount === 0 ? 0 : wordCount / wpm;
    const estimatedSeconds = estimatedMinutes * 60;

    return {
      wordCount,
      estimatedMinutes,
      estimatedSeconds,
      wordsPerMinute: wpm,
    };
  },
});
