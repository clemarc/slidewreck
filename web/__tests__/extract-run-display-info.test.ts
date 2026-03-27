import { describe, it, expect } from 'vitest';
import { extractRunDisplayInfo } from '../lib/mastra-client';
import type { WorkflowRun } from '../lib/mastra-client';

function makeRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    runId: 'run-1',
    status: 'success',
    createdAt: '2026-03-26T00:00:00Z',
    updatedAt: '2026-03-26T00:00:00Z',
    ...overrides,
  };
}

describe('extractRunDisplayInfo', () => {
  it('returns polished title from result.deckSpec.title', () => {
    const run = makeRun({
      result: {
        deckSpec: { title: 'A World Transformed by El Niño' },
        metadata: { input: { topic: 'el nino effects', format: 'standard' } },
      },
    });
    expect(extractRunDisplayInfo(run)).toEqual({
      title: 'A World Transformed by El Niño',
      format: 'standard',
    });
  });

  it('falls back to result.metadata.input.topic when deckSpec is missing', () => {
    const run = makeRun({
      result: {
        metadata: { input: { topic: 'quantum computing basics', format: 'lightning' } },
      },
    });
    expect(extractRunDisplayInfo(run)).toEqual({
      title: 'quantum computing basics',
      format: 'lightning',
    });
  });

  it('falls back to rawContext.input.topic for in-progress runs', () => {
    const run = makeRun({
      status: 'running',
      result: undefined,
      rawContext: {
        input: { topic: 'rust memory model', format: 'keynote' },
      },
    });
    expect(extractRunDisplayInfo(run)).toEqual({
      title: 'rust memory model',
      format: 'keynote',
    });
  });

  it('returns "Untitled" when no result and no rawContext', () => {
    const run = makeRun({
      status: 'pending',
      result: undefined,
      rawContext: undefined,
    });
    expect(extractRunDisplayInfo(run)).toEqual({
      title: 'Untitled',
      format: null,
    });
  });

  it('returns format for known format values', () => {
    for (const fmt of ['lightning', 'standard', 'keynote'] as const) {
      const run = makeRun({
        rawContext: { input: { topic: 'test', format: fmt } },
      });
      expect(extractRunDisplayInfo(run).format).toBe(fmt);
    }
  });

  it('returns null format for unknown format value', () => {
    const run = makeRun({
      rawContext: { input: { topic: 'test', format: 'webinar' } },
    });
    expect(extractRunDisplayInfo(run).format).toBeNull();
  });

  it('returns null format when format field is missing', () => {
    const run = makeRun({
      rawContext: { input: { topic: 'test' } },
    });
    expect(extractRunDisplayInfo(run).format).toBeNull();
  });
});
