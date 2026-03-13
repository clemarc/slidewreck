import { describe, it, expect } from 'vitest';
import { suggestLayout } from '../suggest-layout';
import { validateSchema } from '../../__tests__/schema-helpers';

async function suggest(content: string, slidePosition?: 'first' | 'last' | 'middle') {
  const result = await suggestLayout.execute!(
    { content, slidePosition: slidePosition ?? 'middle' },
    {} as never,
  );
  if (result && 'layout' in result) return result;
  throw new Error('Unexpected validation error');
}

describe('suggestLayout tool', () => {
  it('should have id, description, inputSchema, and outputSchema', () => {
    expect(suggestLayout.id).toBe('suggest-layout');
    expect(suggestLayout.description).toBeTruthy();
    expect(suggestLayout.inputSchema).toBeDefined();
    expect(suggestLayout.outputSchema).toBeDefined();
  });

  it('should return "code" for content with code block markers', async () => {
    const result = await suggest('Here is the implementation:\n```typescript\nconst x = 1;\n```');
    expect(result.layout).toBe('code');
  });

  it('should return "diagram" for content referencing diagrams', async () => {
    const result = await suggest('This flowchart shows the system architecture and data flow');
    expect(result.layout).toBe('diagram');
  });

  it('should return "title" for first slide position', async () => {
    const result = await suggest('Welcome to our presentation about AI', 'first');
    expect(result.layout).toBe('title');
  });

  it('should return "closing" for last slide position', async () => {
    const result = await suggest('Thank you and questions', 'last');
    expect(result.layout).toBe('closing');
  });

  it('should return "quote" for content with quotation marks', async () => {
    const result = await suggest('"The best way to predict the future is to invent it." — Alan Kay');
    expect(result.layout).toBe('quote');
  });

  it('should return "comparison" for content with vs or comparison language', async () => {
    const result = await suggest('React vs Vue: a comparison of frontend frameworks');
    expect(result.layout).toBe('comparison');
  });

  it('should return "image" for content referencing images or photos', async () => {
    const result = await suggest('Full-screen photo of the team at the conference');
    expect(result.layout).toBe('image');
  });

  it('should return "split" for content with two distinct sections', async () => {
    const result = await suggest('On one hand we have microservices, alternatively we have monoliths');
    expect(result.layout).toBe('split');
  });

  it('should reject empty content via schema', () => {
    expect(validateSchema(suggestLayout.inputSchema!, { content: '', slidePosition: 'middle' }).success).toBe(false);
  });

  it('should return "content" as default for generic text', async () => {
    const result = await suggest('The key insight from our research is that users prefer simplicity');
    expect(result.layout).toBe('content');
  });

  it('should include a reason for the suggestion', async () => {
    const result = await suggest('Some content');
    expect(result.reason).toBeTruthy();
    expect(typeof result.reason).toBe('string');
  });
});
