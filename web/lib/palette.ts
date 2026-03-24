import type { ColourPalette } from '@/types/deck-spec';

export const DEFAULT_PALETTE: ColourPalette = {
  primary: '#1a1a2e',
  secondary: '#16213e',
  accent: '#0f3460',
  background: '#ffffff',
  text: '#1a1a2e',
};

/** Convert a ColourPalette to CSS custom properties for inline style injection */
export function paletteToCustomProperties(
  palette: ColourPalette | undefined,
): Record<string, string> {
  const p = palette ?? DEFAULT_PALETTE;
  return {
    '--slide-primary': p.primary,
    '--slide-secondary': p.secondary,
    '--slide-accent': p.accent,
    '--slide-bg': p.background,
    '--slide-text': p.text,
  };
}
