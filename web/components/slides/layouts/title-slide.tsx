import type { SlideProps } from '../slide-renderer';

export function TitleSlide({ slide }: SlideProps) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full px-16 text-center"
      style={{ backgroundColor: 'var(--slide-primary)', color: 'var(--slide-bg)' }}
    >
      <h1 className="text-5xl font-bold leading-tight">{slide.title}</h1>
      {slide.content && (
        <p className="mt-6 text-xl opacity-80 max-w-2xl">{slide.content}</p>
      )}
    </div>
  );
}
