import { describe, it, expect } from 'vitest';
import { WorkflowOutputSchema } from '../workflow-output';

const validResearchBrief = {
  keyFindings: [{ finding: 'Microservices adoption grew 40%', source: 'https://example.com', relevance: 'Core topic' }],
  sources: [{ url: 'https://example.com', title: 'Example', relevance: 'Primary source' }],
  existingTalks: [{ title: 'Resilience Talk', speaker: 'Jane', url: 'https://yt.com/123', summary: 'Covers circuit breakers' }],
  statistics: [{ value: '40% growth', context: 'Year over year', source: 'https://example.com' }],
  suggestedAngles: ['Focus on circuit breaker patterns'],
};

const validSpeakerScript = {
  sections: [
    {
      title: 'Introduction',
      content: 'Welcome to this talk on microservices.',
      speakingNotes: '[PAUSE] Make eye contact.',
      durationMinutes: 3,
    },
  ],
  timingMarkers: [{ timestamp: '00:00', instruction: 'Start with energy' }],
  totalDurationMinutes: 30,
  speakerNotes: '# Talk Script\n\n## Introduction\n\nWelcome...',
};

const validMetadata = {
  workflowRunId: 'run-abc123',
  completedAt: '2026-02-25T12:00:00Z',
  input: {
    topic: 'Building Resilient Microservices',
    audienceLevel: 'intermediate',
    format: 'standard',
  },
};

describe('WorkflowOutputSchema', () => {
  it('should accept valid output with all fields', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: validResearchBrief,
      speakerScript: validSpeakerScript,
      metadata: validMetadata,
    });
    expect(result.success).toBe(true);
  });

  it('should accept minimal valid structures', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: {
        keyFindings: [],
        sources: [],
        existingTalks: [],
        statistics: [],
        suggestedAngles: [],
      },
      speakerScript: {
        sections: [],
        timingMarkers: [],
        totalDurationMinutes: 0,
        speakerNotes: '',
      },
      metadata: {
        workflowRunId: 'run-1',
        completedAt: '2026-01-01T00:00:00Z',
        input: {
          topic: 'Test',
          audienceLevel: 'beginner',
          format: 'lightning',
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing researchBrief', () => {
    const result = WorkflowOutputSchema.safeParse({
      speakerScript: validSpeakerScript,
      metadata: validMetadata,
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing speakerScript', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: validResearchBrief,
      metadata: validMetadata,
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing metadata', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: validResearchBrief,
      speakerScript: validSpeakerScript,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid researchBrief structure', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: { keyFindings: 'not an array' },
      speakerScript: validSpeakerScript,
      metadata: validMetadata,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid speakerScript structure', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: validResearchBrief,
      speakerScript: { sections: 'not an array' },
      metadata: validMetadata,
    });
    expect(result.success).toBe(false);
  });

  it('should accept output with optional scorecard and preserve it in parsed result', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: validResearchBrief,
      speakerScript: validSpeakerScript,
      scorecard: {
        entries: [
          { scorerId: 'hook-strength', score: 4, reason: 'Strong', status: 'success' },
          { scorerId: 'narrative-coherence', score: 3, status: 'success' },
        ],
        overallScore: 3.5,
        timestamp: '2026-03-04T12:00:00.000Z',
      },
      metadata: validMetadata,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scorecard).toBeDefined();
      expect(result.data.scorecard?.entries).toHaveLength(2);
      expect(result.data.scorecard?.overallScore).toBe(3.5);
    }
  });

  it('should accept output without scorecard (backward compatible)', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: validResearchBrief,
      speakerScript: validSpeakerScript,
      metadata: validMetadata,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid metadata input', () => {
    const result = WorkflowOutputSchema.safeParse({
      researchBrief: validResearchBrief,
      speakerScript: validSpeakerScript,
      metadata: {
        workflowRunId: 'run-1',
        completedAt: '2026-01-01',
        input: {
          topic: 'Test',
          audienceLevel: 'expert', // invalid
          format: 'lightning',
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
