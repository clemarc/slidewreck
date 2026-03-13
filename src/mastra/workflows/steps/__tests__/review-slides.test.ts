import { describe, it, expect, vi } from 'vitest';
import { reviewSlidesStep } from '../review-slides';
import type { DeckSpec } from '../../../schemas/deck-spec';

const TEST_DECK: DeckSpec = {
  title: 'Test Presentation',
  colourPalette: {
    primary: '#1A2B3C',
    secondary: '#4D5E6F',
    accent: '#FF6600',
    background: '#FFFFFF',
    text: '#333333',
  },
  slides: [
    {
      slideNumber: 1,
      title: 'Intro',
      layout: 'title',
      content: 'Welcome',
      speakerNoteRef: 'intro',
    },
  ],
  diagramCount: 0,
};

describe('reviewSlidesStep', () => {
  it('should have id "review-slides"', () => {
    expect(reviewSlidesStep.id).toBe('review-slides');
  });

  it('should have input, output, suspend, and resume schemas', () => {
    expect(reviewSlidesStep.inputSchema).toBeDefined();
    expect(reviewSlidesStep.outputSchema).toBeDefined();
    expect(reviewSlidesStep.suspendSchema).toBeDefined();
    expect(reviewSlidesStep.resumeSchema).toBeDefined();
  });

  it('should auto-approve when reviewSlides is false', async () => {
    const result = await reviewSlidesStep.execute!({
      inputData: { deckSpec: TEST_DECK },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn().mockReturnValue({ reviewSlides: false }),
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    const typed = result as { decision: string; deckSpec: DeckSpec };
    expect(typed.decision).toBe('approve');
    expect(typed.deckSpec).toEqual(TEST_DECK);
  });

  it('should auto-approve when reviewSlides is undefined (default)', async () => {
    const result = await reviewSlidesStep.execute!({
      inputData: { deckSpec: TEST_DECK },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn().mockReturnValue({}),
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    const typed = result as { decision: string; deckSpec: DeckSpec };
    expect(typed.decision).toBe('approve');
    expect(typed.deckSpec).toEqual(TEST_DECK);
  });

  it('should suspend when reviewSlides is true', async () => {
    const suspendFn = vi.fn();

    await reviewSlidesStep.execute!({
      inputData: { deckSpec: TEST_DECK },
      resumeData: undefined,
      suspend: suspendFn as never,
      suspendData: undefined,
      getInitData: vi.fn().mockReturnValue({ reviewSlides: true }),
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    expect(suspendFn).toHaveBeenCalledOnce();
    expect(suspendFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'designer',
        gateId: 'review-slides',
        output: TEST_DECK,
      }),
    );
  });

  it('should pass through resume data with deckSpec on approval', async () => {
    const result = await reviewSlidesStep.execute!({
      inputData: { deckSpec: TEST_DECK },
      resumeData: { decision: 'approve', deckSpec: TEST_DECK },
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn().mockReturnValue({ reviewSlides: true }),
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    const typed = result as { decision: string; deckSpec: DeckSpec };
    expect(typed.decision).toBe('approve');
    expect(typed.deckSpec).toEqual(TEST_DECK);
  });
});
