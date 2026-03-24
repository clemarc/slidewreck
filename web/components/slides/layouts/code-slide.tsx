import type { SlideProps } from '../slide-renderer';

export function CodeSlide({ slide }: SlideProps) {
  return (
    <div
      className="flex flex-col justify-center h-full px-16"
      style={{ backgroundColor: 'var(--slide-bg)', color: 'var(--slide-text)' }}
    >
      <h2
        className="text-3xl font-bold mb-8"
        style={{ color: slide.colourAccent ?? 'var(--slide-primary)' }}
      >
        {slide.title}
      </h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-6 text-sm font-mono overflow-auto max-h-[60%]">
        <code>{slide.content}</code>
      </pre>
    </div>
  );
}
