import { describe, it, expect } from 'vitest';
import {
  isExchangeTradingDay,
  getExchangeHoliday,
  getLatestCompletedTradingDate,
} from '../../data/tradingCalendar2026';
import { formatEventTime } from '../formatEventTime';

describe('Trading Calendar & Exchange Holidays 2026 (Part C & B)', () => {
  it('1. Weekend detection: Saturday and Sunday are non-trading days for both NSE and US exchanges', () => {
    const saturday = new Date('2026-10-03T10:00:00.000Z');
    const sunday = new Date('2026-10-04T10:00:00.000Z');

    expect(isExchangeTradingDay('NSE', saturday)).toBe(false);
    expect(isExchangeTradingDay('NASDAQ', saturday)).toBe(false);

    expect(isExchangeTradingDay('NSE', sunday)).toBe(false);
    expect(isExchangeTradingDay('NYSE', sunday)).toBe(false);
  });

  it('2. Oct 2 2026: NSE is closed (Mahatma Gandhi Jayanti) while NASDAQ is open', () => {
    // 2026-10-02 at 14:00 UTC (10:00 AM EDT, 7:30 PM IST)
    const oct2 = new Date('2026-10-02T14:00:00.000Z');

    // NSE Holiday check
    const nseHoliday = getExchangeHoliday('NSE', oct2);
    expect(nseHoliday).not.toBeNull();
    expect(nseHoliday?.name).toBe('Mahatma Gandhi Jayanti');
    expect(isExchangeTradingDay('NSE', oct2)).toBe(false);

    // US Exchanges are OPEN on 2 Oct 2026
    const usHoliday = getExchangeHoliday('NASDAQ', oct2);
    expect(usHoliday).toBeNull();
    expect(isExchangeTradingDay('NASDAQ', oct2)).toBe(true);
  });

  it('3. US Holiday (Memorial Day 25 May 2026): US is closed while NSE is open', () => {
    const memorialDay = new Date('2026-05-25T10:00:00.000Z');

    // US Holiday check
    const usHoliday = getExchangeHoliday('NYSE', memorialDay);
    expect(usHoliday).not.toBeNull();
    expect(usHoliday?.name).toBe('Memorial Day');
    expect(isExchangeTradingDay('NYSE', memorialDay)).toBe(false);

    // NSE is OPEN on 25 May 2026
    const nseHoliday = getExchangeHoliday('NSE', memorialDay);
    expect(nseHoliday).toBeNull();
    expect(isExchangeTradingDay('NSE', memorialDay)).toBe(true);
  });

  it('4. Cumulative "since last visit" formats baseline and end close dates', () => {
    const baseline = new Date('2026-10-01T10:00:00.000Z'); // Thu 1 Oct
    const end = new Date('2026-10-02T10:00:00.000Z');      // Fri 2 Oct

    const result = formatEventTime({
      periodStart: baseline,
      occurredOn: end,
      isCumulative: true,
      exchange: 'NSE',
    });

    expect(result).toBe('Thu 1 Oct close -> Fri 2 Oct close');
  });

  it('5. Single-session move on weekend shows actual last completed trading date, NEVER "Today close"', () => {
    const saturday = new Date('2026-10-03T12:00:00.000Z');
    const fridayClose = new Date('2026-10-02T10:00:00.000Z');

    const result = formatEventTime(
      {
        occurredOn: fridayClose,
        exchange: 'NSE',
      },
      saturday
    );

    expect(result).toBe('Fri 2 Oct session · NSE data');
  });

  it('6. Latest completed trading date calculation', () => {
    const saturday = new Date('2026-10-03T12:00:00.000Z');
    const latestNse = getLatestCompletedTradingDate('NSE', saturday);

    // On Saturday 3 Oct, previous completed NSE trading date is Thu 1 Oct (since Fri 2 Oct was Gandhi Jayanti)
    expect(isExchangeTradingDay('NSE', latestNse)).toBe(true);
  });
});
