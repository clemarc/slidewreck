'use client';

interface ScriptSection {
  title: string;
  content: string;
  speakingNotes: string;
  durationMinutes: number;
}

interface WriterOutput {
  sections?: ScriptSection[];
  totalDurationMinutes?: number;
  speakerNotes?: string;
}

export function ScriptGate({ output }: { output: unknown }) {
  const data = output as WriterOutput;

  return (
    <div className="space-y-4">
      {data.totalDurationMinutes != null && (
        <p className="text-xs text-gray-400">
          Total duration: ~{data.totalDurationMinutes} minutes
        </p>
      )}

      {data.sections && data.sections.length > 0 && (
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {data.sections.map((section, i) => (
            <div key={i} className="rounded border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{section.title}</h3>
                <span className="text-xs text-gray-400">{section.durationMinutes}m</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{section.content}</p>
              {section.speakingNotes && (
                <p className="mt-2 border-l-2 border-blue-200 pl-2 text-xs italic text-blue-500">
                  {section.speakingNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
