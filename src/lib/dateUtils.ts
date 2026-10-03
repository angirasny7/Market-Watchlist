/**
 * Date and Time Formatting Utilities
 * 
 * Supports user activity tracking, localized session timestamps,
 * human-readable relative duration calculations with server clock offset,
 * and user timezone presentation.
 */

/**
 * Checks whether the user is in their first-ever login session.
 */
export function isFirstLoginSession(previousLoginAt?: string | Date | null): boolean {
  if (!previousLoginAt) return true;
  const d = typeof previousLoginAt === 'string' ? new Date(previousLoginAt) : previousLoginAt;
  return isNaN(d.getTime());
}

/**
 * Resolves the user's preferred time zone or defaults to system Intl time zone.
 */
export function getUserTimeZone(overrideTz?: string): string {
  if (overrideTz) return overrideTz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

/**
 * Resolves short timezone abbreviation (e.g., IST, EDT, PDT, UTC, GMT).
 */
export function getTimeZoneAbbreviation(date: Date, timeZone?: string): string {
  const tz = timeZone || getUserTimeZone();
  const KNOWN_TZ_ABBR: Record<string, string> = {
    'Asia/Kolkata': 'IST',
    'Asia/Calcutta': 'IST',
    'UTC': 'UTC',
    'GMT': 'GMT',
  };

  if (KNOWN_TZ_ABBR[tz]) {
    return KNOWN_TZ_ABBR[tz];
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : tz;
  } catch {
    return 'IST';
  }
}


/**
 * Formats a user login timestamp into the user's local timezone.
 * Example output: "Sep 4, 2026 • 10:42 PM IST"
 */
export function formatLastActiveTimestamp(
  timestamp?: string | Date | null,
  timeZone?: string
): string {
  if (!timestamp) {
    return 'First Login Session';
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) {
    return 'First Login Session';
  }

  const tz = getUserTimeZone(timeZone);

  const datePart = date.toLocaleDateString('en-US', {
    timeZone: tz,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timePart = date.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const tzAbbr = getTimeZoneAbbreviation(date, tz);

  return `${datePart} • ${timePart} ${tzAbbr}`;
}

/**
 * Computes human-readable relative time from a timestamp to now,
 * accounting for server clock skew offset.
 */
export function formatRelativeTime(
  timestamp?: string | Date | null,
  compact: boolean = false,
  serverNowOffsetMs: number = 0
): string {
  if (!timestamp) {
    return 'Just now';
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) {
    return 'Just now';
  }

  // Adjust reference now by server clock offset
  const effectiveNow = Date.now() + serverNowOffsetMs;
  const elapsedMs = Math.max(0, effectiveNow - date.getTime());
  const minutes = Math.floor(elapsedMs / (60 * 1000));
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  const days = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

  if (compact) {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/**
 * Shared formatter for Attention Feed session strip & session popover.
 * 
 * Rules:
 * - Brand-new user: "Welcome! Here's what we're tracking"
 * - Normal logout: "Last visit ended: Sat 3 Oct, 6:00 PM IST · (16 hours ago)"
 * - Tab closed / inactivity: "Last active: Sat 3 Oct, 5:52 PM IST · (16 hours ago)"
 */
export function formatVisitTime(options: {
  timestamp?: string | Date | null;
  endReason?: 'logout' | 'inactivity' | 'tab_closed' | string | null;
  timeZone?: string;
  serverNowOffsetMs?: number;
}): {
  label: string;
  prefix: string;
  formattedDate: string;
  relative: string;
  timeZoneAbbr: string;
  isNewUser: boolean;
} {
  const { timestamp, endReason, timeZone, serverNowOffsetMs = 0 } = options;

  if (!timestamp) {
    return {
      label: "Welcome! Here's what we're tracking",
      prefix: 'Welcome',
      formattedDate: '',
      relative: '',
      timeZoneAbbr: '',
      isNewUser: true,
    };
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) {
    return {
      label: "Welcome! Here's what we're tracking",
      prefix: 'Welcome',
      formattedDate: '',
      relative: '',
      timeZoneAbbr: '',
      isNewUser: true,
    };
  }

  const tz = getUserTimeZone(timeZone);
  const weekday = date.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
  const day = date.toLocaleDateString('en-US', { timeZone: tz, day: 'numeric' });
  const month = date.toLocaleDateString('en-US', { timeZone: tz, month: 'short' });
  const time = date.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
  const tzAbbr = getTimeZoneAbbreviation(date, tz);
  const relative = formatRelativeTime(date, false, serverNowOffsetMs);

  const prefix = endReason === 'logout' ? 'Last visit ended' : 'Last active';
  const formattedDate = `${weekday} ${day} ${month}, ${time} ${tzAbbr}`;
  const label = `${prefix}: ${formattedDate} · (${relative})`;

  return {
    label,
    prefix,
    formattedDate,
    relative,
    timeZoneAbbr: tzAbbr,
    isNewUser: false,
  };
}

/**
 * Formats user absence / last visit into a clear label
 */
export function formatLastVisitLabel(timestamp?: string | Date | null): string {
  if (!timestamp) {
    return "Welcome! Here's what we're tracking";
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) {
    return "Welcome! Here's what we're tracking";
  }

  const now = Date.now();
  const elapsedMs = Math.max(0, now - date.getTime());
  const minutes = Math.floor(elapsedMs / (60 * 1000));
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  const days = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

  if (minutes < 1) {
    return 'Last visit just now';
  }
  if (minutes < 60) {
    return `Last visit ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  if (hours < 24) {
    return `Last visit ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (days === 1) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `Last visit 1 day ago (${dayOfWeek})`;
  }
  if (days < 7) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `Last visit ${days} days ago (${dayOfWeek})`;
  }
  const dayNum = date.getDate();
  const monthShort = date.toLocaleDateString('en-US', { month: 'short' });
  return `Last visit ${days} days ago (${dayNum} ${monthShort})`;
}

export function formatSessionSummary(timestamp?: string | Date | null): string {
  if (isFirstLoginSession(timestamp)) {
    return "Welcome! Here's what we're tracking";
  }
  return formatLastVisitLabel(timestamp);
}

export function formatSessionStripTime(
  timestamp?: string | Date | null,
  endReason?: string | null,
  timeZone?: string,
  serverNowOffsetMs: number = 0
): string {
  return formatVisitTime({ timestamp, endReason, timeZone, serverNowOffsetMs }).label;
}

export function formatWindowBaseline(timestamp?: string | Date | null, timeZone?: string): string {
  if (!timestamp) return '';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) return '';

  const tz = getUserTimeZone(timeZone);
  const weekday = date.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });
  const day = date.toLocaleDateString('en-US', { timeZone: tz, day: 'numeric' });
  const month = date.toLocaleDateString('en-US', { timeZone: tz, month: 'short' });
  const time = date.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });

  return `${weekday} ${day} ${month}, ${time}`;
}
