import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ResearcherOutputSchema, researcher } from '../researcher';
import { SONNET_MODEL } from '../../config/models';

describe('ResearcherOutputSchema', () => {
  it('should accept a valid research brief', () => {
    const validBrief = {
      keyFindings: [
        { finding: 'AI adoption is growing rapidly', source: 'https://example.com', relevance: 'high' },
      ],
      sources: [
        { url: 'https://example.com', title: 'AI Report 2026', relevance: 'Primary research on AI trends' },
      ],
      existingTalks: [
        { title: 'The Future of AI', speaker: 'Jane Doe', url: 'https://youtube.com/watch?v=123', summary: 'Overview of AI trends' },
      ],
      statistics: [
        { value: '85%', context: 'of companies plan to adopt AI by 2027', source: 'https://example.com' },
      ],
      suggestedAngles: [
        'Focus on practical applications rather than theory',
        'Compare enterprise vs startup adoption patterns',
      ],
    };

    const result = ResearcherOutputSchema.safeParse(validBrief);
    expect(result.success).toBe(true);
  });

  it('should accept a minimal valid research brief with empty arrays', () => {
    const minimalBrief = {
      keyFindings: [],
      sources: [],
      existingTalks: [],
      statistics: [],
      suggestedAngles: [],
    };

    const result = ResearcherOutputSchema.safeParse(minimalBrief);
    expect(result.success).toBe(true);
  });

  it('should reject when required top-level fields are missing', () => {
    const missingFields = {
      keyFindings: [{ finding: 'test', source: 'https://example.com', relevance: 'high' }],
      // missing: sources, existingTalks, statistics, suggestedAngles
    };

    const result = ResearcherOutputSchema.safeParse(missingFields);
    expect(result.success).toBe(false);
  });

  it('should reject when keyFindings items have missing required fields', () => {
    const invalidFinding = {
      keyFindings: [{ finding: 'test' }], // missing source and relevance
      sources: [],
      existingTalks: [],
      statistics: [],
      suggestedAngles: [],
    };

    const result = ResearcherOutputSchema.safeParse(invalidFinding);
    expect(result.success).toBe(false);
  });

  it('should reject when sources items have missing required fields', () => {
    const invalidSource = {
      keyFindings: [],
      sources: [{ url: 'https://example.com' }], // missing title and relevance
      existingTalks: [],
      statistics: [],
      suggestedAngles: [],
    };

    const result = ResearcherOutputSchema.safeParse(invalidSource);
    expect(result.success).toBe(false);
  });

  it('should reject non-string values in suggestedAngles', () => {
    const invalidAngles = {
      keyFindings: [],
      sources: [],
      existingTalks: [],
      statistics: [],
      suggestedAngles: [123, true], // should be strings
    };

    const result = ResearcherOutputSchema.safeParse(invalidAngles);
    expect(result.success).toBe(false);
  });
});

describe('Researcher agent', () => {
  it('should have correct agent ID', () => {
    expect(researcher.id).toBe('researcher');
  });

  it('should use Sonnet model tier', () => {
    expect(researcher.model).toBe(SONNET_MODEL);
  });

  it('should have webSearch and webFetch tools bound', async () => {
    const tools = await researcher.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('webSearch');
    expect(toolKeys).toContain('webFetch');
  });

  it('should have userReferencesQueryTool bound for RAG access', async () => {
    const tools = await researcher.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('query-user-references');
  });

  it('should have bestPracticesQueryTool bound for RAG access', async () => {
    const tools = await researcher.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('query-best-practices');
  });

  it('should have a name', () => {
    expect(researcher.name).toBe('Researcher');
  });

  it('should mention query-best-practices tool in instructions source', () => {
    const source = readFileSync(join(__dirname, '../researcher.ts'), 'utf-8');
    expect(source).toContain('query-best-practices');
  });

  it('should mention source attribution in instructions source', () => {
    const source = readFileSync(join(__dirname, '../researcher.ts'), 'utf-8');
    expect(source).toContain('sourceType');
  });
});

describe('ResearcherOutputSchema — RAG source attribution', () => {
  const baseBrief = {
    keyFindings: [
      { finding: 'AI adoption is growing rapidly', source: 'https://example.com', relevance: 'high' },
    ],
    sources: [
      { url: 'https://example.com', title: 'AI Report 2026', relevance: 'Primary research on AI trends' },
    ],
    existingTalks: [],
    statistics: [],
    suggestedAngles: ['Focus on practical applications'],
  };

  it('should accept findings with optional sourceType field', () => {
    const brief = {
      ...baseBrief,
      keyFindings: [
        { finding: 'AI growing', source: 'https://example.com', relevance: 'high', sourceType: 'web' },
      ],
    };
    const result = ResearcherOutputSchema.safeParse(brief);
    expect(result.success).toBe(true);
  });

  it('should accept all valid sourceType values', () => {
    for (const sourceType of ['user_reference', 'best_practice', 'web']) {
      const brief = {
        ...baseBrief,
        keyFindings: [
          { finding: 'test', source: 'src', relevance: 'rel', sourceType },
        ],
      };
      const result = ResearcherOutputSchema.safeParse(brief);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid sourceType values', () => {
    const brief = {
      ...baseBrief,
      keyFindings: [
        { finding: 'test', source: 'src', relevance: 'rel', sourceType: 'invalid' },
      ],
    };
    const result = ResearcherOutputSchema.safeParse(brief);
    expect(result.success).toBe(false);
  });

  it('should accept optional bestPracticesGuidance field', () => {
    const brief = {
      ...baseBrief,
      bestPracticesGuidance: [
        { category: 'structure', guidance: 'Use Problem-Solution-Demo pattern' },
      ],
    };
    const result = ResearcherOutputSchema.safeParse(brief);
    expect(result.success).toBe(true);
  });

  it('should accept bestPracticesGuidance with optional applicableTo', () => {
    const brief = {
      ...baseBrief,
      bestPracticesGuidance: [
        { category: 'pacing', guidance: 'Use 10-20-30 rule', applicableTo: 'opening section' },
      ],
    };
    const result = ResearcherOutputSchema.safeParse(brief);
    expect(result.success).toBe(true);
  });

  it('should remain backward-compatible — existing briefs without new fields still parse', () => {
    const result = ResearcherOutputSchema.safeParse(baseBrief);
    expect(result.success).toBe(true);
  });
});
