import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { narrativeCoherenceScorer } from '../narrative-coherence';
import { HAIKU_MODEL } from '../../config/models';

describe('Narrative Coherence Scorer', () => {
  it('should have id "narrative-coherence"', () => {
    expect(narrativeCoherenceScorer.id).toBe('narrative-coherence');
  });

  it('should have a description', () => {
    expect(narrativeCoherenceScorer.description).toBeTruthy();
    expect(typeof narrativeCoherenceScorer.description).toBe('string');
  });

  it('should use Haiku model tier as judge', () => {
    expect(narrativeCoherenceScorer.judge).toBeDefined();
    expect(narrativeCoherenceScorer.judge?.model).toBe(HAIKU_MODEL);
  });

  it('should have generateScore and generateReason steps in source', () => {
    const source = readFileSync(join(__dirname, '../narrative-coherence.ts'), 'utf-8');
    expect(source).toContain('.generateScore(');
    expect(source).toContain('.generateReason(');
  });

  it('should have scoring rubric in judge instructions', () => {
    expect(narrativeCoherenceScorer.judge?.instructions).toContain('Score 1');
    expect(narrativeCoherenceScorer.judge?.instructions).toContain('Score 5');
  });

  it('should have a run method', () => {
    expect(typeof narrativeCoherenceScorer.run).toBe('function');
  });
});
