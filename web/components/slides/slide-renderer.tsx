import type { SlideSpec } from '@/types/deck-spec';
import { TitleSlide } from './layouts/title-slide';
import { ContentSlide } from './layouts/content-slide';
import { DiagramSlide } from './layouts/diagram-slide';
import { QuoteSlide } from './layouts/quote-slide';
import { ClosingSlide } from './layouts/closing-slide';
import { SplitSlide } from './layouts/split-slide';
import { ImageSlide } from './layouts/image-slide';
import { CodeSlide } from './layouts/code-slide';
import { ComparisonSlide } from './layouts/comparison-slide';

/**
 * Props for individual layout components.
 * Colours come from CSS custom properties (--slide-primary, --slide-bg, etc.)
 * set on the parent container via paletteToCustomProperties().
 */
export interface SlideProps {
  slide: SlideSpec;
  svg?: string;
}

type SlideComponent = React.FC<SlideProps>;

/** Layout type → component map. Every SLIDE_LAYOUTS value has an entry. */
export const LAYOUT_RENDERERS: Record<string, SlideComponent> = {
  title: TitleSlide,
  content: ContentSlide,
  split: SplitSlide,
  image: ImageSlide,
  quote: QuoteSlide,
  code: CodeSlide,
  comparison: ComparisonSlide,
  diagram: DiagramSlide,
  closing: ClosingSlide,
};

/** Get the layout component for a given layout type, falling back to ContentSlide */
export function getLayoutComponent(layout: string): SlideComponent {
  return LAYOUT_RENDERERS[layout] ?? ContentSlide;
}

/** Render a single slide using the correct layout component */
export function SlideRenderer({
  slide,
  slideAccent,
  svg,
}: {
  slide: SlideSpec;
  slideAccent?: string;
  svg?: string;
}) {
  const Component = getLayoutComponent(slide.layout);
  // Per-slide colourAccent override via CSS custom property
  const accentOverride = slideAccent
    ? ({ '--slide-accent': slideAccent } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="aspect-video w-full overflow-hidden rounded-lg shadow-lg"
      style={accentOverride}
    >
      <Component slide={slide} svg={svg} />
    </div>
  );
}
