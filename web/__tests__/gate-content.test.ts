import { describe, it, expect } from 'vitest';
import { GATE_RENDERERS } from '../components/gate-content';

describe('GATE_RENDERERS', () => {
  it('has a renderer for review-research', () => {
    expect(GATE_RENDERERS['review-research']).toBeDefined();
  });

  it('architect-structure uses special-case rendering (not in GATE_RENDERERS)', () => {
    expect(GATE_RENDERERS['architect-structure']).toBeUndefined();
  });

  it('has a renderer for review-script', () => {
    expect(GATE_RENDERERS['review-script']).toBeDefined();
  });

  it('has a renderer for review-slides', () => {
    expect(GATE_RENDERERS['review-slides']).toBeDefined();
  });

  it('does not have a renderer for collect-references (handled separately)', () => {
    expect(GATE_RENDERERS['collect-references']).toBeUndefined();
  });

  it('has exactly 3 gate renderers (architect-structure handled separately)', () => {
    expect(Object.keys(GATE_RENDERERS)).toHaveLength(3);
  });
});
