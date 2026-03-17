import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  pacingDistributionScorer,
  parseSections,
  calculatePacingScore,
} from '../pacing-distribution';

describe('Pacing Distribution Scorer', () => {
  it('should have id "pacing-distribution"', () => {
    expect(pacingDistributionScorer.id).toBe('pacing-distribution');
  });

  it('should have a description mentioning pacing', () => {
    expect(pacingDistributionScorer.description).toBeTruthy();
    expect(pacingDistributionScorer.description.toLowerCase()).toContain('pacing');
  });

  it('should NOT have a judge (heuristic scorer)', () => {
    expect(pacingDistributionScorer.judge).toBeUndefined();
  });

  // Note: getSteps() has a bug in @mastra/core@1.8.0 — use source inspection
  it('should have preprocess, generateScore, and generateReason steps in source', () => {
    const source = readFileSync(join(__dirname, '../pacing-distribution.ts'), 'utf-8');
    expect(source).toContain('.preprocess(');
    expect(source).toContain('.generateScore(');
    expect(source).toContain('.generateReason(');
  });

  it('should have a run method', () => {
    expect(typeof pacingDistributionScorer.run).toBe('function');
  });
});

describe('parseSections', () => {
  it('should split by markdown h2 headers', () => {
    const script = `## Introduction
Welcome to the talk about testing.

## Main Body
Here is the core content of the presentation.

## Conclusion
Thank you for listening.`;
    const sections = parseSections(script);
    expect(sections).toHaveLength(3);
    expect(sections[0].name).toBe('Introduction');
    expect(sections[1].name).toBe('Main Body');
    expect(sections[2].name).toBe('Conclusion');
  });

  it('should split by markdown h3 headers', () => {
    const script = `### Part One
First section content here.

### Part Two
Second section content here.`;
    const sections = parseSections(script);
    expect(sections).toHaveLength(2);
    expect(sections[0].name).toBe('Part One');
    expect(sections[1].name).toBe('Part Two');
  });

  it('should fall back to paragraph splitting when no headers', () => {
    const script = `First paragraph with some content about testing.

Second paragraph with different content about deployment.

Third paragraph wrapping things up nicely.`;
    const sections = parseSections(script);
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  it('should count words per section', () => {
    const script = `## Short
One two three.

## Long
One two three four five six seven eight nine ten eleven twelve.`;
    const sections = parseSections(script);
    expect(sections[0].wordCount).toBe(3);
    expect(sections[1].wordCount).toBe(12);
  });

  it('should return a single section for headerless single-paragraph input', () => {
    const script = 'Just a single paragraph with no structure at all.';
    const sections = parseSections(script);
    expect(sections).toHaveLength(1);
  });

  it('should return empty array for empty input', () => {
    const sections = parseSections('');
    expect(sections).toHaveLength(0);
  });

  it('should return empty array for whitespace-only input', () => {
    const sections = parseSections('   \n\n   \n  ');
    expect(sections).toHaveLength(0);
  });
});

describe('calculatePacingScore', () => {
  it('should return 5 for perfectly balanced sections', () => {
    const sections = [
      { wordCount: 100 },
      { wordCount: 100 },
      { wordCount: 100 },
    ];
    expect(calculatePacingScore(sections)).toBe(5);
  });

  it('should return 5 for nearly balanced sections (low CV)', () => {
    const sections = [
      { wordCount: 95 },
      { wordCount: 100 },
      { wordCount: 105 },
    ];
    expect(calculatePacingScore(sections)).toBe(5);
  });

  it('should return 1 for extremely unbalanced sections', () => {
    const sections = [
      { wordCount: 10 },
      { wordCount: 500 },
      { wordCount: 5 },
    ];
    expect(calculatePacingScore(sections)).toBe(1);
  });

  it('should return 3 for single-section input', () => {
    const sections = [{ wordCount: 200 }];
    expect(calculatePacingScore(sections)).toBe(3);
  });

  it('should return 1 for empty input', () => {
    expect(calculatePacingScore([])).toBe(1);
  });

  it('should return score between 1 and 5 for moderate variation', () => {
    const sections = [
      { wordCount: 50 },
      { wordCount: 100 },
      { wordCount: 150 },
      { wordCount: 80 },
    ];
    const score = calculatePacingScore(sections);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(5);
  });
});
