/**
 * Helper to format event times meaningfully based on market occurrence and event type.
 *
 * Rules:
 * 1. Cumulative "since your last visit" event -> "Since <Weekday> <Day> <Month>" (e.g. "Since Thu 1 Oct")
 * 2. Single-day price/volume move -> "<Day/Date> close" (e.g. "Today close", "Yesterday close", "Fri 2 Oct close")
 * 3. Corporate event (Earnings, Dividend, etc.) -> "Earnings today", "Reported 2 Oct", "Dividend announced 1 Oct"
 * 4. Alert-triggered event -> "Triggered <Weekday> <Day> <Month>, <Hour>:<Min> <AM/PM>" in exchange/local TZ
 * 5. NEVER show a bare clock time without a date.
 */

export interface EventTimeContext {
  occurredOn?: string | Date | null;
  periodStart?: string | Date | null;
  detectedAt?: string | Date | null;
  date?: string | Date | null;
  timestamp?: string | Date | null;
  eventType?: string;
  isCumulative?: boolean;
  isAlertTriggered?: boolean;
  exchange?: string;
  headline?: string;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parses any valid date input (string, Date, number) into a Date object.
 */
function parseDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  const d = typeof val === 'string' ? new Date(val) : val;
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Returns 'Asia/Kolkata' for Indian exchanges or 'America/New_York' for US.
 */
export function getExchangeTimeZone(exchange?: string): string {
  if (!exchange) return 'Asia/Kolkata';
  const ex = exchange.toUpperCase();
  if (ex === 'NSE' || ex === 'BSE' || ex === 'IN' || ex === 'INDIA') {
    return 'Asia/Kolkata';
  }
  if (ex === 'NASDAQ' || ex === 'NYSE' || ex === 'US') {
    return 'America/New_York';
  }
  return 'Asia/Kolkata';
}

/**
 * Compares two dates by calendar day in a given timezone or UTC.
 */
function getDayDiff(d1: Date, d2: Date = new Date()): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Formats "Thu 1 Oct" or "2 Oct"
 */
function formatDayMonth(d: Date, includeWeekday: boolean = true): string {
  const weekday = SHORT_WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()];
  return includeWeekday ? `${weekday} ${day} ${month}` : `${day} ${month}`;
}

/**
 * Main function to format event time on Attention Feed cards.
 */
export function formatEventTime(item: EventTimeContext, now: Date = new Date()): string {
  const occurred = parseDate(item.occurredOn) || parseDate(item.date) || parseDate(item.timestamp);
  const periodStart = parseDate(item.periodStart);
  const detected = parseDate(item.detectedAt) || parseDate(item.timestamp) || parseDate(item.date);
  const type = (item.eventType || '').toUpperCase();
  const isCumulative = Boolean(
    item.isCumulative ||
    (item.headline && item.headline.toLowerCase().includes('since your last visit')) ||
    (periodStart && occurred && periodStart.getTime() < occurred.getTime() - 12 * 60 * 60 * 1000)
  );

  // 1. Alert-Triggered Events
  if (item.isAlertTriggered && detected) {
    const tz = getExchangeTimeZone(item.exchange);
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).formatToParts(detected);

      let weekday = '';
      let day = '';
      let month = '';
      let hour = '';
      let minute = '';
      let dayPeriod = 'AM';

      for (const p of parts) {
        if (p.type === 'weekday') weekday = p.value;
        if (p.type === 'day') day = p.value;
        if (p.type === 'month') month = p.value;
        if (p.type === 'hour') hour = p.value;
        if (p.type === 'minute') minute = p.value;
        if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
      }

      return `Triggered ${weekday} ${day} ${month}, ${hour}:${minute} ${dayPeriod}`;
    } catch {
      return `Triggered ${formatDayMonth(detected, true)}`;
    }
  }

  // 2. Cumulative "Since Last Visit" Events
  if (isCumulative) {
    const startDate = periodStart || occurred;
    if (startDate) {
      return `Since ${formatDayMonth(startDate, true)}`;
    }
    return 'Since last visit';
  }

  // 3. Corporate Events (Earnings, Dividend, Management change, Analyst action)
  const isEarnings = type.includes('EARNINGS');
  const isDividend = type.includes('DIVIDEND');
  const isManagement = type.includes('MANAGEMENT');
  const isAnalyst = type.includes('ANALYST') || type.includes('UPGRADE') || type.includes('DOWNGRADE');

  if (occurred && (isEarnings || isDividend || isManagement || isAnalyst)) {
    const diffDays = getDayDiff(occurred, now);
    const dateStr = formatDayMonth(occurred, false);

    if (isEarnings) {
      if (diffDays === 0) return 'Earnings today';
      if (diffDays === 1) return 'Reported yesterday';
      return `Reported ${dateStr}`;
    }
    if (isDividend) {
      if (diffDays === 0) return 'Dividend today';
      return `Dividend announced ${dateStr}`;
    }
    if (isManagement) {
      if (diffDays === 0) return 'Announced today';
      return `Announced ${dateStr}`;
    }
    if (isAnalyst) {
      if (diffDays === 0) return 'Upgraded today';
      return `Updated ${dateStr}`;
    }
  }

  // 4. Single-Day Price / Volume moves (End-of-day close moves)
  if (occurred) {
    const diffDays = getDayDiff(occurred, now);
    if (diffDays === 0) {
      return 'Today close';
    }
    if (diffDays === 1) {
      return 'Yesterday close';
    }
    return `${formatDayMonth(occurred, true)} close`;
  }

  // Fallback safe date format (NEVER a bare time)
  if (detected) {
    return `${formatDayMonth(detected, true)} close`;
  }

  return 'Recent move';
}

/**
 * Detailed tooltip string for auditing data provenance and exact detection time.
 */
export function formatEventTooltip(item: EventTimeContext): string {
  const occurred = parseDate(item.occurredOn) || parseDate(item.date) || parseDate(item.timestamp);
  const detected = parseDate(item.detectedAt) || parseDate(item.timestamp) || parseDate(item.date);
  const tz = getExchangeTimeZone(item.exchange);

  const lines: string[] = [];

  if (occurred) {
    lines.push(`Market Date: ${occurred.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`);
  }

  if (item.periodStart) {
    const start = parseDate(item.periodStart);
    if (start) {
      lines.push(`Period Start: ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`);
    }
  }

  if (detected) {
    try {
      const timeStr = detected.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const dateStr = detected.toLocaleDateString('en-GB', {
        timeZone: tz,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      lines.push(`Detected: ${dateStr} at ${timeStr} (${tz})`);
    } catch {
      lines.push(`Detected: ${detected.toISOString()}`);
    }
  }

  return lines.join(' · ');
}
