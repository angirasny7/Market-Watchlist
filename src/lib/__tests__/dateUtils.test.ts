import { describe, it, expect } from 'vitest';
import { formatLastVisitLabel, formatSessionSummary, formatSessionStripTime, formatWindowBaseline } from '../dateUtils';

describe('formatLastVisitLabel', () => {
  it('returns welcome message when no previous login exists or invalid date', () => {
    expect(formatLastVisitLabel(null)).toBe("Welcome! Here's what we're tracking");
    expect(formatLastVisitLabel(undefined)).toBe("Welcome! Here's what we're tracking");
    expect(formatLastVisitLabel('invalid-date')).toBe("Welcome! Here's what we're tracking");
  });

  it('formats recent visits within minutes / hours', () => {
    const justNow = new Date(Date.now() - 30 * 1000);
    expect(formatLastVisitLabel(justNow)).toBe('Last visit just now');

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatLastVisitLabel(twoHoursAgo)).toBe('Last visit 2 hours ago');
  });

  it('formats short absence of 2 days with weekday name', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const result = formatLastVisitLabel(twoDaysAgo);
    expect(result).toMatch(/^Last visit 2 days ago \(\w+\)$/);
  });

  it('formats longer absence of 19 days with day and month', () => {
    const nineteenDaysAgo = new Date(Date.now() - 19 * 24 * 60 * 60 * 1000);
    const result = formatLastVisitLabel(nineteenDaysAgo);
    expect(result).toMatch(/^Last visit 19 days ago \(\d{1,2} \w+\)$/);
  });
});

describe('formatSessionSummary', () => {
  it('delegates to formatLastVisitLabel', () => {
    expect(formatSessionSummary(null)).toBe("Welcome! Here's what we're tracking");
  });
});

describe('formatSessionStripTime', () => {
  it('returns welcome message for null/undefined', () => {
    expect(formatSessionStripTime(null)).toBe("Welcome! Here's what we're tracking across your watchlists.");
    expect(formatSessionStripTime(undefined)).toBe("Welcome! Here's what we're tracking across your watchlists.");
  });

  it('formats timestamp with weekday, day, month, time, and relative duration', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatSessionStripTime(twoHoursAgo);
    expect(result).toMatch(/^Last login: \w+ \d{1,2} \w+, \d{1,2}:\d{2} [AP]M \(2 hours ago\)$/);
  });
});

describe('formatWindowBaseline', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatWindowBaseline(null)).toBe('');
    expect(formatWindowBaseline(undefined)).toBe('');
  });

  it('formats timestamp with weekday, day, month, and time', () => {
    const testDate = new Date('2026-10-03T13:20:00.000Z');
    const result = formatWindowBaseline(testDate);
    expect(result).toMatch(/^\w+ \d{1,2} \w+, \d{1,2}:\d{2} [AP]M$/);
  });
});

