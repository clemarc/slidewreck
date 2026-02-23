import { describe, it, expect } from 'vitest';
import {
  OPUS_MODEL,
  SONNET_MODEL,
  HAIKU_MODEL,
  MODEL_TIERS,
} from '../models';

describe('Model tier configuration', () => {
  it('should export correct model tier constants', () => {
    expect(OPUS_MODEL).toBe('anthropic/claude-opus-4-6');
    expect(SONNET_MODEL).toBe('anthropic/claude-sonnet-4-5');
    expect(HAIKU_MODEL).toBe('anthropic/claude-haiku-4-5');
  });

  it('should map writer role to Opus tier', () => {
    expect(MODEL_TIERS.writer).toBe(OPUS_MODEL);
  });

  it('should map researcher and architect roles to Sonnet tier', () => {
    expect(MODEL_TIERS.researcher).toBe(SONNET_MODEL);
    expect(MODEL_TIERS.architect).toBe(SONNET_MODEL);
  });

  it('should map designer and coach roles to Sonnet tier', () => {
    expect(MODEL_TIERS.designer).toBe(SONNET_MODEL);
    expect(MODEL_TIERS.coach).toBe(SONNET_MODEL);
  });

  it('should map styleLearner and eval roles to Haiku tier', () => {
    expect(MODEL_TIERS.styleLearner).toBe(HAIKU_MODEL);
    expect(MODEL_TIERS.eval).toBe(HAIKU_MODEL);
  });

  it('should have exactly 7 agent roles defined', () => {
    expect(Object.keys(MODEL_TIERS)).toHaveLength(7);
  });

  it('should use valid Anthropic model ID format for all tiers', () => {
    const allModels = Object.values(MODEL_TIERS);
    for (const model of allModels) {
      expect(model).toMatch(/^anthropic\/claude-/);
    }
  });
});
