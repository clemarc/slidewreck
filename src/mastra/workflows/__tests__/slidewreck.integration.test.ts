import { describe, it, expect, beforeAll } from 'vitest';
import { Mastra } from '@mastra/core';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { InMemoryStore } from '@mastra/core/storage';
import { z } from 'zod';
import { ResearcherOutputSchema, type ResearcherOutput } from '../../agents/researcher';
import { WriterOutputSchema, type WriterOutput } from '../../agents/writer';
import {
  WorkflowInputSchema,
  FORMAT_DURATION_RANGES,
  type WorkflowInput,
} from '../../schemas/workflow-input';
import { WorkflowOutputSchema } from '../../schemas/workflow-output';
import { GateSuspendSchema } from '../../schemas/gate-payloads';
import { createReviewGateStep } from '../gates/review-gate';

// --- Mock fixtures matching agent output schemas exactly ---

const mockResearcherOutput: ResearcherOutput = {
  keyFindings: [
    { finding: 'Microservices adoption grew 40% YoY', source: 'https://example.com/report', relevance: 'Directly relevant' },
  ],
  sources: [
    { url: 'https://example.com/report', title: 'State of Microservices 2026', relevance: 'Primary industry report' },
  ],
  existingTalks: [
    { title: 'Resilient Microservices', speaker: 'Jane Doe', url: 'https://example.com/talk', summary: 'Resilience patterns' },
  ],
  statistics: [
    { value: '78%', context: 'of enterprises use microservices in production', source: 'https://example.com/stats' },
  ],
  suggestedAngles: ['Focus on failure modes and recovery patterns'],
};

const mockWriterOutput: WriterOutput = {
  sections: [
    {
      title: 'Introduction',
      content: 'Welcome to this talk on building resilient microservices.',
      speakingNotes: '[PAUSE] Open with energy. [ASK AUDIENCE] How many of you run microservices?',
      durationMinutes: 3,
    },
    {
      title: 'Core Patterns',
      content: 'The three key resilience patterns are circuit breakers, bulkheads, and retries.',
      speakingNotes: '[EMPHASIS] These patterns save you at 3am.',
      durationMinutes: 15,
    },
    {
      title: 'Conclusion',
      content: 'Start with one pattern, measure its impact, then add more.',
      speakingNotes: '[PAUSE] Let the call to action sink in.',
      durationMinutes: 2,
    },
  ],
  timingMarkers: [
    { timestamp: '00:00', instruction: 'Begin talk' },
    { timestamp: '03:00', instruction: 'Transition to core patterns' },
    { timestamp: '18:00', instruction: 'Wrap up' },
  ],
  totalDurationMinutes: 20,
  speakerNotes: '# Resilient Microservices\n\nWelcome to this talk...\n\n[PAUSE]\n\nThe three key patterns...',
};

// --- Build test pipeline mirroring the real slidewreck workflow ---
// Uses the same transforms, gates, and schemas, but replaces agent steps
// with mock steps that return fixed data (no LLM calls).

const mockResearcherStep = createStep({
  id: 'researcher',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ResearcherOutputSchema,
  execute: async () => mockResearcherOutput,
});

const mockWriterStep = createStep({
  id: 'script-writer',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: WriterOutputSchema,
  execute: async () => mockWriterOutput,
});

// Use the real review gate factory — identical to production
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

// Build test workflow using identical .map() transforms from slidewreck.ts
const testPipeline = createWorkflow({
  id: 'slidewreck-integration-test',
  inputSchema: WorkflowInputSchema,
  outputSchema: WorkflowOutputSchema,
})
  .map(async ({ inputData }) => {
    const { topic, audienceLevel, format } = inputData;
    const duration = FORMAT_DURATION_RANGES[format];
    return {
      prompt: `Research the following conference talk topic and produce a comprehensive research brief.

Topic: ${topic}
Audience Level: ${audienceLevel}
Format: ${format} (${duration.minMinutes}-${duration.maxMinutes} minutes)

Focus on finding:
- Current trends and data related to this topic
- Existing talks and presentations on similar subjects
- Relevant statistics and data points
- Unique angles that would make this talk stand out
- High-quality sources with URLs for attribution`,
    };
  })
  .then(mockResearcherStep)
  .then(reviewResearchGate)
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const gateResult = inputData;
    const researchBrief = getStepResult(mockResearcherStep);
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
  .then(mockWriterStep)
  .then(reviewScriptGate)
  .map(async ({ runId, getStepResult, getInitData }) => {
    const researchBrief = getStepResult(mockResearcherStep);
    const speakerScript = getStepResult(mockWriterStep);
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

// --- Test setup ---

const testInput: WorkflowInput = {
  topic: 'Building Resilient Microservices',
  audienceLevel: 'intermediate',
  format: 'standard',
};

// --- Error propagation pipeline ---
// Separate workflow with its own step instances and a writer that throws (AC #5)

const errorResearcherStep = createStep({
  id: 'researcher',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ResearcherOutputSchema,
  execute: async () => mockResearcherOutput,
});

const errorResearchGate = createReviewGateStep({
  gateId: 'review-research',
  agentId: 'researcher',
  summary: 'Research brief ready for review',
});

const failingWriterStep = createStep({
  id: 'script-writer',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: WriterOutputSchema,
  execute: async () => {
    throw new Error('Writer agent failed: simulated LLM error');
  },
});

const errorScriptGate = createReviewGateStep({
  gateId: 'review-script',
  agentId: 'script-writer',
  summary: 'Speaker script ready for review',
});

const errorPipeline = createWorkflow({
  id: 'slidewreck-error-test',
  inputSchema: WorkflowInputSchema,
  outputSchema: WorkflowOutputSchema,
})
  .map(async ({ inputData }) => {
    const { topic, audienceLevel, format } = inputData;
    const duration = FORMAT_DURATION_RANGES[format];
    return { prompt: `Research ${topic} for ${audienceLevel} (${format}, ${duration.minMinutes}-${duration.maxMinutes}min)` };
  })
  .then(errorResearcherStep)
  .then(errorResearchGate)
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const gateResult = inputData;
    const researchBrief = getStepResult(errorResearcherStep);
    const initData = getInitData<WorkflowInput>();
    const feedback = gateResult.feedback ?? '';
    return { prompt: `Write script. Research: ${JSON.stringify(researchBrief)}. Feedback: ${feedback}. Level: ${initData.audienceLevel}` };
  })
  .then(failingWriterStep)
  .then(errorScriptGate)
  .map(async ({ runId, getStepResult, getInitData }) => {
    const researchBrief = getStepResult(errorResearcherStep);
    const speakerScript = getStepResult(failingWriterStep);
    const initData = getInitData<WorkflowInput>();
    return {
      researchBrief,
      speakerScript,
      metadata: { workflowRunId: runId, completedAt: new Date().toISOString(), input: initData },
    };
  })
  .commit();

// --- Test setup: register both workflows with a single Mastra instance ---

beforeAll(() => {
  new Mastra({
    storage: new InMemoryStore({ id: 'integration-test-storage' }),
    workflows: {
      'slidewreck-integration-test': testPipeline,
      'slidewreck-error-test': errorPipeline,
    },
  });
});

// --- Integration tests ---

describe('slidewreck pipeline integration', () => {
  it('should suspend at Gate 1 (review-research) after researcher step completes', async () => {
    const run = await testPipeline.createRun();
    const result = await run.start({ inputData: testInput });

    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') return;
    expect(result.suspended).toContainEqual(['review-research']);
  }, 15_000);

  it('should produce a valid Gate 1 suspend payload matching GateSuspendSchema', async () => {
    const run = await testPipeline.createRun();
    const result = await run.start({ inputData: testInput });

    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') return;

    const payload = (result.suspendPayload as Record<string, unknown>)?.['review-research'];
    const parsed = GateSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.agentId).toBe('researcher');
    expect(parsed.data.gateId).toBe('review-research');
    expect(parsed.data.summary).toBe('Research brief ready for review');
    // The output field contains the researcher's structured output
    expect(parsed.data.output).toBeDefined();
  }, 15_000);

  it('should pass researcher output through Gate 1 to writer step and suspend at Gate 3', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;
    expect(resumeResult.suspended).toContainEqual(['review-script']);
  }, 15_000);

  it('should produce a valid Gate 3 suspend payload with script-writer output', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;

    const payload = (resumeResult.suspendPayload as Record<string, unknown>)?.['review-script'];
    const parsed = GateSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.agentId).toBe('script-writer');
    expect(parsed.data.gateId).toBe('review-script');
  }, 15_000);

  it('should complete successfully after resuming both gates', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { approved: true },
    });

    expect(finalResult.status).toBe('success');
  }, 15_000);

  it('should produce final output conforming to WorkflowOutputSchema', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { approved: true },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;

    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    // Verify research brief data flows through
    expect(parsed.data.researchBrief.keyFindings).toHaveLength(1);
    expect(parsed.data.researchBrief.keyFindings[0].finding).toContain('Microservices');

    // Verify writer output flows through
    expect(parsed.data.speakerScript.sections).toHaveLength(3);
    expect(parsed.data.speakerScript.totalDurationMinutes).toBe(20);

    // Verify metadata
    expect(parsed.data.metadata.input.topic).toBe('Building Resilient Microservices');
    expect(parsed.data.metadata.input.audienceLevel).toBe('intermediate');
    expect(parsed.data.metadata.input.format).toBe('standard');
    expect(parsed.data.metadata.workflowRunId).toBeDefined();
    expect(parsed.data.metadata.completedAt).toBeDefined();
  }, 15_000);

  it('should capture error state when writer step fails after Gate 1 resume (AC: #5)', async () => {
    const run = await errorPipeline.createRun();
    await run.start({ inputData: testInput });

    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Proceed' },
    });

    expect(resumeResult.status).toBe('failed');
    if (resumeResult.status !== 'failed') return;
    expect(resumeResult.error).toBeDefined();
    expect(JSON.stringify(resumeResult.error)).toContain('simulated LLM error');
  }, 15_000);
});
