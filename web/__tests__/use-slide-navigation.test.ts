import { describe, it, expect } from 'vitest';

// We test the pure navigation logic, not the React hook (no JSDOM).
// The hook is a thin wrapper around this logic.
import { clampSlideIndex, getNextAction } from '../lib/use-slide-navigation';

describe('clampSlideIndex', () => {
  it('clamps to 0 when index is negative', () => {
    expect(clampSlideIndex(-1, 10)).toBe(0);
  });

  it('clamps to total-1 when index exceeds bounds', () => {
    expect(clampSlideIndex(15, 10)).toBe(9);
  });

  it('returns index unchanged when within bounds', () => {
    expect(clampSlideIndex(5, 10)).toBe(5);
  });

  it('returns 0 for single-slide deck', () => {
    expect(clampSlideIndex(0, 1)).toBe(0);
    expect(clampSlideIndex(1, 1)).toBe(0);
  });
});

describe('getNextAction', () => {
  it('returns "next" for ArrowRight', () => {
    expect(getNextAction('ArrowRight')).toBe('next');
  });

  it('returns "next" for Space', () => {
    expect(getNextAction(' ')).toBe('next');
  });

  it('returns "prev" for ArrowLeft', () => {
    expect(getNextAction('ArrowLeft')).toBe('prev');
  });

  it('returns "fullscreen" for f key', () => {
    expect(getNextAction('f')).toBe('fullscreen');
  });

  it('returns "exit" for Escape key', () => {
    expect(getNextAction('Escape')).toBe('exit');
  });

  it('returns null for unrecognised key', () => {
    expect(getNextAction('a')).toBeNull();
  });
});
