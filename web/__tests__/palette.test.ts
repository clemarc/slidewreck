import { describe, it, expect } from 'vitest';
import { DEFAULT_PALETTE, paletteToCustomProperties } from '../lib/palette';

describe('DEFAULT_PALETTE', () => {
  it('has all 5 required colour fields', () => {
    expect(DEFAULT_PALETTE.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_PALETTE.secondary).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_PALETTE.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_PALETTE.background).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(DEFAULT_PALETTE.text).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('paletteToCustomProperties', () => {
  it('maps palette fields to CSS custom property names', () => {
    const palette = {
      primary: '#2C3E50',
      secondary: '#34495E',
      accent: '#3F9DD0',
      background: '#FFFFFF',
      text: '#2C3E50',
    };
    const props = paletteToCustomProperties(palette);
    expect(props['--slide-primary']).toBe('#2C3E50');
    expect(props['--slide-secondary']).toBe('#34495E');
    expect(props['--slide-accent']).toBe('#3F9DD0');
    expect(props['--slide-bg']).toBe('#FFFFFF');
    expect(props['--slide-text']).toBe('#2C3E50');
  });

  it('returns exactly 5 custom properties', () => {
    const props = paletteToCustomProperties(DEFAULT_PALETTE);
    expect(Object.keys(props)).toHaveLength(5);
  });

  it('returns DEFAULT_PALETTE properties when given undefined', () => {
    const props = paletteToCustomProperties(undefined);
    expect(props['--slide-primary']).toBe(DEFAULT_PALETTE.primary);
  });
});
