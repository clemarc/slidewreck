import { describe, it, expect } from 'vitest';
import { WriterOutputSchema, writer } from '../writer';
import { OPUS_MODEL } from '../../config/models';

describe('WriterOutputSchema', () => {
  it('should accept a valid writer output', () => {
    const validOutput = {
      sections: [
        {
          title: 'Introduction',
          content: 'Welcome everyone to this talk about building resilient microservices.',
          speakingNotes: '[PAUSE] Make eye contact with the audience. [ASK AUDIENCE] How many of you have dealt with service outages?',
          durationMinutes: 3,
        },
        {
          title: 'Key Patterns',
          content: 'There are three main patterns we will cover today: circuit breakers, retries, and bulkheads.',
          speakingNotes: 'Slow down here. These are the core concepts.',
          durationMinutes: 10,
        },
      ],
      timingMarkers: [
        { timestamp: '00:00', instruction: 'Start with energy, scan the room' },
        { timestamp: '03:00', instruction: 'Transition to patterns section' },
        { timestamp: '13:00', instruction: 'Check time - adjust pace if needed' },
      ],
      totalDurationMinutes: 30,
      speakerNotes: '# Building Resilient Microservices\n\n## Introduction\n\nWelcome everyone...',
    };

    const result = WriterOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('should accept a minimal valid output with empty sections array', () => {
    const minimalOutput = {
      sections: [],
      timingMarkers: [],
      totalDurationMinutes: 0,
      speakerNotes: '',
    };

    const result = WriterOutputSchema.safeParse(minimalOutput);
    expect(result.success).toBe(true);
  });

  it('should reject when required top-level fields are missing', () => {
    const missingFields = {
      sections: [
        {
          title: 'Intro',
          content: 'Hello',
          speakingNotes: 'Wave',
          durationMinutes: 1,
        },
      ],
      // missing: timingMarkers, totalDurationMinutes, speakerNotes
    };

    const result = WriterOutputSchema.safeParse(missingFields);
    expect(result.success).toBe(false);
  });

  it('should reject when section items have missing required fields', () => {
    const invalidSection = {
      sections: [{ title: 'Intro' }], // missing content, speakingNotes, durationMinutes
      timingMarkers: [],
      totalDurationMinutes: 5,
      speakerNotes: 'test',
    };

    const result = WriterOutputSchema.safeParse(invalidSection);
    expect(result.success).toBe(false);
  });

  it('should reject when timingMarker items have missing required fields', () => {
    const invalidMarker = {
      sections: [],
      timingMarkers: [{ timestamp: '00:00' }], // missing instruction
      totalDurationMinutes: 5,
      speakerNotes: 'test',
    };

    const result = WriterOutputSchema.safeParse(invalidMarker);
    expect(result.success).toBe(false);
  });

  it('should reject non-number totalDurationMinutes', () => {
    const invalidDuration = {
      sections: [],
      timingMarkers: [],
      totalDurationMinutes: 'thirty',
      speakerNotes: 'test',
    };

    const result = WriterOutputSchema.safeParse(invalidDuration);
    expect(result.success).toBe(false);
  });
});

describe('Writer agent', () => {
  it('should have correct agent ID', () => {
    expect(writer.id).toBe('script-writer');
  });

  it('should use Opus model tier', () => {
    expect(writer.model).toBe(OPUS_MODEL);
  });

  it('should have wordCountToTime and checkJargon tools bound', async () => {
    const tools = await writer.listTools();
    const toolKeys = Object.keys(tools);
    expect(toolKeys).toContain('wordCountToTime');
    expect(toolKeys).toContain('checkJargon');
  });

  it('should have a name', () => {
    expect(writer.name).toBe('Script Writer');
  });
});
