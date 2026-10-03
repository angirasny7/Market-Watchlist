import { describe, it, expect } from 'vitest';
import { formatEventTime, formatEventTooltip } from '../formatEventTime';

describe('formatEventTime', () => {
  const fixedNow = new Date('2026-10-03T12:00:00Z');

  it('formats cumulative "since last visit" events using baseline and end close dates', () => {
    const item = {
      isCumulative: true,
      periodStart: '2026-10-01T00:00:00Z',
      occurredOn: '2026-10-02T10:00:00Z',
      eventType: 'PRICE_SURGE',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, fixedNow);
    expect(result).toBe('Thu 1 Oct close -> Fri 2 Oct close');
  });

  it('formats single-day price/volume move from yesterday (trading day) as Yesterday close', () => {
    // When now is a trading day (e.g. Wednesday), Tuesday move is Yesterday close
    const wednesdayNow = new Date('2026-09-30T12:00:00Z');
    const item = {
      occurredOn: '2026-09-29T12:00:00Z',
      eventType: 'PRICE_DROP',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, wednesdayNow);
    expect(result).toBe('Yesterday close');
  });

  it('formats single-day price/volume move from today (trading day) as Today close', () => {
    const wednesdayNow = new Date('2026-09-30T12:00:00Z');
    const item = {
      occurredOn: '2026-09-30T08:00:00Z',
      eventType: 'PRICE_SURGE',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, wednesdayNow);
    expect(result).toBe('Today close');
  });

  it('formats single-day price/volume move from earlier dates as Weekday Day Month close', () => {
    const item = {
      occurredOn: '2026-09-28T10:00:00Z',
      eventType: 'VOLUME_SPIKE',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, fixedNow);
    expect(result).toBe('Mon 28 Sep close');
  });

  it('formats earnings events correctly for today and past dates', () => {
    const todayEarnings = {
      occurredOn: '2026-10-03T05:00:00Z',
      eventType: 'EARNINGS_BEAT',
      exchange: 'NSE',
    };
    expect(formatEventTime(todayEarnings, fixedNow)).toBe('Earnings today');

    const pastEarnings = {
      occurredOn: '2026-10-02T05:00:00Z',
      eventType: 'EARNINGS_MISS',
      exchange: 'NSE',
    };
    expect(formatEventTime(pastEarnings, fixedNow)).toBe('Reported yesterday');

    const earlierEarnings = {
      occurredOn: '2026-09-25T05:00:00Z',
      eventType: 'EARNINGS_BEAT',
      exchange: 'NSE',
    };
    expect(formatEventTime(earlierEarnings, fixedNow)).toBe('Reported 25 Sep');
  });

  it('formats dividend announcement events', () => {
    const divItem = {
      occurredOn: '2026-10-01T05:00:00Z',
      eventType: 'DIVIDEND_ANNOUNCED',
      exchange: 'NSE',
    };
    expect(formatEventTime(divItem, fixedNow)).toBe('Dividend announced 1 Oct');
  });

  it('formats alert-triggered events with full date and time in exchange timezone', () => {
    const alertNSE = {
      isAlertTriggered: true,
      detectedAt: '2026-10-02T09:29:00Z', // 2:59 PM IST
      exchange: 'NSE',
      eventType: 'PRICE_SURGE',
    };
    const formatted = formatEventTime(alertNSE, fixedNow);
    expect(formatted).toContain('Triggered Fri 2 Oct');
    expect(formatted).toMatch(/2:59\s*PM/i);
  });

  it('never outputs a bare clock time without date', () => {
    const bareItem = {
      timestamp: '2026-10-02T09:29:00Z',
    };
    const formatted = formatEventTime(bareItem, fixedNow);
    expect(formatted).not.toBe('02:59 PM');
    expect(formatted).not.toBe('2:59 PM');
    expect(formatted).toContain('close');
  });

  it('generates rich audit tooltip containing market date and detection timestamp', () => {
    const item = {
      occurredOn: '2026-10-02T00:00:00Z',
      detectedAt: '2026-10-02T09:29:00Z',
      exchange: 'NSE',
    };
    const tooltip = formatEventTooltip(item);
    expect(tooltip).toContain('Market Date:');
    expect(tooltip).toContain('Detected:');
    expect(tooltip).toContain('Asia/Kolkata');
  });
});
