import { describe, it, expect, vi } from 'vitest';
import { DeckOutlineSchema } from '../../../schemas/deck-spec';
import { ANTHROPIC_STRUCTURED_OUTPUT_OPTIONS } from '../../../config/models';

// Mock designer agent before importing the step
vi.mock('../../../agents/designer', () => ({
  designer: {
    generate: vi.fn(),
  },
}));

import { designerOutlineStep, DesignerOutlineOutputSchema, type DesignerOutlineOutput } from '../designer-outline';
import { designer } from '../../../agents/designer';

const mockDesigner = vi.mocked(designer);

const validOutline = {
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
      layout: 'title' as const,
      speakerNoteRef: 'section-intro',
    },
    {
      slideNumber: 2,
      title: 'Architecture Overview',
      layout: 'diagram' as const,
      speakerNoteRef: 'section-arch',
      diagram: {
        type: 'flowchart' as const,
        description: 'Microservices communication flow',
      },
    },
  ],
  diagramCount: 1,
};

describe('designerOutlineStep', () => {
  it('should have id "designer-outline"', () => {
    expect(designerOutlineStep.id).toBe('designer-outline');
  });

  it('should call designer.generate with outline-specific instructions', async () => {
    mockDesigner.generate.mockResolvedValueOnce({
      object: validOutline,
      text: '',
    } as never);

    const prompt = `Design a slide deck.

## Speaker Script
Hello world, this is the talk.

## Requirements
- Topic: Testing`;

    await designerOutlineStep.execute!({
      inputData: { prompt },
      mapiId: undefined,
      suspend: vi.fn(),
      resumeData: undefined,
      suspendData: undefined,
      getInitData: vi.fn(),
      getStepResult: vi.fn(),
      retry: { count: 0 },
      runId: 'test-run',
    } as never);

    expect(mockDesigner.generate).toHaveBeenCalledTimes(1);
    const callArgs = mockDesigner.generate.mock.calls[0];
    expect(callArgs[0]).toContain('IMPORTANT: In this phase, produce ONLY the deck outline');
    expect(callArgs[0]).toContain('Do NOT write slide content yet');
    expect(callArgs[1]).toEqual({
      structuredOutput: { schema: DeckOutlineSchema },
      providerOptions: ANTHROPIC_STRUCTURED_OUTPUT_OPTIONS,
    });
  });

  it('should return deckOutline and extracted speakerScript', async () => {
    mockDesigner.generate.mockResolvedValueOnce({
      object: validOutline,
      text: '',
    } as never);

    const result = await designerOutlineStep.execute!({
      inputData: {
        prompt: `Design a slide deck.

## Speaker Script
Hello world, this is the talk about microservices.

## Talk Structure
Some structure here`,
      },
      mapiId: undefined,
      suspend: vi.fn(),
      resumeData: undefined,
      suspendData: undefined,
      getInitData: vi.fn(),
      getStepResult: vi.fn(),
      retry: { count: 0 },
      runId: 'test-run',
    } as never) as DesignerOutlineOutput;

    expect(result.deckOutline).toEqual(validOutline);
    expect(result.speakerScript).toBe('Hello world, this is the talk about microservices.');
  });

  it('should handle missing speaker script section gracefully', async () => {
    mockDesigner.generate.mockResolvedValueOnce({
      object: validOutline,
      text: '',
    } as never);

    const result = await designerOutlineStep.execute!({
      inputData: { prompt: 'Design a slide deck with no script section.' },
      mapiId: undefined,
      suspend: vi.fn(),
      resumeData: undefined,
      suspendData: undefined,
      getInitData: vi.fn(),
      getStepResult: vi.fn(),
      retry: { count: 0 },
      runId: 'test-run',
    } as never) as DesignerOutlineOutput;

    expect(result.deckOutline).toEqual(validOutline);
    expect(result.speakerScript).toBe('');
  });
});

describe('DesignerOutlineOutputSchema', () => {
  it('should accept valid output with deckOutline and speakerScript', () => {
    const result = DesignerOutlineOutputSchema.safeParse({
      deckOutline: validOutline,
      speakerScript: 'Hello world',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty speakerScript', () => {
    const result = DesignerOutlineOutputSchema.safeParse({
      deckOutline: validOutline,
      speakerScript: '',
    });
    expect(result.success).toBe(false);
  });
});
