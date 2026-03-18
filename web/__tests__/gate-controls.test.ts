import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Gate-specific resume payloads', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('collect-references gate', () => {
    it('sends materials array on submit', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { MastraClient } = await import('../lib/mastra-client');
      const client = new MastraClient('http://localhost:4111');
      await client.resumeStep('slidewreck', 'run-123', 'collect-references', {
        materials: [
          { type: 'url', path: 'https://example.com/article' },
          { type: 'file', path: '/docs/notes.md' },
        ],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async?runId=run-123',
        expect.objectContaining({
          body: JSON.stringify({
            step: 'collect-references',
            resumeData: {
              materials: [
                { type: 'url', path: 'https://example.com/article' },
                { type: 'file', path: '/docs/notes.md' },
              ],
            },
          }),
        }),
      );
    });

    it('sends empty materials array on skip', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { MastraClient } = await import('../lib/mastra-client');
      const client = new MastraClient('http://localhost:4111');
      await client.resumeStep('slidewreck', 'run-123', 'collect-references', {
        materials: [],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async?runId=run-123',
        expect.objectContaining({
          body: JSON.stringify({
            step: 'collect-references',
            resumeData: { materials: [] },
          }),
        }),
      );
    });
  });

  describe('architect-structure gate', () => {
    it('sends approve with selected option in feedback', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { MastraClient } = await import('../lib/mastra-client');
      const client = new MastraClient('http://localhost:4111');
      await client.resumeStep('slidewreck', 'run-123', 'architect-structure', {
        decision: 'approve',
        feedback: 'Selected option: Problem → Solution → Demo',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async?runId=run-123',
        expect.objectContaining({
          body: JSON.stringify({
            step: 'architect-structure',
            resumeData: {
              decision: 'approve',
              feedback: 'Selected option: Problem → Solution → Demo',
            },
          }),
        }),
      );
    });

    it('sends reject with feedback for regeneration', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { MastraClient } = await import('../lib/mastra-client');
      const client = new MastraClient('http://localhost:4111');
      await client.resumeStep('slidewreck', 'run-123', 'architect-structure', {
        decision: 'reject',
        feedback: 'More interactive demos please',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async?runId=run-123',
        expect.objectContaining({
          body: JSON.stringify({
            step: 'architect-structure',
            resumeData: {
              decision: 'reject',
              feedback: 'More interactive demos please',
            },
          }),
        }),
      );
    });
  });

  describe('review-slides gate', () => {
    it('sends approve with modified deckSpec', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const deckSpec = { title: 'My Talk', slides: [{ type: 'title', content: { heading: 'Hello' } }] };

      const { MastraClient } = await import('../lib/mastra-client');
      const client = new MastraClient('http://localhost:4111');
      await client.resumeStep('slidewreck', 'run-123', 'review-slides', {
        decision: 'approve',
        deckSpec,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async?runId=run-123',
        expect.objectContaining({
          body: JSON.stringify({
            step: 'review-slides',
            resumeData: { decision: 'approve', deckSpec },
          }),
        }),
      );
    });

    it('sends approve without deckSpec when no edits', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { MastraClient } = await import('../lib/mastra-client');
      const client = new MastraClient('http://localhost:4111');
      await client.resumeStep('slidewreck', 'run-123', 'review-slides', {
        decision: 'approve',
        feedback: 'Looks good',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async?runId=run-123',
        expect.objectContaining({
          body: JSON.stringify({
            step: 'review-slides',
            resumeData: { decision: 'approve', feedback: 'Looks good' },
          }),
        }),
      );
    });
  });

  describe('standard gates (review-research, review-script)', () => {
    it('sends standard approve/reject for review-research', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { MastraClient } = await import('../lib/mastra-client');
      const client = new MastraClient('http://localhost:4111');
      await client.resumeStep('slidewreck', 'run-123', 'review-research', {
        decision: 'approve',
        feedback: 'Good findings',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4111/api/workflows/slidewreck/resume-async?runId=run-123',
        expect.objectContaining({
          body: JSON.stringify({
            step: 'review-research',
            resumeData: { decision: 'approve', feedback: 'Good findings' },
          }),
        }),
      );
    });
  });
});

describe('Gate controls payload builders', () => {
  it('buildReferencesPayload returns materials array', async () => {
    const { buildReferencesPayload } = await import('../components/gate-controls/references-controls');
    const payload = buildReferencesPayload([
      { type: 'url' as const, path: 'https://example.com' },
      { type: 'file' as const, path: '/docs/readme.md' },
    ]);
    expect(payload).toEqual({
      materials: [
        { type: 'url', path: 'https://example.com' },
        { type: 'file', path: '/docs/readme.md' },
      ],
    });
  });

  it('buildReferencesPayload returns empty materials for skip', async () => {
    const { buildReferencesPayload } = await import('../components/gate-controls/references-controls');
    const payload = buildReferencesPayload([]);
    expect(payload).toEqual({ materials: [] });
  });

  it('buildStructureApprovePayload includes selected option title', async () => {
    const { buildStructureApprovePayload } = await import('../components/gate-controls/structure-controls');
    const payload = buildStructureApprovePayload('Problem → Solution → Demo', 'Also add more code examples');
    expect(payload).toEqual({
      decision: 'approve',
      feedback: 'Selected option: Problem → Solution → Demo\nAlso add more code examples',
    });
  });

  it('buildStructureApprovePayload with no extra feedback', async () => {
    const { buildStructureApprovePayload } = await import('../components/gate-controls/structure-controls');
    const payload = buildStructureApprovePayload('Story Arc', '');
    expect(payload).toEqual({
      decision: 'approve',
      feedback: 'Selected option: Story Arc',
    });
  });

  it('buildStructureRejectPayload sends reject with feedback', async () => {
    const { buildStructureRejectPayload } = await import('../components/gate-controls/structure-controls');
    const payload = buildStructureRejectPayload('Need more interactive options');
    expect(payload).toEqual({
      decision: 'reject',
      feedback: 'Need more interactive options',
    });
  });

  it('buildSlidesApprovePayload includes deckSpec when provided', async () => {
    const { buildSlidesApprovePayload } = await import('../components/gate-controls/slides-controls');
    const deckSpec = { title: 'My Talk', slides: [] };
    const payload = buildSlidesApprovePayload('Looks good', deckSpec);
    expect(payload).toEqual({
      decision: 'approve',
      feedback: 'Looks good',
      deckSpec: { title: 'My Talk', slides: [] },
    });
  });

  it('buildSlidesApprovePayload omits deckSpec when undefined', async () => {
    const { buildSlidesApprovePayload } = await import('../components/gate-controls/slides-controls');
    const payload = buildSlidesApprovePayload('Fine as is', undefined);
    expect(payload).toEqual({
      decision: 'approve',
      feedback: 'Fine as is',
    });
  });

  it('buildSlidesApprovePayload omits feedback when empty string', async () => {
    const { buildSlidesApprovePayload } = await import('../components/gate-controls/slides-controls');
    const payload = buildSlidesApprovePayload('', undefined);
    expect(payload).toEqual({ decision: 'approve' });
    expect(payload).not.toHaveProperty('feedback');
    expect(payload).not.toHaveProperty('deckSpec');
  });

  it('buildStructureApprovePayload handles options array from output', async () => {
    const { buildStructureApprovePayload } = await import('../components/gate-controls/structure-controls');
    // When output has no options, the component defaults to []. Approve should still work with the title.
    const payload = buildStructureApprovePayload('Fallback Title', '');
    expect(payload.decision).toBe('approve');
    expect(payload.feedback).toContain('Fallback Title');
  });
});

describe('GATE_CONTROLS_MAP', () => {
  it('maps all 5 gate IDs to control types', async () => {
    const { GATE_CONTROLS_MAP } = await import('../components/gate-controls');
    expect(GATE_CONTROLS_MAP['collect-references']).toBe('references');
    expect(GATE_CONTROLS_MAP['architect-structure']).toBe('structure');
    expect(GATE_CONTROLS_MAP['review-slides']).toBe('slides');
    // Standard gates use generic controls (not in map)
    expect(GATE_CONTROLS_MAP['review-research']).toBeUndefined();
    expect(GATE_CONTROLS_MAP['review-script']).toBeUndefined();
  });
});
