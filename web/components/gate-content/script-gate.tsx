'use client';

import { CollapsibleSection } from '@/components/content-renderers';

interface ScriptSection {
  title: string;
  content: string;
  speakingNotes: string;
  durationMinutes: number;
}

export interface WriterOutput {
  sections?: ScriptSection[];
  totalDurationMinutes?: number;
  speakerNotes?: string;
}

export function ScriptGate({ output }: { output: unknown }) {
  const data = output as WriterOutput;
  const sectionCount = data.sections?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {data.totalDurationMinutes != null && (
          <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs font-medium text-gray-600">
            ~{data.totalDurationMinutes}m
          </span>
        )}
        {sectionCount > 0 && (
          <span className="text-xs text-gray-400">
            {sectionCount} section{sectionCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {data.sections && data.sections.length > 0 && (
        <div className="max-h-[32rem] space-y-3 overflow-y-auto">
          {data.sections.map((section, i) => (
            <div key={i} className="rounded border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{section.title}</h3>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500">
                  {section.durationMinutes}m
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{section.content}</p>
              {section.speakingNotes && (
                <CollapsibleSection title="Speaking Notes">
                  <p className="border-l-2 border-blue-200 pl-2 text-xs italic text-blue-500">
                    {section.speakingNotes}
                  </p>
                </CollapsibleSection>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
