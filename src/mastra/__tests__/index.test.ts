import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// DATABASE_URL must be set before any import of index.ts
const originalEnv = { ...process.env };
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

vi.mock('@mastra/core', () => {
  const Mastra = vi.fn();
  return { Mastra };
});
vi.mock('@mastra/pg', () => {
  const PostgresStore = vi.fn();
  const PgVector = vi.fn();
  return { PostgresStore, PgVector };
});
vi.mock('@mastra/core/logger', () => ({
  createLogger: vi.fn().mockReturnValue({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('../agents/researcher', () => ({ researcher: {} }));
vi.mock('../agents/talk-architect', () => ({ architect: {} }));
vi.mock('../agents/writer', () => ({ writer: {} }));
vi.mock('../workflows/slidewreck', () => ({ slidewreck: {} }));
vi.mock('../scorers/hook-strength', () => ({ hookStrengthScorer: { id: 'hook-strength' } }));
vi.mock('../scorers/narrative-coherence', () => ({
  narrativeCoherenceScorer: { id: 'narrative-coherence' },
}));
vi.mock('../scorers/pacing-distribution', () => ({
  pacingDistributionScorer: { id: 'pacing-distribution' },
}));
vi.mock('../scorers/jargon-density', () => ({
  jargonDensityScorer: { id: 'jargon-density' },
}));

describe('parseLogLevel', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv, DATABASE_URL: 'postgresql://test:test@localhost:5432/test' };
  });

  it('returns "debug" for undefined LOG_LEVEL (default)', async () => {
    const { parseLogLevel } = await import('../index');
    expect(parseLogLevel(undefined)).toBe('debug');
  });

  it('maps uppercase env values to lowercase LogLevel strings', async () => {
    const { parseLogLevel } = await import('../index');
    expect(parseLogLevel('DEBUG')).toBe('debug');
    expect(parseLogLevel('INFO')).toBe('info');
    expect(parseLogLevel('WARN')).toBe('warn');
    expect(parseLogLevel('ERROR')).toBe('error');
  });

  it('maps NONE to "silent"', async () => {
    const { parseLogLevel } = await import('../index');
    expect(parseLogLevel('NONE')).toBe('silent');
  });

  it('handles lowercase input', async () => {
    const { parseLogLevel } = await import('../index');
    expect(parseLogLevel('debug')).toBe('debug');
    expect(parseLogLevel('info')).toBe('info');
  });

  it('falls back to "debug" for unrecognized values', async () => {
    const { parseLogLevel } = await import('../index');
    expect(parseLogLevel('VERBOSE')).toBe('debug');
    expect(parseLogLevel('')).toBe('debug');
  });
});

describe('Mastra logger configuration', () => {
  afterEach(() => {
    process.env = { ...originalEnv, DATABASE_URL: 'postgresql://test:test@localhost:5432/test' };
  });

  it('creates logger with level from LOG_LEVEL env var', async () => {
    process.env.LOG_LEVEL = 'WARN';
    vi.resetModules();

    const { createLogger } = await import('@mastra/core/logger');
    await import('../index');

    expect(createLogger).toHaveBeenCalledWith({
      name: 'slidewreck',
      level: 'warn',
    });
  });

  it('defaults logger to DEBUG when LOG_LEVEL is not set', async () => {
    delete process.env.LOG_LEVEL;
    vi.resetModules();

    const { createLogger } = await import('@mastra/core/logger');
    await import('../index');

    expect(createLogger).toHaveBeenCalledWith({
      name: 'slidewreck',
      level: 'debug',
    });
  });
});

describe('Mastra scorers configuration', () => {
  afterEach(() => {
    process.env = { ...originalEnv, DATABASE_URL: 'postgresql://test:test@localhost:5432/test' };
  });

  it('registers hook-strength scorer', async () => {
    vi.resetModules();

    const { Mastra } = await import('@mastra/core');
    await import('../index');

    expect(Mastra).toHaveBeenCalledWith(
      expect.objectContaining({
        scorers: expect.objectContaining({
          'hook-strength': expect.anything(),
        }),
      }),
    );
  });

  it('registers narrative-coherence scorer', async () => {
    vi.resetModules();

    const { Mastra } = await import('@mastra/core');
    await import('../index');

    expect(Mastra).toHaveBeenCalledWith(
      expect.objectContaining({
        scorers: expect.objectContaining({
          'narrative-coherence': expect.anything(),
        }),
      }),
    );
  });

  it('registers pacing-distribution scorer', async () => {
    vi.resetModules();

    const { Mastra } = await import('@mastra/core');
    await import('../index');

    expect(Mastra).toHaveBeenCalledWith(
      expect.objectContaining({
        scorers: expect.objectContaining({
          'pacing-distribution': expect.anything(),
        }),
      }),
    );
  });

  it('registers jargon-density scorer', async () => {
    vi.resetModules();

    const { Mastra } = await import('@mastra/core');
    await import('../index');

    expect(Mastra).toHaveBeenCalledWith(
      expect.objectContaining({
        scorers: expect.objectContaining({
          'jargon-density': expect.anything(),
        }),
      }),
    );
  });
});

describe('Mastra vectors configuration', () => {
  afterEach(() => {
    process.env = { ...originalEnv, DATABASE_URL: 'postgresql://test:test@localhost:5432/test' };
  });

  it('registers pgVector in vectors config', async () => {
    vi.resetModules();

    const { Mastra } = await import('@mastra/core');
    const { PgVector } = await import('@mastra/pg');
    await import('../index');

    expect(PgVector).toHaveBeenCalledWith({
      id: 'pg-vector',
      connectionString: 'postgresql://test:test@localhost:5432/test',
    });
    expect(Mastra).toHaveBeenCalledWith(
      expect.objectContaining({
        vectors: expect.objectContaining({
          pgVector: expect.anything(),
        }),
      }),
    );
  });
});
