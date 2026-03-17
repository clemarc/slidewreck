'use client';

import { ResearchGate } from './research-gate';
import { StructureGate } from './structure-gate';
import { ScriptGate } from './script-gate';
import { SlidesGate } from './slides-gate';
import { ReferencesGate } from './references-gate';

const GATE_RENDERERS: Record<string, React.ComponentType<{ output: unknown }>> = {
  'review-research': ResearchGate,
  'architect-structure': StructureGate,
  'review-script': ScriptGate,
  'review-slides': SlidesGate,
};

export interface GateContentProps {
  gateId: string;
  output: unknown;
  summary: string;
}

export function GateContent({ gateId, output, summary }: GateContentProps) {
  if (gateId === 'collect-references') {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Collect References</h2>
        <ReferencesGate />
      </div>
    );
  }

  const Renderer = GATE_RENDERERS[gateId];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">
        {gateId === 'review-research' && 'Research Review'}
        {gateId === 'architect-structure' && 'Structure Review'}
        {gateId === 'review-script' && 'Script Review'}
        {gateId === 'review-slides' && 'Slide Review'}
        {!GATE_RENDERERS[gateId] && gateId !== 'collect-references' && `Gate: ${gateId}`}
      </h2>
      <p className="text-xs text-gray-500">{summary}</p>
      {Renderer ? (
        <Renderer output={output} />
      ) : (
        <pre className="max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}

export { GATE_RENDERERS };
