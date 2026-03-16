import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import type { DeckSpec } from '../../src/mastra/schemas/deck-spec';

import { deckToMarp } from '../lib/deck-to-marp';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const palette = {
  primary: '#2C3E50',
  secondary: '#3498DB',
  accent: '#E74C3C',
  background: '#ECF0F1',
  text: '#2C3E50',
};

function makeDeck(overrides: Partial<DeckSpec> = {}): DeckSpec {
  return {
    title: 'Test Presentation',
    colourPalette: palette,
    slides: [
      {
        slideNumber: 1,
        title: 'Welcome',
        layout: 'title',
        content: 'Introduction to Testing',
        speakerNoteRef: 'note-1',
      },
    ],
    diagramCount: 0,
    ...overrides,
  };
}

describe('deckToMarp', () => {
  describe('frontmatter', () => {
    it('starts with Marp frontmatter containing marp:true and theme', () => {
      const result = deckToMarp(makeDeck());
      expect(result).toMatch(/^---\nmarp: true\ntheme: deckspec-custom\n---/);
    });
  });

  describe('slide separation', () => {
    it('separates multiple slides with ---', () => {
      const deck = makeDeck({
        slides: [
          { slideNumber: 1, title: 'Slide 1', layout: 'title', content: 'First', speakerNoteRef: 'n1' },
          { slideNumber: 2, title: 'Slide 2', layout: 'content', content: 'Second', speakerNoteRef: 'n2' },
          { slideNumber: 3, title: 'Slide 3', layout: 'content', content: 'Third', speakerNoteRef: 'n3' },
        ],
        diagramCount: 0,
      });
      const result = deckToMarp(deck);
      // Count slide separators (--- between slides, not frontmatter)
      const body = result.split('---\n\n').slice(1).join('---\n\n'); // skip frontmatter
      const sections = body.split('\n---\n');
      expect(sections.length).toBe(3);
    });
  });

  describe('title mapping', () => {
    it('renders slide title as ## heading', () => {
      const result = deckToMarp(makeDeck());
      expect(result).toContain('## Welcome');
    });
  });

  describe('content mapping', () => {
    it('includes slide content below the title', () => {
      const result = deckToMarp(makeDeck());
      expect(result).toContain('Introduction to Testing');
    });
  });

  describe('speaker notes', () => {
    it('includes speaker notes as HTML comments', () => {
      const result = deckToMarp(makeDeck());
      expect(result).toContain('<!-- note-1 -->');
    });
  });

  describe('layout directives', () => {
    it('applies lead class for title layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Title', layout: 'title', content: 'Hello', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('<!-- _class: lead -->');
    });

    it('applies lead class for closing layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Thanks', layout: 'closing', content: 'Bye', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('<!-- _class: lead -->');
    });

    it('applies no class for content layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Info', layout: 'content', content: 'Data', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).not.toContain('<!-- _class:');
    });

    it('applies invert class for code layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Code', layout: 'code', content: '```ts\nconst x = 1;\n```', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('<!-- _class: invert -->');
    });

    it('applies lead class with blockquote for quote layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Quote', layout: 'quote', content: 'To be or not to be', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('<!-- _class: lead -->');
      expect(result).toContain('> To be or not to be');
    });

    it('handles multiline quotes with blockquote prefix on each line', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Quote', layout: 'quote', content: 'Line one\nLine two', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('> Line one\n> Line two');
    });

    it('applies comparison class for comparison layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Compare', layout: 'comparison', content: 'A vs B', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('<!-- _class: comparison -->');
    });

    it('uses bg image syntax for image layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Photo', layout: 'image', content: 'Beautiful scene', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('![bg]');
    });

    it('uses bg right syntax for split layout', () => {
      const deck = makeDeck({
        slides: [{ slideNumber: 1, title: 'Split', layout: 'split', content: 'Left side content', speakerNoteRef: 'n' }],
      });
      const result = deckToMarp(deck);
      expect(result).toContain('![bg right:40%]');
    });

    it('renders diagram as inline image for diagram layout', () => {
      const deck = makeDeck({
        slides: [{
          slideNumber: 1,
          title: 'Architecture',
          layout: 'diagram',
          content: 'System overview',
          speakerNoteRef: 'n',
          diagram: { type: 'flowchart' as const, description: 'System flow' },
        }],
        diagramCount: 1,
      });
      const result = deckToMarp(deck);
      // Without svgPath, should show placeholder
      expect(result).toContain('*Diagram: System flow*');
    });
  });

  describe('subtitle', () => {
    it('includes subtitle in title slide when present', () => {
      const deck = makeDeck({ subtitle: 'A Deep Dive' });
      const result = deckToMarp(deck);
      expect(result).toContain('A Deep Dive');
    });
  });

  describe('SVG inlining', () => {
    it('inlines SVG as base64 data URI when svgPath and basePath provided', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'marp-test-'));
      const diagramsDir = join(tmpDir, 'diagrams');
      mkdirSync(diagramsDir);
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>';
      writeFileSync(join(diagramsDir, 'diagram-1.svg'), svgContent);

      const deck = makeDeck({
        slides: [{
          slideNumber: 1,
          title: 'Flow',
          layout: 'diagram',
          content: 'System flow',
          speakerNoteRef: 'n',
          diagram: { type: 'flowchart' as const, description: 'Flow', svgPath: 'diagrams/diagram-1.svg' },
        }],
        diagramCount: 1,
      });

      const result = deckToMarp(deck, { basePath: tmpDir });
      const expected = Buffer.from(svgContent).toString('base64');
      expect(result).toContain(`<img src="data:image/svg+xml;base64,${expected}"`);
    });

    it('shows placeholder when diagram has no svgPath', () => {
      const deck = makeDeck({
        slides: [{
          slideNumber: 1,
          title: 'Arch',
          layout: 'diagram',
          content: 'Overview',
          speakerNoteRef: 'n',
          diagram: { type: 'flowchart' as const, description: 'Architecture diagram' },
        }],
        diagramCount: 1,
      });
      const result = deckToMarp(deck);
      expect(result).toContain('*Diagram: Architecture diagram*');
    });

    it('shows placeholder when SVG file not found and no convention match', () => {
      const deck = makeDeck({
        slides: [{
          slideNumber: 1,
          title: 'Missing',
          layout: 'diagram',
          content: 'Gone',
          speakerNoteRef: 'n',
          diagram: { type: 'flowchart' as const, description: 'Missing diagram' },
        }],
        diagramCount: 1,
      });
      // No basePath and no svgPath → no file to discover → placeholder
      const result = deckToMarp(deck);
      expect(result).toContain('*Diagram: Missing diagram*');
    });

    it('auto-discovers SVG by convention when svgPath is absent but basePath provided', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'marp-test-'));
      const diagramsDir = join(tmpDir, 'diagrams');
      mkdirSync(diagramsDir);
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="50"/></svg>';
      writeFileSync(join(diagramsDir, 'diagram-5.svg'), svgContent);

      const deck = makeDeck({
        slides: [{
          slideNumber: 5,
          title: 'Auto Discover',
          layout: 'diagram',
          content: 'Found by convention',
          speakerNoteRef: 'n',
          diagram: { type: 'flowchart' as const, description: 'Auto-discovered' },
        }],
        diagramCount: 1,
      });

      const result = deckToMarp(deck, { basePath: tmpDir });
      const expected = Buffer.from(svgContent).toString('base64');
      expect(result).toContain(`<img src="data:image/svg+xml;base64,${expected}"`);
    });

    it('embeds diagram on non-diagram layout (e.g. comparison+diagram)', () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'marp-test-'));
      const diagramsDir = join(tmpDir, 'diagrams');
      mkdirSync(diagramsDir);
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
      writeFileSync(join(diagramsDir, 'diagram-3.svg'), svgContent);

      const deck = makeDeck({
        slides: [{
          slideNumber: 3,
          title: 'Compare with Diagram',
          layout: 'comparison',
          content: 'Side by side',
          speakerNoteRef: 'n',
          diagram: { type: 'pie' as const, description: 'Comparison chart' },
        }],
        diagramCount: 1,
      });

      const result = deckToMarp(deck, { basePath: tmpDir });
      // Should have comparison class AND the inlined diagram
      expect(result).toContain('<!-- _class: comparison -->');
      expect(result).toContain('<img src="data:image/svg+xml;base64,');
    });
  });

  describe('integration: full fixture', () => {
    it('converts sample-deck.json to valid Marp markdown', () => {
      const fixturePath = resolve(__dirname, 'fixtures/sample-deck.json');
      const deck: DeckSpec = JSON.parse(readFileSync(fixturePath, 'utf-8'));
      const result = deckToMarp(deck);

      // Frontmatter
      expect(result).toMatch(/^---\nmarp: true\ntheme: deckspec-custom\n---/);

      // All 6 slides present — count sections after frontmatter
      const frontmatterEnd = '---\n\n';
      const afterFrontmatter = result.slice(result.indexOf(frontmatterEnd) + frontmatterEnd.length);
      const slideSections = afterFrontmatter.split('\n---\n');
      expect(slideSections.length).toBe(6);

      // Title slide has lead class and subtitle
      expect(result).toContain('<!-- _class: lead -->');
      expect(result).toContain('## Building with Mastra AI');
      expect(result).toContain('From Zero to Multi-Agent Pipeline');

      // Content slide (no directive)
      expect(result).toContain('## Why Multi-Agent?');

      // Diagram slide shows placeholder (no SVG file on disk, no basePath)
      expect(result).toContain('*Diagram: Multi-agent pipeline');

      // Quote slide uses blockquote
      expect(result).toContain('> The best agent is the one that knows when NOT to use an LLM.');

      // Code slide has invert class
      expect(result).toContain('<!-- _class: invert -->');
      expect(result).toContain('```typescript');

      // Closing slide
      expect(result).toContain('## Thank You');

      // Speaker notes for every slide
      expect(result).toContain('<!-- intro-notes -->');
      expect(result).toContain('<!-- why-agents-notes -->');
      expect(result).toContain('<!-- arch-notes -->');
      expect(result).toContain('<!-- quote-notes -->');
      expect(result).toContain('<!-- code-notes -->');
      expect(result).toContain('<!-- closing-notes -->');
    });
  });
});
