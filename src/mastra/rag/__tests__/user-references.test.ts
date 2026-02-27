import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MDocument } from '@mastra/rag';
import type { PgVector } from '@mastra/pg';

// Mock embedMany at file scope (hoisted)
vi.mock('ai', () => ({
  embedMany: vi.fn().mockResolvedValue({
    embeddings: Array.from({ length: 10 }, () =>
      Array.from({ length: 1536 }, () => Math.random()),
    ),
  }),
}));

// Mock fs/promises at file scope (hoisted)
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// --- MDocument.fromMarkdown and fromHTML API verification ---

describe('MDocument fromMarkdown and fromHTML', () => {
  it('should create MDocument from markdown content and chunk it', async () => {
    const markdown = `# My Blog Post

## Introduction

This is a blog post about building conference talks with AI assistance.

## Key Points

- Use structured approaches
- Engage the audience early
- Practice with real feedback`;

    const doc = MDocument.fromMarkdown(markdown);
    expect(doc).toBeInstanceOf(MDocument);

    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 512,
      overlap: 50,
    });
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.text).toBeDefined();
      expect(chunk.text.length).toBeGreaterThan(0);
    }
  });

  it('should create MDocument from HTML content and chunk it', async () => {
    const html = `<html><body>
      <h1>Article Title</h1>
      <p>This is a paragraph about conference presentations and public speaking techniques.</p>
      <h2>Section Two</h2>
      <p>More content about engagement strategies and audience interaction patterns.</p>
    </body></html>`;

    const doc = MDocument.fromHTML(html);
    expect(doc).toBeInstanceOf(MDocument);

    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 512,
      overlap: 50,
    });
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.text).toBeDefined();
      expect(chunk.text.length).toBeGreaterThan(0);
    }
  });
});

// --- User references constants and indexing ---

describe('user references constants', () => {
  it('should export valid index name with underscores', async () => {
    const { USER_REFERENCES_INDEX_NAME } = await import('../user-references');
    expect(USER_REFERENCES_INDEX_NAME).toBe('user_references');
    expect(USER_REFERENCES_INDEX_NAME).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
  });
});

describe('indexUserReferences', () => {
  let mockPgVector: {
    createIndex: ReturnType<typeof vi.fn>;
    deleteIndex: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    mockPgVector = {
      createIndex: vi.fn().mockResolvedValue(undefined),
      deleteIndex: vi.fn().mockResolvedValue(undefined),
      upsert: vi.fn().mockResolvedValue([]),
    };
  });

  it('should index markdown file content into pgvector', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('# My Blog Post\n\nContent about presentations.');

    const { indexUserReferences } = await import('../user-references');

    const result = await indexUserReferences(mockPgVector as unknown as PgVector, [
      { type: 'file', path: '/docs/blog.md' },
    ]);

    expect(result.indexed).toBeGreaterThan(0);
    expect(result.failed).toEqual([]);
    expect(mockPgVector.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: 'user_references',
        vectors: expect.any(Array),
        metadata: expect.any(Array),
      }),
    );
  });

  it('should index URL content as HTML into pgvector', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<html><body><p>Article content here.</p></body></html>'),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { indexUserReferences } = await import('../user-references');

    const result = await indexUserReferences(mockPgVector as unknown as PgVector, [
      { type: 'url', path: 'https://example.com/article' },
    ]);

    expect(result.indexed).toBeGreaterThan(0);
    expect(result.failed).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/article',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );

    vi.unstubAllGlobals();
  });

  it('should return indexed count and empty failed array on success', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockResolvedValue('Some plain text content for testing.');

    const { indexUserReferences } = await import('../user-references');

    const result = await indexUserReferences(mockPgVector as unknown as PgVector, [
      { type: 'file', path: '/docs/notes.txt' },
    ]);

    expect(typeof result.indexed).toBe('number');
    expect(result.indexed).toBeGreaterThan(0);
    expect(Array.isArray(result.failed)).toBe(true);
    expect(result.failed).toHaveLength(0);
  });

  it('should capture failed materials without throwing', async () => {
    const { readFile } = await import('fs/promises');
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file'));

    const mockFailFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFailFetch);

    const { indexUserReferences } = await import('../user-references');

    const result = await indexUserReferences(mockPgVector as unknown as PgVector, [
      { type: 'file', path: '/docs/missing.md' },
      { type: 'url', path: 'https://unreachable.example.com' },
    ]);

    expect(result.indexed).toBe(0);
    expect(result.failed).toContain('/docs/missing.md');
    expect(result.failed).toContain('https://unreachable.example.com');
    expect(mockPgVector.upsert).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it('should handle empty materials array as no-op', async () => {
    const { indexUserReferences } = await import('../user-references');

    const result = await indexUserReferences(mockPgVector as unknown as PgVector, []);

    expect(result.indexed).toBe(0);
    expect(result.failed).toEqual([]);
    expect(mockPgVector.upsert).not.toHaveBeenCalled();
  });
});

describe('clearUserReferences', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should delete and recreate user references index', async () => {
    const mockPgVector = {
      deleteIndex: vi.fn().mockResolvedValue(undefined),
      createIndex: vi.fn().mockResolvedValue(undefined),
    };

    const { clearUserReferences } = await import('../user-references');

    await clearUserReferences(mockPgVector as unknown as PgVector);

    expect(mockPgVector.deleteIndex).toHaveBeenCalledWith({
      indexName: 'user_references',
    });
    expect(mockPgVector.createIndex).toHaveBeenCalledWith({
      indexName: 'user_references',
      dimension: 1536,
      metric: 'cosine',
    });
  });
});
