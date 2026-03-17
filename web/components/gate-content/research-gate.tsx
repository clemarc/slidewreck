'use client';

interface Finding {
  finding: string;
  source: string;
  relevance: string;
  sourceType?: string;
}

interface ResearchOutput {
  keyFindings?: Finding[];
  sources?: Array<{ url: string; title: string; relevance: string }>;
  suggestedAngles?: string[];
  statistics?: Array<{ value: string; context: string; source: string }>;
  existingTalks?: Array<{ title: string; speaker: string; url: string; summary: string }>;
}

export function ResearchGate({ output }: { output: unknown }) {
  const data = output as ResearchOutput;

  return (
    <div className="space-y-4">
      {data.keyFindings && data.keyFindings.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700">Key Findings</h3>
          <ul className="mt-2 space-y-2">
            {data.keyFindings.map((f, i) => (
              <li key={i} className="rounded border border-gray-100 bg-gray-50 p-3 text-sm">
                <p className="font-medium">{f.finding}</p>
                <p className="mt-1 text-xs text-gray-500">{f.relevance}</p>
                {f.sourceType && (
                  <span className="mt-1 inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                    {f.sourceType}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.suggestedAngles && data.suggestedAngles.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700">Suggested Angles</h3>
          <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
            {data.suggestedAngles.map((angle, i) => (
              <li key={i}>{angle}</li>
            ))}
          </ul>
        </section>
      )}

      {data.sources && (
        <p className="text-xs text-gray-400">
          {data.sources.length} source{data.sources.length !== 1 ? 's' : ''} found
        </p>
      )}
    </div>
  );
}
