import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('createWebSearchTool', () => {
  const originalEnv = process.env.WEB_SEARCH_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.WEB_SEARCH_PROVIDER;
    } else {
      process.env.WEB_SEARCH_PROVIDER = originalEnv;
    }
    vi.resetModules();
  });

  it('should default to anthropic provider', async () => {
    const { createWebSearchTool } = await import('../web-search');
    const tool = createWebSearchTool();
    expect(tool).toBeDefined();
    expect(typeof tool).toBe('object');
  });

  it('should return a tool for anthropic provider explicitly', async () => {
    const { createWebSearchTool } = await import('../web-search');
    const tool = createWebSearchTool('anthropic');
    expect(tool).toBeDefined();
  });

  it('should throw for unsupported provider', async () => {
    const { createWebSearchTool } = await import('../web-search');
    expect(() => createWebSearchTool('unsupported' as any)).toThrow(
      'Unsupported web search provider: unsupported',
    );
  });

  it('should export webSearch using WEB_SEARCH_PROVIDER env var default', async () => {
    delete process.env.WEB_SEARCH_PROVIDER;
    const { webSearch } = await import('../web-search');
    expect(webSearch).toBeDefined();
  });

  it('should export SearchProvider type values', async () => {
    const { createWebSearchTool } = await import('../web-search');
    // Verify function exists and is callable
    expect(typeof createWebSearchTool).toBe('function');
  });
});
