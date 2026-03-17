import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DeckSpec, SlideSpec } from '../../src/mastra/schemas/deck-spec';

export interface DeckToMarpOptions {
  /** Base directory for resolving relative SVG paths (e.g. the presentation folder). */
  basePath?: string;
}

/**
 * Convert a DeckSpec JSON to Marp-flavoured markdown.
 * Pure function aside from optional SVG file reads when basePath is provided.
 */
export function deckToMarp(deck: DeckSpec, opts?: DeckToMarpOptions): string {
  const frontmatter = [
    '---',
    'marp: true',
    'theme: deckspec-custom',
    '---',
  ].join('\n');

  const slides = deck.slides.map((slide, index) => {
    return renderSlide(slide, deck, index, opts);
  });

  return frontmatter + '\n\n' + slides.join('\n\n---\n\n');
}

function renderSlide(
  slide: SlideSpec,
  deck: DeckSpec,
  index: number,
  opts?: DeckToMarpOptions,
): string {
  const parts: string[] = [];

  // Layout directive
  const directive = getLayoutDirective(slide.layout);
  if (directive) {
    parts.push(directive);
    parts.push('');
  }

  // Title
  parts.push(`## ${slide.title}`);

  // Subtitle on first slide if deck has subtitle
  if (index === 0 && deck.subtitle) {
    parts.push('');
    parts.push(deck.subtitle);
  }

  // Layout-specific content rendering
  parts.push('');
  parts.push(renderContent(slide, opts));

  // Speaker notes
  parts.push('');
  parts.push(`<!-- ${slide.speakerNoteRef} -->`);

  return parts.join('\n');
}

function getLayoutDirective(layout: SlideSpec['layout']): string | null {
  switch (layout) {
    case 'title':
    case 'closing':
    case 'quote':
      return '<!-- _class: lead -->';
    case 'code':
      return '<!-- _class: invert -->';
    case 'comparison':
      return '<!-- _class: comparison -->';
    case 'content':
    case 'diagram':
      return null;
    case 'split':
      return null; // bg image syntax handled in content
    case 'image':
      return null; // bg image syntax handled in content
    default:
      return null;
  }
}

function renderContent(slide: SlideSpec, opts?: DeckToMarpOptions): string {
  let base: string;
  switch (slide.layout) {
    case 'quote':
      base = slide.content.split('\n').map(line => `> ${line}`).join('\n');
      break;
    case 'image':
      base = `![bg](image)\n\n${slide.content}`;
      break;
    case 'split':
      base = `![bg right:40%](image)\n\n${slide.content}`;
      break;
    case 'diagram':
      return renderDiagramContent(slide, opts);
    default:
      base = slide.content;
      break;
  }

  // Append diagram for any layout that has one (e.g. comparison+diagram)
  if (slide.diagram) {
    const diagramMarkdown = inlineDiagramSvg(slide, opts);
    if (diagramMarkdown) {
      return `${base}\n\n${diagramMarkdown}`;
    }
  }

  return base;
}

function renderDiagramContent(slide: SlideSpec, opts?: DeckToMarpOptions): string {
  if (!slide.diagram) {
    return slide.content;
  }

  const diagramMarkdown = inlineDiagramSvg(slide, opts);
  if (diagramMarkdown) {
    return `${slide.content}\n\n${diagramMarkdown}`;
  }

  return `${slide.content}\n\n*Diagram: ${slide.diagram.description}*`;
}

/**
 * Try to inline a slide's diagram SVG as a base64 data URI.
 * Resolution order:
 *   1. Explicit svgPath from the DeckSpec diagram field
 *   2. Auto-discover by convention: diagrams/diagram-<slideNumber>.svg
 * Returns the markdown image string, or null if no SVG found.
 */
function inlineDiagramSvg(slide: SlideSpec, opts?: DeckToMarpOptions): string | null {
  const svgPath = slide.diagram?.svgPath;
  const conventionPath = `diagrams/diagram-${slide.slideNumber}.svg`;

  // Try explicit path first, then convention-based discovery
  const candidates = svgPath ? [svgPath, conventionPath] : [conventionPath];

  for (const candidate of candidates) {
    try {
      const resolvedPath = opts?.basePath
        ? resolve(opts.basePath, candidate)
        : candidate;

      if (!existsSync(resolvedPath)) continue;

      const svgContent = readFileSync(resolvedPath, 'utf-8');
      const base64 = Buffer.from(svgContent).toString('base64');
      const dataUri = `data:image/svg+xml;base64,${base64}`;
      return `<img src="${dataUri}" alt="diagram" style="max-width:100%;max-height:80%;">`;
    } catch {
      continue;
    }
  }

  return null;
}
