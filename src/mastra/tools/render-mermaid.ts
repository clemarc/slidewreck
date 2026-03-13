import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getBrowser } from '../config/browser';

let mermaidCliModule: typeof import('@mermaid-js/mermaid-cli') | null = null;

async function getMermaidCli() {
  if (!mermaidCliModule) {
    mermaidCliModule = await import('@mermaid-js/mermaid-cli');
  }
  return mermaidCliModule;
}

export const renderMermaidTool = createTool({
  id: 'render-mermaid',
  description: 'Render Mermaid diagram syntax to SVG. Returns SVG content on success or an error message on invalid syntax.',
  inputSchema: z.object({
    mermaidSyntax: z.string().min(1).describe('Valid Mermaid diagram syntax to render'),
  }),
  outputSchema: z.object({
    svg: z.string().optional().describe('Rendered SVG content. Absent when rendering fails.'),
    error: z.string().optional().describe('Error message when rendering fails. Absent on success.'),
  }),
  execute: async ({ mermaidSyntax }) => {
    try {
      const { renderMermaid } = await getMermaidCli();
      const browser = await getBrowser();
      const { data } = await renderMermaid(browser, mermaidSyntax, 'svg', {
        backgroundColor: 'transparent',
        mermaidConfig: { theme: 'neutral' },
      });
      const svg = new TextDecoder().decode(data);
      return { svg };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { error: message };
    }
  },
});
