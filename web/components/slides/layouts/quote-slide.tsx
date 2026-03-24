import type { SlideProps } from '../slide-renderer';

export function QuoteSlide({ slide }: SlideProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-16 text-center"
      style={{ backgroundColor: 'var(--slide-bg)', color: 'var(--slide-text)' }}
    >
      <blockquote
        className="text-3xl italic font-light leading-relaxed max-w-3xl border-l-4 pl-8"
        style={{ borderLeftColor: 'var(--slide-accent)' }}
      >
        &ldquo;{slide.title}&rdquo;
      </blockquote>
      {slide.content && (
        <p className="mt-8 text-lg opacity-70">{slide.content}</p>
      )}
    </div>
  );
}
