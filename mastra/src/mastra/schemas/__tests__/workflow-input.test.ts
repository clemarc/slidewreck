import { describe, it, expect } from 'vitest';
import { WorkflowInputSchema, FORMAT_DURATION_RANGES, type WorkflowInput } from '../workflow-input';

// Compile-time assertion: WorkflowInput must not have referenceMaterials
// If someone re-adds the field, this line will cause a TypeScript error.
type _AssertNoReferenceMaterials = WorkflowInput extends { referenceMaterials: unknown } ? never : true;
const _typeCheck: _AssertNoReferenceMaterials = true as const;
void _typeCheck;

describe('WorkflowInputSchema', () => {
  it('should accept valid input with all required fields', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Building Resilient Microservices',
      audienceLevel: 'intermediate',
      format: 'standard',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all valid audienceLevel values', () => {
    for (const level of ['beginner', 'intermediate', 'advanced', 'mixed'] as const) {
      const result = WorkflowInputSchema.safeParse({
        topic: 'Test topic',
        audienceLevel: level,
        format: 'lightning',
      });
      expect(result.success).toBe(true);
    }
  });

  it('should accept all valid format values', () => {
    for (const format of ['lightning', 'standard', 'keynote'] as const) {
      const result = WorkflowInputSchema.safeParse({
        topic: 'Test topic',
        audienceLevel: 'beginner',
        format,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject missing topic', () => {
    const result = WorkflowInputSchema.safeParse({
      audienceLevel: 'beginner',
      format: 'lightning',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty topic string', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: '',
      audienceLevel: 'beginner',
      format: 'lightning',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid audienceLevel', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'expert',
      format: 'standard',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid format', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'beginner',
      format: 'workshop',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing audienceLevel', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      format: 'standard',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing format', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'beginner',
    });
    expect(result.success).toBe(false);
  });

  describe('optional constraints field', () => {
    it('should accept input with constraints provided', () => {
      const result = WorkflowInputSchema.safeParse({
        topic: 'Building Resilient Microservices',
        audienceLevel: 'intermediate',
        format: 'standard',
        constraints: 'Focus on observability, avoid Kubernetes examples',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.constraints).toBe('Focus on observability, avoid Kubernetes examples');
      }
    });

    it('should accept input without constraints (undefined)', () => {
      const result = WorkflowInputSchema.safeParse({
        topic: 'Test topic',
        audienceLevel: 'beginner',
        format: 'lightning',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.constraints).toBeUndefined();
      }
    });

    it('should reject empty constraints string', () => {
      const result = WorkflowInputSchema.safeParse({
        topic: 'Test topic',
        audienceLevel: 'beginner',
        format: 'lightning',
        constraints: '',
      });
      expect(result.success).toBe(false);
    });

    it('should accept long constraints text', () => {
      const longConstraints = 'A'.repeat(2000);
      const result = WorkflowInputSchema.safeParse({
        topic: 'Test topic',
        audienceLevel: 'advanced',
        format: 'keynote',
        constraints: longConstraints,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-string constraints', () => {
      const result = WorkflowInputSchema.safeParse({
        topic: 'Test topic',
        audienceLevel: 'beginner',
        format: 'lightning',
        constraints: 42,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('optional reviewSlides field (Story 5-4)', () => {
  it('should default reviewSlides to false when omitted', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'beginner',
      format: 'lightning',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewSlides).toBe(false);
    }
  });

  it('should accept reviewSlides=true', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'beginner',
      format: 'lightning',
      reviewSlides: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewSlides).toBe(true);
    }
  });

  it('should accept reviewSlides=false', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'beginner',
      format: 'lightning',
      reviewSlides: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewSlides).toBe(false);
    }
  });

  it('should reject non-boolean reviewSlides', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'beginner',
      format: 'lightning',
      reviewSlides: 'yes',
    });
    expect(result.success).toBe(false);
  });
});

describe('referenceMaterials removed (AC-A4)', () => {
  it('should not have referenceMaterials in the parsed type', () => {
    const result = WorkflowInputSchema.safeParse({
      topic: 'Test topic',
      audienceLevel: 'beginner',
      format: 'lightning',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('referenceMaterials' in result.data).toBe(false);
    }
  });
});

describe('FORMAT_DURATION_RANGES', () => {
  it('should have entries for all three formats', () => {
    expect(FORMAT_DURATION_RANGES).toHaveProperty('lightning');
    expect(FORMAT_DURATION_RANGES).toHaveProperty('standard');
    expect(FORMAT_DURATION_RANGES).toHaveProperty('keynote');
  });

  it('should have minMinutes and maxMinutes for each format', () => {
    for (const format of ['lightning', 'standard', 'keynote'] as const) {
      expect(FORMAT_DURATION_RANGES[format]).toHaveProperty('minMinutes');
      expect(FORMAT_DURATION_RANGES[format]).toHaveProperty('maxMinutes');
      expect(FORMAT_DURATION_RANGES[format].minMinutes).toBeLessThan(FORMAT_DURATION_RANGES[format].maxMinutes);
    }
  });

  it('should have correct duration ranges', () => {
    expect(FORMAT_DURATION_RANGES.lightning).toEqual({ minMinutes: 5, maxMinutes: 10 });
    expect(FORMAT_DURATION_RANGES.standard).toEqual({ minMinutes: 25, maxMinutes: 45 });
    expect(FORMAT_DURATION_RANGES.keynote).toEqual({ minMinutes: 45, maxMinutes: 60 });
  });
});
