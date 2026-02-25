import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPage } from '../fetch-page';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to assert result is not a ValidationError
function assertOutput(result: unknown): asserts result is { content: string; title: string; url: string; contentLength: number } {
  expect(result).toBeDefined();
  expect(result).toHaveProperty('content');
}

describe('fetchPage tool', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should have correct tool ID', () => {
    expect(fetchPage.id).toBe('fetch-page');
  });

  it('should have a description', () => {
    expect(fetchPage.description).toBeDefined();
    expect(fetchPage.description!.length).toBeGreaterThan(0);
  });

  it('should have inputSchema that validates a URL', () => {
    expect(fetchPage.inputSchema).toBeDefined();
    const validResult = fetchPage.inputSchema!.safeParse({ url: 'https://example.com' });
    expect(validResult.success).toBe(true);

    const invalidResult = fetchPage.inputSchema!.safeParse({ url: 'not-a-url' });
    expect(invalidResult.success).toBe(false);
  });

  it('should have outputSchema defined', () => {
    expect(fetchPage.outputSchema).toBeDefined();
  });

  it('should extract text content from HTML', async () => {
    const htmlContent = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Hello World</h1>
          <p>This is a test paragraph.</p>
          <script>console.log('ignored');</script>
          <style>.hidden { display: none; }</style>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(htmlContent),
    });

    const result = await fetchPage.execute!({ url: 'https://example.com' }, {} as any);
    assertOutput(result);
    expect(result.title).toBe('Test Page');
    expect(result.url).toBe('https://example.com');
    expect(result.content).toContain('Hello World');
    expect(result.content).toContain('This is a test paragraph');
    expect(result.content).not.toContain('console.log');
    expect(result.content).not.toContain('display: none');
    expect(result.contentLength).toBeGreaterThan(0);
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await fetchPage.execute!({ url: 'https://example.com/404' }, {} as any);
    assertOutput(result);
    expect(result.content).toContain('404');
  });

  it('should throw on network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchPage.execute!({ url: 'https://unreachable.example.com' }, {} as any),
    ).rejects.toThrow('Network error');
  });

  it('should truncate content exceeding size limit', async () => {
    const largeContent = 'x'.repeat(200_000);
    const html = `<html><head><title>Large</title></head><body>${largeContent}</body></html>`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(html),
    });

    const result = await fetchPage.execute!({ url: 'https://example.com/large' }, {} as any);
    assertOutput(result);
    expect(result.contentLength).toBeLessThanOrEqual(100_000);
  });
});
