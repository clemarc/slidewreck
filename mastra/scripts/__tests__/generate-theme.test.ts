import { describe, it, expect } from 'vitest';
import { generateThemeCSS } from '../lib/generate-theme';
import type { ColourPalette } from '../../src/mastra/schemas/deck-spec';

const palette: ColourPalette = {
  primary: '#2C3E50',
  secondary: '#3498DB',
  accent: '#E74C3C',
  background: '#ECF0F1',
  text: '#2C3E50',
};

describe('generateThemeCSS', () => {
  describe('with palette', () => {
    it('produces CSS with @theme comment and @import default', () => {
      const css = generateThemeCSS(palette);
      expect(css).toContain('/* @theme deckspec-custom */');
      expect(css).toContain("@import 'default'");
    });

    it('maps all 5 palette colours into CSS', () => {
      const css = generateThemeCSS(palette);
      expect(css).toContain('#2C3E50'); // primary
      expect(css).toContain('#3498DB'); // secondary
      expect(css).toContain('#E74C3C'); // accent
      expect(css).toContain('#ECF0F1'); // background
    });

    it('contains section selectors for headings, links, strong, blockquote, code', () => {
      const css = generateThemeCSS(palette);
      expect(css).toContain('section h1');
      expect(css).toContain('section h2');
      expect(css).toContain('section h3');
      expect(css).toContain('section a');
      expect(css).toContain('section strong');
      expect(css).toContain('section blockquote');
      expect(css).toContain('section code');
    });

    it('contains .lead class with primary bg and background text', () => {
      const css = generateThemeCSS(palette);
      expect(css).toMatch(/section\.lead\s*\{[^}]*background-color:\s*#2C3E50/);
      expect(css).toMatch(/section\.lead\s*\{[^}]*color:\s*#ECF0F1/);
    });

    it('contains .invert class with primary bg', () => {
      const css = generateThemeCSS(palette);
      expect(css).toMatch(/section\.invert\s*\{[^}]*background-color:\s*#2C3E50/);
    });

    it('contains .comparison class with grid layout', () => {
      const css = generateThemeCSS(palette);
      expect(css).toMatch(/section\.comparison\s*\{[^}]*display:\s*grid/);
      expect(css).toMatch(/grid-template-columns:\s*1fr\s+1fr/);
    });
  });

  describe('without palette (fallback)', () => {
    it('returns valid theme CSS with @theme and @import', () => {
      const css = generateThemeCSS(undefined);
      expect(css).toContain('/* @theme deckspec-custom */');
      expect(css).toContain("@import 'default'");
    });

    it('still contains .comparison class', () => {
      const css = generateThemeCSS(undefined);
      expect(css).toMatch(/section\.comparison/);
    });
  });
});
