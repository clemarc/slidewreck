import { describe, it, expect } from 'vitest';
import { estimateTiming } from '../estimate-timing';

// Helper to call tool execute
async function execute(input: {
  sections: Array<{ title: string; contentWordCount: number }>;
  format: 'lightning' | 'standard' | 'keynote';
  wordsPerMinute?: number;
}) {
  return (await estimateTiming.execute!(input, {} as never)) as {
    sectionTimings: Array<{ title: string; estimatedMinutes: number }>;
    totalMinutes: number;
    targetRange: { min: number; max: number };
    isWithinRange: boolean;
  };
}

describe('estimateTiming tool', () => {
  it('should have correct tool ID', () => {
    expect(estimateTiming.id).toBe('estimate-timing');
  });

  it('should have description and outputSchema defined', () => {
    expect(estimateTiming.description).toBeDefined();
    expect(estimateTiming.description!.length).toBeGreaterThan(0);
    expect(estimateTiming.outputSchema).toBeDefined();
  });

  it('should calculate per-section timings at default 150 WPM', async () => {
    const result = await execute({
      sections: [
        { title: 'Intro', contentWordCount: 450 },
        { title: 'Body', contentWordCount: 3000 },
        { title: 'Conclusion', contentWordCount: 300 },
      ],
      format: 'standard',
    });

    expect(result.sectionTimings).toHaveLength(3);
    expect(result.sectionTimings[0].title).toBe('Intro');
    expect(result.sectionTimings[0].estimatedMinutes).toBeCloseTo(3);
    expect(result.sectionTimings[1].title).toBe('Body');
    expect(result.sectionTimings[1].estimatedMinutes).toBeCloseTo(20);
    expect(result.sectionTimings[2].title).toBe('Conclusion');
    expect(result.sectionTimings[2].estimatedMinutes).toBeCloseTo(2);
    expect(result.totalMinutes).toBeCloseTo(25);
  });

  it('should use custom WPM when provided', async () => {
    const result = await execute({
      sections: [{ title: 'Only Section', contentWordCount: 300 }],
      format: 'lightning',
      wordsPerMinute: 100,
    });

    expect(result.sectionTimings[0].estimatedMinutes).toBeCloseTo(3);
    expect(result.totalMinutes).toBeCloseTo(3);
  });

  it('should return correct target range for each format', async () => {
    const sections = [{ title: 'Test', contentWordCount: 150 }];

    const lightning = await execute({ sections, format: 'lightning' });
    expect(lightning.targetRange).toEqual({ min: 5, max: 10 });

    const standard = await execute({ sections, format: 'standard' });
    expect(standard.targetRange).toEqual({ min: 25, max: 45 });

    const keynote = await execute({ sections, format: 'keynote' });
    expect(keynote.targetRange).toEqual({ min: 45, max: 60 });
  });

  it('should set isWithinRange true when total is within target', async () => {
    // 4500 words at 150 WPM = 30 min, standard range is 25-45
    const result = await execute({
      sections: [{ title: 'Full Talk', contentWordCount: 4500 }],
      format: 'standard',
    });

    expect(result.totalMinutes).toBeCloseTo(30);
    expect(result.isWithinRange).toBe(true);
  });

  it('should set isWithinRange false when total exceeds target', async () => {
    // 9000 words at 150 WPM = 60 min, standard range is 25-45
    const result = await execute({
      sections: [{ title: 'Too Long', contentWordCount: 9000 }],
      format: 'standard',
    });

    expect(result.totalMinutes).toBeCloseTo(60);
    expect(result.isWithinRange).toBe(false);
  });

  it('should set isWithinRange false when total is below target', async () => {
    // 150 words at 150 WPM = 1 min, lightning range is 5-10
    const result = await execute({
      sections: [{ title: 'Too Short', contentWordCount: 150 }],
      format: 'lightning',
    });

    expect(result.totalMinutes).toBeCloseTo(1);
    expect(result.isWithinRange).toBe(false);
  });

  it('should handle empty sections array', async () => {
    const result = await execute({
      sections: [],
      format: 'standard',
    });

    expect(result.sectionTimings).toHaveLength(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.isWithinRange).toBe(false);
  });

  it('should handle sections with zero word count', async () => {
    const result = await execute({
      sections: [{ title: 'Empty Section', contentWordCount: 0 }],
      format: 'standard',
    });

    expect(result.sectionTimings[0].estimatedMinutes).toBe(0);
    expect(result.totalMinutes).toBe(0);
  });

  describe('input schema validation', () => {
    it('should reject negative word counts', () => {
      const schema = estimateTiming.inputSchema!;
      const result = schema.safeParse({
        sections: [{ title: 'Bad', contentWordCount: -10 }],
        format: 'standard',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid format values', () => {
      const schema = estimateTiming.inputSchema!;
      const result = schema.safeParse({
        sections: [{ title: 'Test', contentWordCount: 100 }],
        format: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty section titles', () => {
      const schema = estimateTiming.inputSchema!;
      const result = schema.safeParse({
        sections: [{ title: '', contentWordCount: 100 }],
        format: 'standard',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid input with optional wordsPerMinute', () => {
      const schema = estimateTiming.inputSchema!;
      const result = schema.safeParse({
        sections: [{ title: 'Test', contentWordCount: 100 }],
        format: 'standard',
      });
      expect(result.success).toBe(true);
    });

    it('should reject zero or negative wordsPerMinute', () => {
      const schema = estimateTiming.inputSchema!;
      expect(
        schema.safeParse({
          sections: [{ title: 'Test', contentWordCount: 100 }],
          format: 'standard',
          wordsPerMinute: 0,
        }).success,
      ).toBe(false);
      expect(
        schema.safeParse({
          sections: [{ title: 'Test', contentWordCount: 100 }],
          format: 'standard',
          wordsPerMinute: -50,
        }).success,
      ).toBe(false);
    });
  });
});
