import { describe, it, expect, vi } from 'vitest';
import { MDocument } from '@mastra/rag';
import { PgVector } from '@mastra/pg';
import { createVectorQueryTool } from '@mastra/rag';
import { openai } from '@ai-sdk/openai';
import { BEST_PRACTICES_CONTENT, BEST_PRACTICES_INDEX_NAME, EMBEDDING_DIMENSION } from '../best-practices-content';
import { createBestPracticesIndex, indexBestPractices } from '../best-practices';

// Mock embedMany at file scope — vi.mock is hoisted regardless of placement
vi.mock('ai', () => ({
  embedMany: vi.fn().mockResolvedValue({
    embeddings: Array.from({ length: 20 }, () => Array.from({ length: 1536 }, () => Math.random())),
  }),
}));

// --- Task 1.3-1.4: Mastra API Verification Tests ---

describe('Mastra RAG API verification', () => {
  it('should import MDocument from @mastra/rag', () => {
    expect(MDocument).toBeDefined();
    expect(typeof MDocument.fromText).toBe('function');
  });

  it('should import createVectorQueryTool from @mastra/rag', () => {
    expect(createVectorQueryTool).toBeDefined();
    expect(typeof createVectorQueryTool).toBe('function');
  });

  it('should import PgVector from @mastra/pg', () => {
    expect(PgVector).toBeDefined();
    expect(typeof PgVector).toBe('function');
  });

  it('should create embedding model from @ai-sdk/openai', () => {
    const embeddingModel = openai.embedding('text-embedding-3-small');
    expect(embeddingModel).toBeDefined();
    expect(embeddingModel.modelId).toBe('text-embedding-3-small');
  });
});

// --- Task 2: MDocument chunking tests ---

describe('MDocument chunking', () => {
  const sampleContent = `# Talk Structure Patterns

## Problem-Solution-Demo
Start with a real-world pain point that the audience recognizes. Present your solution clearly. Then demonstrate it live. This structure builds credibility through demonstration.

## Story Arc
Take the audience on a narrative journey. Set up the context, build tension through rising action, reach a climax with your key insight, and resolve with practical takeaways. This approach engages emotionally.

## Hook Techniques
Open with a surprising statistic. Ask a provocative question. Share a brief personal anecdote. Make a bold claim. The first 30 seconds determine whether the audience stays engaged.`;

  it('should create MDocument from text content', () => {
    const doc = MDocument.fromText(sampleContent);
    expect(doc).toBeDefined();
    expect(doc).toBeInstanceOf(MDocument);
  });

  it('should chunk content into non-empty array', async () => {
    const doc = MDocument.fromText(sampleContent);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 512,
      overlap: 50,
    });
    expect(chunks).toBeDefined();
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should produce chunks with text property', async () => {
    const doc = MDocument.fromText(sampleContent);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 512,
      overlap: 50,
    });
    for (const chunk of chunks) {
      expect(chunk.text).toBeDefined();
      expect(typeof chunk.text).toBe('string');
      expect(chunk.text.length).toBeGreaterThan(0);
    }
  });
});

// --- Task 2 (continued): Best practices content ---

describe('best practices content', () => {
  it('should export non-empty content string', () => {
    expect(typeof BEST_PRACTICES_CONTENT).toBe('string');
    expect(BEST_PRACTICES_CONTENT.length).toBeGreaterThan(1000);
  });

  it('should export valid index name with underscores only', () => {
    expect(BEST_PRACTICES_INDEX_NAME).toBe('best_practices');
    expect(BEST_PRACTICES_INDEX_NAME).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
  });

  it('should export correct embedding dimension for text-embedding-3-small', () => {
    expect(EMBEDDING_DIMENSION).toBe(1536);
  });

  it('should cover key best practices topics', () => {
    expect(BEST_PRACTICES_CONTENT).toContain('Talk Structure');
    expect(BEST_PRACTICES_CONTENT).toContain('Opening Hook');
    expect(BEST_PRACTICES_CONTENT).toContain('Audience Engagement');
    expect(BEST_PRACTICES_CONTENT).toContain('Pacing');
    expect(BEST_PRACTICES_CONTENT).toContain('Call to Action');
  });
});

// --- Task 3: Index creation and embedding pipeline (mocked) ---

describe('createBestPracticesIndex', () => {
  it('should call pgVector.createIndex with correct params', async () => {
    const mockPgVector = {
      createIndex: vi.fn().mockResolvedValue(undefined),
    } as unknown as PgVector;

    await createBestPracticesIndex(mockPgVector);

    expect(mockPgVector.createIndex).toHaveBeenCalledWith({
      indexName: 'best_practices',
      dimension: 1536,
      metric: 'cosine',
    });
  });
});

describe('indexBestPractices', () => {
  it('should chunk content, generate embeddings, and upsert to pgvector', async () => {
    const mockPgVector = {
      upsert: vi.fn().mockResolvedValue([]),
    } as unknown as PgVector;

    const result = await indexBestPractices(mockPgVector);

    expect(result.chunksIndexed).toBeGreaterThan(0);
    expect(mockPgVector.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: 'best_practices',
        vectors: expect.any(Array),
        metadata: expect.any(Array),
      }),
    );

    // Verify metadata has text field
    const upsertCall = (mockPgVector.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(upsertCall.metadata.length).toBeGreaterThan(0);
    for (const meta of upsertCall.metadata) {
      expect(meta.text).toBeDefined();
      expect(typeof meta.text).toBe('string');
    }
  });
});

// --- Task 4: Vector query tool configuration tests ---

describe('bestPracticesQueryTool configuration', () => {
  it('should create a valid vector query tool with correct config', () => {
    const tool = createVectorQueryTool({
      id: 'query-best-practices',
      vectorStoreName: 'pgVector',
      indexName: 'best_practices',
      model: openai.embedding('text-embedding-3-small'),
      description: 'Query curated conference talk best practices for structure, pacing, hooks, and audience engagement guidance',
    });
    expect(tool).toBeDefined();
    expect(tool.id).toBe('query-best-practices');
    expect(tool.description).toBe('Query curated conference talk best practices for structure, pacing, hooks, and audience engagement guidance');
  });
});
