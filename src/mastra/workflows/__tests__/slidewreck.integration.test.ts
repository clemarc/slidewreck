import { describe, it, expect, beforeAll } from 'vitest';
import { Mastra } from '@mastra/core';
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { InMemoryStore } from '@mastra/core/storage';
import { z } from 'zod';
import { ResearcherOutputSchema, type ResearcherOutput } from '../../agents/researcher';
import { ArchitectOutputSchema, type ArchitectOutput } from '../../agents/talk-architect';
import { WriterOutputSchema, type WriterOutput } from '../../agents/writer';
import {
  WorkflowInputSchema,
  FORMAT_DURATION_RANGES,
  type WorkflowInput,
} from '../../schemas/workflow-input';
import { WorkflowOutputSchema } from '../../schemas/workflow-output';
import { GateSuspendSchema, GateResumeSchema } from '../../schemas/gate-payloads';
import { ArchitectStructureOutputSchema } from '../slidewreck';
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

const mockArchitectOutput: ArchitectOutput = {
  options: [
    {
      title: 'Problem-Solution-Demo',
      description: 'Start with a real-world pain point, present the solution, then demonstrate it',
      sections: [
        { title: 'Problem Statement', purpose: 'Frame the challenge', contentWordCount: 500, estimatedMinutes: 3 },
        { title: 'Solution Architecture', purpose: 'Present approach', contentWordCount: 2000, estimatedMinutes: 13 },
        { title: 'Live Demo', purpose: 'Show it works', contentWordCount: 500, estimatedMinutes: 4 },
      ],
      rationale: 'Builds credibility through demonstration',
    },
    {
      title: 'Story Arc',
      description: 'Narrative journey with setup, rising action, climax, and resolution',
      sections: [
        { title: 'The Setup', purpose: 'Set the scene', contentWordCount: 750, estimatedMinutes: 5 },
        { title: 'Rising Action', purpose: 'Build tension', contentWordCount: 1500, estimatedMinutes: 10 },
        { title: 'Resolution', purpose: 'Deliver the insight', contentWordCount: 750, estimatedMinutes: 5 },
      ],
      rationale: 'Engages emotionally and maintains attention',
    },
    {
      title: 'Hot Take',
      description: 'Open with a controversial claim, then systematically support it with evidence',
      sections: [
        { title: 'The Claim', purpose: 'Hook the audience', contentWordCount: 300, estimatedMinutes: 2 },
        { title: 'Evidence', purpose: 'Build the case', contentWordCount: 2200, estimatedMinutes: 14 },
        { title: 'So What', purpose: 'Actionable takeaways', contentWordCount: 500, estimatedMinutes: 4 },
      ],
      rationale: 'Creates immediate engagement through controversy',
    },
  ],
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

// Mock composite architect + gate step (mirrors production architectStructureStep)
// Handles format-aware skipping (lightning), suspend, re-suspend on rejection, and return on approval.
const mockArchitectStructureStep = createStep({
  id: 'architect-structure',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ArchitectStructureOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ suspend, resumeData, getInitData }) => {
    const initData = getInitData<WorkflowInput>();

    // Lightning format: skip architect, return default structure immediately (FR-12)
    if (initData.format === 'lightning') {
      const duration = FORMAT_DURATION_RANGES.lightning;
      return {
        approved: true,
        feedback: undefined,
        architectOutput: {
          options: [{
            title: initData.topic,
            description: `Single-section lightning talk on ${initData.topic}`,
            sections: [{
              title: initData.topic,
              purpose: 'Complete lightning talk content',
              contentWordCount: duration.maxMinutes * 150,
              estimatedMinutes: duration.maxMinutes,
            }],
            rationale: 'Default single-section structure for lightning format — architect step skipped',
          }],
        },
        skippedArchitect: true,
      };
    }

    if (resumeData?.approved) {
      return {
        approved: true,
        feedback: resumeData.feedback,
        architectOutput: mockArchitectOutput,
      };
    }

    if (resumeData && !resumeData.approved) {
      // Rejection — re-suspend with mock data (simulates architect re-generation)
      const summary = mockArchitectOutput.options
        .map((opt, i) => `Option ${i + 1}: ${opt.title} — ${opt.description}`)
        .join('\n');
      return await suspend({
        agentId: 'talk-architect',
        gateId: 'review-structure',
        output: mockArchitectOutput,
        summary: `Structure options ready for review (re-generated):\n${summary}`,
      });
    }

    // First run — suspend with mock architect output
    const summary = mockArchitectOutput.options
      .map((opt, i) => `Option ${i + 1}: ${opt.title} — ${opt.description}`)
      .join('\n');
    return await suspend({
      agentId: 'talk-architect',
      gateId: 'review-structure',
      output: mockArchitectOutput,
      summary: `Structure options ready for review:\n${summary}`,
    });
  },
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
  .then(mockResearcherStep)
  .then(reviewResearchGate)
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const gateResult = inputData;
    const researchBrief = getStepResult(mockResearcherStep);
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
  .then(mockArchitectStructureStep)
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const structureResult = inputData;
    const researchBrief = getStepResult(mockResearcherStep);
    const initData = getInitData<WorkflowInput>();
    const { audienceLevel } = initData;
    const format = initData.format;
    const duration = FORMAT_DURATION_RANGES[format];

    // Format-specific writing instructions (mirrors production)
    let formatInstructions = '';
    if (format === 'lightning') {
      formatInstructions = `\n\n## Lightning Format Guidelines
- Condense to a single clear narrative arc
- No extended audience interaction prompts ([ASK AUDIENCE] max 1)
- Minimal section transitions — dive straight into content
- Strong opening hook and immediate call to action`;
    } else if (format === 'keynote') {
      formatInstructions = `\n\n## Keynote Format Guidelines
- Include multiple audience interaction points throughout
- Deeper examples and case studies in each section
- Longer, more polished transitions between sections
- Extended storytelling and narrative building
- Multiple [PAUSE] and [ASK AUDIENCE] markers`;
    }

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
- Use the checkJargon tool to verify language is appropriate for ${audienceLevel} audience${formatInstructions}`,
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

const testInputWithConstraints: WorkflowInput = {
  topic: 'Building Resilient Microservices',
  audienceLevel: 'intermediate',
  format: 'standard',
  constraints: 'Focus on observability, avoid Kubernetes examples',
};

const testInputLightning: WorkflowInput = {
  topic: 'Building Resilient Microservices',
  audienceLevel: 'intermediate',
  format: 'lightning',
};

const testInputKeynote: WorkflowInput = {
  topic: 'Building Resilient Microservices',
  audienceLevel: 'advanced',
  format: 'keynote',
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

const errorArchitectStructureStep = createStep({
  id: 'architect-structure',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ArchitectStructureOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ suspend, resumeData }) => {
    if (resumeData?.approved) {
      return { approved: true, feedback: resumeData.feedback, architectOutput: mockArchitectOutput };
    }
    return await suspend({
      agentId: 'talk-architect',
      gateId: 'review-structure',
      output: mockArchitectOutput,
      summary: 'Structure options ready for review',
    });
  },
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
  .map(async ({ inputData }) => {
    return { prompt: `Design structure. Gate result: ${JSON.stringify(inputData)}` };
  })
  .then(errorArchitectStructureStep)
  .map(async ({ inputData, getStepResult }) => {
    const researchBrief = getStepResult(errorResearcherStep);
    return { prompt: `Write script. Research: ${JSON.stringify(researchBrief)}. Structure: ${JSON.stringify(inputData)}` };
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
    expect(parsed.data.output).toBeDefined();
  }, 15_000);

  it('should suspend at Gate 2 (review-structure) after Gate 1 approval', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;
    expect(resumeResult.suspended).toContainEqual(['architect-structure']);
  }, 15_000);

  it('should produce a valid Gate 2 suspend payload with 3 architect options', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;

    const payload = (resumeResult.suspendPayload as Record<string, unknown>)?.['architect-structure'];
    const parsed = GateSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.agentId).toBe('talk-architect');
    expect(parsed.data.gateId).toBe('review-structure');
    expect(parsed.data.summary).toContain('Structure options ready for review');

    // Verify the output contains 3 structure options
    const architectOutput = ArchitectOutputSchema.safeParse(parsed.data.output);
    expect(architectOutput.success).toBe(true);
    if (!architectOutput.success) return;
    expect(architectOutput.data.options).toHaveLength(3);
  }, 15_000);

  it('should suspend at Gate 3 (review-script) after Gate 2 approval', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    const resumeResult = await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true, feedback: 'Option 2, but swap sections 3 and 4' },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;
    expect(resumeResult.suspended).toContainEqual(['review-script']);
  }, 15_000);

  it('should produce a valid Gate 3 suspend payload with script-writer output', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    const resumeResult = await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true },
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

  it('should complete successfully after resuming all three gates', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Focus on resilience patterns' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true, feedback: 'Use Problem-Solution-Demo' },
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

    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true },
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

  it('should re-suspend at Gate 2 when speaker rejects structure (loopback)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    // Reject at Gate 2
    const rejectResult = await run.resume({
      step: 'architect-structure',
      resumeData: { approved: false, feedback: 'Too academic, try more conversational approaches' },
    });

    expect(rejectResult.status).toBe('suspended');
    if (rejectResult.status !== 'suspended') return;
    expect(rejectResult.suspended).toContainEqual(['architect-structure']);

    // Verify re-suspend payload still has 3 options
    const payload = (rejectResult.suspendPayload as Record<string, unknown>)?.['architect-structure'];
    const parsed = GateSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.summary).toContain('re-generated');
  }, 15_000);

  it('should complete pipeline after rejection then approval at Gate 2 (loopback)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    // Reject at Gate 2
    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: false, feedback: 'Too academic' },
    });

    // Approve on second attempt
    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true, feedback: 'Much better, use option 1' },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { approved: true },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;
    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
  }, 15_000);

  it('should handle multiple rejections then approval at Gate 2', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    // Reject twice
    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: false, feedback: 'First rejection' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: false, feedback: 'Second rejection' },
    });

    // Approve on third attempt
    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true, feedback: 'Third time is the charm' },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { approved: true },
    });

    expect(finalResult.status).toBe('success');
  }, 30_000);

  it('should re-suspend at Gate 2 when speaker rejects without feedback (no-feedback loopback)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    // Reject at Gate 2 with no feedback
    const rejectResult = await run.resume({
      step: 'architect-structure',
      resumeData: { approved: false },
    });

    expect(rejectResult.status).toBe('suspended');
    if (rejectResult.status !== 'suspended') return;
    expect(rejectResult.suspended).toContainEqual(['architect-structure']);

    // Approve on second attempt — pipeline should continue to Gate 3
    const approveResult = await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true },
    });

    expect(approveResult.status).toBe('suspended');
    if (approveResult.status !== 'suspended') return;
    expect(approveResult.suspended).toContainEqual(['review-script']);
  }, 15_000);

  it('should complete pipeline when constraints are provided in input', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInputWithConstraints });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Good' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { approved: true },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;
    expect(finalResult.result).toBeDefined();
    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.metadata.input.constraints).toBe('Focus on observability, avoid Kubernetes examples');
  }, 15_000);

  it('should skip Gate 2 for lightning format — Gate 1 approval goes directly to Gate 3 (AC: #1)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInputLightning });

    // After Gate 1 approval, lightning should skip architect/Gate 2 and go straight to Gate 3
    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;
    // Should be at review-script (Gate 3), NOT architect-structure (Gate 2)
    expect(resumeResult.suspended).toContainEqual(['review-script']);
  }, 15_000);

  it('should complete lightning format pipeline with only 2 gates (AC: #1, #4)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInputLightning });

    // Gate 1 approval
    await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    // Gate 3 approval (Gate 2 skipped)
    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { approved: true },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;

    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.metadata.input.format).toBe('lightning');
  }, 15_000);

  it('should use default single-section structure for lightning format (AC: #4)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInputLightning });

    // Gate 1 approval — architect step returns immediately with default structure
    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;

    // The architect step returned a default structure (not suspended), so it's at Gate 3 now.
    // Verify the pipeline made it to review-script by checking the suspend payload.
    const payload = (resumeResult.suspendPayload as Record<string, unknown>)?.['review-script'];
    const parsed = GateSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  }, 15_000);

  it('should execute all 3 gates for keynote format (AC: #3)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInputKeynote });

    // Gate 1 approval
    const gate2 = await run.resume({
      step: 'review-research',
      resumeData: { approved: true },
    });

    expect(gate2.status).toBe('suspended');
    if (gate2.status !== 'suspended') return;
    expect(gate2.suspended).toContainEqual(['architect-structure']);

    // Gate 2 approval
    const gate3 = await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true },
    });

    expect(gate3.status).toBe('suspended');
    if (gate3.status !== 'suspended') return;
    expect(gate3.suspended).toContainEqual(['review-script']);

    // Gate 3 approval
    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { approved: true },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;

    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.metadata.input.format).toBe('keynote');
  }, 15_000);

  it('should capture error state when writer step fails after Gate 2 approval (AC: #5)', async () => {
    const run = await errorPipeline.createRun();
    await run.start({ inputData: testInput });

    await run.resume({
      step: 'review-research',
      resumeData: { approved: true, feedback: 'Proceed' },
    });

    // After approving architect structure, pipeline continues to writer which fails
    const resumeResult = await run.resume({
      step: 'architect-structure',
      resumeData: { approved: true },
    });

    expect(resumeResult.status).toBe('failed');
    if (resumeResult.status !== 'failed') return;
    expect(resumeResult.error).toBeDefined();
    expect(JSON.stringify(resumeResult.error)).toContain('simulated LLM error');
  }, 15_000);
});
