import { describe, it, expect } from 'vitest';
import { deriveStepStatus, findActiveStepId } from '../components/step-progress';
import type { StepState } from '../lib/mastra-client';
import { WORKFLOW_STEPS } from '../lib/workflow-steps';

function makeStep(status: StepState['status']): StepState {
  return {
    status,
    startedAt: Date.now(),
    endedAt: Date.now(),
  };
}

describe('deriveStepStatus', () => {
  it('returns pending when steps is undefined', () => {
    expect(deriveStepStatus('review-research', undefined)).toBe('pending');
  });

  it('returns pending when step not in record', () => {
    expect(deriveStepStatus('review-research', {})).toBe('pending');
  });

  it('returns the step status when present', () => {
    const steps: Record<string, StepState> = {
      'review-research': makeStep('success'),
    };
    expect(deriveStepStatus('review-research', steps)).toBe('success');
  });

  it('returns suspended for suspended step', () => {
    const steps: Record<string, StepState> = {
      'review-research': {
        ...makeStep('suspended'),
        suspendPayload: { agentId: 'researcher', gateId: 'review-research', output: {}, summary: 'test' },
      },
    };
    expect(deriveStepStatus('review-research', steps)).toBe('suspended');
  });
});

describe('findActiveStepId', () => {
  it('returns null when steps is undefined', () => {
    // When steps is undefined, all are pending — returns first pending
    expect(findActiveStepId(undefined)).toBe('collect-references');
  });

  it('returns first running step', () => {
    const steps: Record<string, StepState> = {
      'collect-references': makeStep('success'),
      'review-research': makeStep('success'),
      'architect-structure': makeStep('running'),
    };
    expect(findActiveStepId(steps)).toBe('architect-structure');
  });

  it('returns suspended step over pending', () => {
    const steps: Record<string, StepState> = {
      'collect-references': makeStep('success'),
      'review-research': makeStep('suspended'),
    };
    expect(findActiveStepId(steps)).toBe('review-research');
  });

  it('returns null when all steps are success', () => {
    const steps: Record<string, StepState> = {};
    for (const meta of WORKFLOW_STEPS) {
      steps[meta.id] = makeStep('success');
    }
    expect(findActiveStepId(steps)).toBeNull();
  });

  it('returns first pending step when none are running/suspended', () => {
    const steps: Record<string, StepState> = {
      'collect-references': makeStep('success'),
      'review-research': makeStep('success'),
    };
    expect(findActiveStepId(steps)).toBe('architect-structure');
  });
});
