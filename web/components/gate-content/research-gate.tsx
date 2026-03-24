'use client';

import { CollapsibleSection } from '@/components/content-renderers';

interface Finding {
  finding: string;
  source: string;
  relevance: string;
  sourceType?: string;
}

export interface ResearchOutput {
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
        <CollapsibleSection title="Key Findings" count={data.keyFindings.length} defaultOpen>
          <ul className="space-y-2">
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
        </CollapsibleSection>
      )}

      {data.suggestedAngles && data.suggestedAngles.length > 0 && (
        <CollapsibleSection title="Suggested Angles" count={data.suggestedAngles.length} defaultOpen>
          <ul className="list-inside list-disc text-sm text-gray-600">
            {data.suggestedAngles.map((angle, i) => (
              <li key={i}>{angle}</li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {data.statistics && data.statistics.length > 0 && (
        <CollapsibleSection title="Statistics" count={data.statistics.length}>
          <ul className="space-y-2">
            {data.statistics.map((stat, i) => (
              <li key={i} className="rounded border border-gray-100 bg-gray-50 p-2 text-sm">
                <span className="font-semibold text-gray-800">{stat.value}</span>
                <span className="ml-2 text-gray-500">{stat.context}</span>
                <p className="mt-1 text-xs text-gray-400">Source: {stat.source}</p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {data.existingTalks && data.existingTalks.length > 0 && (
        <CollapsibleSection title="Existing Talks" count={data.existingTalks.length}>
          <ul className="space-y-2">
            {data.existingTalks.map((talk, i) => (
              <li key={i} className="rounded border border-gray-100 bg-gray-50 p-2 text-sm">
                <p className="font-medium text-gray-800">{talk.title}</p>
                <p className="text-xs text-gray-500">by {talk.speaker}</p>
                {talk.summary && <p className="mt-1 text-xs text-gray-400">{talk.summary}</p>}
                <a
                  href={talk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-xs text-blue-500 hover:underline"
                >
                  View talk &rarr;
                </a>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {data.sources && data.sources.length > 0 && (
        <CollapsibleSection title="Sources" count={data.sources.length}>
          <ul className="space-y-1">
            {data.sources.map((src, i) => (
              <li key={i} className="text-xs">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {src.title || src.url}
                </a>
                <span className="ml-2 text-gray-400">{src.relevance}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
