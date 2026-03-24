import { describe, it, expect } from 'vitest';
import { getMermaidRenderPriority } from '../lib/use-mermaid';

describe('getMermaidRenderPriority', () => {
  it('returns "prerendered" when svg prop is provided', () => {
    const result = getMermaidRenderPriority('<svg>test</svg>', 'graph LR; A-->B');
    expect(result).toBe('prerendered');
  });

  it('returns "mermaid" when no svg but mermaidSyntax exists', () => {
    const result = getMermaidRenderPriority(undefined, 'graph LR; A-->B');
    expect(result).toBe('mermaid');
  });

  it('returns "fallback" when neither svg nor mermaidSyntax exists', () => {
    const result = getMermaidRenderPriority(undefined, undefined);
    expect(result).toBe('fallback');
  });

  it('returns "prerendered" when svg exists even with mermaidSyntax', () => {
    const result = getMermaidRenderPriority('<svg>test</svg>', 'graph LR; A-->B');
    expect(result).toBe('prerendered');
  });

  it('returns "fallback" for empty string mermaidSyntax', () => {
    const result = getMermaidRenderPriority(undefined, '');
    expect(result).toBe('fallback');
  });
});
