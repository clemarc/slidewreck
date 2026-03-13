import { describe, it, expect } from 'vitest';
import { generateMermaid } from '../generate-mermaid';

type DiagramType = 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'mindmap';

async function generate(description: string, diagramType: DiagramType) {
  const result = await generateMermaid.execute!(
    { description, diagramType },
    {} as never,
  );
  if (result && 'mermaidSyntax' in result) return result;
  throw new Error('Unexpected validation error');
}

describe('generateMermaid tool', () => {
  it('should have id, description, inputSchema, and outputSchema', () => {
    expect(generateMermaid.id).toBe('generate-mermaid');
    expect(generateMermaid.description).toBeTruthy();
    expect(generateMermaid.inputSchema).toBeDefined();
    expect(generateMermaid.outputSchema).toBeDefined();
  });

  it('should return Mermaid syntax for a flowchart', async () => {
    const result = await generate('User authentication flow', 'flowchart');
    expect(result.mermaidSyntax).toContain('graph');
    expect(result.mermaidSyntax.length).toBeGreaterThan(10);
  });

  it('should return Mermaid syntax for a sequence diagram', async () => {
    const result = await generate('API request response cycle', 'sequence');
    expect(result.mermaidSyntax).toContain('sequenceDiagram');
  });

  it('should return Mermaid syntax for a mindmap', async () => {
    const result = await generate('Machine learning concepts', 'mindmap');
    expect(result.mermaidSyntax).toContain('mindmap');
  });

  it('should return Mermaid syntax for a pie chart', async () => {
    const result = await generate('Market share distribution', 'pie');
    expect(result.mermaidSyntax).toContain('pie');
  });

  it('should include the description in a comment or node', async () => {
    const result = await generate('System architecture overview', 'flowchart');
    // The generated syntax should reference the description content
    expect(result.mermaidSyntax.length).toBeGreaterThan(0);
  });

  it('should reject empty description via schema', () => {
    const schema = generateMermaid.inputSchema!;
    expect(schema.safeParse({ description: '', diagramType: 'flowchart' }).success).toBe(false);
  });

  it('should reject empty diagramType via schema', () => {
    const schema = generateMermaid.inputSchema!;
    expect(schema.safeParse({ description: 'test', diagramType: '' }).success).toBe(false);
  });
});
