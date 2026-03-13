import { describe, it, expect } from 'vitest';
import { wordCountToTime } from '../word-count-to-time';
import { validateSchema } from '../../__tests__/schema-helpers';

// Helper to call tool execute with proper context
async function execute(input: { text: string; wordsPerMinute?: number }) {
  const result = await wordCountToTime.execute!(input, {} as never);
  return result as { wordCount: number; estimatedMinutes: number; estimatedSeconds: number; wordsPerMinute: number };
}

describe('wordCountToTime tool', () => {
  it('should have correct tool ID', () => {
    expect(wordCountToTime.id).toBe('word-count-to-time');
  });

  it('should count words and calculate duration with explicit WPM', async () => {
    // 150 words at 150 WPM = 1 minute = 60 seconds
    const text = Array(150).fill('word').join(' ');
    const result = await execute({ text, wordsPerMinute: 150 });
    expect(result.wordCount).toBe(150);
    expect(result.estimatedMinutes).toBeCloseTo(1.0);
    expect(result.estimatedSeconds).toBeCloseTo(60.0);
    expect(result.wordsPerMinute).toBe(150);
  });

  it('should use default WPM of 150 when not specified', async () => {
    const text = 'one two three four five';
    const result = await execute({ text });
    expect(result.wordCount).toBe(5);
    expect(result.wordsPerMinute).toBe(150);
    expect(result.estimatedMinutes).toBeCloseTo(5 / 150);
    expect(result.estimatedSeconds).toBeCloseTo((5 / 150) * 60);
  });

  it('should calculate correctly with custom WPM', async () => {
    // 100 words at 200 WPM = 0.5 minutes = 30 seconds
    const text = Array(100).fill('word').join(' ');
    const result = await execute({ text, wordsPerMinute: 200 });
    expect(result.wordCount).toBe(100);
    expect(result.estimatedMinutes).toBeCloseTo(0.5);
    expect(result.estimatedSeconds).toBeCloseTo(30);
    expect(result.wordsPerMinute).toBe(200);
  });

  it('should handle empty text', async () => {
    const result = await execute({ text: '' });
    expect(result.wordCount).toBe(0);
    expect(result.estimatedMinutes).toBe(0);
    expect(result.estimatedSeconds).toBe(0);
  });

  it('should handle single word', async () => {
    const result = await execute({ text: 'hello' });
    expect(result.wordCount).toBe(1);
    expect(result.estimatedMinutes).toBeCloseTo(1 / 150);
  });

  it('should handle text with multiple spaces and newlines', async () => {
    const text = '  hello   world  \n  foo   bar  ';
    const result = await execute({ text });
    expect(result.wordCount).toBe(4);
  });

  it('should reject wordsPerMinute of 0 or negative via schema', () => {
    const schema = wordCountToTime.inputSchema!;
    expect(validateSchema(schema, { text: 'hello', wordsPerMinute: 0 }).success).toBe(false);
    expect(validateSchema(schema, { text: 'hello', wordsPerMinute: -10 }).success).toBe(false);
    expect(validateSchema(schema, { text: 'hello', wordsPerMinute: 1 }).success).toBe(true);
  });
});
