import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, EventType, Priority } from '@prisma/client';
import { authService } from '../src/services/authService.js';
import { watchlistService } from '../src/services/watchlistService.js';
import { feedService } from '../src/services/feedService.js';
import { alertService } from '../src/services/alertService.js';
import { notificationService } from '../src/services/notificationService.js';
import { digestService } from '../src/services/digestService.js';
import { eventService } from '../src/services/eventService.js';

const prisma = new PrismaClient();

describe('Multi-User Isolation & Ownership Verification Suite', () => {
  let userA: { id: string; email: string; defaultWatchlistId: string };
  let userB: { id: string; email: string; defaultWatchlistId: string };
  let testEventId: string;
  let userACumulativeEventId: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // 1. Register User A
    const regA = await authService.register({
      name: 'User Alpha',
      email: `multi_a_${timestamp}@test.com`,
      password: 'Password123!@#',
    });
    userA = {
      id: regA.user.id,
      email: regA.user.email,
      defaultWatchlistId: regA.defaultWatchlistId!,
    };

    // 2. Register User B
    const regB = await authService.register({
      name: 'User Beta',
      email: `multi_b_${timestamp}@test.com`,
      password: 'Password123!@#',
    });
    userB = {
      id: regB.user.id,
      email: regB.user.email,
      defaultWatchlistId: regB.defaultWatchlistId!,
    };

    // 3. Ensure master stock records exist
    await prisma.stock.upsert({
      where: { symbol: 'INFY' },
      update: { currentPrice: 1500, changePercent: 1.5 },
      create: {
        symbol: 'INFY',
        companyName: 'Infosys Ltd',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 1500,
        changeAmount: 22.5,
        changePercent: 1.5,
        high52w: 1900,
        low52w: 1300,
        marketCap: '₹6.2T',
      },
    });

    await prisma.stock.upsert({
      where: { symbol: 'TCS' },
      update: { currentPrice: 3000, changePercent: -0.8 },
      create: {
        symbol: 'TCS',
        companyName: 'Tata Consultancy Services',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 3000,
        changeAmount: -24,
        changePercent: -0.8,
        high52w: 4200,
        low52w: 2800,
        marketCap: '₹11.0T',
      },
    });

    await prisma.stock.upsert({
      where: { symbol: 'RELIANCE' },
      update: { currentPrice: 1400, changePercent: 2.1 },
      create: {
        symbol: 'RELIANCE',
        companyName: 'Reliance Industries',
        sector: 'Energy',
        currency: '₹',
        currentPrice: 1400,
        changeAmount: 29.4,
        changePercent: 2.1,
        high52w: 1600,
        low52w: 1100,
        marketCap: '₹18.0T',
      },
    });

    // 4. Create a shared test market event on INFY
    const sharedEv = await prisma.event.create({
      data: {
        stockSymbol: 'INFY',
        eventType: EventType.PRICE_SURGE,
        priority: Priority.HIGH,
        timestamp: new Date(),
        occurredOn: new Date(),
        occurredAt: new Date(),
        userId: null, // Shared market event
        metricsDelta: {
          changePercent: 5.2,
          detectionReason: 'Test Surge Anomaly',
        },
      },
    });
    testEventId = sharedEv.id;

    // 5. Create a user-specific cumulative return event strictly for User A
    const cumEvA = await prisma.event.create({
      data: {
        stockSymbol: 'INFY',
        eventType: EventType.PRICE_SURGE,
        priority: Priority.HIGH,
        timestamp: new Date(),
        occurredOn: new Date(),
        occurredAt: new Date(),
        periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        userId: userA.id, // User A specific
        metricsDelta: {
          changePercent: 12.4,
          isCumulativeReturnEvent: true,
          detectionReason: 'User A 7-day cumulative move',
        },
      },
    });
    userACumulativeEventId = cumEvA.id;
  });

  afterAll(async () => {
    // Clean up created test users and test events
    if (testEventId) {
      await prisma.event.delete({ where: { id: testEventId } }).catch(() => {});
    }
    if (userACumulativeEventId) {
      await prisma.event.delete({ where: { id: userACumulativeEventId } }).catch(() => {});
    }
    if (userA?.id) {
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
    if (userB?.id) {
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. New user registration starts with clean onboarding state', async () => {
    const watchlistsA = await watchlistService.getUserWatchlists(userA.id);
    expect(watchlistsA.length).toBe(1);
    expect(watchlistsA[0].isDefault).toBe(true);
    expect(watchlistsA[0].stockCount).toBe(0);

    const feedA = await feedService.getFeed(userA.id, { window: 'sinceLastVisit' });
    expect(feedA.items.length).toBe(0);
    expect(feedA.total).toBe(0);

    const summaryA = await feedService.getSummary(userA.id);
    expect(summaryA.unreadClusters).toBe(0);
    expect(summaryA.totalInWindow).toBe(0);
    expect(summaryA.daysSinceLastVisit).toBe(0);

    const notificationsA = await notificationService.listNotifications(userA.id);
    expect(notificationsA.notifications.length).toBe(0);
    expect(notificationsA.unreadCount).toBe(0);
  });

  it('2. Watchlists and monitored stocks are strictly isolated', async () => {
    // User A adds INFY and TCS
    await watchlistService.addStockToWatchlist(userA.id, userA.defaultWatchlistId, 'INFY');
    await watchlistService.addStockToWatchlist(userA.id, userA.defaultWatchlistId, 'TCS');

    // User B adds INFY and RELIANCE
    await watchlistService.addStockToWatchlist(userB.id, userB.defaultWatchlistId, 'INFY');
    await watchlistService.addStockToWatchlist(userB.id, userB.defaultWatchlistId, 'RELIANCE');

    const overviewA = await watchlistService.getOverview(userA.id, 'all');
    const symbolsA = overviewA.stocks.map((s) => s.symbol);
    expect(symbolsA).toContain('INFY');
    expect(symbolsA).toContain('TCS');
    expect(symbolsA).not.toContain('RELIANCE');

    const overviewB = await watchlistService.getOverview(userB.id, 'all');
    const symbolsB = overviewB.stocks.map((s) => s.symbol);
    expect(symbolsB).toContain('INFY');
    expect(symbolsB).toContain('RELIANCE');
    expect(symbolsB).not.toContain('TCS');
  });

  it('3. Alerts are strictly owned and isolated per user', async () => {
    // User A creates alert on INFY
    const alertA = await alertService.createAlert(userA.id, {
      stockSymbol: 'INFY',
      alertType: 'PRICE_ABOVE',
      targetValue: 2000,
    });
    expect(alertA.id).toBeDefined();

    // User B creates alert on INFY with different threshold
    const alertB = await alertService.createAlert(userB.id, {
      stockSymbol: 'INFY',
      alertType: 'PRICE_ABOVE',
      targetValue: 2500,
    });
    expect(alertB.id).toBeDefined();

    const alertsA = await alertService.listAlerts(userA.id);
    expect(alertsA.length).toBe(1);
    expect(alertsA[0].id).toBe(alertA.id);
    expect(alertsA[0].targetValue).toBe(2000);

    const alertsB = await alertService.listAlerts(userB.id);
    expect(alertsB.length).toBe(1);
    expect(alertsB[0].id).toBe(alertB.id);
    expect(alertsB[0].targetValue).toBe(2500);

    // User B cannot update User A's alert (should throw 404)
    await expect(
      alertService.updateAlert(userB.id, alertA.id, { targetValue: 3000 })
    ).rejects.toThrow();

    // User B cannot delete User A's alert (should throw 404)
    await expect(
      alertService.deleteAlert(userB.id, alertA.id)
    ).rejects.toThrow();
  });

  it('4. Read and Saved states on shared events are isolated', async () => {
    // User A marks shared event read and saves it
    await feedService.markRead(userA.id, [testEventId]);
    await feedService.toggleSave(userA.id, testEventId);

    // Verify User A sees it read and saved
    const feedA = await feedService.getFeed(userA.id, { window: '30d' });
    const itemA = feedA.items.find((i) => i.memberEventIds.includes(testEventId));
    expect(itemA).toBeDefined();
    expect(itemA?.isUnread).toBe(false);
    expect(itemA?.isSaved).toBe(true);

    // Verify User B still sees it UNREAD and NOT SAVED
    const feedB = await feedService.getFeed(userB.id, { window: '30d' });
    const itemB = feedB.items.find((i) => i.memberEventIds.includes(testEventId));
    expect(itemB).toBeDefined();
    expect(itemB?.isUnread).toBe(true);
    expect(itemB?.isSaved).toBe(false);
  });

  it('5. User-specific cumulative events are strictly isolated', async () => {
    // User A should see User A's cumulative event
    const feedA = await feedService.getFeed(userA.id, { window: '30d' });
    const cumItemA = feedA.items.find((i) => i.memberEventIds.includes(userACumulativeEventId));
    expect(cumItemA).toBeDefined();

    // User B MUST NOT see User A's cumulative event
    const feedB = await feedService.getFeed(userB.id, { window: '30d' });
    const cumItemB = feedB.items.find((i) => i.memberEventIds.includes(userACumulativeEventId));
    expect(cumItemB).toBeUndefined();

    // User B requesting details for User A's cumulative event gets null (404)
    const detailsB = await feedService.getItemDetails(userB.id, userACumulativeEventId);
    expect(detailsB).toBeNull();
  });

  it('6. Route ownership and cross-user resource access denial', async () => {
    // User B cannot modify User A's watchlist
    await expect(
      watchlistService.renameWatchlist(userB.id, userA.defaultWatchlistId, 'Hacked Name')
    ).rejects.toThrow();

    await expect(
      watchlistService.addStockToWatchlist(userB.id, userA.defaultWatchlistId, 'AAPL')
    ).rejects.toThrow();

    await expect(
      watchlistService.removeStockFromWatchlist(userB.id, userA.defaultWatchlistId, 'INFY')
    ).rejects.toThrow();

    await expect(
      watchlistService.deleteWatchlist(userB.id, userA.defaultWatchlistId)
    ).rejects.toThrow();
  });

  it('7. Modifying or deleting User A resources does not affect User B', async () => {
    // Create custom watchlist for User A
    const customWlA = await watchlistService.createWatchlist(userA.id, 'Alpha Tech');
    await watchlistService.addStockToWatchlist(userA.id, customWlA.id, 'INFY');

    // Delete custom watchlist for User A
    await watchlistService.deleteWatchlist(userA.id, customWlA.id);

    // Verify User B's watchlists and stocks are untouched
    const watchlistsB = await watchlistService.getUserWatchlists(userB.id);
    expect(watchlistsB.length).toBe(1);
    expect(watchlistsB[0].id).toBe(userB.defaultWatchlistId);

    const overviewB = await watchlistService.getOverview(userB.id, 'all');
    expect(overviewB.stocks.map((s) => s.symbol)).toEqual(expect.arrayContaining(['INFY', 'RELIANCE']));
  });

  it('8. Personalized gap digests and market memory are strictly isolated', async () => {
    // Create personalized gap digest for User A
    const digestA = await prisma.digest.create({
      data: {
        userId: userA.id,
        headline: '7-Day Gap Dossier: INFY & TCS Developments',
        executiveSummary: 'Personalized catch-up digest for User A',
        marketMood: 'BULLISH',
        timeRange: '7-Day Absence',
        benchmarkCloses: {},
        read: false,
        digestEvents: {
          create: [{ eventId: testEventId }],
        },
      },
    });

    // User A should see their personal digest in digest list
    const digestsA = await digestService.getDigests({ userId: userA.id });
    const foundA = digestsA.find((d) => d.id === digestA.id);
    expect(foundA).toBeDefined();
    expect(foundA?.executiveSummary).toContain('User A');

    // User B MUST NOT see User A's personal digest in digest list
    const digestsB = await digestService.getDigests({ userId: userB.id });
    const foundB = digestsB.find((d) => d.id === digestA.id);
    expect(foundB).toBeUndefined();

    // User B attempting to fetch User A's digest by ID receives null (404)
    const directFetchB = await digestService.getDigestById(digestA.id, userB.id);
    expect(directFetchB).toBeNull();

    // Cleanup created digest
    await prisma.digest.delete({ where: { id: digestA.id } });
  });
});

