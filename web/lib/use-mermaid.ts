'use client';

import { useState, useEffect, useRef } from 'react';

export type MermaidRenderPriority = 'prerendered' | 'mermaid' | 'fallback';

/** Determine the rendering strategy for a diagram slide */
export function getMermaidRenderPriority(
  svg: string | undefined,
  mermaidSyntax: string | undefined,
): MermaidRenderPriority {
  if (svg) return 'prerendered';
  if (mermaidSyntax && mermaidSyntax.length > 0) return 'mermaid';
  return 'fallback';
}

export interface UseMermaidResult {
  svg: string | null;
  error: string | null;
  loading: boolean;
}

/**
 * Client-side Mermaid rendering hook.
 * Dynamically imports mermaid.js and renders syntax to SVG.
 * Reads colour palette from CSS custom properties for theme integration.
 */
export function useMermaid(
  syntax: string | undefined,
  id: string,
): UseMermaidResult {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!syntax);
  const rendered = useRef(false);

  useEffect(() => {
    if (!syntax || rendered.current) return;
    rendered.current = true;

    (async () => {
      try {
        const mermaid = await import('mermaid');

        // Read palette from CSS custom properties set by paletteToCustomProperties()
        const style = getComputedStyle(document.documentElement);
        const primary = style.getPropertyValue('--slide-primary').trim() || '#1a1a2e';
        const text = style.getPropertyValue('--slide-text').trim() || '#1a1a2e';
        const secondary = style.getPropertyValue('--slide-secondary').trim() || '#16213e';

        mermaid.default.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            primaryColor: primary,
            primaryTextColor: text,
            lineColor: secondary,
          },
        });

        const { svg: renderedSvg } = await mermaid.default.render(id, syntax);
        setSvg(renderedSvg);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Mermaid render failed');
      } finally {
        setLoading(false);
      }
    })();
  }, [syntax, id]);

  return { svg, error, loading };
}
