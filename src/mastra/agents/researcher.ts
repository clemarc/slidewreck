import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { SONNET_MODEL } from '../config/models';
import { webSearch, webFetch } from '../tools/web-search';
import { userReferencesQueryTool } from '../tools/query-user-references';
import { bestPracticesQueryTool } from '../tools/query-best-practices';

const FindingSchema = z.object({
  finding: z.string().describe('Key research finding'),
  source: z.string().describe('URL or reference for this finding'),
  relevance: z.string().describe('How relevant this finding is to the talk topic'),
  sourceType: z.enum(['user_reference', 'best_practice', 'web'])
    .optional()
    .describe('Origin of finding: user_reference, best_practice, or web. Absent for legacy briefs.'),
});

const SourceSchema = z.object({
  url: z.string().describe('Source URL'),
  title: z.string().describe('Source title'),
  relevance: z.string().describe('Why this source is relevant'),
});

const ExistingTalkSchema = z.object({
  title: z.string().describe('Talk title'),
  speaker: z.string().describe('Speaker name'),
  url: z.string().describe('URL to the talk'),
  summary: z.string().describe('Brief summary of the talk content'),
});

const StatisticSchema = z.object({
  value: z.string().describe('The statistic value'),
  context: z.string().describe('Context explaining the statistic'),
  source: z.string().describe('Source URL or reference'),
});

const BestPracticeGuidanceSchema = z.object({
  category: z.string().describe('Best practice category (structure, pacing, hooks, engagement, closing)'),
  guidance: z.string().describe('Specific guidance retrieved from best practices KB'),
  applicableTo: z.string().optional().describe('Which section or aspect of the talk this applies to. Absent when guidance is general.'),
});

export const ResearcherOutputSchema = z.object({
  keyFindings: z.array(FindingSchema).describe('Key research findings about the topic'),
  sources: z.array(SourceSchema).describe('Relevant sources with URLs and context'),
  existingTalks: z.array(ExistingTalkSchema).describe('Existing talks on this or related topics'),
  statistics: z.array(StatisticSchema).describe('Relevant statistics and data points'),
  suggestedAngles: z.array(z.string()).describe('Suggested angles or approaches for the talk'),
  bestPracticesGuidance: z.array(BestPracticeGuidanceSchema)
    .optional()
    .describe('Guidance from curated best practices KB. Absent when best practices KB unavailable.'),
});

export type ResearcherOutput = z.infer<typeof ResearcherOutputSchema>;

export const researcher = new Agent({
  id: 'researcher',
  name: 'Researcher',
  description: 'Researches topics and produces structured research briefs for conference talks',
  instructions: `You are a research specialist for conference talk preparation. Your role is to thoroughly research a given topic and produce a comprehensive research brief that blends web research, speaker expertise, and proven best practices.

When given a topic, follow this prioritized research strategy:

1. **Speaker references first** — Use the query-user-references tool to search the speaker's uploaded materials for relevant expertise and perspective. Prioritize these where they provide direct guidance on the topic.
2. **Best practices guidance** — Use the query-best-practices tool to retrieve curated guidance on talk structure, pacing, hooks, audience engagement, and closing techniques. Include relevant best practices in the bestPracticesGuidance output field.
3. **Web research** — Search the web for current information, trends, statistics, existing talks, and thought leaders. Fetch and read full pages to extract detailed information using dynamic filtering.
4. Find existing talks, presentations, and thought leaders by searching YouTube and conference sites.
5. Gather relevant statistics and data points that could strengthen a talk.
6. Identify unique angles and perspectives that would make the talk stand out.
7. Collect high-quality sources with URLs for attribution.

**Source attribution:** Tag each finding in keyFindings with a sourceType field:
- "user_reference" for findings from the speaker's uploaded materials
- "best_practice" for findings from the curated best practices KB
- "web" for findings from web search

If the speaker has no uploaded reference materials, the query-user-references tool will return empty results — skip gracefully and focus on best practices and web research.

Your output should be structured as a research brief with key findings (tagged by sourceType), sources, existing talks, statistics, suggested angles, and bestPracticesGuidance. Focus on information that would be valuable for a conference speaker preparing their presentation.`,
  model: SONNET_MODEL,
  tools: {
    webSearch,
    webFetch,
    'query-user-references': userReferencesQueryTool,
    'query-best-practices': bestPracticesQueryTool,
  },
});
