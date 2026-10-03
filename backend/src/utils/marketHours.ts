/**
 * Market hours utility for backend scheduling.
 * Evaluates whether Indian (NSE/BSE) or US (NYSE/NASDAQ) markets are open.
 */

export const NSE_HOLIDAYS = new Set([
  '2026-01-26', // Republic Day
  '2026-02-17', // Mahashivratri
  '2026-03-03', // Holi
  '2026-03-20', // Id-Ul-Fitr
  '2026-03-27', // Shri Ram Navami
  '2026-04-03', // Good Friday
  '2026-04-14', // Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-05-27', // Bakri Id
  '2026-08-15', // Independence Day
  '2026-09-14', // Ganesh Chaturthi
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-08', // Diwali (Laxmi Pujan)
  '2026-11-24', // Gurunanak Jayanti
  '2026-12-25', // Christmas
]);

export function isIndianMarketOpen(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const dateKey = `${year}-${month}-${day}`;

  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;

  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  const isHoliday = NSE_HOLIDAYS.has(dateKey);

  // NSE: 09:15 to 15:30 IST on trading days
  return !isWeekend && !isHoliday && totalMinutes >= 555 && totalMinutes <= 930;
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
