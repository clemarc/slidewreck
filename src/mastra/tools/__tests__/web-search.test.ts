import { describe, it, expect, vi, afterEach } from 'vitest';

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

  it('should default to anthropic provider and return a provider-defined tool', async () => {
    const { createWebSearchTool } = await import('../web-search');
    const tool = await createWebSearchTool();
    expect(tool).toBeDefined();
    expect(typeof tool).toBe('object');
    expect(tool).toHaveProperty('type');
  });

  it('should return a tool for anthropic provider explicitly', async () => {
    const { createWebSearchTool } = await import('../web-search');
    const tool = await createWebSearchTool('anthropic');
    expect(tool).toBeDefined();
    expect(tool).toHaveProperty('type');
  });

  it('should throw for unsupported provider', async () => {
    const { createWebSearchTool } = await import('../web-search');
    await expect(
      createWebSearchTool('unsupported' as any),
    ).rejects.toThrow('Unsupported web search provider: unsupported');
  });

  it('should export webSearch as a resolved provider-defined tool', async () => {
    delete process.env.WEB_SEARCH_PROVIDER;
    const { webSearch } = await import('../web-search');
    expect(webSearch).toBeDefined();
    expect(typeof webSearch).toBe('object');
    expect(webSearch).toHaveProperty('type');
  });

  it('should export createWebSearchTool as an async function', async () => {
    const { createWebSearchTool } = await import('../web-search');
    expect(typeof createWebSearchTool).toBe('function');
    const result = createWebSearchTool();
    expect(result).toBeInstanceOf(Promise);
  });
});
