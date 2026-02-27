import { describe, it, expect } from 'vitest';
import { ArchitectOutputSchema, architect } from '../talk-architect';
import { SONNET_MODEL } from '../../config/models';

describe('ArchitectOutputSchema', () => {
  const validOption = {
    title: 'Problem-Solution-Demo',
    description: 'Start with a real-world problem, present the solution, then demo it live.',
    sections: [
      { title: 'The Problem', purpose: 'Establish pain point', contentWordCount: 600, estimatedMinutes: 4 },
      { title: 'The Solution', purpose: 'Present approach', contentWordCount: 1500, estimatedMinutes: 10 },
      { title: 'Live Demo', purpose: 'Show it working', contentWordCount: 900, estimatedMinutes: 6 },
    ],
    rationale: 'Works well for technical audiences who want to see things in action.',
  };

  it('should accept a valid output with 3 options', () => {
    const validOutput = {
      options: [
        validOption,
        { ...validOption, title: 'Story Arc', description: 'Narrative journey through the topic.' },
        { ...validOption, title: 'Hot Take', description: 'Start with a controversial opinion, then back it up.' },
      ],
    };

    const result = ArchitectOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('should reject when options array has fewer than 3 items', () => {
    const twoOptions = {
      options: [validOption, { ...validOption, title: 'Story Arc', description: 'Alt.' }],
    };

    const result = ArchitectOutputSchema.safeParse(twoOptions);
    expect(result.success).toBe(false);
  });

  it('should reject when options array has more than 3 items', () => {
    const fourOptions = {
      options: [
        validOption,
        { ...validOption, title: 'A', description: 'a' },
        { ...validOption, title: 'B', description: 'b' },
        { ...validOption, title: 'C', description: 'c' },
      ],
    };

    const result = ArchitectOutputSchema.safeParse(fourOptions);
    expect(result.success).toBe(false);
  });

  it('should reject when required top-level fields are missing', () => {
    const result = ArchitectOutputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject when option has missing required fields', () => {
    const missingFields = {
      options: [
        { title: 'Only Title' },
        validOption,
        validOption,
      ],
    };

    const result = ArchitectOutputSchema.safeParse(missingFields);
    expect(result.success).toBe(false);
  });

  it('should reject when section has missing required fields', () => {
    const badSection = {
      options: [
        {
          ...validOption,
          sections: [{ title: 'Incomplete' }], // missing purpose, contentWordCount, estimatedMinutes
        },
        validOption,
        validOption,
      ],
    };

    const result = ArchitectOutputSchema.safeParse(badSection);
    expect(result.success).toBe(false);
  });

  it('should reject empty option title', () => {
    const emptyTitle = {
      options: [
        { ...validOption, title: '' },
        validOption,
        validOption,
      ],
    };

    const result = ArchitectOutputSchema.safeParse(emptyTitle);
    expect(result.success).toBe(false);
  });

  it('should reject options with empty sections array', () => {
    const noSections = {
      options: [
        { ...validOption, sections: [] },
        validOption,
        validOption,
      ],
    };

    const result = ArchitectOutputSchema.safeParse(noSections);
    expect(result.success).toBe(false);
  });
});

describe('Architect agent', () => {
  it('should have correct agent ID', () => {
    expect(architect.id).toBe('talk-architect');
  });

  it('should use Sonnet model tier', () => {
    expect(architect.model).toBe(SONNET_MODEL);
  });

  it('should have estimateTiming tool bound', async () => {
    const tools = await architect.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('estimateTiming');
  });

  it('should have a name', () => {
    expect(architect.name).toBe('Talk Architect');
  });
});
