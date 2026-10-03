/**
 * Shared Money & Currency Formatter (F0.6)
 * Uses Intl.NumberFormat with currency codes (e.g. INR, USD) to avoid double currency symbols.
 */

export interface FormatMoneyOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: string;
}

export function normalizeCurrencyCode(curr?: string): { code: string; symbol: string } {
  if (!curr) return { code: 'INR', symbol: '₹' };
  const trimmed = curr.trim();
  if (trimmed === '₹' || trimmed.toUpperCase() === 'INR') {
    return { code: 'INR', symbol: '₹' };
  }
  if (trimmed === '$' || trimmed.toUpperCase() === 'USD') {
    return { code: 'USD', symbol: '$' };
  }
  if (trimmed === '€' || trimmed.toUpperCase() === 'EUR') {
    return { code: 'EUR', symbol: '€' };
  }
  if (trimmed === '£' || trimmed.toUpperCase() === 'GBP') {
    return { code: 'GBP', symbol: '£' };
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
    const numStr = amount.toLocaleString(code === 'INR' ? 'en-IN' : 'en-US', {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
    });
    return `${symbol}${numStr}`;
  }
}
