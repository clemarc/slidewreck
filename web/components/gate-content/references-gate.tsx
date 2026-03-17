'use client';

export function ReferencesGate() {
  return (
    <div className="rounded border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm text-blue-700">
        The workflow is waiting for reference materials. You can provide documents,
        links, or previous talk materials to enhance the research phase.
      </p>
      <p className="mt-2 text-xs text-blue-500">
        Approve to skip, or provide references before continuing.
      </p>
    </div>
  );
}
