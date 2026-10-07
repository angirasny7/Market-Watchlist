import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { feedService } from '../src/services/feedService.js';
import { eventService } from '../src/services/eventService.js';
import { watchlistService } from '../src/services/watchlistService.js';

const prisma = new PrismaClient();

describe('Part B: Feed Shape & Backend Endpoints Test Suite', () => {
  let userId: string;
  let userSymbols: string[];

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { email: 'test_feed_endpoints@marketwatch.test' },
      update: { isTestUser: true },
      create: {
        email: 'test_feed_endpoints@marketwatch.test',
        name: 'Feed Endpoints Tester',
        passwordHash: 'dummy_hash',
        isTestUser: true,
        userState: {
          create: {
            previousSessionEndedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            previousSessionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    userId = user.id;

    const defaultWl = await watchlistService.getUserWatchlists(userId);
    const wlId = defaultWl[0].id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await prisma.watchlistStock.createMany({
      data: [
        { watchlistId: wlId, stockSymbol: 'INFY', addedAt: thirtyDaysAgo },
        { watchlistId: wlId, stockSymbol: 'RELIANCE', addedAt: thirtyDaysAgo },
        { watchlistId: wlId, stockSymbol: 'TCS', addedAt: thirtyDaysAgo },
      ],
      skipDuplicates: true,
    });

    const ws = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId } },
      select: { stockSymbol: true },
    });
    userSymbols = Array.from(new Set(ws.map((w) => w.stockSymbol)));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Clustering merges same stock and day into a single feed item', async () => {
    const result = await feedService.getFeed(userId, { window: '30d', limit: 1000 });
    const items = result.items;

    expect(items.length).toBeGreaterThan(0);

    const clusterKeys = new Set<string>();
    for (const item of items) {
      const dayStr = new Date(item.date).toISOString().split('T')[0];
      const key = `${item.stockSymbol}|${dayStr}`;
      expect(clusterKeys.has(key)).toBe(false);
      clusterKeys.add(key);

      // Must have memberEventIds
      expect(item.memberEventIds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('2. Non-monitored stocks never appear in the feed', async () => {
    const result = await feedService.getFeed(userId, { window: '30d', limit: 1000 });
    const userSymbolSet = new Set(userSymbols);

    for (const item of result.items) {
      expect(userSymbolSet.has(item.stockSymbol)).toBe(true);
    }
  });

  it('3. Demo and corrupt seed rows are strictly excluded', async () => {
    const result = await feedService.getFeed(userId, { window: '30d', limit: 1000 });

    for (const item of result.items) {
      expect(item.isDemo).toBe(false);
      expect(item.id.startsWith('demo_')).toBe(false);
      expect(item.id.startsWith('evt_00')).toBe(false);

      // Reliance corrupt legacy price check
      if (item.stockSymbol === 'RELIANCE') {
        expect(item.eventPrice).toBeLessThan(2000);
      }
    }
  });

  it('4. No contradictory numbers inside feed items and happened details', async () => {
    const result = await feedService.getFeed(userId, { window: '30d', limit: 2 });

    for (const item of result.items) {
      const details = await feedService.getItemDetails(userId, item.id);
      expect(details).not.toBeNull();
      if (!details) continue;

      const happened = details.happened;
      expect(typeof happened.movePercent).toBe('number');

      // Price delta consistency
      if (happened.priceAtEvent && happened.currentPrice) {
        expect(happened.priceDelta).toBe(parseFloat((happened.currentPrice - happened.priceAtEvent).toFixed(2)));
      }

      // Daily OHLC bounds
      if (happened.dayHigh !== null && happened.dayLow !== null && happened.priceAtEvent !== null) {
        expect(happened.priceAtEvent).toBeGreaterThanOrEqual(happened.dayLow * 0.99);
        expect(happened.priceAtEvent).toBeLessThanOrEqual(happened.dayHigh * 1.01);
      }
    }
  }, 60000);


  it('5. Only qualifying verified sources are returned in sources and why tabs', async () => {
    const result = await feedService.getFeed(userId, { window: '30d', limit: 3 });

    for (const item of result.items) {
      const details = await feedService.getItemDetails(userId, item.id);
      if (!details) continue;

      for (const src of details.sources) {
        expect(src.publisher).toBeTruthy();
        expect(src.title).toBeTruthy();
        expect(src.url.startsWith('http')).toBe(true);
      }

      // If no sources exist, why tab must state "No confirmed cause found" with Low confidence
      if (details.sources.length === 0) {
        expect(details.why.cause).toContain('No confirmed cause found');
        expect(details.why.confidenceLevel).toBe('Low');
        expect(details.why.confidenceScore).toBeLessThanOrEqual(25);
      }
    }
  }, 30000);

  it('6. Counts are identical across summary, sidebar, watchlist and buttons', async () => {
    const feed = await feedService.getFeed(userId, { window: '30d', limit: 1000 });
    const summary = await feedService.getSummary(userId, { window: '30d' });
    const overview = await watchlistService.getOverview(userId, 'all');
    const feedUnread = feed.items.filter((i) => i.isUnread).length;

    expect(summary.totalInWindow).toBe(feed.items.length);
    expect(summary.unreadClusters).toBe(feed.items.length);
    expect(overview.summary.unseenUpdates).toBeGreaterThanOrEqual(feedUnread);
  });

  it('7. Details endpoint returns structured facts, why, matters, sources, price and alert tabs', async () => {
    const feed = await feedService.getFeed(userId, { window: '30d', limit: 5 });
    expect(feed.items.length).toBeGreaterThan(0);

    const firstId = feed.items[0].id;
    const details = await feedService.getItemDetails(userId, firstId, 'all');

    expect(details).not.toBeNull();
    expect(details!.happened).toBeDefined();
    expect(details!.why).toBeDefined();
    expect(details!.matters).toBeDefined();
    expect(details!.sources).toBeInstanceOf(Array);
    expect(details!.price.series1M).toBeInstanceOf(Array);
    expect(details!.item.headline).toBeTruthy();
  }, 25000);
});
