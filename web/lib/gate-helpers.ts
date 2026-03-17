import type { StepState, StepSuspendPayload } from './mastra-client';

export interface SuspendedGate {
  stepId: string;
  suspendPayload: StepSuspendPayload;
}

/**
 * Find the first suspended step in a run's step record.
 * Returns the step ID and its suspend payload, or null if no step is suspended.
 */
export function findSuspendedStep(
  steps: Record<string, StepState> | undefined,
): SuspendedGate | null {
  if (!steps) return null;

  for (const [stepId, state] of Object.entries(steps)) {
    if (state.status === 'suspended' && state.suspendPayload) {
      return { stepId, suspendPayload: state.suspendPayload };
    }
  }

  return null;
}
