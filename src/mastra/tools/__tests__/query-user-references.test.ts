import { describe, it, expect, vi } from 'vitest';

// Mock ai module (transitive dep, not direct)
vi.mock('ai', () => ({
  embedMany: vi.fn(),
}));

// Mock fs/promises (imported by user-references.ts)
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

import { userReferencesQueryTool } from '../query-user-references';

describe('userReferencesQueryTool', () => {
  it('should have the correct tool id', () => {
    expect(userReferencesQueryTool.id).toBe('query-user-references');
  });

  it('should have a description about user reference materials', () => {
    expect(userReferencesQueryTool.description).toContain('reference');
  });
});
