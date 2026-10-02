import { CorporateEventType } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface UpcomingEventSummary {
  type: string;
  date: string;
  label: string;
  daysAway: number;
  isDemo: boolean;
}

export class CorporateEventService {
  /**
   * Seeds realistic demo corporate events only when NODE_ENV=development AND SEED_DEMO_EVENTS=true.
   * Auto-seeded demo events have isDemo=true.
   * In production or when SEED_DEMO_EVENTS is not set, no demo events are created.
   */
  async ensureSeedCorporateEvents(): Promise<void> {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    const seedDemo = process.env.SEED_DEMO_EVENTS === 'true';

    if (!isDev || !seedDemo) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.corporateEvent.count({
      where: { eventDate: { gte: today } },
    });

    if (count >= 3) return;

    // Check available stocks in database to attach events to
    const availableStocks = await prisma.stock.findMany({
      select: { symbol: true, companyName: true },
      take: 10,
    });

    if (availableStocks.length === 0) return;

    const symbolSet = new Set(availableStocks.map((s) => s.symbol));
    const findStock = (sym: string) =>
      symbolSet.has(sym) ? sym : availableStocks[0].symbol;

    const sampleEvents: Array<{
      symbol: string;
      type: CorporateEventType;
      daysOffset: number;
      title: string;
      details: string;
    }> = [
      {
        symbol: findStock('INFY.NS'),
        type: 'EARNINGS',
        daysOffset: 2,
        title: 'Q2 Financial Results & Guidance',
        details: 'Board meeting to approve Q2 FY26 audited financial results and interim dividend.',
      },
      {
        symbol: findStock('TCS.NS'),
        type: 'EX_DIVIDEND',
        daysOffset: 3,
        title: 'Interim Dividend Ex-Date (₹12.00)',
        details: 'Record date for declaration of second interim dividend of ₹12 per equity share.',
      },
      {
        symbol: findStock('RELIANCE.NS'),
        type: 'AGM',
        daysOffset: 7,
        title: 'Annual General Meeting',
        details: '48th Annual General Meeting of Reliance Industries Limited via VC/OAVM.',
      },
      {
        symbol: findStock('HDFCBANK.NS'),
        type: 'EARNINGS',
        daysOffset: 10,
        title: 'Q2 Earnings Conference Call',
        details: 'Audited standalone and consolidated quarterly results conference call with analysts.',
      },
      {
        symbol: findStock('TATAMOTORS.NS'),
        type: 'SPLIT',
        daysOffset: 13,
        title: 'Demerger & Share Capital Reorganization',
        details: 'Implementation update regarding passenger and commercial vehicles demerger scheme.',
      },
    ];

    for (const item of sampleEvents) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + item.daysOffset);
      eventDate.setHours(10, 30, 0, 0);

      // Check if duplicate exists for symbol and date
      const existing = await prisma.corporateEvent.findFirst({
        where: {
          stockSymbol: item.symbol,
          eventType: item.type,
          eventDate: {
            gte: new Date(eventDate.getTime() - 24 * 60 * 60 * 1000),
            lte: new Date(eventDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!existing) {
        await prisma.corporateEvent.create({
          data: {
            stockSymbol: item.symbol,
            eventType: item.type,
            eventDate,
            title: item.title,
            details: item.details,
            isDemo: true,
          },
        });
      }
    }
  }

  /**
   * Retrieves earliest upcoming event for each specified stock symbol.
   * In production, never returns demo-seeded dates.
   * If the provider has no data for a stock, shows nothing (no invented dates).
   */
  async getEarliestUpcomingEventsBySymbol(
    symbols: string[]
  ): Promise<Map<string, UpcomingEventSummary>> {
    const eventMap = new Map<string, UpcomingEventSummary>();
    if (symbols.length === 0) return eventMap;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    const allowDemo = isDev && process.env.SEED_DEMO_EVENTS === 'true';

    const events = await prisma.corporateEvent.findMany({
      where: {
        stockSymbol: { in: symbols },
        eventDate: { gte: startOfToday },
        ...(allowDemo ? {} : { isDemo: false }),
      },
      orderBy: { eventDate: 'asc' },
    });

    for (const ev of events) {
      if (!eventMap.has(ev.stockSymbol)) {
        const diffMs = ev.eventDate.getTime() - Date.now();
        const daysAway = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        let shortLabel = ev.title;
        if (ev.eventType === 'EARNINGS') {
          shortLabel = daysAway <= 3 ? `Earnings in ${daysAway}d` : 'Earnings';
        } else if (ev.eventType === 'DIVIDEND') {
          shortLabel = daysAway <= 3 ? `Div in ${daysAway}d` : 'Dividend';
        } else if (ev.eventType === 'EX_DIVIDEND') {
          shortLabel = daysAway <= 3 ? `Ex-Div in ${daysAway}d` : 'Ex-Dividend';
        } else if (ev.eventType === 'SPLIT') {
          shortLabel = daysAway <= 3 ? `Split in ${daysAway}d` : 'Stock Split';
        } else if (ev.eventType === 'AGM') {
          shortLabel = daysAway <= 3 ? `AGM in ${daysAway}d` : 'AGM';
        }

        eventMap.set(ev.stockSymbol, {
          type: ev.eventType,
          date: ev.eventDate.toISOString(),
          label: shortLabel,
          daysAway,
          isDemo: ev.isDemo,
        });
      }
    }

    return eventMap;
  }
}

export const corporateEventService = new CorporateEventService();
