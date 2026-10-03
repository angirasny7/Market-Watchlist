/**
 * Date and Time Formatting Utilities
 * 
 * Supports user activity tracking, localized session timestamps,
 * human-readable relative duration calculations, and user timezone presentation.
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
 * Formats a user login timestamp into the user's local timezone.
 * Example output: "Sep 4, 2026 • 10:42 PM IST"
 * Returns "First Login Session" if no previous login exists.
 */
export function formatLastActiveTimestamp(timestamp?: string | Date | null): string {
  if (!timestamp) {
    return 'First Login Session';
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) {
    return 'First Login Session';
  }

  // Use user's local timezone and locale
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });

  return `${datePart} • ${timePart}`;
}

/**
 * Computes human-readable relative time from a timestamp to now.
 * Supports compact mode (e.g. "2h ago", "15m ago", "1d ago") and expanded mode (e.g. "2 hours ago").
 */
export function formatRelativeTime(
  timestamp?: string | Date | null,
  compact: boolean = false
): string {
  if (!timestamp) {
    return 'Just now';
  }

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(date.getTime())) {
    return 'Just now';
  }

  const elapsedMs = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(elapsedMs / (60 * 1000));
  const hours = Math.floor(elapsedMs / (60 * 60 * 1000));
  const days = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

  if (compact) {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/**
 * Formats user absence / last visit into a clear, natural English label (F0.7)
 * Examples:
 * - New / missing session: "Welcome! Here's what we're tracking"
 * - 2 hours ago: "Last visit 2 hours ago"
 * - 2 days ago: "Last visit 2 days ago (Tuesday)"
 * - 19 days ago: "Last visit 19 days ago (14 Sep)"
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

/**
 * Generates a human-friendly session summary string.
 */
export function formatSessionSummary(timestamp?: string | Date | null): string {
  if (isFirstLoginSession(timestamp)) {
    return "Welcome! Here's what we're tracking";
  }
  return formatLastVisitLabel(timestamp);
}

