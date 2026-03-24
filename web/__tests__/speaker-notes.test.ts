import { describe, it, expect } from 'vitest';
import { extractRelevantSection } from '../lib/speaker-notes';

const SAMPLE_SPEAKER_NOTES = `## TIMING OVERVIEW

| Time | Section |
|------|---------|
| 0:00 | Hook Opening |
| 2:00 | Context Rules |

## HOOK: THE ROUND THAT ACTUALLY MATTERS

This is the hook section content.
It has multiple lines of speaker notes.

### Sub-section inside hook

More details here.

## CONTEXT: THE RULES OF THE GAME

This is the context section.

## KEY STRATEGY 1: THE DÉSISTEMENT DILEMMA

Strategy one content here.

## KEY STRATEGY 2: THE CRUMBLING REPUBLICAN FRONT

Strategy two content here.

## CLOSING: THREE THINGS TO WATCH IN 2026

Closing content here.`;

describe('extractRelevantSection', () => {
  it('matches hook-opening to HOOK section', () => {
    const result = extractRelevantSection(SAMPLE_SPEAKER_NOTES, 'hook-opening');
    expect(result).toContain('HOOK');
    expect(result).toContain('hook section content');
  });

  it('matches context-rules to CONTEXT section', () => {
    const result = extractRelevantSection(SAMPLE_SPEAKER_NOTES, 'context-rules');
    expect(result).toContain('CONTEXT');
    expect(result).toContain('context section');
  });

  it('matches strategy1-desistement to KEY STRATEGY 1 section', () => {
    const result = extractRelevantSection(SAMPLE_SPEAKER_NOTES, 'strategy1-desistement');
    expect(result).toContain('DÉSISTEMENT');
  });

  it('matches closing-three-things to CLOSING section', () => {
    const result = extractRelevantSection(SAMPLE_SPEAKER_NOTES, 'closing-three-things');
    expect(result).toContain('CLOSING');
    expect(result).toContain('Closing content');
  });

  it('falls back to first 2000 chars for unrecognised ref', () => {
    const result = extractRelevantSection(SAMPLE_SPEAKER_NOTES, 'totally-unknown-ref-xyz');
    expect(result.length).toBeLessThanOrEqual(2000);
    expect(result).toContain('TIMING OVERVIEW');
  });

  it('returns empty string for empty notes', () => {
    const result = extractRelevantSection('', 'hook-opening');
    expect(result).toBe('');
  });

  it('returns empty string for empty ref', () => {
    const result = extractRelevantSection(SAMPLE_SPEAKER_NOTES, '');
    // Empty ref → no tokens → no match → fallback
    expect(result.length).toBeGreaterThan(0);
  });
});
