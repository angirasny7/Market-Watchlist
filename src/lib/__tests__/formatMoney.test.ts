import { describe, it, expect } from 'vitest';
import { formatMoney, normalizeCurrencyCode } from '../formatMoney';
import { formatPrice } from '../utils';

describe('normalizeCurrencyCode', () => {
  it('normalizes INR symbols and strings', () => {
    expect(normalizeCurrencyCode('₹')).toEqual({ code: 'INR', symbol: '₹' });
    expect(normalizeCurrencyCode('INR')).toEqual({ code: 'INR', symbol: '₹' });
    expect(normalizeCurrencyCode(' inr ')).toEqual({ code: 'INR', symbol: '₹' });
    expect(normalizeCurrencyCode()).toEqual({ code: 'INR', symbol: '₹' });
    expect(normalizeCurrencyCode(null)).toEqual({ code: 'INR', symbol: '₹' });
    expect(normalizeCurrencyCode('')).toEqual({ code: 'INR', symbol: '₹' });
  });

  it('normalizes USD, EUR, GBP, and JPY', () => {
    expect(normalizeCurrencyCode('$')).toEqual({ code: 'USD', symbol: '$' });
    expect(normalizeCurrencyCode('USD')).toEqual({ code: 'USD', symbol: '$' });
    expect(normalizeCurrencyCode('€')).toEqual({ code: 'EUR', symbol: '€' });
    expect(normalizeCurrencyCode('EUR')).toEqual({ code: 'EUR', symbol: '€' });
    expect(normalizeCurrencyCode('£')).toEqual({ code: 'GBP', symbol: '£' });
    expect(normalizeCurrencyCode('GBP')).toEqual({ code: 'GBP', symbol: '£' });
    expect(normalizeCurrencyCode('¥')).toEqual({ code: 'JPY', symbol: '¥' });
    expect(normalizeCurrencyCode('JPY')).toEqual({ code: 'JPY', symbol: '¥' });
  });

  it('handles standard 3-letter codes and unknown symbols gracefully', () => {
    expect(normalizeCurrencyCode('CAD')).toEqual({ code: 'CAD', symbol: 'CAD' });
    expect(normalizeCurrencyCode('CHF')).toEqual({ code: 'CHF', symbol: 'CHF' });
    expect(normalizeCurrencyCode('UNKNOWN')).toEqual({ code: 'INR', symbol: 'UNKNOWN' });
  });
});

describe('formatMoney and formatPrice', () => {
  it('formats INR correctly without duplicate symbols', () => {
    const result = formatMoney(1942.5, 'INR');
    expect(result).toMatch(/₹\s?1,942\.50/);
    expect(result).not.toContain('₹₹');
  });

  it('formats USD correctly', () => {
    const result = formatMoney(150.75, 'USD');
    expect(result).toContain('$150.75');
    expect(result).not.toContain('$$');
  });

  it('formats EUR and GBP correctly', () => {
    const eur = formatMoney(1234.56, 'EUR');
    expect(eur).toContain('1,234.56');
    const gbp = formatMoney(789.1, 'GBP');
    expect(gbp).toContain('789.10');
  });

  it('handles null/undefined/NaN gracefully with default or custom fallback', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(NaN)).toBe('—');
    expect(formatMoney(undefined, 'INR', { fallback: 'N/A' })).toBe('N/A');
    expect(formatMoney(null, 'USD', { fallback: '0.00' })).toBe('0.00');
  });

  it('formatPrice helper produces single currency prefix', () => {
    const priceStr = formatPrice(1942.5, '₹');
    expect(priceStr).not.toContain('₹₹');
    expect(priceStr).toContain('1,942.50');
  });
});
