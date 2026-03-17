import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DesignerOutputSchema, designer } from '../designer';
import { SONNET_MODEL } from '../../config/models';
import { DeckSpecSchema } from '../../schemas/deck-spec';

describe('DesignerOutputSchema', () => {
  it('should be the same schema as DeckSpecSchema', () => {
    // DesignerOutputSchema is a re-export of DeckSpecSchema
    expect(DesignerOutputSchema).toBe(DeckSpecSchema);
  });

  it('should accept a valid DeckSpec', () => {
    const validDeck = {
      title: 'My Talk',
      colourPalette: {
        primary: '#2C3E50',
        secondary: '#34495E',
        accent: '#3498DB',
        background: '#FFFFFF',
        text: '#2C3E50',
      },
      slides: [
        {
          slideNumber: 1,
          title: 'Introduction',
          layout: 'title',
          content: 'Welcome to the talk',
          speakerNoteRef: 'section-intro',
        },
      ],
      diagramCount: 0,
    };
    const result = DesignerOutputSchema.safeParse(validDeck);
    expect(result.success).toBe(true);
  });
});

describe('Designer agent', () => {
  it('should have correct agent ID', () => {
    expect(designer.id).toBe('designer');
  });

  it('should use Sonnet model tier', () => {
    expect(designer.model).toBe(SONNET_MODEL);
  });

  it('should have a name', () => {
    expect(designer.name).toBe('Designer');
  });

  it('should have suggestLayout tool bound', async () => {
    const tools = await designer.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('suggestLayout');
  });

  it('should have generateColourPalette tool bound', async () => {
    const tools = await designer.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('generateColourPalette');
  });

  it('should mention opinionated design rules in instructions source', () => {
    const source = readFileSync(join(__dirname, '../designer.ts'), 'utf-8');
    expect(source).toContain('One idea per slide');
    expect(source).toContain('No bullet points');
    expect(source).toContain('Visual-first');
  });
});
