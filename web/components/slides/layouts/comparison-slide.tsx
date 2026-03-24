import type { SlideProps } from '../slide-renderer';

export function ComparisonSlide({ slide }: SlideProps) {
  return (
    <div
      className="flex flex-col h-full px-16 py-12"
      style={{ backgroundColor: 'var(--slide-bg)', color: 'var(--slide-text)' }}
    >
      <h2
        className="text-3xl font-bold mb-8"
        style={{ color: slide.colourAccent ?? 'var(--slide-primary)' }}
      >
        {slide.title}
      </h2>
      <div className="flex-1 grid grid-cols-2 gap-8">
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-6">
          <p className="text-lg leading-relaxed text-center">{slide.content}</p>
        </div>
        <div className="flex items-center justify-center rounded-lg bg-gray-50 p-6">
          <p className="text-gray-400 italic">Comparison panel</p>
        </div>
      </div>
    </div>
  );
}
