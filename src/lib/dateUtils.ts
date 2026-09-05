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
 * Generates a human-friendly session summary string.
 * Example: "First Login Session" or "Last active: 2 hours ago"
 */
export function formatSessionSummary(timestamp?: string | Date | null): string {
  if (isFirstLoginSession(timestamp)) {
    return 'First Login Session';
  }
  return `Last active: ${formatRelativeTime(timestamp)}`;
}

