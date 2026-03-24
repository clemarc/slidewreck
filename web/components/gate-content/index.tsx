'use client';

import { ResearchGate } from './research-gate';
import { StructureGate } from './structure-gate';
import { ScriptGate } from './script-gate';
import { SlidesGate } from './slides-gate';
import { ReferencesGate } from './references-gate';

const GATE_RENDERERS: Record<string, React.ComponentType<{ output: unknown }>> = {
  'review-research': ResearchGate,
  'review-script': ScriptGate,
  'review-slides': SlidesGate,
};

const GATE_LABELS: Record<string, string> = {
  'review-research': 'Research Review',
  'architect-structure': 'Structure Review',
  'review-script': 'Script Review',
  'review-slides': 'Slide Review',
};

export interface GateContentProps {
  gateId: string;
  output: unknown;
  summary: string;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
}

export function GateContent({ gateId, output, summary, selectedIndex, onSelect }: GateContentProps) {
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
        {GATE_LABELS[gateId] ?? `Gate: ${gateId}`}
      </h2>
      <p className="text-xs text-gray-500">{summary}</p>
      {gateId === 'architect-structure' ? (
        <StructureGate output={output} selectedIndex={selectedIndex} onSelect={onSelect} />
      ) : Renderer ? (
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
