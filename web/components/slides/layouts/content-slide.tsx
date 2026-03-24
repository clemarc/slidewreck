import type { SlideProps } from '../slide-renderer';

export function ContentSlide({ slide }: SlideProps) {
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
      <p className="text-xl leading-relaxed max-w-3xl">{slide.content}</p>
    </div>
  );
}
