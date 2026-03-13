import { z } from 'zod';
import { ResearcherOutputSchema } from '../agents/researcher';
import { WriterOutputSchema } from '../agents/writer';
import { DeckSpecSchema } from './deck-spec';
import { DiagramResultSchema } from './diagram-result';
import { WorkflowInputSchema } from './workflow-input';
import { ScorecardSchema } from './scorecard';

const WorkflowMetadataSchema = z.object({
  workflowRunId: z.string().describe('Unique identifier for the workflow run'),
  completedAt: z.string().describe('ISO 8601 timestamp of when the pipeline completed'),
  input: WorkflowInputSchema.describe('The original input that started this pipeline run'),
  outputFilePath: z.string().optional().describe('Absolute path to the saved presentation file. Absent if file save failed.'),
});

/**
 * Final output schema for the Slidewreck pipeline.
 * Composes the research brief and speaker script from their respective agents,
 * plus metadata about the pipeline run.
 */
export const WorkflowOutputSchema = z.object({
  researchBrief: ResearcherOutputSchema.describe('Research brief produced by the Researcher agent'),
  speakerScript: WriterOutputSchema.describe('Speaker script produced by the Writer agent'),
  deckSpec: DeckSpecSchema.optional().describe('Slide specifications from the Designer agent. Absent if designer step not yet integrated.'),
  slideMarkdown: z.string().optional().describe('Rendered slide Markdown. Absent if asset pipeline not yet integrated.'),
  diagrams: z.array(DiagramResultSchema).optional().describe('Rendered diagram SVGs. Absent if no diagrams in deck.'),
  scorecard: ScorecardSchema.optional().describe('Quality evaluation scorecard. Absent if eval suite was skipped or not yet implemented.'),
  metadata: WorkflowMetadataSchema.describe('Pipeline run metadata'),
});

export type WorkflowOutput = z.infer<typeof WorkflowOutputSchema>;
