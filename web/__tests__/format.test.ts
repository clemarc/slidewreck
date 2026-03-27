import { describe, it, expect } from 'vitest';
import { relativeTime } from '../lib/format';

describe('relativeTime', () => {
  // Fixed reference: 2026-03-26T12:00:00Z
  const now = new Date('2026-03-26T12:00:00Z').getTime();

  it('returns "just now" for 30 seconds ago', () => {
    const date = new Date(now - 30_000).toISOString();
    expect(relativeTime(date, now)).toBe('just now');
  });

  it('returns "1 min ago" for 90 seconds ago (singular)', () => {
    const date = new Date(now - 90_000).toISOString();
    expect(relativeTime(date, now)).toBe('1 min ago');
  });

  it('returns "5 min ago" for 5 minutes ago (plural)', () => {
    const date = new Date(now - 5 * 60_000).toISOString();
    expect(relativeTime(date, now)).toBe('5 min ago');
  });

  it('returns "1 hour ago" for 90 minutes ago (singular)', () => {
    const date = new Date(now - 90 * 60_000).toISOString();
    expect(relativeTime(date, now)).toBe('1 hour ago');
  });

  it('returns "3 hours ago" for 3 hours ago (plural)', () => {
    const date = new Date(now - 3 * 3600_000).toISOString();
    expect(relativeTime(date, now)).toBe('3 hours ago');
  });

  it('returns "1 day ago" for 36 hours ago (singular)', () => {
    const date = new Date(now - 36 * 3600_000).toISOString();
    expect(relativeTime(date, now)).toBe('1 day ago');
  });

  it('returns "6 days ago" for 6 days ago (plural)', () => {
    const date = new Date(now - 6 * 86400_000).toISOString();
    expect(relativeTime(date, now)).toBe('6 days ago');
  });

  it('returns locale date string for 60 days ago', () => {
    const date = new Date(now - 60 * 86400_000).toISOString();
    expect(relativeTime(date, now)).toBe('1/25/2026');
  });

  it('returns "just now" for future date (clock skew)', () => {
    const date = new Date(now + 3600_000).toISOString();
    expect(relativeTime(date, now)).toBe('just now');
  });

  it('returns input as-is for invalid date string', () => {
    expect(relativeTime('not-a-date', now)).toBe('not-a-date');
  });
});
