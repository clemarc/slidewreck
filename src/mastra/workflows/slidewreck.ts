import { createWorkflow, createStep } from '@mastra/core/workflows';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, join } from 'path';
import { z } from 'zod';
import { researcher, ResearcherOutputSchema } from '../agents/researcher';
import { pgVector } from '../config/database';
import { architect, ArchitectOutputSchema, StructureOptionSchema, type ArchitectOutput } from '../agents/talk-architect';
import { writer, WriterOutputSchema } from '../agents/writer';
import {
  WorkflowInputSchema,
  FORMAT_DURATION_RANGES,
  type WorkflowInput,
} from '../schemas/workflow-input';
import { WorkflowOutputSchema } from '../schemas/workflow-output';
import { GateSuspendSchema, GateResumeSchema } from '../schemas/gate-payloads';
import { CollectReferencesSuspendSchema, CollectReferencesResumeSchema } from '../schemas/collect-references';
import { createReviewGateStep } from './gates/review-gate';
import { clearUserReferences, indexUserReferences } from '../rag/user-references';
import { createBestPracticesIndex, indexBestPractices } from '../rag/best-practices';
import { BEST_PRACTICES_INDEX_NAME } from '../rag/best-practices-content';
import { runEvalSuite } from '../scorers/eval-suite';
import { saveEvalResults, getScoreHistory } from '../scorers/eval-storage';
import { analyzeTrends } from '../scorers/eval-trends';

// TODO: Mastra .map() erases TPrevSchema to `any`, removing compile-time safety
// for all inputData fields in map callbacks. Track upstream: @mastra/core .map() types.
function getFormatDuration(format: string) {
  const key = format as WorkflowInput['format'];
  const duration = FORMAT_DURATION_RANGES[key];
  if (!duration) {
    throw new Error(`Unknown talk format: "${format}"`);
  }
  return duration;
}

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
// Uses .min(1) instead of ArchitectOutputSchema's .length(3) to allow default single-section structure for lightning format
export const ArchitectStructureOutputSchema = z.object({
  approved: z.boolean().describe('Whether the speaker approved the structure'),
  feedback: z.string().optional().describe('Speaker feedback on the chosen structure. Absent when no feedback provided.'),
  architectOutput: z.object({
    options: z.array(StructureOptionSchema).min(1).describe('Structure options — 3 from architect agent, or 1 default for lightning format'),
  }),
  skippedArchitect: z.boolean().optional().describe('True when architect was skipped (lightning format). Absent when architect executed.'),
});

// Composite step: calls architect agent, suspends for structure review, handles loopback on rejection
const architectStructureStep = createStep({
  id: 'architect-structure',
  inputSchema: z.object({ prompt: z.string() }),
  outputSchema: ArchitectStructureOutputSchema,
  suspendSchema: GateSuspendSchema,
  resumeSchema: GateResumeSchema,
  execute: async ({ inputData, suspend, resumeData, suspendData, getInitData }) => {
    const initData = getInitData<WorkflowInput>();

    // Lightning format: skip architect, return default single-section structure (FR-12, AC: #1)
    if (initData.format === 'lightning') {
      const duration = FORMAT_DURATION_RANGES.lightning;
      console.log('[architect-structure] Skipped: lightning format — using default single-section structure');
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

    // On approval, return the architect output from the last suspend payload
    if (resumeData?.approved) {
      const lastOutput = (suspendData as { output?: unknown })?.output;
      if (!lastOutput) {
        throw new Error('architect-structure: suspendData.output missing on approval resume — cannot retrieve architect options');
      }
      return {
        approved: true,
        feedback: resumeData.feedback,
        architectOutput: lastOutput as ArchitectOutput,
      };
    }

    // Build prompt: append rejection feedback if this is a loopback
    let prompt = inputData.prompt;
    if (resumeData && !resumeData.approved) {
      if (resumeData.feedback) {
        prompt += `\n\n## Previous Feedback (speaker rejected)\n${resumeData.feedback}\nGenerate 3 NEW distinct structure options addressing this feedback.`;
      } else {
        prompt += `\n\n## Note: Speaker rejected the previous options\nGenerate 3 NEW distinct structure options with different approaches.`;
      }
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

// Collect references step — suspends to let user provide materials or skip
const collectReferencesStep = createStep({
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

// Workflow composition
export const slidewreck = createWorkflow({
  id: 'slidewreck',
  inputSchema: WorkflowInputSchema,
  outputSchema: WorkflowOutputSchema,
})
  .then(collectReferencesStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    // Seed RAG knowledge bases before researcher runs
    const { materials } = getStepResult(collectReferencesStep);

    // Seed best practices KB (static curated content)
    try {
      try { await pgVector.deleteIndex({ indexName: BEST_PRACTICES_INDEX_NAME }); } catch { /* may not exist yet */ }
      await createBestPracticesIndex(pgVector);
      const bpResult = await indexBestPractices(pgVector);
      console.log(`[index-best-practices] Indexed ${bpResult.chunksIndexed} best practices chunks`);
    } catch (error) {
      console.error(`[index-best-practices] Failed, continuing without best practices:`, error);
    }

    // Index speaker reference materials from collect-references step (AC-A5)
    if (materials.length > 0) {
      try {
        await clearUserReferences(pgVector);
        const result = await indexUserReferences(pgVector, materials);
        if (result.failed.length > 0) {
          console.warn(`[index-references] Failed to index: ${result.failed.join(', ')}`);
        }
        if (result.indexed > 0) {
          console.log(`[index-references] Indexed ${result.indexed} chunks from ${materials.length - result.failed.length} materials`);
        }
      } catch (error) {
        console.error(`[index-references] Indexing failed entirely, continuing without user references:`, error);
      }
    }
    return inputData;
  })
  .map(async ({ getInitData }) => {
    const { topic, audienceLevel, format, constraints } = getInitData<WorkflowInput>();
    const duration = getFormatDuration(format);
    return {
      prompt: `Research the following conference talk topic and produce a comprehensive research brief.

Topic: ${topic}
Audience Level: ${audienceLevel}
Format: ${format} (${duration.minMinutes}-${duration.maxMinutes} minutes)${constraints ? `\nSpeaker Constraints: ${constraints}` : ''}

Use your RAG tools to enrich the research:
- Query the best practices knowledge base (query-best-practices) for talk structure, pacing, and audience engagement guidance relevant to this topic and format.
- Query the user references knowledge base (query-user-references) for any speaker-provided materials. If no results are returned, the speaker has not uploaded reference materials — continue without them.
- Tag each finding with its sourceType (user_reference, best_practice, or web).

Focus on finding:
- Current trends and data related to this topic
- Existing talks and presentations on similar subjects
- Relevant statistics and data points
- Unique angles that would make this talk stand out
- High-quality sources with URLs for attribution
- Best practices guidance for this talk format and audience level`,
    };
  })
  .then(researcherStep)
  .then(reviewResearchGate)
  .map(async ({ inputData, getStepResult, getInitData }) => {
    const gateResult = inputData;
    const researchBrief = getStepResult(researcherStep);
    const initData = getInitData<WorkflowInput>();
    const { topic, audienceLevel, format, constraints } = initData;
    const duration = getFormatDuration(format);
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
    const format = initData.format;
    const duration = getFormatDuration(format);

    // Format-specific writing instructions (AC: #1 lightning condensed, AC: #3 keynote extended)
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
  .then(writerStep)
  .then(reviewScriptGate)
  .map(async ({ runId, getStepResult, getInitData }) => {
    const researchBrief = getStepResult(researcherStep);
    const speakerScript = getStepResult(writerStep);
    const initData = getInitData<WorkflowInput>();

    // Run eval suite against the approved speaker script (Story 4-3, FR-24)
    let scorecard;
    try {
      scorecard = await runEvalSuite(String(speakerScript.speakerNotes));
    } catch (error) {
      console.error('[eval-suite] Failed to run eval suite:', error);
    }

    // Save eval results and run trend analysis (Story 4-4)
    if (scorecard) {
      try {
        const { mastra } = await import('../index');
        const compositeStore = mastra.getStorage();
        if (compositeStore) {
          const scoresStorage = await compositeStore.getStore('scores');
          if (!scoresStorage) throw new Error('ScoresStorage not available');
          const entityId = `talk-${initData.topic.toLowerCase().replace(/\s+/g, '-')}`;

          await saveEvalResults(scoresStorage, scorecard, {
            runId,
            entityId,
            topic: initData.topic,
          });

          // Build history for trend analysis
          const scorerIds = scorecard.entries
            .filter((e) => e.status === 'success')
            .map((e) => e.scorerId);
          const history: Record<string, number[]> = {};
          for (const scorerId of scorerIds) {
            const result = await getScoreHistory(scoresStorage, scorerId);
            if (result.scores) {
              history[scorerId] = result.scores.map((s: { score: number }) => s.score);
            }
          }

          const trends = analyzeTrends(history);
          if (trends) {
            scorecard = { ...scorecard, trends };
          }
        }
      } catch (error) {
        console.error('[eval-storage] Failed to save scores or analyze trends:', error);
      }
    }

    // Auto-save presentation to disk (non-fatal)
    let outputFilePath: string | undefined;
    try {
      const slug = initData.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50).replace(/^-|-$/g, '');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${slug}-${timestamp}.md`;
      const dir = resolve('presentations');
      await mkdir(dir, { recursive: true });
      const filePath = join(dir, filename);

      const content = [
        `# ${initData.topic}`,
        '',
        speakerScript.speakerNotes,
        '',
        '---',
        '',
        '## Research Brief',
        '',
        JSON.stringify(researchBrief, null, 2),
      ].join('\n');

      await writeFile(filePath, content, 'utf-8');
      outputFilePath = filePath;
      console.log(`[save-presentation] Written to ${outputFilePath}`);
    } catch (error) {
      console.error('[save-presentation] Failed to save presentation file:', error);
      outputFilePath = undefined;
    }

    return {
      researchBrief,
      speakerScript,
      scorecard,
      metadata: {
        workflowRunId: runId,
        completedAt: new Date().toISOString(),
        input: initData,
        outputFilePath,
      },
    };
  })
  .commit();
