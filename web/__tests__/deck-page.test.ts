import { describe, it, expect } from 'vitest';
import { buildDiagramMap } from '../lib/deck-helpers';

describe('buildDiagramMap', () => {
  it('maps diagrams by slideNumber', () => {
    const diagrams = [
      { slideNumber: 5, svg: '<svg>5</svg>' },
      { slideNumber: 8, svg: '<svg>8</svg>' },
    ];
    const map = buildDiagramMap(diagrams);
    expect(map.get(5)).toBe('<svg>5</svg>');
    expect(map.get(8)).toBe('<svg>8</svg>');
    expect(map.get(1)).toBeUndefined();
  });

  it('returns empty map for undefined input', () => {
    const map = buildDiagramMap(undefined);
    expect(map.size).toBe(0);
  });

  it('returns empty map for empty array', () => {
    const map = buildDiagramMap([]);
    expect(map.size).toBe(0);
  });
});
