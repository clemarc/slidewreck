import { describe, it, expect } from 'vitest';
import { generateColourPalette } from '../generate-colour-palette';
import { ColourPaletteSchema } from '../../schemas/deck-spec';
import { validateSchema } from '../../__tests__/schema-helpers';

async function generate(topic: string, tone: string) {
  const result = await generateColourPalette.execute!(
    { topic, tone },
    {} as never,
  );
  if (result && 'palette' in result) return result;
  throw new Error('Unexpected validation error');
}

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

describe('generateColourPalette tool', () => {
  it('should have id, description, inputSchema, and outputSchema', () => {
    expect(generateColourPalette.id).toBe('generate-colour-palette');
    expect(generateColourPalette.description).toBeTruthy();
    expect(generateColourPalette.inputSchema).toBeDefined();
    expect(generateColourPalette.outputSchema).toBeDefined();
  });

  it('should return a palette matching ColourPaletteSchema', async () => {
    const result = await generate('machine learning', 'professional');
    const parsed = ColourPaletteSchema.safeParse(result.palette);
    expect(parsed.success).toBe(true);
  });

  it('should return all 5 required colour keys', async () => {
    const result = await generate('cloud computing', 'energetic');
    const keys = Object.keys(result.palette);
    expect(keys).toContain('primary');
    expect(keys).toContain('secondary');
    expect(keys).toContain('accent');
    expect(keys).toContain('background');
    expect(keys).toContain('text');
  });

  it('should return valid hex colours for all keys', async () => {
    const result = await generate('design systems', 'calm');
    for (const [key, value] of Object.entries(result.palette)) {
      expect(value).toMatch(HEX_REGEX);
    }
  });

  it('should return different palettes for different tones', async () => {
    const professional = await generate('topic', 'professional');
    const playful = await generate('topic', 'playful');
    // At least the accent colour should differ between tones
    expect(professional.palette).not.toEqual(playful.palette);
  });

  it('should produce different accent colours for different topics with same tone', async () => {
    const ai = await generate('artificial intelligence', 'professional');
    const cooking = await generate('french cooking techniques', 'professional');
    expect(ai.palette.accent).not.toBe(cooking.palette.accent);
  });

  it('should reject empty topic via schema', () => {
    expect(validateSchema(generateColourPalette.inputSchema!, { topic: '', tone: 'professional' }).success).toBe(false);
  });

  it('should reject empty tone via schema', () => {
    expect(validateSchema(generateColourPalette.inputSchema!, { topic: 'AI', tone: '' }).success).toBe(false);
  });
});
