import { describe, it, expect } from 'vitest';
import { WorkflowInputSchema } from 'slidewreck/src/mastra/schemas/workflow-input';

describe('workflow form validation', () => {
  it('rejects empty topic', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: '',
      audienceLevel: 'intermediate',
      format: 'standard',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing topic', () => {
    const result = WorkflowInputSchema.safeParse({
      audienceLevel: 'intermediate',
      format: 'standard',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid audience level', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test Topic',
      audienceLevel: 'expert',
      format: 'standard',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid format', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test Topic',
      audienceLevel: 'intermediate',
      format: 'workshop',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid input with all fields', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Building Resilient Microservices',
      audienceLevel: 'advanced',
      format: 'keynote',
      constraints: 'Focus on observability',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topic).toBe('Building Resilient Microservices');
      expect(result.data.constraints).toBe('Focus on observability');
    }
  });

  it('accepts valid input without optional constraints', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Intro to TypeScript',
      audienceLevel: 'beginner',
      format: 'lightning',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constraints).toBeUndefined();
      expect(result.data.reviewSlides).toBe(false);
    }
  });

  it('rejects empty string constraints', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test Topic',
      audienceLevel: 'mixed',
      format: 'standard',
      constraints: '',
    });
    expect(result.success).toBe(false);
  });
});
