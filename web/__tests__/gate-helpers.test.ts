import { describe, it, expect } from 'vitest';
import { findSuspendedStep } from '../lib/gate-helpers';
import type { StepState } from '../lib/mastra-client';

function makeStep(status: StepState['status'], extras?: Partial<StepState>): StepState {
  return {
    status,
    startedAt: Date.now(),
    endedAt: Date.now(),
    ...extras,
  };
}

describe('findSuspendedStep', () => {
  it('returns null when steps is undefined', () => {
    expect(findSuspendedStep(undefined)).toBeNull();
  });

  it('returns null when no steps are suspended', () => {
    const steps: Record<string, StepState> = {
      'collect-references': makeStep('success'),
      'review-research': makeStep('running'),
    };
    expect(findSuspendedStep(steps)).toBeNull();
  });

  it('returns null when step is suspended but has no suspendPayload', () => {
    const steps: Record<string, StepState> = {
      'review-research': makeStep('suspended'),
    };
    expect(findSuspendedStep(steps)).toBeNull();
  });

  it('returns suspended step with payload', () => {
    const payload = {
      agentId: 'researcher',
      gateId: 'review-research',
      output: { keyFindings: [] },
      summary: 'Research brief ready for review',
    };
    const steps: Record<string, StepState> = {
      'collect-references': makeStep('success'),
      'review-research': makeStep('suspended', { suspendPayload: payload }),
    };

    const result = findSuspendedStep(steps);
    expect(result).not.toBeNull();
    expect(result!.stepId).toBe('review-research');
    expect(result!.suspendPayload).toEqual(payload);
  });

  it('returns first suspended step when multiple are suspended', () => {
    const payload1 = {
      agentId: 'researcher',
      gateId: 'review-research',
      output: {},
      summary: 'First gate',
    };
    const payload2 = {
      agentId: 'architect',
      gateId: 'architect-structure',
      output: {},
      summary: 'Second gate',
    };
    const steps: Record<string, StepState> = {
      'review-research': makeStep('suspended', { suspendPayload: payload1 }),
      'architect-structure': makeStep('suspended', { suspendPayload: payload2 }),
    };

    const result = findSuspendedStep(steps);
    expect(result).not.toBeNull();
    expect(result!.suspendPayload.gateId).toBeDefined();
  });
});
