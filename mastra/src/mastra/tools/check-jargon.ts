import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

type JargonEntry = {
  term: string;
  reason: string;
  suggestion: string;
  /** Minimum audience level where this term is NOT flagged */
  threshold: 'intermediate' | 'advanced' | 'expert';
};

/**
 * Curated jargon dictionary. Each entry has a complexity threshold:
 * - 'intermediate': flagged only for beginners
 * - 'advanced': flagged for beginners and intermediate
 * - 'expert': flagged for all except advanced
 */
const JARGON_DICTIONARY: JargonEntry[] = [
  // Common tech terms — intermediate threshold (only flagged for beginners)
  { term: 'api', reason: 'Technical acronym unfamiliar to non-developers', suggestion: 'Explain as "a way for software to communicate"', threshold: 'intermediate' },
  { term: 'database', reason: 'Technical term', suggestion: 'Use "data storage" or define on first use', threshold: 'intermediate' },
  { term: 'frontend', reason: 'Developer-specific term', suggestion: 'Use "the part users see" or define it', threshold: 'intermediate' },
  { term: 'backend', reason: 'Developer-specific term', suggestion: 'Use "the server side" or define it', threshold: 'intermediate' },
  { term: 'deployment', reason: 'Technical process term', suggestion: 'Use "releasing" or "putting into production"', threshold: 'intermediate' },
  { term: 'repository', reason: 'Version control term', suggestion: 'Use "code storage" or "project folder"', threshold: 'intermediate' },
  { term: 'framework', reason: 'Development concept', suggestion: 'Use "toolkit" or "set of building blocks"', threshold: 'intermediate' },
  { term: 'refactoring', reason: 'Developer practice term', suggestion: 'Use "restructuring code" or "cleaning up code"', threshold: 'intermediate' },
  { term: 'latency', reason: 'Performance metric term', suggestion: 'Use "delay" or "response time"', threshold: 'intermediate' },
  { term: 'scalability', reason: 'Architecture concept', suggestion: 'Use "ability to handle more users/load"', threshold: 'intermediate' },

  // Intermediate terms — advanced threshold (flagged for beginners + intermediate)
  { term: 'microservice', reason: 'Architecture pattern requiring context', suggestion: 'Define as "small, independent services that work together"', threshold: 'advanced' },
  { term: 'kubernetes', reason: 'Specific orchestration platform', suggestion: 'Define as "a system for managing containerized applications"', threshold: 'advanced' },
  { term: 'docker', reason: 'Container platform', suggestion: 'Define as "a tool for packaging applications"', threshold: 'advanced' },
  { term: 'ci/cd', reason: 'DevOps practice acronym', suggestion: 'Expand as "continuous integration and delivery" and explain briefly', threshold: 'advanced' },
  { term: 'load balancing', reason: 'Infrastructure concept', suggestion: 'Define as "distributing work across multiple servers"', threshold: 'advanced' },
  { term: 'api gateway', reason: 'Architecture component', suggestion: 'Define as "a single entry point for all service requests"', threshold: 'advanced' },
  { term: 'webhook', reason: 'Integration pattern', suggestion: 'Define as "an automatic notification sent when something happens"', threshold: 'advanced' },
  { term: 'middleware', reason: 'Software architecture term', suggestion: 'Define as "software that sits between two systems"', threshold: 'advanced' },
  { term: 'containerization', reason: 'DevOps concept', suggestion: 'Define as "packaging software with everything it needs to run"', threshold: 'advanced' },
  { term: 'orchestration', reason: 'Infrastructure management term', suggestion: 'Define as "automated coordination of multiple services"', threshold: 'advanced' },
  { term: 'idempotent', reason: 'Computer science concept', suggestion: 'Define as "safe to repeat without side effects"', threshold: 'advanced' },
  { term: 'eventual consistency', reason: 'Distributed systems concept', suggestion: 'Define as "data that syncs up over time, not instantly"', threshold: 'advanced' },
  { term: 'sharding', reason: 'Database scaling technique', suggestion: 'Define as "splitting data across multiple databases"', threshold: 'advanced' },

  // Advanced terms — expert threshold (flagged for all except advanced)
  { term: 'raft consensus', reason: 'Distributed systems algorithm', suggestion: 'Define the concept or use "agreement protocol"', threshold: 'expert' },
  { term: 'cqrs', reason: 'Specialized architecture pattern', suggestion: 'Expand and explain: "Command Query Responsibility Segregation"', threshold: 'expert' },
  { term: 'event sourcing', reason: 'Specialized data pattern', suggestion: 'Define as "storing every change as an event"', threshold: 'expert' },
  { term: 'saga pattern', reason: 'Distributed transaction pattern', suggestion: 'Define as "a sequence of steps that can be undone"', threshold: 'expert' },
];

type AudienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'mixed';

/**
 * Determine which threshold levels get flagged for a given audience level.
 * Returns the set of thresholds whose terms should be flagged.
 */
function getThresholdsToFlag(audienceLevel: AudienceLevel): Set<string> {
  switch (audienceLevel) {
    case 'beginner':
      // Flag everything: intermediate, advanced, and expert terms
      return new Set(['intermediate', 'advanced', 'expert']);
    case 'intermediate':
    case 'mixed':
      // Flag advanced and expert terms
      return new Set(['advanced', 'expert']);
    case 'advanced':
      // Flag only expert terms
      return new Set(['expert']);
    default:
      return new Set(['advanced', 'expert']);
  }
}

export const checkJargon = createTool({
  id: 'check-jargon',
  description: 'Check text for technical jargon that may not be appropriate for the target audience level. Returns flagged terms with explanations and simpler alternatives.',
  inputSchema: z.object({
    text: z.string().describe('The text content to check for jargon'),
    audienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']).describe('Target audience technical level'),
  }),
  outputSchema: z.object({
    flaggedTerms: z.array(z.object({
      term: z.string().describe('The jargon term found'),
      reason: z.string().describe('Why this term may be problematic for the audience'),
      suggestion: z.string().describe('Simpler alternative or recommendation'),
    })).describe('List of flagged jargon terms'),
    audienceLevel: z.string().describe('The audience level that was checked against'),
    totalFlagged: z.number().describe('Total number of flagged terms'),
  }),
  execute: async ({ text, audienceLevel }) => {
    if (!text.trim()) {
      return { flaggedTerms: [], audienceLevel, totalFlagged: 0 };
    }

    const textLower = text.toLowerCase();
    const thresholdsToFlag = getThresholdsToFlag(audienceLevel);
    const flaggedTerms: Array<{ term: string; reason: string; suggestion: string }> = [];
    const seen = new Set<string>();

    for (const entry of JARGON_DICTIONARY) {
      if (!thresholdsToFlag.has(entry.threshold)) continue;

      const termLower = entry.term.toLowerCase();
      if (seen.has(termLower)) continue;

      // Match whole word or phrase (case-insensitive), with optional trailing 's' for plurals
      const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}s?\\b`, 'i');

      if (regex.test(textLower)) {
        seen.add(termLower);
        flaggedTerms.push({
          term: entry.term,
          reason: entry.reason,
          suggestion: entry.suggestion,
        });
      }
    }

    return {
      flaggedTerms,
      audienceLevel,
      totalFlagged: flaggedTerms.length,
    };
  },
});
