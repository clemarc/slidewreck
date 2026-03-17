'use client';

export function SlidesGate({ output }: { output: unknown }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        Slide deck specification (visual preview coming in Epic 11)
      </p>
      <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600">
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  );
}
