import { createVectorQueryTool } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';
import { USER_REFERENCES_INDEX_NAME } from '../rag/user-references';

/**
 * RAG tool for querying speaker-uploaded reference materials.
 * Agents use this tool to retrieve context from the speaker's own blog posts, docs, and code samples.
 */
export const userReferencesQueryTool = createVectorQueryTool({
  id: 'query-user-references',
  vectorStoreName: 'pgVector',
  indexName: USER_REFERENCES_INDEX_NAME,
  model: openai.embedding('text-embedding-3-small'),
  description: 'Query speaker-uploaded reference materials (blog posts, docs, code samples) for personal context and expertise',
});
