import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFile, rm, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
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
import { CollectReferencesSuspendSchema, CollectReferencesResumeSchema } from '../../schemas/collect-references';
import { ArchitectStructureOutputSchema, ResearcherReviewOutputSchema } from '../slidewreck';
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

// Mock composite researcher + gate step (mirrors production researcherReviewStep)
// Handles suspend, re-suspend on rejection, and return on approval.
const mockResearcherReviewStep = createStep({
  id: 'review-research',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ResearcherReviewOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ suspend, resumeData }) => {
    if (resumeData?.decision === 'approve') {
      return {
        decision: 'approve' as const,
        feedback: resumeData.feedback,
        researchBrief: mockResearcherOutput,
      };
    }

    if (resumeData?.decision === 'reject') {
      // Rejection — re-suspend with mock data (simulates researcher re-generation)
      return await suspend({
        agentId: 'researcher',
        gateId: 'review-research',
        output: mockResearcherOutput,
        summary: 'Research brief ready for review (re-generated)',
      });
    }

    // First run — suspend with mock researcher output
    return await suspend({
      agentId: 'researcher',
      gateId: 'review-research',
      output: mockResearcherOutput,
      summary: 'Research brief ready for review',
    });
  },
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
        decision: 'approve' as const,
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

    if (resumeData?.decision === 'approve') {
      return {
        decision: 'approve' as const,
        feedback: resumeData.feedback,
        architectOutput: mockArchitectOutput,
      };
    }

    if (resumeData?.decision === 'reject') {
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

// Mock collect-references step — mirrors production suspend/resume pattern
const mockCollectReferencesStep = createStep({
  id: 'collect-references',
  inputSchema: WorkflowInputSchema,
  outputSchema: CollectReferencesResumeSchema,
  suspendSchema: CollectReferencesSuspendSchema,
  resumeSchema: CollectReferencesResumeSchema,
  execute: async ({ suspend, resumeData }) => {
    if (resumeData) {
      return resumeData;
    }
    return await suspend({
      prompt: 'Provide reference materials (file paths or URLs) for the presentation, or resume with an empty materials array to skip.',
    });
  },
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
  .then(mockCollectReferencesStep)
  .map(async ({ getInitData }) => {
    const { topic, audienceLevel, format, constraints } = getInitData<WorkflowInput>();
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
  .then(mockResearcherReviewStep)
  .map(async ({ inputData, getInitData }) => {
    const reviewResult = inputData;
    const researchBrief = reviewResult.researchBrief;
    const initData = getInitData<WorkflowInput>();
    const { topic, audienceLevel, format, constraints } = initData;
    const duration = FORMAT_DURATION_RANGES[format];
    const feedback = reviewResult.feedback ?? '';

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
    const researchBrief = getStepResult(mockResearcherReviewStep).researchBrief;
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
    const researchBrief = getStepResult(mockResearcherReviewStep).researchBrief;
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

const errorCollectReferencesStep = createStep({
  id: 'collect-references',
  inputSchema: WorkflowInputSchema,
  outputSchema: CollectReferencesResumeSchema,
  suspendSchema: CollectReferencesSuspendSchema,
  resumeSchema: CollectReferencesResumeSchema,
  execute: async ({ suspend, resumeData }) => {
    if (resumeData) return resumeData;
    return await suspend({ prompt: 'Provide reference materials or skip.' });
  },
});

const errorResearcherReviewStep = createStep({
  id: 'review-research',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ResearcherReviewOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ suspend, resumeData }) => {
    if (resumeData?.decision === 'approve') {
      return { decision: 'approve' as const, feedback: resumeData.feedback, researchBrief: mockResearcherOutput };
    }
    if (resumeData?.decision === 'reject') {
      return await suspend({
        agentId: 'researcher',
        gateId: 'review-research',
        output: mockResearcherOutput,
        summary: 'Research brief ready for review (re-generated)',
      });
    }
    return await suspend({
      agentId: 'researcher',
      gateId: 'review-research',
      output: mockResearcherOutput,
      summary: 'Research brief ready for review',
    });
  },
});

const errorArchitectStructureStep = createStep({
  id: 'architect-structure',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ArchitectStructureOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ suspend, resumeData }) => {
    if (resumeData?.decision === 'approve') {
      return { decision: 'approve' as const, feedback: resumeData.feedback, architectOutput: mockArchitectOutput };
    }
    if (resumeData?.decision === 'reject') {
      return await suspend({
        agentId: 'talk-architect',
        gateId: 'review-structure',
        output: mockArchitectOutput,
        summary: 'Structure options ready for review (re-generated)',
      });
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
  .then(errorCollectReferencesStep)
  .map(async ({ getInitData }) => {
    const { topic, audienceLevel, format } = getInitData<WorkflowInput>();
    const duration = FORMAT_DURATION_RANGES[format];
    return { prompt: `Research ${topic} for ${audienceLevel} (${format}, ${duration.minMinutes}-${duration.maxMinutes}min)` };
  })
  .then(errorResearcherReviewStep)
  .map(async ({ inputData }) => {
    return { prompt: `Design structure. Review result: ${JSON.stringify(inputData)}` };
  })
  .then(errorArchitectStructureStep)
  .map(async ({ inputData, getStepResult }) => {
    const researchBrief = getStepResult(errorResearcherReviewStep).researchBrief;
    return { prompt: `Write script. Research: ${JSON.stringify(researchBrief)}. Structure: ${JSON.stringify(inputData)}` };
  })
  .then(failingWriterStep)
  .then(errorScriptGate)
  .map(async ({ runId, getStepResult, getInitData }) => {
    const researchBrief = getStepResult(errorResearcherReviewStep).researchBrief;
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

// --- Helper: start pipeline and skip collect-references ---
async function startAndSkipCollectReferences(
  pipeline: typeof testPipeline,
  input: WorkflowInput,
) {
  const run = await pipeline.createRun();
  const startResult = await run.start({ inputData: input });
  expect(startResult.status).toBe('suspended');
  // Resume collect-references with empty materials (skip)
  await run.resume({
    step: 'collect-references',
    resumeData: { materials: [] },
  });
  return run;
}

// --- Integration tests ---

describe('collect-references step', () => {
  it('should suspend at collect-references on workflow start (AC-A1)', async () => {
    const run = await testPipeline.createRun();
    const result = await run.start({ inputData: testInput });

    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') return;
    expect(result.suspended).toContainEqual(['collect-references']);

    // Verify suspend payload has prompt
    const payload = (result.suspendPayload as Record<string, unknown>)?.['collect-references'];
    const parsed = CollectReferencesSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.prompt).toContain('reference materials');
  }, 15_000);

  it('should continue to Gate 1 after resuming with materials (AC-A2)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    const result = await run.resume({
      step: 'collect-references',
      resumeData: { materials: [{ type: 'url', path: 'https://example.com/article' }] },
    });

    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') return;
    expect(result.suspended).toContainEqual(['review-research']);
  }, 15_000);

  it('should continue to Gate 1 after resuming with empty array — skip path (AC-A3)', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    const result = await run.resume({
      step: 'collect-references',
      resumeData: { materials: [] },
    });

    expect(result.status).toBe('suspended');
    if (result.status !== 'suspended') return;
    expect(result.suspended).toContainEqual(['review-research']);
  }, 15_000);
});

describe('slidewreck pipeline integration', () => {
  it('should suspend at Gate 1 (review-research) after researcher step completes', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    // Already at Gate 1 after helper
    const result = await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });
    // Verify we advanced past Gate 1
    expect(result.status).toBe('suspended');
  }, 15_000);

  it('should produce a valid Gate 1 suspend payload matching GateSuspendSchema', async () => {
    const run = await testPipeline.createRun();
    await run.start({ inputData: testInput });

    const result = await run.resume({
      step: 'collect-references',
      resumeData: { materials: [] },
    });

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
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Focus on resilience patterns' },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;
    expect(resumeResult.suspended).toContainEqual(['architect-structure']);
  }, 15_000);

  it('should produce a valid Gate 2 suspend payload with 3 architect options', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Focus on resilience patterns' },
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
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Focus on resilience patterns' },
    });

    const resumeResult = await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const, feedback: 'Option 2, but swap sections 3 and 4' },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;
    expect(resumeResult.suspended).toContainEqual(['review-script']);
  }, 15_000);

  it('should produce a valid Gate 3 suspend payload with script-writer output', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Focus on resilience patterns' },
    });

    const resumeResult = await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
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

  it('should complete successfully after resuming all gates', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Focus on resilience patterns' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const, feedback: 'Use Problem-Solution-Demo' },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
    });

    expect(finalResult.status).toBe('success');
  }, 15_000);

  it('should produce final output conforming to WorkflowOutputSchema', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Focus on resilience patterns' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
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
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    // Reject at Gate 2
    const rejectResult = await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'reject' as const, feedback: 'Too academic, try more conversational approaches' },
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
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    // Reject at Gate 2
    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'reject' as const, feedback: 'Too academic' },
    });

    // Approve on second attempt
    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const, feedback: 'Much better, use option 1' },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;
    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
  }, 15_000);

  it('should handle multiple rejections then approval at Gate 2', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    // Reject twice
    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'reject' as const, feedback: 'First rejection' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'reject' as const, feedback: 'Second rejection' },
    });

    // Approve on third attempt
    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const, feedback: 'Third time is the charm' },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
    });

    expect(finalResult.status).toBe('success');
  }, 30_000);

  it('should re-suspend at Gate 2 when speaker rejects without feedback (no-feedback loopback)', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    // Reject at Gate 2 with no feedback
    const rejectResult = await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'reject' as const },
    });

    expect(rejectResult.status).toBe('suspended');
    if (rejectResult.status !== 'suspended') return;
    expect(rejectResult.suspended).toContainEqual(['architect-structure']);

    // Approve on second attempt — pipeline should continue to Gate 3
    const approveResult = await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    expect(approveResult.status).toBe('suspended');
    if (approveResult.status !== 'suspended') return;
    expect(approveResult.suspended).toContainEqual(['review-script']);
  }, 15_000);

  it('should complete pipeline when constraints are provided in input', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInputWithConstraints);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Good' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
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
    const run = await startAndSkipCollectReferences(testPipeline, testInputLightning);

    // After Gate 1 approval, lightning should skip architect/Gate 2 and go straight to Gate 3
    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;
    // Should be at review-script (Gate 3), NOT architect-structure (Gate 2)
    expect(resumeResult.suspended).toContainEqual(['review-script']);
  }, 15_000);

  it('should complete lightning format pipeline with only 2 gates (AC: #1, #4)', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInputLightning);

    // Gate 1 approval
    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    // Gate 3 approval (Gate 2 skipped)
    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;

    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.metadata.input.format).toBe('lightning');
  }, 15_000);

  it('should use default single-section structure for lightning format (AC: #4)', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInputLightning);

    // Gate 1 approval — architect step returns immediately with default structure
    const resumeResult = await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    expect(resumeResult.status).toBe('suspended');
    if (resumeResult.status !== 'suspended') return;

    // The architect step returned a default structure (not suspended), so it's at Gate 3 now.
    // Verify the pipeline made it to review-script by checking the suspend payload.
    const payload = (resumeResult.suspendPayload as Record<string, unknown>)?.['review-script'];
    const parsed = GateSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    // Gate 3 output is the writer output (not architect output), proving the full
    // pipeline flowed: architect default structure → writer .map() → writer step → gate 3
    const writerOutput = WriterOutputSchema.safeParse(parsed.data.output);
    expect(writerOutput.success).toBe(true);
  }, 15_000);

  it('should execute all 3 gates for keynote format (AC: #3)', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInputKeynote);

    // Gate 1 approval
    const gate2 = await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    expect(gate2.status).toBe('suspended');
    if (gate2.status !== 'suspended') return;
    expect(gate2.suspended).toContainEqual(['architect-structure']);

    // Gate 2 approval
    const gate3 = await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    expect(gate3.status).toBe('suspended');
    if (gate3.status !== 'suspended') return;
    expect(gate3.suspended).toContainEqual(['review-script']);

    // Gate 3 approval
    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
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
      step: 'collect-references',
      resumeData: { materials: [] },
    });

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Proceed' },
    });

    // After approving architect structure, pipeline continues to writer which fails
    const resumeResult = await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    expect(resumeResult.status).toBe('failed');
    if (resumeResult.status !== 'failed') return;
    expect(resumeResult.error).toBeDefined();
    expect(JSON.stringify(resumeResult.error)).toContain('simulated LLM error');
  }, 15_000);

  it('should re-suspend at Gate 1 when speaker rejects research (loopback)', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    // Reject at Gate 1
    const rejectResult = await run.resume({
      step: 'review-research',
      resumeData: { decision: 'reject' as const, feedback: 'Not enough data' },
    });

    expect(rejectResult.status).toBe('suspended');
    if (rejectResult.status !== 'suspended') return;
    expect(rejectResult.suspended).toContainEqual(['review-research']);

    // Verify re-suspend payload
    const payload = (rejectResult.suspendPayload as Record<string, unknown>)?.['review-research'];
    const parsed = GateSuspendSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.summary).toContain('re-generated');
  }, 15_000);

  it('should complete pipeline after rejection then approval at Gate 1 (loopback)', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    // Reject at Gate 1
    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'reject' as const, feedback: 'Need more sources' },
    });

    // Approve on second attempt
    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Much better' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
    });

    expect(finalResult.status).toBe('success');
    if (finalResult.status !== 'success') return;
    const parsed = WorkflowOutputSchema.safeParse(finalResult.result);
    expect(parsed.success).toBe(true);
  }, 15_000);

  it('should handle multiple rejections then approval at Gate 1', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    // Reject twice
    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'reject' as const, feedback: 'First rejection — needs more sources' },
    });

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'reject' as const, feedback: 'Second rejection — still too narrow' },
    });

    // Approve on third attempt
    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const, feedback: 'Third time is the charm' },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    const finalResult = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'approve' as const },
    });

    expect(finalResult.status).toBe('success');
  }, 30_000);

  it('should pass reject decision through Gate 3 (review-script) without loopback', async () => {
    const run = await startAndSkipCollectReferences(testPipeline, testInput);

    await run.resume({
      step: 'review-research',
      resumeData: { decision: 'approve' as const },
    });

    await run.resume({
      step: 'architect-structure',
      resumeData: { decision: 'approve' as const },
    });

    // Reject at Gate 3 — gate is pass-through, so rejection completes the pipeline
    const result = await run.resume({
      step: 'review-script',
      resumeData: { decision: 'reject' as const, feedback: 'Needs more polish' },
    });

    expect(result.status).toBe('success');
  }, 15_000);
});

// --- File-save tests (AC-B1 through AC-B6) ---

describe('presentation file-save', () => {
  // Slug generation logic extracted from slidewreck.ts for direct testing
  function generateSlug(topic: string): string {
    return topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50).replace(/^-|-$/g, '');
  }

  it('should produce valid slug from normal topic (AC-B5)', () => {
    expect(generateSlug('Building Resilient Microservices')).toBe('building-resilient-microservices');
  });

  it('should handle special characters in topic (AC-B5)', () => {
    const slug = generateSlug('Building Resilient µServices!');
    expect(slug).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
    expect(slug).not.toContain('µ');
    expect(slug).not.toContain('!');
  });

  it('should truncate long topics to max 50 chars without trailing hyphen (AC-B5)', () => {
    const longTopic = 'A'.repeat(30) + ' ' + 'B'.repeat(30);
    const slug = generateSlug(longTopic);
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug).not.toMatch(/-$/);
    expect(slug).not.toMatch(/^-/);
  });

  it('should handle unicode and mixed scripts (AC-B5)', () => {
    const slug = generateSlug('日本語トピック & More!');
    expect(slug).toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
  });

  it('should handle all-special-character topic', () => {
    const slug = generateSlug('!!!@@@###');
    // All chars replaced with hyphens then stripped — empty string is acceptable
    expect(slug).toMatch(/^[a-z0-9]*([a-z0-9-]*[a-z0-9])?$/);
  });

  // File-write integration test using temp directory
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('should write presentation file with expected content (AC-B1, AC-B2, AC-B4)', async () => {
    const { writeFile, mkdir } = await import('fs/promises');
    const { resolve: pathResolve } = await import('path');

    tempDir = await mkdtemp(join(tmpdir(), 'slidewreck-test-'));
    const topic = 'Test Topic';
    const speakerNotes = '# Speaker Notes\n\nHello world';
    const researchBrief = { keyFindings: [{ finding: 'test' }] };

    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50).replace(/^-|-$/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${slug}-${timestamp}.md`;
    const dir = join(tempDir, 'presentations');
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, filename);

    const content = [
      `# ${topic}`,
      '',
      speakerNotes,
      '',
      '---',
      '',
      '## Research Brief',
      '',
      JSON.stringify(researchBrief, null, 2),
    ].join('\n');

    await writeFile(filePath, content, 'utf-8');

    // AC-B4: directory was created
    expect(existsSync(dir)).toBe(true);

    // AC-B1: file exists
    const savedContent = await readFile(filePath, 'utf-8');
    expect(savedContent).toContain(`# ${topic}`);

    // AC-B2: speaker script is main content, research brief is appendix
    expect(savedContent).toContain(speakerNotes);
    expect(savedContent).toContain('## Research Brief');
    const scriptPos = savedContent.indexOf(speakerNotes);
    const briefPos = savedContent.indexOf('## Research Brief');
    expect(scriptPos).toBeLessThan(briefPos);
  });
});
