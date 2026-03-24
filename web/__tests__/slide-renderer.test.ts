import { describe, it, expect } from 'vitest';
import { LAYOUT_RENDERERS, getLayoutComponent } from '../components/slides/slide-renderer';
import { SLIDE_LAYOUTS } from '../types/deck-spec';

describe('SlideRenderer', () => {
  it('has a renderer for every SLIDE_LAYOUTS value', () => {
    for (const layout of SLIDE_LAYOUTS) {
      expect(LAYOUT_RENDERERS[layout], `Missing renderer for layout: ${layout}`).toBeDefined();
    }
  });

  it('has exactly 9 layout renderers (one per SlideLayout)', () => {
    expect(Object.keys(LAYOUT_RENDERERS)).toHaveLength(9);
  });

  it('getLayoutComponent returns correct component for known layout', () => {
    const component = getLayoutComponent('title');
    expect(component).toBe(LAYOUT_RENDERERS['title']);
  });

  it('getLayoutComponent falls back to content for unknown layout', () => {
    const component = getLayoutComponent('unknown-layout' as never);
    expect(component).toBe(LAYOUT_RENDERERS['content']);
  });

  it('getLayoutComponent falls back to content for undefined layout', () => {
    const component = getLayoutComponent(undefined as never);
    expect(component).toBe(LAYOUT_RENDERERS['content']);
  });
});
