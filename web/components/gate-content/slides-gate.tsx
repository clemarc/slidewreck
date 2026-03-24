'use client';

import { LayoutBadge } from '@/components/content-renderers';

interface SlideSpec {
  slideNumber: number;
  title: string;
  layout: string;
  content: string;
  speakerNoteRef: string;
  diagram?: { type: string; description: string };
  colourAccent?: string;
}

interface ColourPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

interface DeckSpecOutput {
  title?: string;
  subtitle?: string;
  colourPalette?: ColourPalette;
  slides?: SlideSpec[];
  diagramCount?: number;
}

const HEX_COLOUR_RE = /^#[0-9a-fA-F]{6}$/;

function ColourSwatch({ colour, label }: { colour: string; label: string }) {
  const isValid = HEX_COLOUR_RE.test(colour);
  return (
    <div className="flex items-center gap-1" title={`${label}: ${colour}`}>
      <div
        className="h-4 w-4 rounded border border-gray-200"
        style={isValid ? { backgroundColor: colour } : { backgroundColor: '#ccc' }}
      />
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

export function SlidesGate({ output }: { output: unknown }) {
  const data = output as DeckSpecOutput;
  const slides = data.slides ?? [];
  const palette = data.colourPalette;

  if (slides.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-gray-400">No slide data available.</p>
        <pre className="max-h-96 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.title && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{data.title}</h3>
          {data.subtitle && <p className="text-xs text-gray-500">{data.subtitle}</p>}
        </div>
      )}

      {palette && (
        <div className="flex items-center gap-3">
          <ColourSwatch colour={palette.primary} label="primary" />
          <ColourSwatch colour={palette.secondary} label="secondary" />
          <ColourSwatch colour={palette.accent} label="accent" />
          <ColourSwatch colour={palette.background} label="bg" />
          <ColourSwatch colour={palette.text} label="text" />
        </div>
      )}

      <p className="text-xs text-gray-400">
        {slides.length} slide{slides.length !== 1 ? 's' : ''}
        {data.diagramCount != null && data.diagramCount > 0 && ` · ${data.diagramCount} diagram${data.diagramCount !== 1 ? 's' : ''}`}
      </p>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {slides.map((slide) => (
          <div key={slide.slideNumber} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-gray-400">#{slide.slideNumber}</span>
              <LayoutBadge layout={slide.layout} />
            </div>
            <h4 className="mt-1 text-xs font-medium text-gray-700 line-clamp-1">{slide.title}</h4>
            <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">{slide.content}</p>
            {slide.diagram && (
              <span className="mt-1 inline-block rounded bg-blue-50 px-1 py-0.5 text-[10px] text-blue-500">
                {slide.diagram.type} diagram
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
