import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DeckOutline, DeckSpec } from '../../../schemas/deck-spec';
import { DeckSpecSchema } from '../../../schemas/deck-spec';

// Mock designer agent before importing the step
vi.mock('../../../agents/designer', () => ({
  designer: {
    generate: vi.fn(),
  },
}));

import { designerContentFillStep } from '../designer-content-fill';
import { designer } from '../../../agents/designer';

const mockDesigner = vi.mocked(designer);

const validOutline: DeckOutline = {
  title: 'Building Resilient Microservices',
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
      speakerNoteRef: 'section-intro',
    },
    {
      slideNumber: 2,
      title: 'Architecture Overview',
      layout: 'diagram',
      speakerNoteRef: 'section-arch',
      diagram: {
        type: 'flowchart',
        description: 'Microservices communication flow',
      },
    },
    {
      slideNumber: 3,
      title: 'Conclusion',
      layout: 'closing',
      speakerNoteRef: 'section-conclusion',
    },
  ],
  diagramCount: 1,
};

const speakerScript = '# My Talk\n\nThis is the speaker script about microservices and resilience patterns.';

function makeExecuteContext(inputData: unknown) {
  return {
    inputData,
    mapiId: undefined,
    suspend: vi.fn(),
    resumeData: undefined,
    suspendData: undefined,
    getInitData: vi.fn(),
    getStepResult: vi.fn(),
    retry: { count: 0 },
    runId: 'test-run',
  } as never;
}

describe('designerContentFillStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have id "designer-content-fill"', () => {
    expect(designerContentFillStep.id).toBe('designer-content-fill');
  });

  it('should call designer.generate once per slide in parallel', async () => {
    // Mock each slide's content generation
    mockDesigner.generate
      .mockResolvedValueOnce({ object: { content: 'Welcome to the talk' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'System overview diagram', diagramDescription: 'Refined flow diagram' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Key takeaways' }, text: '' } as never);

    await designerContentFillStep.execute!(makeExecuteContext({
      deckOutline: validOutline,
      speakerScript,
    }));

    // Should be called once per slide (3 slides = 3 calls)
    expect(mockDesigner.generate).toHaveBeenCalledTimes(3);
  });

  it('should return a valid DeckSpec with content filled in', async () => {
    mockDesigner.generate
      .mockResolvedValueOnce({ object: { content: 'Welcome to the talk' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'System overview diagram', diagramDescription: 'Refined flow' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Key takeaways' }, text: '' } as never);

    const result = await designerContentFillStep.execute!(makeExecuteContext({
      deckOutline: validOutline,
      speakerScript,
    })) as DeckSpec;

    // Result should be a valid DeckSpec
    const parsed = DeckSpecSchema.safeParse(result);
    expect(parsed.success).toBe(true);

    // Verify slide content was filled
    expect(result.slides[0].content).toBe('Welcome to the talk');
    expect(result.slides[1].content).toBe('System overview diagram');
    expect(result.slides[2].content).toBe('Key takeaways');
  });

  it('should preserve outline metadata in final DeckSpec', async () => {
    mockDesigner.generate
      .mockResolvedValueOnce({ object: { content: 'Content 1' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Content 2', diagramDescription: 'Refined' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Content 3' }, text: '' } as never);

    const result = await designerContentFillStep.execute!(makeExecuteContext({
      deckOutline: validOutline,
      speakerScript,
    })) as DeckSpec;

    expect(result.title).toBe(validOutline.title);
    expect(result.colourPalette).toEqual(validOutline.colourPalette);
    expect(result.diagramCount).toBe(validOutline.diagramCount);
    expect(result.slides).toHaveLength(3);
    expect(result.slides[0].layout).toBe('title');
    expect(result.slides[1].layout).toBe('diagram');
    expect(result.slides[1].speakerNoteRef).toBe('section-arch');
  });

  it('should update diagram description when diagramDescription is returned', async () => {
    mockDesigner.generate
      .mockResolvedValueOnce({ object: { content: 'Content 1' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Content 2', diagramDescription: 'Refined microservices flow with error handling' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Content 3' }, text: '' } as never);

    const result = await designerContentFillStep.execute!(makeExecuteContext({
      deckOutline: validOutline,
      speakerScript,
    })) as DeckSpec;

    expect(result.slides[1].diagram?.description).toBe('Refined microservices flow with error handling');
    expect(result.slides[1].diagram?.type).toBe('flowchart');
  });

  it('should keep original diagram description when diagramDescription is not returned', async () => {
    mockDesigner.generate
      .mockResolvedValueOnce({ object: { content: 'Content 1' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Content 2' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'Content 3' }, text: '' } as never);

    const result = await designerContentFillStep.execute!(makeExecuteContext({
      deckOutline: validOutline,
      speakerScript,
    })) as DeckSpec;

    expect(result.slides[1].diagram?.description).toBe('Microservices communication flow');
  });

  it('should include slide-specific context in each parallel prompt', async () => {
    mockDesigner.generate
      .mockResolvedValueOnce({ object: { content: 'C1' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'C2', diagramDescription: 'D' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'C3' }, text: '' } as never);

    await designerContentFillStep.execute!(makeExecuteContext({
      deckOutline: validOutline,
      speakerScript,
    }));

    // Check that each call gets slide-specific context
    const calls = mockDesigner.generate.mock.calls;

    // Slide 1 prompt should reference slide 1
    expect(calls[0][0]).toContain('slide 1');
    expect(calls[0][0]).toContain('Introduction');

    // Slide 2 prompt should reference diagram type
    expect(calls[1][0]).toContain('slide 2');
    expect(calls[1][0]).toContain('DIAGRAM slide');
    expect(calls[1][0]).toContain('flowchart');

    // Slide 3 prompt
    expect(calls[2][0]).toContain('slide 3');
    expect(calls[2][0]).toContain('Conclusion');
  });

  it('should not include diagram instruction for non-diagram slides', async () => {
    mockDesigner.generate
      .mockResolvedValueOnce({ object: { content: 'C1' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'C2', diagramDescription: 'D' }, text: '' } as never)
      .mockResolvedValueOnce({ object: { content: 'C3' }, text: '' } as never);

    await designerContentFillStep.execute!(makeExecuteContext({
      deckOutline: validOutline,
      speakerScript,
    }));

    const calls = mockDesigner.generate.mock.calls;
    // Slide 1 (title) should not mention diagram
    expect(calls[0][0]).not.toContain('DIAGRAM slide');
    // Slide 3 (closing) should not mention diagram
    expect(calls[2][0]).not.toContain('DIAGRAM slide');
  });
});
