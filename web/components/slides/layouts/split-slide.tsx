import type { SlideProps } from '../slide-renderer';

export function SplitSlide({ slide }: SlideProps) {
  return (
    <div
      className="grid grid-cols-2 h-full"
      style={{ backgroundColor: 'var(--slide-bg)', color: 'var(--slide-text)' }}
    >
      <div className="flex flex-col justify-center px-12">
        <h2
          className="text-3xl font-bold mb-6"
          style={{ color: slide.colourAccent ?? 'var(--slide-primary)' }}
        >
          {slide.title}
        </h2>
      </div>
      <div className="flex flex-col justify-center px-12">
        <p className="text-xl leading-relaxed">{slide.content}</p>
      </div>
    </div>
  );
}
