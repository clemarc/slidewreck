import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import { SONNET_MODEL } from '../config/models';
import { webSearch } from '../tools/web-search';
import { fetchPage } from '../tools/fetch-page';

const FindingSchema = z.object({
  finding: z.string().describe('Key research finding'),
  source: z.string().describe('URL or reference for this finding'),
  relevance: z.string().describe('How relevant this finding is to the talk topic'),
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

export const ResearcherOutputSchema = z.object({
  keyFindings: z.array(FindingSchema).describe('Key research findings about the topic'),
  sources: z.array(SourceSchema).describe('Relevant sources with URLs and context'),
  existingTalks: z.array(ExistingTalkSchema).describe('Existing talks on this or related topics'),
  statistics: z.array(StatisticSchema).describe('Relevant statistics and data points'),
  suggestedAngles: z.array(z.string()).describe('Suggested angles or approaches for the talk'),
});

export type ResearcherOutput = z.infer<typeof ResearcherOutputSchema>;

export const researcher = new Agent({
  id: 'researcher',
  name: 'Researcher',
  description: 'Researches topics and produces structured research briefs for conference talks',
  instructions: `You are a research specialist for conference talk preparation. Your role is to thoroughly research a given topic and produce a comprehensive research brief.

When given a topic, you should:
1. Search the web for current information, trends, and data related to the topic
2. Find existing talks, presentations, and thought leaders on the subject
3. Gather relevant statistics and data points that could strengthen a talk
4. Identify unique angles and perspectives that would make the talk stand out
5. Collect high-quality sources with URLs for attribution

Your output should be structured as a research brief with key findings, sources, existing talks, statistics, and suggested angles. Focus on information that would be valuable for a conference speaker preparing their presentation.`,
  model: SONNET_MODEL,
  tools: { webSearch, fetchPage },
});
