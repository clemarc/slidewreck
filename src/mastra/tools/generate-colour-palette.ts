import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { ColourPaletteSchema, type ColourPalette } from '../schemas/deck-spec';

const TONE_PALETTES: Record<string, ColourPalette> = {
  professional: {
    primary: '#2C3E50',
    secondary: '#34495E',
    accent: '#3498DB',
    background: '#FFFFFF',
    text: '#2C3E50',
  },
  playful: {
    primary: '#E74C3C',
    secondary: '#F39C12',
    accent: '#9B59B6',
    background: '#FDFEFE',
    text: '#2C3E50',
  },
  calm: {
    primary: '#1ABC9C',
    secondary: '#16A085',
    accent: '#2980B9',
    background: '#F8F9FA',
    text: '#2C3E50',
  },
  energetic: {
    primary: '#E67E22',
    secondary: '#D35400',
    accent: '#E74C3C',
    background: '#FFFFFF',
    text: '#2C3E50',
  },
  dark: {
    primary: '#ECF0F1',
    secondary: '#BDC3C7',
    accent: '#3498DB',
    background: '#1A1A2E',
    text: '#ECF0F1',
  },
  minimal: {
    primary: '#333333',
    secondary: '#666666',
    accent: '#0066CC',
    background: '#FFFFFF',
    text: '#333333',
  },
};

const DEFAULT_PALETTE: ColourPalette = TONE_PALETTES.professional;

/**
 * Simple hash to derive a hue shift from the topic string.
 * This ensures different topics produce slightly different accent colours.
 */
function topicHash(topic: string): number {
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = ((hash << 5) - hash + topic.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function shiftHex(hex: string, offset: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + offset));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + (offset >> 1)));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) - offset));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function selectPalette(topic: string, tone: string): ColourPalette {
  const normalized = tone.toLowerCase().trim();
  let base = DEFAULT_PALETTE;
  for (const [key, palette] of Object.entries(TONE_PALETTES)) {
    if (normalized.includes(key)) {
      base = palette;
      break;
    }
  }
  // Apply topic-based accent shift so different topics produce different palettes
  const hash = topicHash(topic.toLowerCase().trim());
  const offset = (hash % 41) - 20; // -20 to +20 shift
  return {
    ...base,
    accent: shiftHex(base.accent, offset),
  };
}

export const generateColourPalette = createTool({
  id: 'generate-colour-palette',
  description: 'Generate a colour palette suitable for a presentation based on topic and tone. Returns 5 hex colours: primary, secondary, accent, background, and text.',
  inputSchema: z.object({
    topic: z.string().min(1).describe('The presentation topic'),
    tone: z.string().min(1).describe('The desired tone (e.g. professional, playful, calm, energetic, dark, minimal)'),
  }),
  outputSchema: z.object({
    palette: ColourPaletteSchema.describe('Generated colour palette'),
  }),
  execute: async ({ topic, tone }) => {
    const palette = selectPalette(topic, tone);
    return { palette };
  },
});
