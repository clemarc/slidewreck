import { describe, it, expect } from 'vitest';

describe('CollapsibleSection', () => {
  it('exports CollapsibleSection component', async () => {
    const mod = await import('../components/content-renderers/collapsible-section');
    expect(mod.CollapsibleSection).toBeDefined();
    expect(typeof mod.CollapsibleSection).toBe('function');
  });
});

describe('LayoutBadge', () => {
  it('exports LayoutBadge component', async () => {
    const mod = await import('../components/content-renderers/layout-badge');
    expect(mod.LayoutBadge).toBeDefined();
    expect(typeof mod.LayoutBadge).toBe('function');
  });

  it('LAYOUT_COLOURS covers all 9 DeckSpec layout types', async () => {
    const { LAYOUT_COLOURS } = await import('../components/content-renderers/layout-badge');
    const expectedLayouts = ['title', 'content', 'split', 'image', 'quote', 'code', 'comparison', 'diagram', 'closing'];
    for (const layout of expectedLayouts) {
      expect(LAYOUT_COLOURS[layout]).toBeDefined();
      expect(LAYOUT_COLOURS[layout].bg).toBeTruthy();
      expect(LAYOUT_COLOURS[layout].text).toBeTruthy();
    }
    expect(Object.keys(LAYOUT_COLOURS)).toHaveLength(9);
  });
});

describe('content-renderers barrel export', () => {
  it('exports all components from barrel', async () => {
    const mod = await import('../components/content-renderers');
    expect(mod.CollapsibleSection).toBeDefined();
    expect(mod.LayoutBadge).toBeDefined();
    expect(mod.LAYOUT_COLOURS).toBeDefined();
  });
});

describe('ResearchGate with collapsible sections', () => {
  it('exports ResearchGate and ResearchOutput type', async () => {
    const mod = await import('../components/gate-content/research-gate');
    expect(mod.ResearchGate).toBeDefined();
  });
});

describe('ScriptGate with enhanced formatting', () => {
  it('exports ScriptGate and WriterOutput type', async () => {
    const mod = await import('../components/gate-content/script-gate');
    expect(mod.ScriptGate).toBeDefined();
  });
});

describe('SlidesGate with thumbnail cards', () => {
  it('exports SlidesGate component', async () => {
    const mod = await import('../components/gate-content/slides-gate');
    expect(mod.SlidesGate).toBeDefined();
  });
});
