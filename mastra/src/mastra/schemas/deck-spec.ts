import { z } from 'zod';

const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex colour (e.g. #1A2B3C)');

// API-safe variant: Anthropic output_format rejects pattern, minLength, minItems,
// exclusiveMinimum, maximum on integer. Move constraints to descriptions instead.
const hexColourApiSafe = z.string().describe('6-digit hex colour string (e.g. #1A2B3C)');

export const SLIDE_LAYOUTS = [
  'title',
  'content',
  'split',
  'image',
  'quote',
  'code',
  'comparison',
  'diagram',
  'closing',
] as const;

export const SlideLayoutEnum = z.enum(SLIDE_LAYOUTS);
export type SlideLayout = z.infer<typeof SlideLayoutEnum>;

export const ColourPaletteSchema = z.object({
  primary: hexColour.describe('Primary colour hex'),
  secondary: hexColour.describe('Secondary colour hex'),
  accent: hexColour.describe('Accent colour hex'),
  background: hexColour.describe('Background colour hex'),
  text: hexColour.describe('Text colour hex'),
});
export type ColourPalette = z.infer<typeof ColourPaletteSchema>;

export const DiagramSpecSchema = z.object({
  type: z.enum(['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'pie', 'mindmap'])
    .describe('Mermaid diagram type'),
  description: z.string().min(1).describe('Natural language description for Mermaid generation'),
  mermaidSyntax: z.string().min(1).optional()
    .describe('Pre-generated Mermaid syntax. Absent until diagram generation step.'),
  svgPath: z.string().min(1).optional()
    .describe('Path to rendered SVG file. Absent until render step.'),
});
export type DiagramSpec = z.infer<typeof DiagramSpecSchema>;

export const SlideSpecSchema = z.object({
  slideNumber: z.number().int().positive().describe('Slide position in deck (1-based)'),
  title: z.string().min(1).describe('Slide title text'),
  layout: SlideLayoutEnum.describe('Layout template for this slide'),
  content: z.string().min(1).describe('Primary slide content (one idea per slide, no bullet points)'),
  speakerNoteRef: z.string().min(1).describe('Reference anchor to corresponding section in speaker notes'),
  diagram: DiagramSpecSchema.optional()
    .describe('Diagram specification if this slide contains a visual. Absent for non-diagram slides.'),
  colourAccent: hexColour.optional()
    .describe('Hex colour accent override for this slide. Absent to use palette default.'),
});
export type SlideSpec = z.infer<typeof SlideSpecSchema>;

export const DeckSpecSchema = z.object({
  title: z.string().min(1).describe('Presentation title'),
  subtitle: z.string().min(1).optional().describe('Presentation subtitle. Absent if none.'),
  colourPalette: ColourPaletteSchema.describe('Deck-level colour palette'),
  slides: z.array(SlideSpecSchema).min(1).describe('Ordered slide specifications'),
  diagramCount: z.number().int().min(0).describe('Total number of slides with diagram indicators'),
});
export type DeckSpec = z.infer<typeof DeckSpecSchema>;

// --- Two-phase designer schemas (API-safe for Anthropic output_format) ---
// No pattern, minLength, minItems, exclusiveMinimum, or maximum on integer.
// Constraints live in descriptions; runtime validation uses DeckSpecSchema.parse().

const ColourPaletteApiSafeSchema = z.object({
  primary: hexColourApiSafe.describe('Primary colour — 6-digit hex (e.g. #2C3E50)'),
  secondary: hexColourApiSafe.describe('Secondary colour — 6-digit hex'),
  accent: hexColourApiSafe.describe('Accent colour — 6-digit hex'),
  background: hexColourApiSafe.describe('Background colour — 6-digit hex'),
  text: hexColourApiSafe.describe('Text colour — 6-digit hex'),
});

const DiagramSpecApiSafeSchema = z.object({
  type: z.enum(['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'pie', 'mindmap'])
    .describe('Mermaid diagram type'),
  description: z.string().describe('Natural language description for Mermaid generation (non-empty)'),
  mermaidSyntax: z.string().optional()
    .describe('Pre-generated Mermaid syntax. Absent until diagram generation step.'),
  svgPath: z.string().optional()
    .describe('Path to rendered SVG file. Absent until render step.'),
});

export const SlideOutlineSchema = z.object({
  slideNumber: z.number().describe('Slide position in deck (1-based, positive integer)'),
  title: z.string().describe('Slide title text (non-empty)'),
  layout: SlideLayoutEnum.describe('Layout template for this slide'),
  speakerNoteRef: z.string().describe('Reference anchor to corresponding section in speaker notes (non-empty)'),
  diagram: DiagramSpecApiSafeSchema.optional()
    .describe('Diagram specification if this slide contains a visual. Absent for non-diagram slides.'),
  colourAccent: hexColourApiSafe.optional()
    .describe('Hex colour accent override for this slide (e.g. #EF4444). Absent to use palette default.'),
});
export type SlideOutline = z.infer<typeof SlideOutlineSchema>;

export const DeckOutlineSchema = z.object({
  title: z.string().describe('Presentation title (non-empty)'),
  subtitle: z.string().optional().describe('Presentation subtitle. Absent if none.'),
  colourPalette: ColourPaletteApiSafeSchema.describe('Deck-level colour palette'),
  slides: z.array(SlideOutlineSchema).describe('Ordered slide outline specifications (at least one)'),
  diagramCount: z.number().describe('Total number of slides with diagram indicators (non-negative integer)'),
});
export type DeckOutline = z.infer<typeof DeckOutlineSchema>;
