'use client';

interface Section {
  title: string;
  purpose: string;
  contentWordCount: number;
  estimatedMinutes: number;
}

export interface StructureOption {
  title: string;
  description: string;
  sections: Section[];
  rationale: string;
}

interface ArchitectOutput {
  options?: StructureOption[];
}

export interface StructureGateProps {
  output: unknown;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
}

export function StructureGate({ output, selectedIndex, onSelect }: StructureGateProps) {
  const data = output as ArchitectOutput;

  if (!data.options || data.options.length === 0) {
    return <p className="text-sm text-gray-500">No structure options available.</p>;
  }

  const isInteractive = typeof onSelect === 'function';

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {data.options.map((option, i) => {
        const isSelected = selectedIndex === i;
        const totalMinutes = option.sections.reduce((sum, s) => sum + s.estimatedMinutes, 0);

        return (
          <div
            key={i}
            onClick={isInteractive ? () => onSelect(i) : undefined}
            className={`rounded-lg border-2 p-4 transition-colors ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : isInteractive
                  ? 'border-gray-200 hover:border-gray-400 cursor-pointer'
                  : 'border-gray-200'
            }`}
          >
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

            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs italic text-gray-400">{option.rationale}</p>
              <span className="text-xs font-medium text-gray-500">{totalMinutes}m total</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
