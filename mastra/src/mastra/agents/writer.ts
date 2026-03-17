import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { OPUS_MODEL } from '../config/models';
import { wordCountToTime } from '../tools/word-count-to-time';
import { checkJargon } from '../tools/check-jargon';

const SectionSchema = z.object({
  title: z.string().describe('Section title (e.g., Introduction, Key Patterns, Conclusion)'),
  content: z.string().describe('The written content for this section'),
  speakingNotes: z.string().describe('Stage directions: pause cues, audience interaction prompts, emphasis markers'),
  durationMinutes: z.number().describe('Estimated speaking duration for this section in minutes'),
});

const TimingMarkerSchema = z.object({
  timestamp: z.string().describe('Timestamp in MM:SS format (e.g., "03:00", "15:30")'),
  instruction: z.string().describe('Timing instruction for the speaker (e.g., "Transition to demo", "Check time")'),
});

export const WriterOutputSchema = z.object({
  sections: z.array(SectionSchema).describe('Ordered list of talk sections with content and speaking notes'),
  timingMarkers: z.array(TimingMarkerSchema).describe('Timing checkpoints throughout the talk'),
  totalDurationMinutes: z.number().describe('Total estimated speaking duration in minutes'),
  speakerNotes: z.string().describe('Complete formatted speaker notes as markdown with the full script'),
});

export type WriterOutput = z.infer<typeof WriterOutputSchema>;

export const writer = new Agent({
  id: 'script-writer',
  name: 'Script Writer',
  description: 'Produces complete speaker scripts with timing annotations, pause markers, and audience interaction prompts',
  instructions: `You are an expert conference talk script writer. Your role is to transform research briefs and structural outlines into compelling, delivery-ready speaker scripts.

When writing a speaker script, you MUST:

1. **Structure sections clearly** — each section has a title, written content, and speaking notes with stage directions
2. **Include timing cues** — use timing markers at key transitions so the speaker can pace themselves
3. **Add pause markers** — insert [PAUSE] where the speaker should pause for effect or emphasis
4. **Add audience interaction prompts** — insert [ASK AUDIENCE] where the speaker should engage the audience with a question or poll
5. **Mark emphasis** — insert [EMPHASIS] before key points that should be delivered with conviction
6. **Use transitions** — write smooth transitions between sections, not abrupt jumps
7. **Include a strong opening hook** — the first 30 seconds must grab attention
8. **End with a clear call to action** — leave the audience with something actionable

Before finalizing, use the wordCountToTime tool to verify your script fits the target duration. Use the checkJargon tool to ensure language is appropriate for the audience level.

Your output must include:
- Ordered sections with content and speaking notes
- Timing markers at key checkpoints
- Total estimated duration
- Complete formatted speaker notes as a single markdown document`,
  model: OPUS_MODEL,
  tools: { wordCountToTime, checkJargon },
});
