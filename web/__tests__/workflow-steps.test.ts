import { describe, it, expect } from 'vitest';
import { WORKFLOW_STEPS, STEP_IDS } from '../lib/workflow-steps';

describe('WORKFLOW_STEPS', () => {
  it('has 10 user-visible steps', () => {
    expect(WORKFLOW_STEPS).toHaveLength(10);
  });

  it('starts with collect-references and ends with render-diagrams', () => {
    expect(WORKFLOW_STEPS[0].id).toBe('collect-references');
    expect(WORKFLOW_STEPS[WORKFLOW_STEPS.length - 1].id).toBe('render-diagrams');
  });

  it('marks gate steps as canSuspend', () => {
    const gateSteps = WORKFLOW_STEPS.filter((s) => s.canSuspend);
    const gateIds = gateSteps.map((s) => s.id);
    expect(gateIds).toEqual([
      'collect-references',
      'review-research',
      'architect-structure',
      'review-script',
      'review-slides',
    ]);
  });

  it('marks non-gate steps as !canSuspend', () => {
    const nonGateSteps = WORKFLOW_STEPS.filter((s) => !s.canSuspend);
    expect(nonGateSteps.length).toBe(5);
    expect(nonGateSteps.every((s) => s.canSuspend === false)).toBe(true);
  });

  it('has a label for every step', () => {
    for (const step of WORKFLOW_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
    }
  });

  it('STEP_IDS matches step order', () => {
    expect(STEP_IDS).toEqual(WORKFLOW_STEPS.map((s) => s.id));
  });

  it('has no duplicate step IDs', () => {
    const uniqueIds = new Set(STEP_IDS);
    expect(uniqueIds.size).toBe(STEP_IDS.length);
  });
});
