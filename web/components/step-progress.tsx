'use client';

import type { StepState } from '@/lib/mastra-client';
import { WORKFLOW_STEPS } from '@/lib/workflow-steps';
import type { RunStatus } from '@/lib/mastra-client';

/**
 * Derive the display status for a step given the API step records.
 * Steps not yet in the `steps` record are pending.
 */
export function deriveStepStatus(
  stepId: string,
  steps: Record<string, StepState> | undefined,
): RunStatus {
  if (!steps) return 'pending';
  const state = steps[stepId];
  if (!state) return 'pending';
  return state.status;
}

/**
 * Find the ID of the currently active (first non-success/non-failed) step,
 * or null if all steps are terminal.
 */
export function findActiveStepId(
  steps: Record<string, StepState> | undefined,
): string | null {
  for (const meta of WORKFLOW_STEPS) {
    const status = deriveStepStatus(meta.id, steps);
    if (status === 'running' || status === 'suspended' || status === 'waiting') {
      return meta.id;
    }
  }
  // If no step is actively running/suspended, find first pending
  for (const meta of WORKFLOW_STEPS) {
    const status = deriveStepStatus(meta.id, steps);
    if (status === 'pending') {
      return meta.id;
    }
  }
  return null;
}

function StepIcon({ status, isActive }: { status: RunStatus; isActive: boolean }) {
  if (status === 'success') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white text-xs">
        &#10003;
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs">
        &#10007;
      </div>
    );
  }
  if (status === 'suspended') {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-400 text-white text-xs">
        &#9612;
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="flex h-6 w-6 animate-pulse items-center justify-center rounded-full bg-yellow-400 text-white text-xs">
        &#9679;
      </div>
    );
  }
  // pending
  return (
    <div
      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
        isActive ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 bg-white'
      }`}
    />
  );
}

export interface StepProgressProps {
  steps: Record<string, StepState> | undefined;
}

export function StepProgress({ steps }: StepProgressProps) {
  const activeStepId = findActiveStepId(steps);

  return (
    <div className="space-y-1">
      {WORKFLOW_STEPS.map((meta, index) => {
        const status = deriveStepStatus(meta.id, steps);
        const isActive = meta.id === activeStepId;
        const isLast = index === WORKFLOW_STEPS.length - 1;

        return (
          <div key={meta.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <StepIcon status={status} isActive={isActive} />
              {!isLast && (
                <div
                  className={`h-4 w-0.5 ${
                    status === 'success' ? 'bg-green-300' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
            <div className={`flex items-center gap-2 pb-3 ${isActive ? 'font-medium' : ''}`}>
              <span
                className={
                  status === 'success'
                    ? 'text-green-700'
                    : status === 'failed'
                      ? 'text-red-700'
                      : status === 'suspended'
                        ? 'text-blue-600'
                        : status === 'running'
                          ? 'text-yellow-700'
                          : 'text-gray-500'
                }
              >
                {meta.label}
              </span>
              {meta.canSuspend && (
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                  Gate
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
