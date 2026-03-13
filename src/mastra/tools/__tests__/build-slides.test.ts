import { describe, it, expect } from 'vitest';
import { buildSlidesTool } from '../build-slides';
import type { DeckSpec } from '../../schemas/deck-spec';

const MINIMAL_DECK: DeckSpec = {
  title: 'Test Presentation',
  colourPalette: {
    primary: '#1A2B3C',
    secondary: '#4D5E6F',
    accent: '#FF6600',
    background: '#FFFFFF',
    text: '#333333',
  },
  slides: [
    {
      slideNumber: 1,
      title: 'Introduction',
      layout: 'title',
      content: 'Welcome to the presentation',
      speakerNoteRef: 'section-intro',
    },
    {
      slideNumber: 2,
      title: 'Key Concepts',
      layout: 'content',
      content: 'Here are the main ideas we will explore.',
      speakerNoteRef: 'section-concepts',
    },
  ],
  diagramCount: 0,
};

async function build(deckSpec: DeckSpec) {
  const result = await buildSlidesTool.execute!(
    { deckSpec },
    {} as never,
  );
  if (result && 'markdown' in result) return result as { markdown: string };
  throw new Error('Unexpected result shape');
}

describe('buildSlides tool', () => {
  it('should have id, description, inputSchema, and outputSchema', () => {
    expect(buildSlidesTool.id).toBe('build-slides');
    expect(buildSlidesTool.description).toBeTruthy();
    expect(buildSlidesTool.inputSchema).toBeDefined();
    expect(buildSlidesTool.outputSchema).toBeDefined();
  });

  it('should produce Markdown with frontmatter per slide', async () => {
    const result = await build(MINIMAL_DECK);
    expect(result.markdown).toContain('---');
    expect(result.markdown).toContain('slideNumber: 1');
    expect(result.markdown).toContain('layout: title');
    expect(result.markdown).toContain('slideNumber: 2');
    expect(result.markdown).toContain('layout: content');
  });

  it('should include all slide titles in output', async () => {
    const result = await build(MINIMAL_DECK);
    expect(result.markdown).toContain('Introduction');
    expect(result.markdown).toContain('Key Concepts');
  });

  it('should include slide content', async () => {
    const result = await build(MINIMAL_DECK);
    expect(result.markdown).toContain('Welcome to the presentation');
    expect(result.markdown).toContain('Here are the main ideas we will explore.');
  });

  it('should include speakerNoteRef in frontmatter', async () => {
    const result = await build(MINIMAL_DECK);
    expect(result.markdown).toContain('speakerNoteRef: section-intro');
    expect(result.markdown).toContain('speakerNoteRef: section-concepts');
  });

  it('should include colourAccent when present', async () => {
    const deck: DeckSpec = {
      ...MINIMAL_DECK,
      slides: [
        {
          ...MINIMAL_DECK.slides[0],
          colourAccent: '#FF0000',
        },
      ],
    };
    const result = await build(deck);
    expect(result.markdown).toContain("colourAccent: '#FF0000'");
  });

  it('should include deck title as header', async () => {
    const result = await build(MINIMAL_DECK);
    // The first line should be the deck-level title
    expect(result.markdown).toMatch(/^# Test Presentation/);
  });

  it('should handle diagram slides with svgContent placeholder', async () => {
    const deck: DeckSpec = {
      ...MINIMAL_DECK,
      slides: [
        {
          slideNumber: 1,
          title: 'Architecture',
          layout: 'diagram',
          content: 'System architecture overview',
          speakerNoteRef: 'section-arch',
          diagram: {
            type: 'flowchart',
            description: 'System flow',
          },
        },
      ],
      diagramCount: 1,
    };
    const result = await build(deck);
    expect(result.markdown).toContain('layout: diagram');
    expect(result.markdown).toContain('diagramType: flowchart');
  });
});
