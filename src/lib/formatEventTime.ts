/**
 * Helper to format event times meaningfully based on market occurrence and event type.
 *
 * Rules:
 * - < 12 hours ago: relative time (e.g. "Just now", "45 min ago", "2 hr ago")
 * - >= 12 hours ago: formatted date + time when updated on reliable website (e.g. "6 Oct, 9:30 AM EDT" or "6 Oct, 9:30 AM IST")
 * - Supporting source URL helper resolves official source, news link, or financial provider URL.
 */

export interface EventTimeContext {
  occurredOn?: string | Date | null;
  occurredAt?: string | Date | null;
  periodStart?: string | Date | null;
  detectedAt?: string | Date | null;
  publishedAt?: string | Date | null;
  receivedAt?: string | Date | null;
  date?: string | Date | null;
  timestamp?: string | Date | null;
  eventType?: string;
  source?: string | null;
  sourceUrl?: string | null;
  sources?: any[] | null;
  sourceTrustTier?: string | null;
  isCumulative?: boolean;
  isAlertTriggered?: boolean;
  exchange?: string;
  headline?: string;
  isIntraday?: boolean;
  stockSymbol?: string;
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  const d = typeof val === 'string' ? new Date(val) : val;
  return isNaN(d.getTime()) ? null : d;
}

export function getExchangeTimeZone(exchange?: string): string {
  if (!exchange) {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  }
  const ex = exchange.toUpperCase();
  if (ex === 'NSE' || ex === 'BSE' || ex === 'IN' || ex === 'INDIA') {
    return 'Asia/Kolkata';
  }
  if (ex === 'NASDAQ' || ex === 'NYSE' || ex === 'US') {
    return 'America/New_York';
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function formatDayMonth(d: Date, includeWeekday: boolean = true): string {
  const weekday = SHORT_WEEKDAYS[d.getDay()];
  const day = d.getDate();
  const month = SHORT_MONTHS[d.getMonth()];
  return includeWeekday ? `${weekday} ${day} ${month}` : `${day} ${month}`;
}

export function formatTimeWithTz(d: Date, tz: string, includeWeekday: boolean = false): string {
  try {
    const weekdayStr = SHORT_WEEKDAYS[d.getDay()];
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(d);

    let day = '';
    let month = '';
    let hour = '';
    let minute = '';
    let dayPeriod = 'AM';

    for (const p of parts) {
      if (p.type === 'day') day = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
      if (p.type === 'dayPeriod') dayPeriod = p.value.toUpperCase();
    }

    const tzAbbr = tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' ? 'IST' : tz === 'America/New_York' ? 'EDT' : 'IST';
    const prefix = includeWeekday ? `${weekdayStr} ` : '';
    return `${prefix}${day} ${month}, ${hour}:${minute} ${dayPeriod} ${tzAbbr}`;
  } catch {
    return formatDayMonth(d, includeWeekday);
  }
}

/**
 * Main function to format event time on Attention Feed cards.
 */
export function formatEventTime(item: EventTimeContext, now: Date = new Date()): string {
  const tz = getExchangeTimeZone(item.exchange);

  // 1. Cumulative session move (since last visit)
  if (item.isCumulative && item.periodStart && item.occurredOn) {
    const start = parseDate(item.periodStart);
    const end = parseDate(item.occurredOn);
    if (start && end) {
      return `${formatDayMonth(start, true)} close -> ${formatDayMonth(end, true)} close`;
    }
  }

  // 2. Alert triggered
  if (item.isAlertTriggered) {
    const triggerDate = parseDate(item.detectedAt) || parseDate(item.occurredAt) || parseDate(item.timestamp) || now;
    return `Your alert · Triggered ${formatTimeWithTz(triggerDate, tz, true)}`;
  }

  // 3. Regulatory filing
  if (item.eventType === 'FILING') {
    const pubDate = parseDate(item.publishedAt) || parseDate(item.occurredAt) || now;
    const src = item.source || `${item.exchange || 'NSE'} filing`;
    return `${src} · Announced ${formatTimeWithTz(pubDate, tz, true)}`;
  }

  // 4. News publication
  if (item.eventType === 'NEWS') {
    const pubDate = parseDate(item.publishedAt) || parseDate(item.occurredAt) || now;
    const src = item.source || 'News';
    return `${src} · Published ${formatTimeWithTz(pubDate, tz, true)}`;
  }

  // 5. Intraday detection with delay notice
  if (item.isIntraday && item.detectedAt) {
    const detDate = parseDate(item.detectedAt) || now;
    return `Detected ${formatTimeWithTz(detDate, tz, false).replace(/^[^\d]+/, '')} · ${item.exchange || 'NSE'} data (~15 min delayed)`;
  }

  // 6. Occurred on completed market session
  if ((item.occurredOn || item.occurredAt || item.timestamp) && !item.isIntraday && !item.publishedAt && !item.detectedAt) {
    const occDate = parseDate(item.occurredOn) || parseDate(item.occurredAt) || parseDate(item.timestamp) || now;
    return `${formatDayMonth(occDate, true)} session · ${item.exchange || 'NSE'} data`;
  }

  // 7. General relative or formatted timestamp
  const eventDate =
    parseDate(item.publishedAt) ||
    parseDate(item.occurredAt) ||
    parseDate(item.occurredOn) ||
    parseDate(item.detectedAt) ||
    parseDate(item.timestamp) ||
    parseDate(item.date) ||
    now;

  const diffMs = Math.max(0, now.getTime() - eventDate.getTime());
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  if (diffMs < TWELVE_HOURS_MS) {
    if (diffMs < 60 * 1000) {
      return 'Just now';
    }
    if (diffMs < 60 * 60 * 1000) {
      const mins = Math.max(1, Math.floor(diffMs / (60 * 1000)));
      return `${mins} min ago`;
    }
    const hrs = Math.max(1, Math.floor(diffMs / (60 * 60 * 1000)));
    return `${hrs} hr ago`;
  }

  // >= 12 hours ago -> Format date + time
  return formatTimeWithTz(eventDate, tz, false);
}

/**
 * Resolves a reliable supporting website or financial quote URL for a feed item.
 */
export function getSupportingSourceUrl(item: {
  stockSymbol?: string;
  exchange?: string;
  sourceUrl?: string | null;
  sources?: any[] | null;
}): string {
  if (item.sourceUrl && typeof item.sourceUrl === 'string' && item.sourceUrl.startsWith('http')) {
    return item.sourceUrl;
  }
  if (Array.isArray(item.sources) && item.sources.length > 0) {
    const valid = item.sources.find((s) => s && typeof s.url === 'string' && s.url.startsWith('http'));
    if (valid) return valid.url;
  }
  const ex = (item.exchange || '').toUpperCase();
  const sym = (item.stockSymbol || '').trim().toUpperCase();
  if (ex === 'NSE' || ex === 'BSE' || ex === 'IN' || ex === 'INDIA' || sym.endsWith('.NS')) {
    const cleanSym = sym.replace('.NS', '');
    return `https://www.google.com/finance/quote/${encodeURIComponent(cleanSym)}:NSE`;
  }
  return `https://finance.yahoo.com/quote/${encodeURIComponent(sym || 'SPY')}`;
}

/**
 * Detailed tooltip string for auditing data provenance, publish time, and receipt time.
 */
export function formatEventTooltip(item: EventTimeContext): string {
  const occurred = parseDate(item.occurredAt) || parseDate(item.occurredOn) || parseDate(item.timestamp);
  const published = parseDate(item.publishedAt) || occurred;
  const received = parseDate(item.receivedAt) || parseDate(item.detectedAt) || parseDate(item.timestamp);
  const tz = getExchangeTimeZone(item.exchange);

  const lines: string[] = [];

  if (published) {
    lines.push(`Published: ${formatTimeWithTz(published, tz, true)}`);
  }

  if (received) {
    lines.push(`Received by us at ${formatTimeWithTz(received, tz, true)}`);
  }

  if (item.source) {
    lines.push(`Source: ${item.source} (${item.sourceTrustTier || 'VERIFIED'})`);
  }

  return lines.join(' · ');
}
