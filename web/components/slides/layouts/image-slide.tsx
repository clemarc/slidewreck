import type { SlideProps } from '../slide-renderer';

export function ImageSlide({ slide }: SlideProps) {
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
      <div className="flex-1 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-400 italic">Image placeholder</p>
      </div>
      {slide.content && (
        <p className="mt-4 text-base opacity-70">{slide.content}</p>
      )}
    </div>
  );
}
