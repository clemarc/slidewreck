import { describe, it, expect } from 'vitest';
import { checkJargon } from '../check-jargon';

type JargonResult = {
  flaggedTerms: Array<{ term: string; reason: string; suggestion: string }>;
  audienceLevel: string;
  totalFlagged: number;
};

// Helper to call tool execute with proper context
async function execute(input: { text: string; audienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'mixed' }) {
  const result = await checkJargon.execute!(input, {} as never);
  return result as JargonResult;
}

describe('checkJargon tool', () => {
  it('should have correct tool ID', () => {
    expect(checkJargon.id).toBe('check-jargon');
  });

  it('should flag technical terms for beginner audience', async () => {
    const text = 'We need to implement a microservice architecture with Kubernetes orchestration and CI/CD pipelines.';
    const result = await execute({ text, audienceLevel: 'beginner' });

    expect(result.audienceLevel).toBe('beginner');
    expect(result.totalFlagged).toBeGreaterThan(0);
    expect(result.flaggedTerms.length).toBe(result.totalFlagged);

    // Each flagged term should have term, reason, and suggestion
    for (const item of result.flaggedTerms) {
      expect(item).toHaveProperty('term');
      expect(item).toHaveProperty('reason');
      expect(item).toHaveProperty('suggestion');
      expect(item.term.length).toBeGreaterThan(0);
    }
  });

  it('should flag fewer terms for advanced audience than beginner', async () => {
    const text = 'We use microservices with Kubernetes, implementing CI/CD pipelines and API gateways for load balancing.';

    const beginnerResult = await execute({ text, audienceLevel: 'beginner' });
    const advancedResult = await execute({ text, audienceLevel: 'advanced' });

    expect(beginnerResult.totalFlagged).toBeGreaterThan(advancedResult.totalFlagged);
  });

  it('should return empty flaggedTerms for plain text with no jargon', async () => {
    const text = 'Today we will talk about how to make better presentations and connect with your audience.';
    const result = await execute({ text, audienceLevel: 'intermediate' });

    expect(result.flaggedTerms).toEqual([]);
    expect(result.totalFlagged).toBe(0);
  });

  it('should handle empty text', async () => {
    const result = await execute({ text: '', audienceLevel: 'beginner' });
    expect(result.flaggedTerms).toEqual([]);
    expect(result.totalFlagged).toBe(0);
    expect(result.audienceLevel).toBe('beginner');
  });

  it('should treat mixed audience like intermediate', async () => {
    const text = 'We use microservices with Kubernetes and implement CI/CD pipelines.';

    const mixedResult = await execute({ text, audienceLevel: 'mixed' });
    const intermediateResult = await execute({ text, audienceLevel: 'intermediate' });

    expect(mixedResult.totalFlagged).toBe(intermediateResult.totalFlagged);
  });

  it('should echo back the audience level', async () => {
    const result = await execute({ text: 'hello', audienceLevel: 'advanced' });
    expect(result.audienceLevel).toBe('advanced');
  });

  it('should detect jargon case-insensitively', async () => {
    const text = 'We deployed our MICROSERVICES to the kubernetes cluster.';
    const result = await execute({ text, audienceLevel: 'beginner' });

    const flaggedLower = result.flaggedTerms.map(f => f.term.toLowerCase());
    expect(flaggedLower).toContain('microservice');
    expect(flaggedLower).toContain('kubernetes');
  });

  it('should detect pluralized jargon forms', async () => {
    const text = 'We manage multiple databases, APIs, and frameworks in production.';
    const result = await execute({ text, audienceLevel: 'beginner' });

    const flaggedLower = result.flaggedTerms.map(f => f.term.toLowerCase());
    expect(flaggedLower).toContain('database');
    expect(flaggedLower).toContain('api');
    expect(flaggedLower).toContain('framework');
  });
});
