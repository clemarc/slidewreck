import { MDocument } from '@mastra/rag';
import { PgVector } from '@mastra/pg';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  BEST_PRACTICES_CONTENT,
  BEST_PRACTICES_INDEX_NAME,
  EMBEDDING_DIMENSION,
} from './best-practices-content';

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');

/**
 * Creates the pgvector index for best practices embeddings.
 * Safe to call multiple times — PgVector handles idempotent index creation.
 */
export async function createBestPracticesIndex(pgVector: PgVector): Promise<void> {
  await pgVector.createIndex({
    indexName: BEST_PRACTICES_INDEX_NAME,
    dimension: EMBEDDING_DIMENSION,
    metric: 'cosine',
  });
}

/**
 * Chunks and indexes the curated best practices content into pgvector.
 * Processes: content → chunks → embeddings → upsert.
 */
export async function indexBestPractices(pgVector: PgVector): Promise<{ chunksIndexed: number }> {
  // Chunk the curated content
  const doc = MDocument.fromText(BEST_PRACTICES_CONTENT);
  const chunks = await doc.chunk({
    strategy: 'recursive',
    maxSize: 512,
    overlap: 50,
  });

  // Generate embeddings
  const { embeddings } = await embedMany({
    values: chunks.map(chunk => chunk.text),
    model: EMBEDDING_MODEL,
  });

  // Upsert into pgvector
  await pgVector.upsert({
    indexName: BEST_PRACTICES_INDEX_NAME,
    vectors: embeddings,
    metadata: chunks.map(chunk => ({ text: chunk.text })),
  });

  return { chunksIndexed: chunks.length };
}
