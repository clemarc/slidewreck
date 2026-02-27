import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { researcher, ResearcherOutputSchema } from '../agents/researcher';
import { architect, ArchitectOutputSchema, type ArchitectOutput } from '../agents/talk-architect';
import { writer, WriterOutputSchema } from '../agents/writer';
import {
  WorkflowInputSchema,
  FORMAT_DURATION_RANGES,
  type WorkflowInput,
} from '../schemas/workflow-input';
import { WorkflowOutputSchema } from '../schemas/workflow-output';
import { GateSuspendSchema, GateResumeSchema } from '../schemas/gate-payloads';
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

// Output schema for the composite architect + gate step
export const ArchitectStructureOutputSchema = z.object({
  approved: z.boolean().describe('Whether the speaker approved the structure'),
  feedback: z.string().optional().describe('Speaker feedback on the chosen structure. Absent when no feedback provided.'),
  architectOutput: ArchitectOutputSchema.describe('The approved architect output with 3 structure options'),
});

// Composite step: calls architect agent, suspends for structure review, handles loopback on rejection
const architectStructureStep = createStep({
  id: 'architect-structure',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ArchitectStructureOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ inputData, suspend, resumeData, suspendData }) => {
    // On approval, return the architect output from the last suspend payload
    if (resumeData?.approved) {
      const lastOutput = (suspendData as { output?: unknown })?.output as ArchitectOutput | undefined;
      return {
        approved: true,
        feedback: resumeData.feedback,
        architectOutput: lastOutput ?? ({ options: [] } as unknown as ArchitectOutput),
      };
    }

    // Build prompt: append rejection feedback if this is a loopback
    let prompt = inputData.prompt;
    if (resumeData && !resumeData.approved && resumeData.feedback) {
      prompt += `\n\n## Previous Feedback (speaker rejected)\n${resumeData.feedback}\nGenerate 3 NEW distinct structure options addressing this feedback.`;
    }

    // Call architect agent with structured output
    const result = await architect.generate(prompt, {
      structuredOutput: { schema: ArchitectOutputSchema },
    });
    const architectOutput = result.object;

    // Build comparison summary for UI
    const summary = architectOutput.options
      .map((opt, i) => `Option ${i + 1}: ${opt.title} — ${opt.description}`)
      .join('\n');

    // Suspend for human review
    return await suspend({
      agentId: 'talk-architect',
      gateId: 'review-structure',
      output: architectOutput,
      summary: `Structure options ready for review:\n${summary}`,
    });
  },
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

// Workflow composition
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
    const { topic, audienceLevel, format, constraints } = initData;
    const duration = FORMAT_DURATION_RANGES[format];
    const feedback = gateResult.feedback ?? '';

    return {
      prompt: `Design 3 distinct talk structure options based on the following research brief and speaker feedback.

## Research Brief
${JSON.stringify(researchBrief, null, 2)}

## Speaker Feedback on Research
${feedback || 'No specific feedback provided.'}

## Requirements
- Topic: ${topic}
- Audience Level: ${audienceLevel}
- Target Duration: ${duration.minMinutes}-${duration.maxMinutes} minutes
- Format: ${format}${constraints ? `\n- Speaker Constraints: ${constraints}` : ''}
- Each option must have a distinct narrative approach
- Use the estimateTiming tool to verify section timings fit the target duration`,
    };
  })
  .then(architectStructureStep)
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const structureResult = inputData;
    const researchBrief = getStepResult(researcherStep);
    const initData = getInitData<WorkflowInput>();
    const { audienceLevel } = initData;
    const duration = FORMAT_DURATION_RANGES[initData.format];

    return {
      prompt: `Write a complete conference talk script based on the following research brief, approved structure, and speaker feedback.

## Research Brief
${JSON.stringify(researchBrief, null, 2)}

## Approved Talk Structure
${JSON.stringify(structureResult.architectOutput, null, 2)}

## Speaker Feedback on Structure
${structureResult.feedback || 'No specific feedback provided. Use the approved structure as-is.'}

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
