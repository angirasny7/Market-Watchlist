import { describe, it, expect } from 'vitest';
import { formatMoney, normalizeCurrencyCode } from '../formatMoney';
import { formatPrice } from '../utils';

describe('normalizeCurrencyCode', () => {
  it('normalizes INR symbols and strings', () => {
    expect(normalizeCurrencyCode('₹')).toEqual({ code: 'INR', symbol: '₹' });
    expect(normalizeCurrencyCode('INR')).toEqual({ code: 'INR', symbol: '₹' });
    expect(normalizeCurrencyCode()).toEqual({ code: 'INR', symbol: '₹' });
  });

  it('normalizes USD and EUR', () => {
    expect(normalizeCurrencyCode('$')).toEqual({ code: 'USD', symbol: '$' });
    expect(normalizeCurrencyCode('USD')).toEqual({ code: 'USD', symbol: '$' });
    expect(normalizeCurrencyCode('EUR')).toEqual({ code: 'EUR', symbol: '€' });
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

  it('handles null/undefined gracefully', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney(undefined, 'INR', { fallback: 'N/A' })).toBe('N/A');
  });

  it('formatPrice helper produces single currency prefix', () => {
    const priceStr = formatPrice(1942.5, '₹');
    expect(priceStr).not.toContain('₹₹');
    expect(priceStr).toContain('1,942.50');
  });
});
