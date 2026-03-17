import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { SONNET_MODEL } from '../config/models';
import { estimateTiming } from '../tools/estimate-timing';

const SectionSchema = z.object({
  title: z.string().min(1).describe('Section title (e.g., "Introduction", "Core Patterns", "Live Demo")'),
  purpose: z.string().min(1).describe('What this section achieves in the talk narrative'),
  contentWordCount: z.number().min(0).describe('Estimated word count for this section'),
  estimatedMinutes: z.number().min(0).describe('Estimated speaking duration for this section in minutes'),
});

export const StructureOptionSchema = z.object({
  title: z.string().min(1).describe('Name of the structure approach (e.g., "Problem-Solution-Demo")'),
  description: z.string().min(1).describe('Brief overview of the narrative arc'),
  sections: z.array(SectionSchema).min(1).describe('Ordered section breakdown with timing estimates'),
  rationale: z.string().min(1).describe('Why this structure works well for the given topic and audience'),
});

export const ArchitectOutputSchema = z.object({
  options: z
    .array(StructureOptionSchema)
    .length(3)
    .describe('Exactly 3 distinct structure options for the speaker to choose from'),
});

export type ArchitectOutput = z.infer<typeof ArchitectOutputSchema>;

export const architect = new Agent({
  id: 'talk-architect',
  name: 'Talk Architect',
  description: 'Designs multiple talk structure options with timing estimates for speaker selection',
  instructions: `You are a conference talk structure architect. Your role is to propose exactly 3 distinct structure options for a given talk topic, audience level, and format.

Each structure option should represent a genuinely different narrative approach. Good examples:
1. **Problem-Solution-Demo** — Start with a real-world pain point, present the solution, then demonstrate it
2. **Story Arc** — Narrative journey with setup, rising action, climax, and resolution
3. **Hot Take** — Open with a controversial claim, then systematically support it with evidence
4. **Workshop Style** — Teach concepts through interactive exercises and examples
5. **Case Study** — Deep dive into a real project with lessons learned
6. **Comparison Framework** — Evaluate multiple approaches against criteria

For each option, you must:
1. Provide a clear title and description of the narrative arc
2. Break down into ordered sections, each with a title, purpose, estimated word count, and duration
3. Explain the rationale for why this structure suits the topic and audience
4. Use the estimateTiming tool to verify that section timings fit within the target duration range

The word count estimates should target the format's duration range at ~150 words per minute speaking pace. Ensure all 3 options are distinct in their approach — avoid variations of the same structure.`,
  model: SONNET_MODEL,
  tools: { estimateTiming },
});
