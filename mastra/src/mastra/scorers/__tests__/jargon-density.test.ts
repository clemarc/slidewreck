import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { jargonDensityScorer } from '../jargon-density';
import { HAIKU_MODEL } from '../../config/models';

describe('Jargon Density Scorer', () => {
  it('should have id "jargon-density"', () => {
    expect(jargonDensityScorer.id).toBe('jargon-density');
  });

  it('should have a description mentioning jargon', () => {
    expect(jargonDensityScorer.description).toBeTruthy();
    expect(jargonDensityScorer.description.toLowerCase()).toContain('jargon');
  });

  it('should use Haiku model tier as judge', () => {
    expect(jargonDensityScorer.judge).toBeDefined();
    expect(jargonDensityScorer.judge?.model).toBe(HAIKU_MODEL);
  });

  // Note: getSteps() has a bug in @mastra/core@1.8.0 — use source inspection
  it('should have generateScore and generateReason steps in source', () => {
    const source = readFileSync(join(__dirname, '../jargon-density.ts'), 'utf-8');
    expect(source).toContain('.generateScore(');
    expect(source).toContain('.generateReason(');
  });

  it('should have scoring rubric in judge instructions', () => {
    expect(jargonDensityScorer.judge?.instructions).toContain('Score 1');
    expect(jargonDensityScorer.judge?.instructions).toContain('Score 5');
  });

  it('should have a run method', () => {
    expect(typeof jargonDensityScorer.run).toBe('function');
  });
});
