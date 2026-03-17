import { describe, it, expect } from 'vitest';
import { SpanType, EntityType } from '@mastra/core/observability';
import type { RecordedTrace, AnyRecordedSpan } from '@mastra/core/observability';

describe('SpanType enum coverage', () => {
  it('includes all expected pipeline span types', () => {
    // These are the span types that the TalkForge pipeline should produce
    // when observability is enabled (NFR-9, NFR-10)
    expect(SpanType.WORKFLOW_RUN).toBe('workflow_run');
    expect(SpanType.WORKFLOW_STEP).toBe('workflow_step');
    expect(SpanType.AGENT_RUN).toBe('agent_run');
    expect(SpanType.MODEL_GENERATION).toBe('model_generation');
    expect(SpanType.TOOL_CALL).toBe('tool_call');
  });

  it('includes suspend/resume span type (NFR-12 coverage for workflow gates)', () => {
    expect(SpanType.WORKFLOW_WAIT_EVENT).toBe('workflow_wait_event');
  });

  it('includes workflow control flow span types', () => {
    expect(SpanType.WORKFLOW_CONDITIONAL).toBe('workflow_conditional');
    expect(SpanType.WORKFLOW_PARALLEL).toBe('workflow_parallel');
    expect(SpanType.WORKFLOW_LOOP).toBe('workflow_loop');
    expect(SpanType.WORKFLOW_SLEEP).toBe('workflow_sleep');
  });

  it('includes model detail span types', () => {
    expect(SpanType.MODEL_STEP).toBe('model_step');
    expect(SpanType.MODEL_CHUNK).toBe('model_chunk');
  });

  it('does NOT include storage-specific span types (confirmed gap — storage ops not auto-traced)', () => {
    // Storage operations (PostgresStore reads/writes) do not have dedicated span types.
    // WORKFLOW_WAIT_EVENT covers suspend/resume state persistence.
    // Direct storage I/O tracing would require upstream @mastra/pg changes.
    const spanTypeValues = Object.values(SpanType);
    expect(spanTypeValues).not.toContain('storage_read');
    expect(spanTypeValues).not.toContain('storage_write');
  });
});

describe('EntityType enum', () => {
  it('includes workflow and agent entity types', () => {
    expect(EntityType.WORKFLOW_RUN).toBe('workflow_run');
    expect(EntityType.WORKFLOW_STEP).toBe('workflow_step');
    expect(EntityType.AGENT).toBe('agent');
    expect(EntityType.TOOL).toBe('tool');
  });
});

describe('RecordedTrace interface contract', () => {
  it('supports tree traversal via rootSpan → children', () => {
    // Verify the RecordedTrace interface shape works for programmatic access
    const mockChildSpan: AnyRecordedSpan = {
      id: 'span-2',
      traceId: 'trace-1',
      name: 'research-step',
      type: SpanType.WORKFLOW_STEP,
      startTime: new Date('2026-03-17T10:00:01Z'),
      endTime: new Date('2026-03-17T10:00:05Z'),
      isRootSpan: false,
      isEvent: false,
      parentSpanId: 'span-1',
      parent: undefined as unknown as AnyRecordedSpan, // circular ref placeholder
      children: [],
      addScore: () => {},
      addFeedback: () => {},
    };

    const mockRootSpan: AnyRecordedSpan = {
      id: 'span-1',
      traceId: 'trace-1',
      name: 'slidewreck-workflow',
      type: SpanType.WORKFLOW_RUN,
      startTime: new Date('2026-03-17T10:00:00Z'),
      endTime: new Date('2026-03-17T10:00:10Z'),
      isRootSpan: true,
      isEvent: false,
      children: [mockChildSpan],
      addScore: () => {},
      addFeedback: () => {},
    };
    // Wire up parent reference
    (mockChildSpan as { parent: AnyRecordedSpan }).parent = mockRootSpan;

    const mockTrace: RecordedTrace = {
      traceId: 'trace-1',
      rootSpan: mockRootSpan,
      spans: [mockRootSpan, mockChildSpan],
      getSpan: (id: string) => [mockRootSpan, mockChildSpan].find(s => s.id === id) ?? null,
      addScore: () => {},
      addFeedback: () => {},
    };

    // AC 2: Can traverse span tree via rootSpan → children
    expect(mockTrace.rootSpan.type).toBe(SpanType.WORKFLOW_RUN);
    expect(mockTrace.rootSpan.children).toHaveLength(1);
    expect(mockTrace.rootSpan.children[0].type).toBe(SpanType.WORKFLOW_STEP);

    // Can find spans for each pipeline phase
    expect(mockTrace.spans).toHaveLength(2);
    expect(mockTrace.getSpan('span-1')).toBe(mockRootSpan);
    expect(mockTrace.getSpan('span-2')).toBe(mockChildSpan);
    expect(mockTrace.getSpan('nonexistent')).toBeNull();
  });

  it('supports NFR-9 model generation attributes', () => {
    // Verify MODEL_GENERATION spans can carry NFR-9 required fields
    const modelSpan: AnyRecordedSpan = {
      id: 'span-model',
      traceId: 'trace-1',
      name: 'claude-generation',
      type: SpanType.MODEL_GENERATION,
      startTime: new Date('2026-03-17T10:00:01Z'),
      endTime: new Date('2026-03-17T10:00:03Z'),
      isRootSpan: false,
      isEvent: false,
      children: [],
      attributes: {
        model: 'claude-sonnet-4-5-20250514',
        provider: 'anthropic',
        usage: {
          inputTokens: 1500,
          outputTokens: 800,
          inputDetails: { text: 1200, cacheRead: 300 },
          outputDetails: { text: 700, reasoning: 100 },
        },
        streaming: true,
        finishReason: 'stop',
      },
      addScore: () => {},
      addFeedback: () => {},
    };

    // NFR-9: model name, provider, tokens (with cache/reasoning), latency, finish reason
    expect(modelSpan.attributes).toBeDefined();
    const attrs = modelSpan.attributes!;
    expect(attrs).toHaveProperty('model');
    expect(attrs).toHaveProperty('provider');
    expect(attrs).toHaveProperty('usage');
    expect(attrs).toHaveProperty('finishReason');
    // Latency derived from startTime/endTime
    expect(modelSpan.startTime).toBeDefined();
    expect(modelSpan.endTime).toBeDefined();
  });

  it('supports NFR-10 workflow step attributes', () => {
    const stepSpan: AnyRecordedSpan = {
      id: 'span-step',
      traceId: 'trace-1',
      name: 'research-step',
      type: SpanType.WORKFLOW_STEP,
      startTime: new Date('2026-03-17T10:00:01Z'),
      endTime: new Date('2026-03-17T10:00:05Z'),
      isRootSpan: false,
      isEvent: false,
      children: [],
      attributes: {
        status: 'completed',
      },
      addScore: () => {},
      addFeedback: () => {},
    };

    // NFR-10: step name, status, duration
    expect(stepSpan.name).toBe('research-step');
    expect(stepSpan.attributes).toHaveProperty('status');
    expect(stepSpan.startTime).toBeDefined();
    expect(stepSpan.endTime).toBeDefined();
  });

  it('supports WORKFLOW_WAIT_EVENT for suspend/resume tracing (AC 1)', () => {
    const waitSpan: AnyRecordedSpan = {
      id: 'span-wait',
      traceId: 'trace-1',
      name: 'review-gate-suspend',
      type: SpanType.WORKFLOW_WAIT_EVENT,
      startTime: new Date('2026-03-17T10:00:05Z'),
      endTime: new Date('2026-03-17T10:05:00Z'),
      isRootSpan: false,
      isEvent: false,
      children: [],
      attributes: {
        eventName: 'review-approved',
        eventReceived: true,
        waitDurationMs: 295000,
      },
      addScore: () => {},
      addFeedback: () => {},
    };

    // AC 1: suspend/resume operations are visible as spans
    expect(waitSpan.type).toBe(SpanType.WORKFLOW_WAIT_EVENT);
    expect(waitSpan.attributes).toHaveProperty('eventName');
    expect(waitSpan.attributes).toHaveProperty('eventReceived');
    expect(waitSpan.attributes).toHaveProperty('waitDurationMs');
  });
});
