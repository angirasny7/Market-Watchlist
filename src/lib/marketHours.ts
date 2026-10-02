/**
 * Calculates current NSE (National Stock Exchange of India) status.
 * Trading hours: Monday – Friday, 09:15 to 15:30 IST (UTC+5:30).
 */
export function getNseMarketStatus(): { isOpen: boolean; label: string; subtext: string } {
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
  const isMarketOpenTime = totalMinutes >= 555 && totalMinutes <= 930;

  if (!isWeekend && isMarketOpenTime) {
    return {
      isOpen: true,
      label: 'Market Open',
      subtext: 'NSE • 09:15 – 15:30 IST',
    };
  }

  return {
    isOpen: false,
    label: 'Market Closed',
    subtext: isWeekend ? 'Weekend • Opens Mon 09:15 IST' : 'Opens 09:15 IST',
  };
}
