import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../tools/build-slides', () => ({
  buildSlidesTool: {
    execute: vi.fn(),
  },
}));

import { buildSlidesStep } from '../build-slides';
import { buildSlidesTool } from '../../../tools/build-slides';
import type { DeckSpec } from '../../../schemas/deck-spec';

const MINIMAL_DECK: DeckSpec = {
  title: 'Test',
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

describe('buildSlidesStep', () => {
  it('should have id and schemas', () => {
    expect(buildSlidesStep.id).toBe('build-slides');
    expect(buildSlidesStep.inputSchema).toBeDefined();
    expect(buildSlidesStep.outputSchema).toBeDefined();
  });

  it('should call buildSlidesTool and return markdown', async () => {
    vi.mocked(buildSlidesTool.execute!).mockResolvedValueOnce({
      markdown: '# Test\n\n---\nslideNumber: 1\n---\n\n## Intro\n\nWelcome',
    });

    const result = await buildSlidesStep.execute!({
      inputData: { deckSpec: MINIMAL_DECK },
      resumeData: undefined,
      suspend: vi.fn() as never,
      suspendData: undefined,
      getInitData: vi.fn() as never,
      getStepResult: vi.fn() as never,
      runId: 'test-run',
    } as never);

    expect(buildSlidesTool.execute).toHaveBeenCalledOnce();
    const typed = result as { markdown: string };
    expect(typed.markdown).toContain('# Test');
  });
});
