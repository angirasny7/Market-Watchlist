/**
 * Shared Money & Currency Formatter (F0.6)
 * Uses Intl.NumberFormat with normalized currency codes (e.g. INR, USD, EUR, GBP)
 * to avoid double currency symbols and handle missing or unknown values safely.
 */

export interface FormatMoneyOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
}

const SYMBOL_TO_CODE: Record<string, { code: string; symbol: string }> = {
  '₹': { code: 'INR', symbol: '₹' },
  'INR': { code: 'INR', symbol: '₹' },
  '$': { code: 'USD', symbol: '$' },
  'USD': { code: 'USD', symbol: '$' },
  '€': { code: 'EUR', symbol: '€' },
  'EUR': { code: 'EUR', symbol: '€' },
  '£': { code: 'GBP', symbol: '£' },
  'GBP': { code: 'GBP', symbol: '£' },
  '¥': { code: 'JPY', symbol: '¥' },
  'JPY': { code: 'JPY', symbol: '¥' },
};

export function normalizeCurrencyCode(curr?: string | null): { code: string; symbol: string } {
  if (!curr || typeof curr !== 'string') {
    return { code: 'INR', symbol: '₹' };
  }

  const trimmed = curr.trim();
  if (!trimmed) {
    return { code: 'INR', symbol: '₹' };
  }

  const upper = trimmed.toUpperCase();
  if (SYMBOL_TO_CODE[trimmed]) {
    return SYMBOL_TO_CODE[trimmed];
  }
  if (SYMBOL_TO_CODE[upper]) {
    return SYMBOL_TO_CODE[upper];
  }

  // If it's a 3-letter currency code (e.g., CAD, AUD, CHF)
  if (/^[A-Z]{3}$/.test(upper)) {
    return { code: upper, symbol: upper };
  }

  return { code: 'INR', symbol: trimmed };
}

export function formatMoney(
  amount: number | null | undefined,
  currency: string = 'INR',
  options?: FormatMoneyOptions
): string {
  const fallback = options?.fallback ?? '—';
  if (amount === null || amount === undefined || isNaN(amount)) {
    return fallback;
  }

  const { code, symbol } = normalizeCurrencyCode(currency);
  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? 2;

  try {
    const locale = code === 'INR' ? 'en-IN' : 'en-US';
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    return formatter.format(amount);
  } catch {
    // Graceful fallback on unsupported Intl currency codes or environment limitations
    const numStr = amount.toLocaleString('en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    return `${symbol} ${numStr}`;
  }
}
