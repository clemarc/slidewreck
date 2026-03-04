import { z } from 'zod';

export const ScorecardEntrySchema = z.object({
  scorerId: z.string().min(1).describe('ID of the scorer that produced this result'),
  score: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .describe('Score from 1-5. Absent when scorer failed.'),
  reason: z
    .string()
    .optional()
    .describe('Explanation and recommendations. Absent when scorer failed.'),
  status: z.enum(['success', 'error']).describe('Whether the scorer completed successfully'),
  error: z
    .string()
    .optional()
    .describe('Error message when scorer failed. Absent on success.'),
});

export type ScorecardEntry = z.infer<typeof ScorecardEntrySchema>;

export const TrendEntrySchema = z.object({
  scorerId: z.string().describe('ID of the scorer'),
  latestScore: z.number().describe('Most recent score'),
  previousAverage: z.number().describe('Average of all prior scores'),
  trend: z.enum(['improving', 'stable', 'declining']).describe('Direction of score change'),
  dataPoints: z.number().describe('Total number of data points for this scorer'),
});

export const TrendAnalysisSchema = z.object({
  entries: z.array(TrendEntrySchema).describe('Trend data per scorer'),
  sessionCount: z.number().describe('Number of sessions analyzed'),
});

export type TrendAnalysisResult = z.infer<typeof TrendAnalysisSchema>;

export const ScorecardSchema = z.object({
  entries: z.array(ScorecardEntrySchema).describe('Results from each scorer'),
  overallScore: z
    .number()
    .optional()
    .describe('Average score across successful scorers. Absent when all failed.'),
  timestamp: z.string().describe('ISO 8601 timestamp when the eval suite ran'),
  trends: TrendAnalysisSchema
    .optional()
    .describe('Score trend analysis across sessions. Absent when fewer than 3 sessions exist.'),
});

export type Scorecard = z.infer<typeof ScorecardSchema>;
