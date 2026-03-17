import { describe, it, expect } from 'vitest';
import { bestPracticesQueryTool } from '../query-best-practices';

describe('bestPracticesQueryTool', () => {
  it('should have the correct tool id', () => {
    expect(bestPracticesQueryTool.id).toBe('query-best-practices');
  });

  it('should have a description about best practices', () => {
    expect(bestPracticesQueryTool.description).toContain('best practices');
  });
});
