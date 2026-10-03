import { describe, it, expect } from 'vitest';
import {
  formatLastVisitLabel,
  formatVisitTime,
  formatRelativeTime,
} from '../dateUtils';

describe('formatVisitTime & Session Strip Formatting', () => {
  const baseTime = new Date('2026-10-03T12:30:00.000Z'); // 6:00 PM IST / 8:30 AM EDT

  it('1. Brand new user without previous session returns Welcome label', () => {
    const res = formatVisitTime({ timestamp: null });
    expect(res.label).toBe("Welcome! Here's what we're tracking");
    expect(res.isNewUser).toBe(true);

    const resUndefined = formatVisitTime({ timestamp: undefined });
    expect(resUndefined.label).toBe("Welcome! Here's what we're tracking");
    expect(resUndefined.isNewUser).toBe(true);
  });

  it('2. Normal logout displays "Last visit ended" with IST time and timezone abbreviation', () => {
    const res = formatVisitTime({
      timestamp: baseTime,
      endReason: 'logout',
      timeZone: 'Asia/Kolkata',
    });
    expect(res.prefix).toBe('Last visit ended');
    expect(res.label).toContain('Last visit ended: Sat 3 Oct, 6:00 PM IST');
    expect(res.timeZoneAbbr).toBe('IST');
    expect(res.isNewUser).toBe(false);
  });

  it('3. Tab closed / inactivity displays "Last active" with time and timezone', () => {
    const res = formatVisitTime({
      timestamp: baseTime,
      endReason: 'inactivity',
      timeZone: 'Asia/Kolkata',
    });
    expect(res.prefix).toBe('Last active');
    expect(res.label).toContain('Last active: Sat 3 Oct, 6:00 PM IST');
  });

  it('4. US Timezone (America/New_York) presentation with EDT abbreviation', () => {
    const res = formatVisitTime({
      timestamp: baseTime,
      endReason: 'logout',
      timeZone: 'America/New_York',
    });
    expect(res.label).toContain('Sat 3 Oct, 8:30 AM');
    expect(['EDT', 'EST', 'GMT-4', 'UTC-4']).toContain(res.timeZoneAbbr);
  });

  it('5. Skewed client clock is normalized using serverNowOffsetMs', () => {
    // Client clock is 1 hour fast compared to real time
    const clientClockSkewMs = 60 * 60 * 1000;
    const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    const relativeNormal = formatRelativeTime(pastTime, false, 0);
    expect(relativeNormal).toBe('2 hours ago');

    // With offset, relative calculation is stable
    const relativeWithOffset = formatRelativeTime(pastTime, false, -clientClockSkewMs);
    expect(relativeWithOffset).toBe('1 hour ago');
  });

  it('6. Midnight boundary formatting', () => {
    const midnightTime = new Date('2026-10-04T00:00:00.000Z');
    const res = formatVisitTime({
      timestamp: midnightTime,
      endReason: 'logout',
      timeZone: 'UTC',
    });
    expect(res.formattedDate).toContain('Sun 4 Oct, 12:00 AM UTC');
  });
});

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
