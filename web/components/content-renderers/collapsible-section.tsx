'use client';

export interface CollapsibleSectionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, count, defaultOpen = false, children }: CollapsibleSectionProps) {
  return (
    <details open={defaultOpen || undefined} className="group">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900">
        <span className="text-gray-400 transition-transform group-open:rotate-90">&#9654;</span>
        {title}
        {count != null && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            {count}
          </span>
        )}
      </summary>
      <div className="mt-2 pl-5">{children}</div>
    </details>
  );
}
