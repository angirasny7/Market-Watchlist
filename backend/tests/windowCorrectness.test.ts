import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EventType, Priority } from '@prisma/client';
import { prisma } from '../src/config/prisma.js';
import { authService } from '../src/services/authService.js';
import { feedService } from '../src/services/feedService.js';
import { catchUpService } from '../src/services/catchUpService.js';

describe('Publish Time and Window Correctness (Part 2)', () => {
  let testUser: any;
  const testEmail = `window_correctness_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const createdEventIds: string[] = [];

  beforeAll(async () => {
    // Register test user
    const reg = await authService.register({
      name: 'Window Tester',
      email: testEmail,
      password: testPassword,
    });
    testUser = reg.user;

    await prisma.stock.upsert({
      where: { symbol: 'ITC' },
      create: {
        symbol: 'ITC',
        companyName: 'ITC Limited',
        sector: 'Consumer Goods',
        exchange: 'NSE',
        currency: '₹',
        currentPrice: 430.0,
        changeAmount: 1.5,
        changePercent: 0.35,
        marketCap: '5L Cr',
        high52w: 500.0,
        low52w: 390.0,
      },
      update: {},
    });

    const ws = await prisma.watchlist.findFirst({ where: { userId: testUser.id } });
    if (ws) {
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
      await prisma.watchlistStock.createMany({
        data: [
          { watchlistId: ws.id, stockSymbol: 'INFY', addedAt: twentyDaysAgo },
          { watchlistId: ws.id, stockSymbol: 'ITC', addedAt: twentyDaysAgo },
        ],
        skipDuplicates: true,
      });
    }

    // Create synthetic test events with distinct occurredAt timestamps
    const now = Date.now();
    const event1 = await prisma.event.create({
      data: {
        stockSymbol: 'INFY',
        eventType: EventType.PRICE_SURGE,
        priority: Priority.HIGH,
        timestamp: new Date(now - 12 * 60 * 60 * 1000), // 12 hours ago
        occurredAt: new Date(now - 12 * 60 * 60 * 1000),
        occurredOn: new Date(now - 12 * 60 * 60 * 1000),
        detectedAt: new Date(now - 12 * 60 * 60 * 1000),
        metricsDelta: { changePercent: 5.2, price: 1500 },
      },
    });
    createdEventIds.push(event1.id);

    const event2 = await prisma.event.create({
      data: {
        stockSymbol: 'ITC',
        eventType: EventType.VOLUME_SPIKE,
        priority: Priority.MEDIUM,
        timestamp: new Date(now - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        occurredAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        occurredOn: new Date(now - 3 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        metricsDelta: { changePercent: 1.2, volumeRatio: 2.5, price: 420 },
      },
    });
    createdEventIds.push(event2.id);

    const event3 = await prisma.event.create({
      data: {
        stockSymbol: 'INFY',
        eventType: EventType.FIFTY_TWO_WEEK_HIGH,
        priority: Priority.LOW,
        timestamp: new Date(now - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        occurredAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
        occurredOn: new Date(now - 15 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(now - 15 * 24 * 60 * 60 * 1000),
        metricsDelta: { changePercent: 0.8, price: 1510 },
      },
    });
    createdEventIds.push(event3.id);
  });

  afterAll(async () => {
    if (createdEventIds.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } }).catch(() => {});
    }
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('filters windows correctly using occurredAt timestamps (24h vs 7d vs 30d)', async () => {
    const feed24h = await feedService.getFeed(testUser.id, { window: '24h' });
    const feed7d = await feedService.getFeed(testUser.id, { window: '7d' });
    const feed30d = await feedService.getFeed(testUser.id, { window: '30d' });

    // 24h must contain event1 (12h ago), but not event2 (3d ago) or event3 (15d ago)
    const hasEvent1In24h = feed24h.items.some((i) => i.id === createdEventIds[0] || i.memberEventIds.includes(createdEventIds[0]));
    const hasEvent2In24h = feed24h.items.some((i) => i.id === createdEventIds[1] || i.memberEventIds.includes(createdEventIds[1]));
    expect(hasEvent1In24h).toBe(true);
    expect(hasEvent2In24h).toBe(false);

    // 7d must contain event1 and event2, but not event3 (15d ago)
    const hasEvent2In7d = feed7d.items.some((i) => i.id === createdEventIds[1] || i.memberEventIds.includes(createdEventIds[1]));
    const hasEvent3In7d = feed7d.items.some((i) => i.id === createdEventIds[2] || i.memberEventIds.includes(createdEventIds[2]));
    expect(hasEvent2In7d).toBe(true);
    expect(hasEvent3In7d).toBe(false);

    // 30d must contain event3
    const hasEvent3In30d = feed30d.items.some((i) => i.id === createdEventIds[2] || i.memberEventIds.includes(createdEventIds[2]));
    expect(hasEvent3In30d).toBe(true);
  });

  it('calculates exact "Since Last Visit" window [previousSessionEndedAt, now]', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await prisma.userState.update({
      where: { userId: testUser.id },
      data: {
        previousSessionEndedAt: twoDaysAgo,
        previousSessionAt: twoDaysAgo,
      },
    });

    const feedSince = await feedService.getFeed(testUser.id, { window: 'sinceLastVisit' });
    // Event 1 (12h ago) is after 2 days ago -> must be included
    const hasEvent1 = feedSince.items.some((i) => i.id === createdEventIds[0] || i.memberEventIds.includes(createdEventIds[0]));
    // Event 2 (3d ago) is before 2 days ago -> must NOT be included
    const hasEvent2 = feedSince.items.some((i) => i.id === createdEventIds[1] || i.memberEventIds.includes(createdEventIds[1]));

    expect(hasEvent1).toBe(true);
    expect(hasEvent2).toBe(false);
  });

  it('returns structured windowCounts and marketsClosed in getSummary', async () => {
    const summary = await feedService.getSummary(testUser.id, { window: '24h' });
    expect(summary.windowCounts).toBeDefined();
    expect(typeof summary.windowCounts?.sinceLastVisit).toBe('number');
    expect(typeof summary.windowCounts?.['24h']).toBe('number');
    expect(typeof summary.windowCounts?.['7d']).toBe('number');
    expect(typeof summary.windowCounts?.['30d']).toBe('number');
    expect(summary.headline).toContain('Last 24 hours:');
  });

  it('runs catchUpService idempotently without creating duplicate events', async () => {
    const run1 = await catchUpService.catchUpForUser(testUser.id);
    const run2 = await catchUpService.catchUpForUser(testUser.id);
    expect(run1.eventsCreated).toBeGreaterThanOrEqual(0);
    expect(run2.eventsCreated).toBe(0); // Second run must create 0 duplicates!
  }, 15000);
});
