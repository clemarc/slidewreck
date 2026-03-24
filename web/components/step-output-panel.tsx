'use client';

import type { StepState } from '@/lib/mastra-client';
import { ResearchGate } from '@/components/gate-content/research-gate';
import { StructureGate } from '@/components/gate-content/structure-gate';
import { ScriptGate } from '@/components/gate-content/script-gate';
import { SlidesGate } from '@/components/gate-content/slides-gate';

/** Maps step IDs to the renderer component that should display their output */
const STEP_RENDERERS: Record<string, React.ComponentType<{ output: unknown }>> = {
  'review-research': ResearchGate,
  'architect-structure': StructureGate,
  'script-writer': ScriptGate,
  'review-script': ScriptGate,
  'designer-outline': SlidesGate,
  'designer-content-fill': SlidesGate,
  'review-slides': SlidesGate,
};

/** Step IDs that have no meaningful output to display */
const SKIP_STEPS = new Set(['collect-references']);

/**
 * Extract displayable output from a completed step's state.
 * Gate steps store their output in suspendPayload.output (the agent output shown at the gate).
 * Non-gate steps store it directly in output.
 */
function extractStepOutput(stepState: StepState): unknown {
  // If the step was suspended (gate step), the interesting data is in suspendPayload.output
  if (stepState.suspendPayload?.output) {
    return stepState.suspendPayload.output;
  }
  // Otherwise use the step's direct output
  if (stepState.output !== undefined && stepState.output !== null) {
    return stepState.output;
  }
  return null;
}

export interface StepOutputPanelProps {
  stepId: string;
  stepState: StepState;
}

export function StepOutputPanel({ stepId, stepState }: StepOutputPanelProps) {
  if (SKIP_STEPS.has(stepId)) {
    return null;
  }

  const output = extractStepOutput(stepState);
  if (!output) {
    return (
      <div className="rounded-md bg-gray-50 p-3">
        <p className="text-xs text-gray-400">No output data available for this step.</p>
      </div>
    );
  }

  const Renderer = STEP_RENDERERS[stepId];
  if (Renderer) {
    return (
      <div className="rounded-lg border border-gray-100 bg-white p-4">
        <Renderer output={output} />
      </div>
    );
  }

  // Fallback: raw JSON for steps without a dedicated renderer
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600">
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  );
}

export { STEP_RENDERERS, SKIP_STEPS, extractStepOutput };
