import { describe, it, expect } from 'vitest';
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

  it('should have a name', () => {
    expect(researcher.name).toBe('Researcher');
  });
});
