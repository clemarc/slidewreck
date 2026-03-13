import { describe, it, expect, afterAll } from 'vitest';
import { renderMermaidTool } from '../render-mermaid';
import { closeBrowser } from '../../config/browser';

afterAll(async () => {
  await closeBrowser();
});

async function render(mermaidSyntax: string) {
  const result = await renderMermaidTool.execute!(
    { mermaidSyntax },
    {} as never,
  );
  if (result && ('svg' in result || 'error' in result)) return result as { svg?: string; error?: string };
  throw new Error('Unexpected result shape');
}

describe('renderMermaid tool', () => {
  it('should have id, description, inputSchema, and outputSchema', () => {
    expect(renderMermaidTool.id).toBe('render-mermaid');
    expect(renderMermaidTool.description).toBeTruthy();
    expect(renderMermaidTool.inputSchema).toBeDefined();
    expect(renderMermaidTool.outputSchema).toBeDefined();
  });

  it('should render valid Mermaid to SVG', async () => {
    const result = await render('graph TD\n  A[Start] --> B[End]');
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('Start');
    expect(result.error).toBeUndefined();
  }, 15000);

  it('should return error for invalid syntax', async () => {
    const result = await render('this is not valid mermaid syntax at all %%%');
    expect(result.error).toBeDefined();
    expect(result.svg).toBeUndefined();
  }, 15000);

  it('should reject empty mermaidSyntax via schema', () => {
    const schema = renderMermaidTool.inputSchema!;
    expect(schema.safeParse({ mermaidSyntax: '' }).success).toBe(false);
  });
});
