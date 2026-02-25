import { z } from 'zod';
import { ResearcherOutputSchema } from '../agents/researcher';
import { WriterOutputSchema } from '../agents/writer';
import { WorkflowInputSchema } from './workflow-input';

const WorkflowMetadataSchema = z.object({
  workflowRunId: z.string().describe('Unique identifier for the workflow run'),
  completedAt: z.string().describe('ISO 8601 timestamp of when the pipeline completed'),
  input: WorkflowInputSchema.describe('The original input that started this pipeline run'),
});

/**
 * Final output schema for the TalkForge pipeline.
 * Composes the research brief and speaker script from their respective agents,
 * plus metadata about the pipeline run.
 */
export const WorkflowOutputSchema = z.object({
  researchBrief: ResearcherOutputSchema.describe('Research brief produced by the Researcher agent'),
  speakerScript: WriterOutputSchema.describe('Speaker script produced by the Writer agent'),
  metadata: WorkflowMetadataSchema.describe('Pipeline run metadata'),
});

export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>;
