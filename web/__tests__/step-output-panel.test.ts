import { describe, it, expect } from 'vitest';

describe('StepOutputPanel', () => {
  it('exports StepOutputPanel component', async () => {
    const mod = await import('../components/step-output-panel');
    expect(mod.StepOutputPanel).toBeDefined();
    expect(typeof mod.StepOutputPanel).toBe('function');
  });

  it('exports STEP_RENDERERS mapping', async () => {
    const { STEP_RENDERERS } = await import('../components/step-output-panel');
    expect(STEP_RENDERERS).toBeDefined();
    expect(typeof STEP_RENDERERS).toBe('object');
  });

  it('STEP_RENDERERS maps gate steps to renderers', async () => {
    const { STEP_RENDERERS } = await import('../components/step-output-panel');
    expect(STEP_RENDERERS['review-research']).toBeDefined();
    expect(STEP_RENDERERS['architect-structure']).toBeDefined();
    expect(STEP_RENDERERS['script-writer']).toBeDefined();
    expect(STEP_RENDERERS['review-script']).toBeDefined();
    expect(STEP_RENDERERS['designer-outline']).toBeDefined();
    expect(STEP_RENDERERS['designer-content-fill']).toBeDefined();
    expect(STEP_RENDERERS['review-slides']).toBeDefined();
  });

  it('STEP_RENDERERS does not map build/render steps (fallback to JSON)', async () => {
    const { STEP_RENDERERS } = await import('../components/step-output-panel');
    expect(STEP_RENDERERS['build-slides']).toBeUndefined();
    expect(STEP_RENDERERS['render-diagrams']).toBeUndefined();
  });

  it('SKIP_STEPS includes collect-references', async () => {
    const { SKIP_STEPS } = await import('../components/step-output-panel');
    expect(SKIP_STEPS.has('collect-references')).toBe(true);
  });

  it('extractStepOutput prefers suspendPayload.output over direct output', async () => {
    const { extractStepOutput } = await import('../components/step-output-panel');

    const stepWithSuspend = {
      status: 'success' as const,
      output: { direct: true },
      suspendPayload: { agentId: 'a', gateId: 'g', output: { suspended: true }, summary: 's' },
      startedAt: 0,
      endedAt: 1,
    };
    expect(extractStepOutput(stepWithSuspend)).toEqual({ suspended: true });
  });

  it('extractStepOutput falls back to direct output when no suspendPayload', async () => {
    const { extractStepOutput } = await import('../components/step-output-panel');

    const stepDirect = {
      status: 'success' as const,
      output: { directOutput: true },
      startedAt: 0,
      endedAt: 1,
    };
    expect(extractStepOutput(stepDirect)).toEqual({ directOutput: true });
  });

  it('extractStepOutput returns null when no output available', async () => {
    const { extractStepOutput } = await import('../components/step-output-panel');

    const emptyStep = {
      status: 'success' as const,
      startedAt: 0,
      endedAt: 1,
    };
    expect(extractStepOutput(emptyStep)).toBeNull();
  });
});

describe('StepProgress with expandable steps', () => {
  it('exports StepProgress with expandedStepId and onStepClick props', async () => {
    const mod = await import('../components/step-progress');
    expect(mod.StepProgress).toBeDefined();
    expect(typeof mod.StepProgress).toBe('function');
  });

  it('deriveStepStatus returns pending for unknown steps', async () => {
    const { deriveStepStatus } = await import('../components/step-progress');
    expect(deriveStepStatus('unknown-step', undefined)).toBe('pending');
    expect(deriveStepStatus('unknown-step', {})).toBe('pending');
  });

  it('deriveStepStatus returns correct status from step record', async () => {
    const { deriveStepStatus } = await import('../components/step-progress');
    const steps = {
      'review-research': { status: 'success' as const, startedAt: 0, endedAt: 1 },
    };
    expect(deriveStepStatus('review-research', steps)).toBe('success');
  });
});
