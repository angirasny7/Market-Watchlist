/**
 * Market hours utility for backend scheduling.
 * Evaluates whether Indian (NSE/BSE) or US (NYSE/NASDAQ) markets are open.
 */

export function isIndianMarketOpen(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  // NSE: 09:15 to 15:30 IST
  return !isWeekend && totalMinutes >= 555 && totalMinutes <= 930;
}

export function isUsMarketOpen(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  // NYSE/NASDAQ: 09:30 to 16:00 ET
  return !isWeekend && totalMinutes >= 570 && totalMinutes <= 960;
}

export function isAnyMarketOpen(): boolean {
  return isIndianMarketOpen() || isUsMarketOpen();
}
