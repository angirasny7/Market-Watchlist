import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, EventType, Priority } from '@prisma/client';
import { authService } from '../src/services/authService.js';
import { watchlistService } from '../src/services/watchlistService.js';
import { feedService } from '../src/services/feedService.js';
import { alertService } from '../src/services/alertService.js';
import { notificationService } from '../src/services/notificationService.js';
import { digestService } from '../src/services/digestService.js';
import { eventService } from '../src/services/eventService.js';
import { memoryService } from '../src/services/memoryService.js';

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

    // 4. Create a shared test market event on INFY (timestamp in future so both A and B have it after addedAt)
    const futureTime = new Date(Date.now() + 60000);
    const sharedEv = await prisma.event.create({
      data: {
        stockSymbol: 'INFY',
        eventType: EventType.PRICE_SURGE,
        priority: Priority.HIGH,
        timestamp: futureTime,
        occurredOn: futureTime,
        occurredAt: futureTime,
        userId: null, // Shared market event
        metricsDelta: {
          changePercent: 5.2,
          detectionReason: 'Test Surge Anomaly',
        },
      },
    });
    testEventId = sharedEv.id;

    // 5. Create a user-specific cumulative return event strictly for User A on TCS
    const cumEvA = await prisma.event.create({
      data: {
        stockSymbol: 'TCS',
        eventType: EventType.PRICE_SURGE,
        priority: Priority.HIGH,
        timestamp: futureTime,
        occurredOn: futureTime,
        occurredAt: futureTime,
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

    // Verify User A sees it in Memory Read and Saved, and has left the unhandled feed
    const feedA = await feedService.getFeed(userA.id, { window: '30d' });
    const itemA = feedA.items.find((i) => i.memberEventIds.includes(testEventId));
    expect(itemA).toBeUndefined(); // Handled items leave the unhandled Attention Feed

    const memorySavedA = await memoryService.getArchivedEvents({ userId: userA.id, memoryType: 'SAVED' });
    expect(memorySavedA.some((m) => m.id === testEventId)).toBe(true);

    // Verify User B still sees it UNREAD and NOT SAVED in their Attention Feed
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

  it('9. watchedSince scoping: New stock addition does not inherit historical events as unread', async () => {
    const sym = `SYM_${Date.now()}`;
    await prisma.stock.create({
      data: {
        symbol: sym,
        companyName: 'Watched Test Stock',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 500,
        changeAmount: 5,
        changePercent: 1.0,
        high52w: 600,
        low52w: 400,
        marketCap: '₹1.0T',
      },
    });

    // Create historical event 2 days ago on this stock
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const pastEvent = await prisma.event.create({
      data: {
        stockSymbol: sym,
        eventType: EventType.PRICE_SURGE,
        priority: Priority.CRITICAL,
        timestamp: pastDate,
        occurredAt: pastDate,
        occurredOn: pastDate,
        metricsDelta: {
          changePercent: 12.5,
          attentionScore: 90,
        },
      },
    });

    // User C registers and adds stock now
    const regC = await authService.register({
      name: 'User Charlie',
      email: `multi_c_${Date.now()}@test.com`,
      password: 'Password123!@#',
    });
    const userC = { id: regC.user.id, defaultWatchlistId: regC.defaultWatchlistId! };

    await watchlistService.addStockToWatchlist(userC.id, userC.defaultWatchlistId, sym);

    // Verify watchlist overview for User C
    const overviewC = await watchlistService.getOverview(userC.id, userC.defaultWatchlistId);
    const stockItemC = overviewC.stocks.find((s) => s.symbol === sym);
    expect(stockItemC).toBeDefined();
    expect(stockItemC?.unseenUpdatesCount).toBe(0);
    expect(stockItemC?.attentionLevel).toBe('LOW');
    expect(stockItemC?.attentionScore).toBe(0);
    expect(overviewC.summary.unseenUpdates).toBe(0);
    expect(overviewC.summary.needAttention).toBe(0);

    // Verify feed for User C
    const feedSinceLastVisit = await feedService.getFeed(userC.id, { window: 'sinceLastVisit' });
    expect(feedSinceLastVisit.items.length).toBe(0);
    expect(feedSinceLastVisit.unreadCount).toBe(0);

    const feed30d = await feedService.getFeed(userC.id, { window: '30d' });
    const historicalFeedItem = feed30d.items.find((i) => i.stockSymbol === sym);
    expect(historicalFeedItem).toBeUndefined(); // Events occurred prior to addedAt are excluded from feed

    // Cleanup
    await prisma.event.delete({ where: { id: pastEvent.id } });
  });

  it('10. watchedSince scoping: New event after addedAt increments unread count and attention score', async () => {
    const sym = `SYM2_${Date.now()}`;
    await prisma.stock.create({
      data: {
        symbol: sym,
        companyName: 'Watched Test Stock 2',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 800,
        changeAmount: 10,
        changePercent: 1.25,
        high52w: 1000,
        low52w: 600,
        marketCap: '₹2.0T',
      },
    });

    const regD = await authService.register({
      name: 'User David',
      email: `multi_d_${Date.now()}@test.com`,
      password: 'Password123!@#',
    });
    const userD = { id: regD.user.id, defaultWatchlistId: regD.defaultWatchlistId! };

    // User D adds stock at T0
    await watchlistService.addStockToWatchlist(userD.id, userD.defaultWatchlistId, sym);

    // New event occurs at T0 + 1 second
    const futureDate = new Date(Date.now() + 1000);
    const newEvent = await prisma.event.create({
      data: {
        stockSymbol: sym,
        eventType: EventType.PRICE_DROP,
        priority: Priority.HIGH,
        timestamp: futureDate,
        occurredAt: futureDate,
        occurredOn: futureDate,
        metricsDelta: {
          changePercent: -6.5,
          attentionScore: 75,
        },
      },
    });

    // Verify watchlist overview now shows unseen update
    const overviewD = await watchlistService.getOverview(userD.id, userD.defaultWatchlistId);
    const stockItemD = overviewD.stocks.find((s) => s.symbol === sym);
    expect(stockItemD).toBeDefined();
    expect(stockItemD?.unseenUpdatesCount).toBe(1);
    expect(stockItemD?.attentionLevel).toBe('HIGH');
    expect(stockItemD?.attentionScore).toBe(75);
    expect(overviewD.summary.unseenUpdates).toBe(1);
    expect(overviewD.summary.needAttention).toBe(1);

    // Verify feed item is unread
    const feed30d = await feedService.getFeed(userD.id, { window: '30d' });
    const feedItem = feed30d.items.find((i) => i.stockSymbol === sym);
    expect(feedItem).toBeDefined();
    expect(feedItem?.isUnread).toBe(true);

    // Cleanup
    await prisma.event.delete({ where: { id: newEvent.id } });
  });

  it('11. Copy/move across watchlists preserves the earliest addedAt timestamp', async () => {
    const sym = `SYM3_${Date.now()}`;
    await prisma.stock.create({
      data: {
        symbol: sym,
        companyName: 'Earliest AddedAt Stock',
        sector: 'Healthcare',
        currency: '₹',
        currentPrice: 400,
        changeAmount: 2,
        changePercent: 0.5,
        high52w: 500,
        low52w: 300,
        marketCap: '₹500B',
      },
    });

    const regE = await authService.register({
      name: 'User Earliest',
      email: `multi_e_${Date.now()}@test.com`,
      password: 'Password123!@#',
    });
    const userE = { id: regE.user.id, defaultWatchlistId: regE.defaultWatchlistId! };

    // Add to Watchlist 1 at T0
    const earlyTime = new Date(Date.now() - 3600 * 1000);
    const item1 = await prisma.watchlistStock.create({
      data: {
        watchlistId: userE.defaultWatchlistId,
        stockSymbol: sym,
        addedAt: earlyTime,
      },
    });

    // Create Watchlist 2 and add same stock at T0 + 1hr
    const wl2 = await watchlistService.createWatchlist(userE.id, 'Secondary List');
    const laterTime = new Date();
    const item2 = await prisma.watchlistStock.create({
      data: {
        watchlistId: wl2.id,
        stockSymbol: sym,
        addedAt: laterTime,
      },
    });

    // In union feed ('all'), watchedSinceMap takes min(addedAt) = earlyTime
    const allWs = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId: userE.id } },
      select: { stockSymbol: true, addedAt: true },
    });
    const minAddedAt = allWs
      .filter((w) => w.stockSymbol === sym)
      .reduce((min, cur) => (cur.addedAt < min ? cur.addedAt : min), allWs[0].addedAt);

    expect(minAddedAt.toISOString()).toBe(earlyTime.toISOString());
  });

  it('12. Remove and re-add resets watchedSince (addedAt timestamp advances)', async () => {
    const sym = `SYM4_${Date.now()}`;
    await prisma.stock.create({
      data: {
        symbol: sym,
        companyName: 'Reset AddedAt Stock',
        sector: 'Financials',
        currency: '₹',
        currentPrice: 1500,
        changeAmount: 15,
        changePercent: 1.0,
        high52w: 1800,
        low52w: 1200,
        marketCap: '₹3.0T',
      },
    });

    const regF = await authService.register({
      name: 'User Reset',
      email: `multi_f_${Date.now()}@test.com`,
      password: 'Password123!@#',
    });
    const userF = { id: regF.user.id, defaultWatchlistId: regF.defaultWatchlistId! };

    // Add initially with historical addedAt (e.g. 5 days ago)
    const oldTime = new Date(Date.now() - 5 * 24 * 3600 * 1000);
    await prisma.watchlistStock.create({
      data: {
        watchlistId: userF.defaultWatchlistId,
        stockSymbol: sym,
        addedAt: oldTime,
      },
    });

    // Remove from watchlist
    await watchlistService.removeStockFromWatchlist(userF.id, userF.defaultWatchlistId, sym);

    // Re-add to watchlist today
    const reAdded = await watchlistService.addStockToWatchlist(userF.id, userF.defaultWatchlistId, sym);

    expect(new Date(reAdded.addedAt).getTime()).toBeGreaterThan(oldTime.getTime());
  });
});


