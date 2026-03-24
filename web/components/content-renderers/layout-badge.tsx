'use client';

const LAYOUT_COLOURS: Record<string, { bg: string; text: string }> = {
  title: { bg: 'bg-purple-100', text: 'text-purple-600' },
  content: { bg: 'bg-gray-100', text: 'text-gray-600' },
  split: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  image: { bg: 'bg-pink-100', text: 'text-pink-600' },
  quote: { bg: 'bg-amber-100', text: 'text-amber-600' },
  code: { bg: 'bg-green-100', text: 'text-green-600' },
  comparison: { bg: 'bg-orange-100', text: 'text-orange-600' },
  diagram: { bg: 'bg-blue-100', text: 'text-blue-600' },
  closing: { bg: 'bg-rose-100', text: 'text-rose-600' },
};

const DEFAULT_COLOUR = { bg: 'bg-gray-100', text: 'text-gray-600' };

export function LayoutBadge({ layout }: { layout: string }) {
  const colour = LAYOUT_COLOURS[layout] ?? DEFAULT_COLOUR;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${colour.bg} ${colour.text}`}>
      {layout}
    </span>
  );
}

export { LAYOUT_COLOURS };
