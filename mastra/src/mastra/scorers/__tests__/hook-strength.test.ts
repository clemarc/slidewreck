import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { hookStrengthScorer } from '../hook-strength';
import { HAIKU_MODEL } from '../../config/models';

describe('Hook Strength Scorer', () => {
  it('should have id "hook-strength"', () => {
    expect(hookStrengthScorer.id).toBe('hook-strength');
  });

  it('should have a description', () => {
    expect(hookStrengthScorer.description).toBeTruthy();
    expect(typeof hookStrengthScorer.description).toBe('string');
  });

  it('should use Haiku model tier as judge', () => {
    expect(hookStrengthScorer.judge).toBeDefined();
    expect(hookStrengthScorer.judge?.model).toBe(HAIKU_MODEL);
  });

  // Note: getSteps() has a bug in @mastra/core@1.8.0 where it crashes for
  // prompt-based steps (definition is stored in originalPromptObjects but
  // getSteps() accesses step.definition.description which is undefined).
  // Testing step presence via source inspection instead.
  it('should have generateScore and generateReason steps in source', () => {
    const source = readFileSync(join(__dirname, '../hook-strength.ts'), 'utf-8');
    expect(source).toContain('.generateScore(');
    expect(source).toContain('.generateReason(');
  });

  it('should have scoring rubric in judge instructions', () => {
    expect(hookStrengthScorer.judge?.instructions).toContain('Score 1');
    expect(hookStrengthScorer.judge?.instructions).toContain('Score 5');
  });

  it('should have a run method', () => {
    expect(typeof hookStrengthScorer.run).toBe('function');
  });
});
