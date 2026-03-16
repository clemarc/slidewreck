import { describe, it, expect } from 'vitest';
import { WorkflowInputSchema, TalkFormatEnum } from 'bmad-mastra-presentation/src/mastra/schemas/workflow-input';

describe('shared schema import', () => {
  it('imports WorkflowInputSchema from workspace package', () => {
    expect(WorkflowInputSchema).toBeDefined();
    expect(typeof WorkflowInputSchema.parse).toBe('function');
  });

  it('validates a correct workflow input', () => {
    const input = {
      topic: 'Building Resilient Microservices',
      audienceLevel: 'intermediate',
      format: 'standard',
    };
    const result = WorkflowInputSchema.parse(input);
    expect(result.topic).toBe('Building Resilient Microservices');
    expect(result.audienceLevel).toBe('intermediate');
    expect(result.format).toBe('standard');
    expect(result.reviewSlides).toBe(false);
  });

  it('exports TalkFormatEnum with expected values', () => {
    expect(TalkFormatEnum.options).toEqual(['lightning', 'standard', 'keynote']);
  });
});
