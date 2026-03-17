import { describe, it, expect } from 'vitest';
import {
  SlideLayoutEnum,
  SLIDE_LAYOUTS,
  DiagramSpecSchema,
  SlideSpecSchema,
  DeckSpecSchema,
  ColourPaletteSchema,
  SlideOutlineSchema,
  DeckOutlineSchema,
} from '../deck-spec';

const validPalette = {
  primary: '#1A2B3C',
  secondary: '#4D5E6F',
  accent: '#FF6B35',
  background: '#FFFFFF',
  text: '#333333',
};

const validSlide = {
  slideNumber: 1,
  title: 'Introduction',
  layout: 'title' as const,
  content: 'Welcome to the presentation',
  speakerNoteRef: 'section-intro',
};

const validDiagram = {
  type: 'flowchart' as const,
  description: 'System architecture overview',
};

const validDeckSpec = {
  title: 'My Presentation',
  colourPalette: validPalette,
  slides: [validSlide],
  diagramCount: 0,
};

describe('SlideLayoutEnum', () => {
  it('should accept all valid layout values', () => {
    for (const layout of SLIDE_LAYOUTS) {
      expect(SlideLayoutEnum.safeParse(layout).success).toBe(true);
    }
  });

  it('should reject invalid layout values', () => {
    expect(SlideLayoutEnum.safeParse('invalid').success).toBe(false);
    expect(SlideLayoutEnum.safeParse('').success).toBe(false);
  });

  it('should have exactly 9 layout types', () => {
    expect(SLIDE_LAYOUTS).toHaveLength(9);
  });
});

describe('ColourPaletteSchema', () => {
  it('should accept valid hex colours', () => {
    const result = ColourPaletteSchema.safeParse(validPalette);
    expect(result.success).toBe(true);
  });

  it('should reject invalid hex colours', () => {
    const result = ColourPaletteSchema.safeParse({
      ...validPalette,
      primary: 'not-a-colour',
    });
    expect(result.success).toBe(false);
  });

  it('should reject 3-digit hex shorthand', () => {
    const result = ColourPaletteSchema.safeParse({
      ...validPalette,
      primary: '#FFF',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const { primary, ...rest } = validPalette;
    expect(ColourPaletteSchema.safeParse(rest).success).toBe(false);
  });

  it('should accept lowercase hex', () => {
    const result = ColourPaletteSchema.safeParse({
      ...validPalette,
      primary: '#abcdef',
    });
    expect(result.success).toBe(true);
  });
});

describe('DiagramSpecSchema', () => {
  it('should accept valid diagram spec', () => {
    const result = DiagramSpecSchema.safeParse(validDiagram);
    expect(result.success).toBe(true);
  });

  it('should accept all diagram types', () => {
    const types = ['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'pie', 'mindmap'];
    for (const type of types) {
      expect(DiagramSpecSchema.safeParse({ ...validDiagram, type }).success).toBe(true);
    }
  });

  it('should reject invalid diagram type', () => {
    expect(DiagramSpecSchema.safeParse({ ...validDiagram, type: 'unknown' }).success).toBe(false);
  });

  it('should reject empty description', () => {
    expect(DiagramSpecSchema.safeParse({ type: 'flowchart', description: '' }).success).toBe(false);
  });

  it('should accept optional mermaidSyntax and svgPath', () => {
    const result = DiagramSpecSchema.safeParse({
      ...validDiagram,
      mermaidSyntax: 'graph TD\n  A-->B',
      svgPath: '/tmp/diagram.svg',
    });
    expect(result.success).toBe(true);
  });

  it('should accept diagram without optional fields', () => {
    const result = DiagramSpecSchema.safeParse(validDiagram);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mermaidSyntax).toBeUndefined();
      expect(result.data.svgPath).toBeUndefined();
    }
  });
});

describe('SlideSpecSchema', () => {
  it('should accept valid slide spec', () => {
    const result = SlideSpecSchema.safeParse(validSlide);
    expect(result.success).toBe(true);
  });

  it('should reject slideNumber of 0', () => {
    expect(SlideSpecSchema.safeParse({ ...validSlide, slideNumber: 0 }).success).toBe(false);
  });

  it('should reject negative slideNumber', () => {
    expect(SlideSpecSchema.safeParse({ ...validSlide, slideNumber: -1 }).success).toBe(false);
  });

  it('should reject non-integer slideNumber', () => {
    expect(SlideSpecSchema.safeParse({ ...validSlide, slideNumber: 1.5 }).success).toBe(false);
  });

  it('should reject empty title', () => {
    expect(SlideSpecSchema.safeParse({ ...validSlide, title: '' }).success).toBe(false);
  });

  it('should reject empty content', () => {
    expect(SlideSpecSchema.safeParse({ ...validSlide, content: '' }).success).toBe(false);
  });

  it('should reject empty speakerNoteRef', () => {
    expect(SlideSpecSchema.safeParse({ ...validSlide, speakerNoteRef: '' }).success).toBe(false);
  });

  it('should accept slide with optional diagram', () => {
    const result = SlideSpecSchema.safeParse({
      ...validSlide,
      layout: 'diagram',
      diagram: validDiagram,
    });
    expect(result.success).toBe(true);
  });

  it('should accept slide with optional colourAccent', () => {
    const result = SlideSpecSchema.safeParse({
      ...validSlide,
      colourAccent: '#FF0000',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid colourAccent hex', () => {
    expect(SlideSpecSchema.safeParse({ ...validSlide, colourAccent: 'red' }).success).toBe(false);
  });
});

describe('DeckSpecSchema', () => {
  it('should accept valid deck spec', () => {
    const result = DeckSpecSchema.safeParse(validDeckSpec);
    expect(result.success).toBe(true);
  });

  it('should accept deck with optional subtitle', () => {
    const result = DeckSpecSchema.safeParse({
      ...validDeckSpec,
      subtitle: 'A deep dive',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty title', () => {
    expect(DeckSpecSchema.safeParse({ ...validDeckSpec, title: '' }).success).toBe(false);
  });

  it('should reject empty slides array', () => {
    expect(DeckSpecSchema.safeParse({ ...validDeckSpec, slides: [] }).success).toBe(false);
  });

  it('should reject negative diagramCount', () => {
    expect(DeckSpecSchema.safeParse({ ...validDeckSpec, diagramCount: -1 }).success).toBe(false);
  });

  it('should reject non-integer diagramCount', () => {
    expect(DeckSpecSchema.safeParse({ ...validDeckSpec, diagramCount: 1.5 }).success).toBe(false);
  });

  it('should accept diagramCount of 0', () => {
    expect(DeckSpecSchema.safeParse({ ...validDeckSpec, diagramCount: 0 }).success).toBe(true);
  });

  it('should accept deck with multiple slides including diagrams', () => {
    const result = DeckSpecSchema.safeParse({
      ...validDeckSpec,
      slides: [
        validSlide,
        {
          slideNumber: 2,
          title: 'Architecture',
          layout: 'diagram',
          content: 'System overview',
          speakerNoteRef: 'section-arch',
          diagram: validDiagram,
        },
      ],
      diagramCount: 1,
    });
    expect(result.success).toBe(true);
  });
});

// --- Two-phase designer schema tests ---

const validSlideOutline = {
  slideNumber: 1,
  title: 'Introduction',
  layout: 'title' as const,
  speakerNoteRef: 'section-intro',
};

const validDeckOutline = {
  title: 'My Presentation',
  colourPalette: validPalette,
  slides: [validSlideOutline],
  diagramCount: 0,
};

describe('SlideOutlineSchema', () => {
  it('should accept a valid slide outline (no content field)', () => {
    const result = SlideOutlineSchema.safeParse(validSlideOutline);
    expect(result.success).toBe(true);
  });

  it('should accept slide outline with optional diagram', () => {
    const result = SlideOutlineSchema.safeParse({
      ...validSlideOutline,
      layout: 'diagram',
      diagram: validDiagram,
    });
    expect(result.success).toBe(true);
  });

  it('should accept slide outline with optional colourAccent', () => {
    const result = SlideOutlineSchema.safeParse({
      ...validSlideOutline,
      colourAccent: '#FF0000',
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty title (API-safe schema — runtime validation via DeckSpecSchema.parse)', () => {
    // Outline schemas are API-safe (no minLength) for Anthropic output_format.
    // Strict validation happens post-API via DeckSpecSchema.parse().
    expect(SlideOutlineSchema.safeParse({ ...validSlideOutline, title: '' }).success).toBe(true);
  });

  it('should accept empty speakerNoteRef (API-safe schema)', () => {
    expect(SlideOutlineSchema.safeParse({ ...validSlideOutline, speakerNoteRef: '' }).success).toBe(true);
  });

  it('should not require content field', () => {
    // Explicitly verify that content is NOT part of the outline schema
    const withContent = { ...validSlideOutline, content: 'Some content' };
    const result = SlideOutlineSchema.safeParse(withContent);
    expect(result.success).toBe(true);
    // Content should be stripped (not in output) since it's not in the schema
    if (result.success) {
      expect('content' in result.data).toBe(false);
    }
  });
});

describe('DeckOutlineSchema', () => {
  it('should accept a valid deck outline', () => {
    const result = DeckOutlineSchema.safeParse(validDeckOutline);
    expect(result.success).toBe(true);
  });

  it('should accept deck outline with optional subtitle', () => {
    const result = DeckOutlineSchema.safeParse({
      ...validDeckOutline,
      subtitle: 'A deep dive',
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty slides array (API-safe schema — runtime validation via DeckSpecSchema.parse)', () => {
    expect(DeckOutlineSchema.safeParse({ ...validDeckOutline, slides: [] }).success).toBe(true);
  });

  it('should accept multiple slide outlines including diagram slides', () => {
    const result = DeckOutlineSchema.safeParse({
      ...validDeckOutline,
      slides: [
        validSlideOutline,
        {
          slideNumber: 2,
          title: 'Architecture',
          layout: 'diagram',
          speakerNoteRef: 'section-arch',
          diagram: validDiagram,
        },
      ],
      diagramCount: 1,
    });
    expect(result.success).toBe(true);
  });
});
