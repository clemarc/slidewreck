import { createVectorQueryTool } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';
import { BEST_PRACTICES_INDEX_NAME } from '../rag/best-practices-content';

/**
 * RAG tool for querying the curated conference talk best practices knowledge base.
 * Agents use this tool to retrieve guidance on structure, pacing, hooks, and engagement.
 */
export const bestPracticesQueryTool = createVectorQueryTool({
  id: 'query-best-practices',
  vectorStoreName: 'pgVector',
  indexName: BEST_PRACTICES_INDEX_NAME,
  model: openai.embedding('text-embedding-3-small'),
  description: 'Query curated conference talk best practices for structure, pacing, hooks, and audience engagement guidance',
});
