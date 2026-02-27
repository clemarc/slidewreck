import { createWorkflow, createStep } from '@mastra/core/workflows';
import { researcher, ResearcherOutputSchema } from '../agents/researcher';
import { writer, WriterOutputSchema } from '../agents/writer';
import {
  WorkflowInputSchema,
  FORMAT_DURATION_RANGES,
  type WorkflowInput,
} from '../schemas/workflow-input';
import { WorkflowOutputSchema } from '../schemas/workflow-output';
import { createReviewGateStep } from './gates/review-gate';

// Agent steps with structured output (AC: #1, #7)
const researcherStep = createStep(researcher, {
  structuredOutput: { schema: ResearcherOutputSchema },
  retries: 3,
});

const writerStep = createStep(writer, {
  structuredOutput: { schema: WriterOutputSchema },
  retries: 3,
});

// Human gate steps (AC: #2, #4)
const reviewResearchGate = createReviewGateStep({
  gateId: 'review-research',
  agentId: 'researcher',
  summary: 'Research brief ready for review',
});

const reviewScriptGate = createReviewGateStep({
  gateId: 'review-script',
  agentId: 'script-writer',
  summary: 'Speaker script ready for review',
});

// Workflow composition (AC: #1, #3, #5)
export const slidewreck = createWorkflow({
  id: 'slidewreck',
  inputSchema: WorkflowInputSchema,
  outputSchema: WorkflowOutputSchema,
})
  .map(async ({ inputData }) => {
    const { topic, audienceLevel, format, constraints } = inputData;
    const duration = FORMAT_DURATION_RANGES[format];
    return {
      prompt: `Research the following conference talk topic and produce a comprehensive research brief.

Topic: ${topic}
Audience Level: ${audienceLevel}
Format: ${format} (${duration.minMinutes}-${duration.maxMinutes} minutes)${constraints ? `\nSpeaker Constraints: ${constraints}` : ''}

Focus on finding:
- Current trends and data related to this topic
- Existing talks and presentations on similar subjects
- Relevant statistics and data points
- Unique angles that would make this talk stand out
- High-quality sources with URLs for attribution`,
    };
  })
  .then(researcherStep)
  .then(reviewResearchGate)
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const gateResult = inputData;
    const researchBrief = getStepResult(researcherStep);
    const initData = getInitData<WorkflowInput>();
    const { format, audienceLevel } = initData;
    const duration = FORMAT_DURATION_RANGES[format];
    const feedback = gateResult.feedback ?? '';

    return {
      prompt: `Write a complete conference talk script based on the following research brief and speaker feedback.

## Research Brief
${JSON.stringify(researchBrief, null, 2)}

## Speaker Feedback
${feedback || 'No specific feedback provided. Proceed with the research as-is.'}

## Requirements
- Audience Level: ${audienceLevel}
- Target Duration: ${duration.minMinutes}-${duration.maxMinutes} minutes
- Include timing markers at key transitions
- Add [PAUSE], [ASK AUDIENCE], and [EMPHASIS] markers
- Write a strong opening hook and clear call to action
- Use the wordCountToTime tool to verify duration
- Use the checkJargon tool to verify language is appropriate for ${audienceLevel} audience`,
    };
  })
  .then(writerStep)
  .then(reviewScriptGate)
  .map(async ({ runId, getStepResult, getInitData }) => {
    const researchBrief = getStepResult(researcherStep);
    const speakerScript = getStepResult(writerStep);
    const initData = getInitData<WorkflowInput>();

    return {
      researchBrief,
      speakerScript,
      metadata: {
        workflowRunId: runId,
        completedAt: new Date().toISOString(),
        input: initData,
      },
    };
  })
  .commit();
