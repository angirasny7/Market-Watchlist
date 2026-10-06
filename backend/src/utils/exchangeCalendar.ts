/**
 * Exchange Calendar and Session Determination Engine for 2026
 *
 * Official Reference Calendars:
 * - NSE India Official Holidays: https://www.nseindia.com/resources/exchange-communication-trading-holidays
 * - US (NYSE/NASDAQ) Official Holidays: https://www.nyse.com/markets/hours-calendars
 */

export interface HolidayEntry {
  date: string; // YYYY-MM-DD
  name: string;
  isEarlyClose?: boolean;
  earlyCloseTime?: string;
}

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
  { date: '2026-11-08', name: 'Diwali (Laxmi Pujan / Muhurat Trading)', isEarlyClose: true, earlyCloseTime: '19:15' },
  { date: '2026-11-10', name: 'Diwali Balipratipada' },
  { date: '2026-11-24', name: 'Gurunanak Jayanti' }, // Flagged: verify on nseindia.com (Nov 24 vs Nov 4)
  { date: '2026-12-25', name: 'Christmas' },
];

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

const NSE_HOLIDAY_MAP = new Map(NSE_HOLIDAYS_2026.map((h) => [h.date, h]));
const US_HOLIDAY_MAP = new Map(US_HOLIDAYS_2026.map((h) => [h.date, h]));

export function getExchangeTimeZone(exchange: string = 'NSE'): string {
  const ex = exchange.toUpperCase();
  if (ex === 'NSE' || ex === 'BSE' || ex === 'IN' || ex === 'INDIA') return 'Asia/Kolkata';
  if (ex === 'NASDAQ' || ex === 'NYSE' || ex === 'US') return 'America/New_York';
  return 'Asia/Kolkata';
}

export function isExchangeTradingDay(exchange: string, date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return false;

  const tz = getExchangeTimeZone(exchange);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  if (weekday === 'Sat' || weekday === 'Sun') return false;

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const dateKey = `${year}-${month}-${day}`;

  const ex = exchange.toUpperCase();
  const isIndian = ex === 'NSE' || ex === 'BSE' || ex === 'IN';
  if (isIndian) {
    return !NSE_HOLIDAY_MAP.has(dateKey);
  }
  return !US_HOLIDAY_MAP.has(dateKey);
}

export interface ExchangeSessionInfo {
  isOpen: boolean;
  isIntraday: boolean;
  sessionDate: string; // YYYY-MM-DD
  occurredAt: Date;
  sessionLabel: string;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatSessionDate(d: Date): string {
  const weekday = SHORT_WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()];
  return `${weekday} ${day} ${month}`;
}

/**
 * Accurately determines the current exchange market session and truth timestamp.
 * NEVER stamps a closed-market calculation with the current wall-clock time.
 */
export function getExchangeMarketSession(
  exchange: string = 'NSE',
  now: Date = new Date()
): ExchangeSessionInfo {
  const tz = getExchangeTimeZone(exchange);
  const upperEx = exchange.toUpperCase();
  const isIndian = upperEx === 'NSE' || upperEx === 'BSE' || upperEx === 'IN';

  // Get current local time in exchange TZ
  const nowParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  const year = parseInt(nowParts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(nowParts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(nowParts.find((p) => p.type === 'day')!.value, 10);
  const hour = parseInt(nowParts.find((p) => p.type === 'hour')!.value, 10);
  const minute = parseInt(nowParts.find((p) => p.type === 'minute')!.value, 10);
  const currentMinutes = hour * 60 + minute;

  const todayIsTradingDay = isExchangeTradingDay(exchange, now);

  if (isIndian) {
    const openMin = 9 * 60 + 15; // 09:15 IST
    const closeMin = 15 * 60 + 30; // 15:30 IST

    if (todayIsTradingDay && currentMinutes >= openMin && currentMinutes <= closeMin) {
      // Intraday active session
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now);

      return {
        isOpen: true,
        isIntraday: true,
        sessionDate: dateStr,
        occurredAt: now,
        sessionLabel: `Detected ${timeStr} IST · NSE data (~15 min delayed)`,
      };
    }

    // Outside market hours or non-trading day: find latest completed session
    let sessionDateObj: Date;
    if (todayIsTradingDay && currentMinutes > closeMin) {
      // Today after close: latest session is today's close at 15:30 IST (10:00 UTC)
      sessionDateObj = new Date(Date.UTC(year, month, day, 10, 0, 0));
    } else {
      // Before market open today or weekend/holiday: look backwards for previous trading day
      let checkDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      while (!isExchangeTradingDay(exchange, checkDate)) {
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      }
      const prevParts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(checkDate);
      const py = parseInt(prevParts.find((p) => p.type === 'year')!.value, 10);
      const pm = parseInt(prevParts.find((p) => p.type === 'month')!.value, 10) - 1;
      const pd = parseInt(prevParts.find((p) => p.type === 'day')!.value, 10);
      sessionDateObj = new Date(Date.UTC(py, pm, pd, 10, 0, 0));
    }

    const y = sessionDateObj.getUTCFullYear();
    const m = String(sessionDateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(sessionDateObj.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    return {
      isOpen: false,
      isIntraday: false,
      sessionDate: dateStr,
      occurredAt: sessionDateObj,
      sessionLabel: `${formatSessionDate(sessionDateObj)} session · NSE data`,
    };
  } else {
    // US Markets (NYSE/NASDAQ) 09:30 to 16:00 EDT (13:30 to 20:00 UTC)
    const openMin = 9 * 60 + 30;
    const closeMin = 16 * 60;

    if (todayIsTradingDay && currentMinutes >= openMin && currentMinutes <= closeMin) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now);

      return {
        isOpen: true,
        isIntraday: true,
        sessionDate: dateStr,
        occurredAt: now,
        sessionLabel: `Detected ${timeStr} EDT · NASDAQ data (~15 min delayed)`,
      };
    }

    let sessionDateObj: Date;
    if (todayIsTradingDay && currentMinutes > closeMin) {
      sessionDateObj = new Date(Date.UTC(year, month, day, 20, 0, 0));
    } else {
      let checkDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      while (!isExchangeTradingDay(exchange, checkDate)) {
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      }
      const prevParts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(checkDate);
      const py = parseInt(prevParts.find((p) => p.type === 'year')!.value, 10);
      const pm = parseInt(prevParts.find((p) => p.type === 'month')!.value, 10) - 1;
      const pd = parseInt(prevParts.find((p) => p.type === 'day')!.value, 10);
      sessionDateObj = new Date(Date.UTC(py, pm, pd, 20, 0, 0));
    }

    const y = sessionDateObj.getUTCFullYear();
    const m = String(sessionDateObj.getUTCMonth() + 1).padStart(2, '0');
    const d = String(sessionDateObj.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    return {
      isOpen: false,
      isIntraday: false,
      sessionDate: dateStr,
      occurredAt: sessionDateObj,
      sessionLabel: `${formatSessionDate(sessionDateObj)} session · US market data`,
    };
  }
}
