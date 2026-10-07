import { describe, it, expect } from 'vitest';
import { formatEventTime, formatEventTooltip } from '../formatEventTime';

describe('formatEventTime (A6 Truth Formatting)', () => {
  const fixedNow = new Date('2026-10-06T12:00:00Z');

  it('formats completed session market signals without "Today close"', () => {
    const item = {
      occurredAt: '2026-10-05T10:00:00Z',
      eventType: 'PRICE_SURGE',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, fixedNow);
    expect(result).toBe('Mon 5 Oct session · NSE data');
    expect(result).not.toContain('Today close');
  });

  it('formats recent market signals with clean relative time', () => {
    const item = {
      detectedAt: '2026-10-06T11:30:00Z', // 30 min before fixedNow
      isIntraday: true,
      eventType: 'PRICE_SURGE',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, fixedNow);
    expect(result).toBe('30 min ago');
  });

  it('formats regulatory filings older than 12 hours with source and announcement time', () => {
    const item = {
      publishedAt: '2026-10-05T03:32:00Z', // > 12h before fixedNow
      eventType: 'FILING',
      source: 'NSE filing',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, fixedNow);
    expect(result).toBe('NSE filing · Announced Mon 5 Oct, 9:02 AM IST');
  });

  it('formats news items older than 12 hours with publisher and publication time', () => {
    const item = {
      publishedAt: '2026-10-05T03:44:00Z', // > 12h before fixedNow
      eventType: 'NEWS',
      source: 'Reuters',
      exchange: 'NSE',
    };
    const result = formatEventTime(item, fixedNow);
    expect(result).toBe('Reuters · Published Mon 5 Oct, 9:14 AM IST');
  });

  it('formats alert-triggered events older than 12 hours with date and time in exchange timezone', () => {
    const alertNSE = {
      isAlertTriggered: true,
      detectedAt: '2026-10-05T05:01:00Z', // > 12h before fixedNow
      exchange: 'NSE',
      eventType: 'PRICE_SURGE',
    };
    const formatted = formatEventTime(alertNSE, fixedNow);
    expect(formatted).toBe('Your alert · Triggered Mon 5 Oct, 10:31 AM IST');
  });

  it('never outputs the phrase "Today close" or bare clock time', () => {
    const bareItem = {
      timestamp: '2026-10-05T10:00:00Z',
      exchange: 'NSE',
    };
    const formatted = formatEventTime(bareItem, fixedNow);
    expect(formatted).not.toContain('Today close');
    expect(formatted).not.toBe('10:00 AM');
    expect(formatted).toContain('session · NSE data');
  });

  it('generates rich audit tooltip containing publish time and receipt timestamp', () => {
    const item = {
      publishedAt: '2026-10-06T03:44:00Z',
      receivedAt: '2026-10-06T03:46:00Z',
      source: 'Reuters',
      sourceTrustTier: 'MAJOR_PUBLISHER',
      exchange: 'NSE',
    };
    const tooltip = formatEventTooltip(item);
    expect(tooltip).toContain('Published: Tue 6 Oct, 9:14 AM IST');
    expect(tooltip).toContain('Received by us at Tue 6 Oct, 9:16 AM IST');
    expect(tooltip).toContain('Source: Reuters (MAJOR_PUBLISHER)');
  });
});
