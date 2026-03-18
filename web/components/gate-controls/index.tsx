'use client';

import { ReferencesControls } from './references-controls';
import { StructureControls } from './structure-controls';
import { SlidesControls } from './slides-controls';
import { GenericControls } from './generic-controls';

/** Maps gate IDs that need specialized controls to their control type. Gates not in this map use generic approve/reject. */
export const GATE_CONTROLS_MAP: Record<string, string> = {
  'collect-references': 'references',
  'architect-structure': 'structure',
  'review-slides': 'slides',
};

export interface GateControlsProps {
  gateId: string;
  workflowId: string;
  runId: string;
  stepId: string;
  output: unknown;
  onResumed: () => void;
}

export function GateControls({ gateId, workflowId, runId, stepId, output, onResumed }: GateControlsProps) {
  const controlType = GATE_CONTROLS_MAP[gateId];

  switch (controlType) {
    case 'references':
      return (
        <ReferencesControls
          workflowId={workflowId}
          runId={runId}
          stepId={stepId}
          onResumed={onResumed}
        />
      );
    case 'structure':
      return (
        <StructureControls
          workflowId={workflowId}
          runId={runId}
          stepId={stepId}
          output={output}
          onResumed={onResumed}
        />
      );
    case 'slides':
      return (
        <SlidesControls
          workflowId={workflowId}
          runId={runId}
          stepId={stepId}
          output={output}
          onResumed={onResumed}
        />
      );
    default:
      return (
        <GenericControls
          workflowId={workflowId}
          runId={runId}
          stepId={stepId}
          onResumed={onResumed}
        />
      );
  }
}
