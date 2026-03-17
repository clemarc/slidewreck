import { describe, it, expect } from 'vitest';
import { CollectReferencesSuspendSchema, CollectReferencesResumeSchema } from '../collect-references';

describe('CollectReferencesSuspendSchema', () => {
  it('should accept a valid prompt', () => {
    const result = CollectReferencesSuspendSchema.safeParse({
      prompt: 'Provide reference materials for the presentation',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing prompt field', () => {
    const result = CollectReferencesSuspendSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject non-string prompt', () => {
    const result = CollectReferencesSuspendSchema.safeParse({ prompt: 42 });
    expect(result.success).toBe(false);
  });
});

describe('CollectReferencesResumeSchema', () => {
  it('should accept valid materials array (AC-T1a)', () => {
    const result = CollectReferencesResumeSchema.safeParse({
      materials: [{ type: 'url', path: 'https://example.com' }],
    });
    expect(result.success).toBe(true);
  });

  it('should accept empty materials array — skip case (AC-T1b)', () => {
    const result = CollectReferencesResumeSchema.safeParse({
      materials: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.materials).toEqual([]);
    }
  });

  it('should default to empty array when materials field is omitted', () => {
    const result = CollectReferencesResumeSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.materials).toEqual([]);
    }
  });

  it('should reject null materials value (default only applies to undefined)', () => {
    const result = CollectReferencesResumeSchema.safeParse({ materials: null });
    expect(result.success).toBe(false);
  });

  it('should reject invalid type values (AC-T1c)', () => {
    const result = CollectReferencesResumeSchema.safeParse({
      materials: [{ type: 'invalid', path: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('should accept mixed file and url materials', () => {
    const result = CollectReferencesResumeSchema.safeParse({
      materials: [
        { type: 'file', path: '/docs/notes.md' },
        { type: 'url', path: 'https://example.com/article' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.materials).toHaveLength(2);
    }
  });
});
