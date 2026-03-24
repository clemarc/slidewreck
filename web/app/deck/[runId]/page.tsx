'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRunStatus, TERMINAL_STATUSES } from '@/lib/use-run-status';
import { useSlideNavigation } from '@/lib/use-slide-navigation';
import { buildDiagramMap } from '@/lib/deck-helpers';
import { paletteToCustomProperties } from '@/lib/palette';
import { SlideRenderer } from '@/components/slides/slide-renderer';
import type { SlidewreckRunResult } from '@/types/deck-spec';

export default function DeckViewerPage() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const runId = params.runId;
  const { run, error, loading } = useRunStatus('slidewreck', runId);

  const result = run?.status === 'success' ? (run.result as SlidewreckRunResult) : null;
  const deckSpec = result?.deckSpec;
  const slides = deckSpec?.slides ?? [];
  const palette = deckSpec?.colourPalette;
  const cssVars = paletteToCustomProperties(palette);
  const diagramMap = buildDiagramMap(result?.diagrams);

  const { currentSlide, goNext, goPrev } = useSlideNavigation(
    slides.length,
    () => router.push(`/run/${runId}`),
  );

  // Loading state
  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900 mx-auto" />
          <p className="mt-4 text-gray-500">Loading presentation...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href={`/run/${runId}`} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Back to run details
          </Link>
        </div>
      </main>
    );
  }

  // Non-success state
  if (run && run.status !== 'success') {
    const isTerminal = TERMINAL_STATUSES.has(run.status);
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <p className="text-lg font-medium mb-2">
            {isTerminal ? 'Run did not complete successfully' : 'Run still in progress'}
          </p>
          <p className="text-gray-500 mb-4 text-sm">Status: {run.status}</p>
          <Link
            href={`/run/${runId}`}
            className="inline-block rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Back to run details
          </Link>
        </div>
      </main>
    );
  }

  // No deck data
  if (!deckSpec || slides.length === 0) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No slide data available</p>
          <Link href={`/run/${runId}`} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Back to run details
          </Link>
        </div>
      </main>
    );
  }

  const slide = slides[currentSlide];

  return (
    <main
      className="relative min-h-screen bg-black flex items-center justify-center"
      onClick={goNext}
    >
      {/* Back button */}
      <Link
        href={`/run/${runId}`}
        className="absolute top-4 left-4 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white hover:bg-black/70"
        onClick={(e) => e.stopPropagation()}
      >
        &larr; Back
      </Link>

      {/* Slide — CSS custom properties injected for palette theming */}
      <div className="w-full max-w-6xl px-4" style={cssVars as React.CSSProperties}>
        <SlideRenderer
          slide={slide}
          slideAccent={slide.colourAccent}
          svg={diagramMap.get(slide.slideNumber)}
        />
      </div>

      {/* Navigation arrows */}
      {currentSlide > 0 && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Previous slide"
        >
          &#8592;
        </button>
      )}
      {currentSlide < slides.length - 1 && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 rounded-full bg-black/50 p-3 text-white hover:bg-black/70"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Next slide"
        >
          &#8594;
        </button>
      )}

      {/* Slide counter */}
      <div className="absolute bottom-4 right-4 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white font-mono">
        {currentSlide + 1} / {slides.length}
      </div>
    </main>
  );
}
