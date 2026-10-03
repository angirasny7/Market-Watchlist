/**
 * Trading Calendar and Exchange Holidays for 2026 (Backend)
 *
 * Sources:
 * - NSE India Official Trading Holidays Circular: https://www.nseindia.com/resources/exchange-communication-trading-holidays
 *   (Verified: 2026-10-03)
 * - NYSE / NASDAQ Official Market Hours & Holidays: https://www.nyse.com/markets/hours-calendars
 *   (Verified: 2026-10-03)
 */

export interface HolidayEntry {
  date: string; // YYYY-MM-DD
  name: string;
  isEarlyClose?: boolean;
  earlyCloseTime?: string;
}

/**
 * NSE 2026 Official Trading Holidays
 */
export const NSE_HOLIDAYS_2026: HolidayEntry[] = [
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-02-17', name: 'Mahashivratri' },
  { date: '2026-03-03', name: 'Holi' },
  { date: '2026-03-20', name: 'Id-Ul-Fitr' },
  { date: '2026-03-27', name: 'Shri Ram Navami' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { date: '2026-05-01', name: 'Maharashtra Day' },
  { date: '2026-05-27', name: 'Bakri Id' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-09-14', name: 'Ganesh Chaturthi' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra' },
  { date: '2026-11-08', name: 'Diwali (Laxmi Pujan)', isEarlyClose: true, earlyCloseTime: '19:15' },
  { date: '2026-11-10', name: 'Diwali Balipratipada' },
  { date: '2026-11-24', name: 'Gurunanak Jayanti' },
  { date: '2026-12-25', name: 'Christmas' },
];

/**
 * US Exchanges (NYSE / NASDAQ) 2026 Official Trading Holidays
 */
export const US_HOLIDAYS_2026: HolidayEntry[] = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day' },
  { date: '2026-02-16', name: "Presidents' Day" },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-05-25', name: 'Memorial Day' },
  { date: '2026-06-19', name: 'Juneteenth National Independence Day' },
  { date: '2026-07-03', name: 'Independence Day (Observed)', isEarlyClose: true, earlyCloseTime: '13:00' },
  { date: '2026-09-07', name: 'Labor Day' },
  { date: '2026-11-26', name: 'Thanksgiving Day' },
  { date: '2026-11-27', name: 'Day After Thanksgiving', isEarlyClose: true, earlyCloseTime: '13:00' },
  { date: '2026-12-24', name: 'Christmas Eve', isEarlyClose: true, earlyCloseTime: '13:00' },
  { date: '2026-12-25', name: 'Christmas Day' },
];

export const NSE_HOLIDAY_MAP = new Map(NSE_HOLIDAYS_2026.map((h) => [h.date, h]));
export const US_HOLIDAY_MAP = new Map(US_HOLIDAYS_2026.map((h) => [h.date, h]));

export function getExchangeHoliday(exchange: string, date: Date | string): HolidayEntry | null {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;

  const upperEx = (exchange || 'NSE').toUpperCase();
  const isIndian = upperEx === 'NSE' || upperEx === 'BSE' || upperEx === 'IN';
  const tz = isIndian ? 'Asia/Kolkata' : 'America/New_York';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const dateKey = `${year}-${month}-${day}`;

  if (year !== '2026') {
    console.warn(`[TradingCalendar] Warning: Holiday calendar not verified for year ${year}. Falling back to weekday schedule.`);
    return null;
  }

  if (isIndian) {
    return NSE_HOLIDAY_MAP.get(dateKey) || null;
  }
  return US_HOLIDAY_MAP.get(dateKey) || null;
}

export function isExchangeTradingDay(exchange: string, date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;

  const upperEx = (exchange || 'NSE').toUpperCase();
  const isIndian = upperEx === 'NSE' || upperEx === 'BSE' || upperEx === 'IN';
  const tz = isIndian ? 'Asia/Kolkata' : 'America/New_York';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  }).formatToParts(d);

  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';
  if (isWeekend) return false;

  const holiday = getExchangeHoliday(exchange, d);
  if (holiday && !holiday.isEarlyClose) {
    return false;
  }
  return true;
}

export function getLatestCompletedTradingDate(exchange: string, referenceDate: Date = new Date()): Date {
  const upperEx = (exchange || 'NSE').toUpperCase();
  const isIndian = upperEx === 'NSE' || upperEx === 'BSE' || upperEx === 'IN';
  const tz = isIndian ? 'Asia/Kolkata' : 'America/New_York';

  const current = new Date(referenceDate);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(current);

  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const totalMinutes = hour * 60 + minute;

  const closeMinutes = isIndian ? 930 : 960;

  if (totalMinutes < closeMinutes || !isExchangeTradingDay(exchange, current)) {
    current.setDate(current.getDate() - 1);
  }

  for (let i = 0; i < 15; i++) {
    if (isExchangeTradingDay(exchange, current)) {
      return current;
    }
    current.setDate(current.getDate() - 1);
  }

  return current;
}
