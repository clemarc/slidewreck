'use client';

interface Section {
  title: string;
  purpose: string;
  contentWordCount: number;
  estimatedMinutes: number;
}

interface StructureOption {
  title: string;
  description: string;
  sections: Section[];
  rationale: string;
}

interface ArchitectOutput {
  options?: StructureOption[];
}

export function StructureGate({ output }: { output: unknown }) {
  const data = output as ArchitectOutput;

  if (!data.options || data.options.length === 0) {
    return <p className="text-sm text-gray-500">No structure options available.</p>;
  }

  return (
    <div className="space-y-4">
      {data.options.map((option, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800">
            Option {i + 1}: {option.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500">{option.description}</p>

          <table className="mt-3 w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-400">
                <th className="pb-1">Section</th>
                <th className="pb-1 text-right">Minutes</th>
                <th className="pb-1 text-right">Words</th>
              </tr>
            </thead>
            <tbody>
              {option.sections.map((section, j) => (
                <tr key={j} className="border-b border-gray-50">
                  <td className="py-1 text-gray-700">{section.title}</td>
                  <td className="py-1 text-right text-gray-500">{section.estimatedMinutes}m</td>
                  <td className="py-1 text-right text-gray-500">{section.contentWordCount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 text-xs italic text-gray-400">{option.rationale}</p>
        </div>
      ))}
    </div>
  );
}
