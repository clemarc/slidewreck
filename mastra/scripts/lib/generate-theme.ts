import type { ColourPalette } from '../../src/mastra/schemas/deck-spec';

/**
 * Generate a Marp-compatible CSS theme from a ColourPalette.
 * Falls back to a minimal default theme when palette is undefined.
 */
export function generateThemeCSS(palette?: ColourPalette): string {
  const themeName = 'deckspec-custom';

  if (!palette) {
    return `/* @theme ${themeName} */
@import 'default';

section.comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 2em; }
`;
  }

  return `/* @theme ${themeName} */
@import 'default';

section { background-color: ${palette.background}; color: ${palette.text}; font-family: 'Segoe UI', system-ui, sans-serif; }
section h1, section h2, section h3 { color: ${palette.primary}; }
section a { color: ${palette.secondary}; }
section strong { color: ${palette.accent}; }
section blockquote { border-left: 4px solid ${palette.accent}; color: ${palette.secondary}; }
section code { background-color: ${palette.primary}; color: ${palette.background}; }

section.lead { background-color: ${palette.primary}; color: ${palette.background}; text-align: center; }
section.lead h1, section.lead h2, section.lead h3 { color: ${palette.background}; }

section.invert { background-color: ${palette.primary}; color: ${palette.background}; }

section.comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 2em; }
`;
}
