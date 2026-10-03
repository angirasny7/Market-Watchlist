/**
 * Calculates current NSE (National Stock Exchange of India) status.
 * Trading hours: Monday – Friday, 09:15 to 15:30 IST (UTC+5:30).
 */
export function getNseMarketStatus(): { isOpen: boolean; label: string; subtext: string } {
  return getExchangeMarketStatus('NSE');
}

type ExchangeGroup = 'IN' | 'US';

export interface ExchangeStatus {
  isOpen: boolean;
  label: string;
  subtext: string;
  exchange: string;
  group: ExchangeGroup;
}

/**
 * Get market status for a specific exchange.
 */
export function getExchangeMarketStatus(exchange: string): ExchangeStatus {
  const upper = (exchange || '').toUpperCase();
  const group: ExchangeGroup = (upper === 'NSE' || upper === 'BSE') ? 'IN' : 'US';

  if (group === 'IN') {
    return getIndianMarketStatus(upper);
  }
  return getUsMarketStatus(upper);
}

/**
 * Get a compact multi-exchange status string for the header.
 * Only shows statuses for exchanges the user's stocks belong to.
 */
export function getMultiExchangeStatus(exchanges: string[]): { parts: ExchangeStatus[]; summary: string } {
  const uniqueExchanges = [...new Set(exchanges.map(e => (e || '').toUpperCase()))].filter(Boolean);

  if (uniqueExchanges.length === 0) {
    return { parts: [], summary: 'No stocks' };
  }

  // Deduplicate by group (IN exchanges share the same hours, US exchanges share the same hours)
  const seenGroups = new Set<ExchangeGroup>();
  const parts: ExchangeStatus[] = [];

  for (const ex of uniqueExchanges) {
    const status = getExchangeMarketStatus(ex);
    if (!seenGroups.has(status.group)) {
      seenGroups.add(status.group);
      parts.push(status);
    }
  }

  const summary = parts
    .map(p => `${p.exchange} ${p.isOpen ? 'Open' : 'Closed'}`)
    .join(' · ');

  return { parts, summary };
}

/**
 * Check if a given exchange is currently open.
 */
export function isExchangeOpen(exchange: string): boolean {
  return getExchangeMarketStatus(exchange).isOpen;
}

// ── Internal helpers ──

export const NSE_HOLIDAY_MAP: Record<string, string> = {
  '2026-01-26': 'Republic Day',
  '2026-02-17': 'Mahashivratri',
  '2026-03-03': 'Holi',
  '2026-03-20': 'Id-Ul-Fitr',
  '2026-03-27': 'Shri Ram Navami',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Ambedkar Jayanti',
  '2026-05-01': 'Maharashtra Day',
  '2026-05-27': 'Bakri Id',
  '2026-08-15': 'Independence Day',
  '2026-09-14': 'Ganesh Chaturthi',
  '2026-10-02': 'Mahatma Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-08': 'Diwali (Laxmi Pujan)',
  '2026-11-24': 'Gurunanak Jayanti',
  '2026-12-25': 'Christmas',
};

function getIndianMarketStatus(exchange: string): ExchangeStatus {
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
  const holidayName = NSE_HOLIDAY_MAP[dateKey];
  const isHoliday = Boolean(holidayName);

  // NSE/BSE: 09:15 (555 min) to 15:30 (930 min) IST
  const isMarketOpenTime = totalMinutes >= 555 && totalMinutes <= 930;

  if (!isWeekend && !isHoliday && isMarketOpenTime) {
    return {
      isOpen: true,
      label: `${exchange} Open`,
      subtext: `${exchange} • 09:15 – 15:30 IST`,
      exchange,
      group: 'IN',
    };
  }

  let subtext = `Opens 09:15 IST`;
  if (isWeekend) {
    subtext = `Weekend • Opens Mon 09:15 IST`;
  } else if (isHoliday) {
    subtext = `Holiday (${holidayName}) • Opens next trading day`;
  }

  return {
    isOpen: false,
    label: `${exchange} Closed`,
    subtext,
    exchange,
    group: 'IN',
  };
}

function getUsMarketStatus(exchange: string): ExchangeStatus {
  const label = exchange || 'US';
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
  // NYSE/NASDAQ: 09:30 (570 min) to 16:00 (960 min) ET
  const isMarketOpenTime = totalMinutes >= 570 && totalMinutes <= 960;

  if (!isWeekend && isMarketOpenTime) {
    return {
      isOpen: true,
      label: `${label} Open`,
      subtext: `${label} • 09:30 – 16:00 ET`,
      exchange: label,
      group: 'US',
    };
  }

  return {
    isOpen: false,
    label: `${label} Closed`,
    subtext: isWeekend ? `Weekend • Opens Mon 09:30 ET` : `Opens 09:30 ET`,
    exchange: label,
    group: 'US',
  };
}
