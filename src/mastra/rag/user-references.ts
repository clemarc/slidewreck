import { MDocument } from '@mastra/rag';
import { PgVector } from '@mastra/pg';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { readFile } from 'fs/promises';
import { EMBEDDING_DIMENSION } from './best-practices-content';

export const USER_REFERENCES_INDEX_NAME = 'user_references';

const EMBEDDING_MODEL = openai.embedding('text-embedding-3-small');
const FETCH_TIMEOUT_MS = 30_000;

/**
 * Deletes and recreates the user references index for a clean state per pipeline run.
 * Handles the case where the index doesn't exist yet (first run).
 */
export async function clearUserReferences(pgVector: PgVector): Promise<void> {
  try {
    await pgVector.deleteIndex({ indexName: USER_REFERENCES_INDEX_NAME });
  } catch {
    // Index may not exist on first run — safe to ignore
  }
  await pgVector.createIndex({
    indexName: USER_REFERENCES_INDEX_NAME,
    dimension: EMBEDDING_DIMENSION,
    metric: 'cosine',
  });
}

/**
 * Indexes speaker reference materials into pgvector.
 * Processes each material individually — failures are captured without blocking.
 */
export async function indexUserReferences(
  pgVector: PgVector,
  materials: Array<{ type: 'file' | 'url'; path: string }>,
): Promise<{ indexed: number; failed: string[] }> {
  if (materials.length === 0) {
    return { indexed: 0, failed: [] };
  }

  const failed: string[] = [];
  const allChunks: Array<{ text: string }> = [];

  for (const material of materials) {
    try {
      let doc: MDocument;
      if (material.type === 'file') {
        const content = await readFile(material.path, 'utf-8');
        doc = material.path.endsWith('.md')
          ? MDocument.fromMarkdown(content)
          : MDocument.fromText(content);
      } else {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
          const response = await fetch(material.path, { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const html = await response.text();
          doc = MDocument.fromHTML(html);
        } finally {
          clearTimeout(timeout);
        }
      }

      const chunks = await doc.chunk({
        strategy: 'recursive',
        maxSize: 512,
        overlap: 50,
      });
      allChunks.push(...chunks.map(c => ({ text: c.text })));
    } catch {
      failed.push(material.path);
    }
  }

  if (allChunks.length > 0) {
    const { embeddings } = await embedMany({
      values: allChunks.map(c => c.text),
      model: EMBEDDING_MODEL,
    });

    await pgVector.upsert({
      indexName: USER_REFERENCES_INDEX_NAME,
      vectors: embeddings,
      metadata: allChunks,
    });
  }

  return { indexed: allChunks.length, failed };
}
