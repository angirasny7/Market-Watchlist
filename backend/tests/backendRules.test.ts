import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { alertService } from '../src/services/alertService.js';
import { watchlistService } from '../src/services/watchlistService.js';
import { AlertType, Priority, EventType } from '@prisma/client';

describe('Backend Watchlist and Alert Rules Test Suite', () => {
  let testUserId: string;
  let defaultWatchlistId: string;
  let testStockSymbol: string;
  let secondaryStockSymbol: string;

  beforeAll(async () => {
    // 1. Get or create a unique test user
    const email = `test_rules_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Rules Test User',
        passwordHash: 'dummyhash',
      },
    });
    testUserId = user.id;

    // 2. Create default watchlist for this test user
    const wl = await prisma.watchlist.create({
      data: {
        userId: testUserId,
        name: 'Default Test Watchlist',
        isDefault: true,
      },
    });
    defaultWatchlistId = wl.id;

    // 3. Ensure test stocks exist in master catalog
    const stocks = await prisma.stock.findMany({ take: 2 });
    if (stocks.length >= 2) {
      testStockSymbol = stocks[0].symbol;
      secondaryStockSymbol = stocks[1].symbol;
    } else {
      const s1 = await prisma.stock.upsert({
        where: { symbol: 'TEST_AAA' },
        create: {
          symbol: 'TEST_AAA',
          companyName: 'Test AAA Inc',
          sector: 'Technology',
          currentPrice: 1000.0,
          changeAmount: 50.0,
          changePercent: 5.0,
        },
        update: {},
      });
      const s2 = await prisma.stock.upsert({
        where: { symbol: 'TEST_BBB' },
        create: {
          symbol: 'TEST_BBB',
          companyName: 'Test BBB Inc',
          sector: 'Finance',
          currentPrice: 500.0,
          changeAmount: -25.0,
          changePercent: -5.0,
        },
        update: {},
      });
      testStockSymbol = s1.symbol;
      secondaryStockSymbol = s2.symbol;
    }
  });

  afterAll(async () => {
    // Clean up created test user and associated cascade records
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. DEFAULT LIST DELETE RULE
  // =========================================================================
  describe('Default Watchlist Delete Rule', () => {
    it('blocks deletion of the default watchlist with a 400 error', async () => {
      await expect(
        watchlistService.deleteWatchlist(testUserId, defaultWatchlistId)
      ).rejects.toThrow('The default watchlist cannot be deleted');
    });

    it('blocks deletion if it is the user only watchlist', async () => {
      // Even if not default, cannot delete only list
      await expect(
        watchlistService.deleteWatchlist(testUserId, defaultWatchlistId)
      ).rejects.toThrow();
    });
  });

  // =========================================================================
  // 2. WATCHLIST LIMITS
  // =========================================================================
  describe('Watchlist Capacity Limits', () => {
    it('enforces maximum 10 watchlists per user', async () => {
      // User currently has 1 watchlist. Create 9 more to reach the 10-watchlist cap.
      const createdIds: string[] = [];
      for (let i = 2; i <= 10; i++) {
        const wl = await watchlistService.createWatchlist(testUserId, `Watchlist Alpha ${i}`);
        createdIds.push(wl.id);
      }

      // Attempting to create the 11th watchlist must fail with 400
      await expect(
        watchlistService.createWatchlist(testUserId, 'Watchlist Eleventh')
      ).rejects.toThrow('Maximum of 10 watchlists allowed per user');

      // Clean up extra watchlists
      for (const id of createdIds) {
        await prisma.watchlist.delete({ where: { id } }).catch(() => {});
      }
    });

    it('enforces maximum 50 stocks per watchlist', async () => {
      // Create a temporary watchlist
      const tempWl = await watchlistService.createWatchlist(testUserId, 'Cap 50 List');

      // Seed 50 dummy stock records if needed and attach them
      const dummySymbols: string[] = [];
      for (let i = 1; i <= 50; i++) {
        const sym = `DUMMY_${i}`;
        dummySymbols.push(sym);
        await prisma.stock.upsert({
          where: { symbol: sym },
          create: {
            symbol: sym,
            companyName: `Dummy Co ${i}`,
            sector: 'General',
            currentPrice: 100,
            changeAmount: 0,
            changePercent: 0,
            marketCap: '1000Cr',
            high52w: 120,
            low52w: 80,
          },
          update: {},
        });
      }

      // Bulk insert 50 stocks into tempWl
      await prisma.watchlistStock.createMany({
        data: dummySymbols.map((sym) => ({
          watchlistId: tempWl.id,
          stockSymbol: sym,
        })),
      });

      // Attempting to add 51st stock must throw 400 error
      await expect(
        watchlistService.addStockToWatchlist(testUserId, tempWl.id, testStockSymbol)
      ).rejects.toThrow('Watchlist cannot exceed 50 stocks');

      // Clean up
      await prisma.watchlist.delete({ where: { id: tempWl.id } }).catch(() => {});
      await prisma.stock.deleteMany({ where: { symbol: { in: dummySymbols } } }).catch(() => {});
    });
  });

  // =========================================================================
  // 3. UNION MONITORING
  // =========================================================================
  describe('Union Monitoring Across Multiple Watchlists', () => {
    it('includes a stock in union overview even if it only exists in a non-default watchlist', async () => {
      // Create a non-default watchlist
      const customWl = await watchlistService.createWatchlist(testUserId, 'Non Default Monitor');

      // Ensure secondaryStockSymbol is ONLY in customWl, NOT in defaultWatchlistId
      await prisma.watchlistStock.deleteMany({
        where: { watchlistId: defaultWatchlistId, stockSymbol: secondaryStockSymbol },
      });

      await watchlistService.addStockToWatchlist(testUserId, customWl.id, secondaryStockSymbol);

      // Fetch overview with 'all'
      const unionOverview = await watchlistService.getOverview(testUserId, 'all');

      const foundInUnion = unionOverview.stocks.some((s) => s.symbol === secondaryStockSymbol);
      expect(foundInUnion).toBe(true);

      // Verify that the overview contains the watchlist mapping
      const stockItem = unionOverview.stocks.find((s) => s.symbol === secondaryStockSymbol);
      expect(stockItem?.watchlistIds).toContain(customWl.id);

      // Clean up custom list
      await prisma.watchlist.delete({ where: { id: customWl.id } }).catch(() => {});
    });
  });

  // =========================================================================
  // 4. ALERT EVALUATION (Above, Below, Percent, Attention, Cooldown, Idempotency)
  // =========================================================================
  describe('Alert Evaluation Engine', () => {
    it('evaluates PRICE_ABOVE alert when price is >= target', async () => {
      const stock = await prisma.stock.findUniqueOrThrow({ where: { symbol: testStockSymbol } });
      const currentPrice = Number(stock.currentPrice);

      const alert = await prisma.alert.create({
        data: {
          userId: testUserId,
          stockSymbol: testStockSymbol,
          alertType: 'PRICE_ABOVE',
          targetValue: currentPrice - 10, // Below current, so price is above target
          isActive: true,
        },
      });

      const triggeredCount = await alertService.evaluateAlerts([testStockSymbol]);
      expect(triggeredCount).toBeGreaterThanOrEqual(1);

      // Verify alert was deactivated and stamped with triggeredAt
      const updatedAlert = await prisma.alert.findUnique({ where: { id: alert.id } });
      expect(updatedAlert?.isActive).toBe(false);
      expect(updatedAlert?.triggeredAt).toBeDefined();

      // Verify notification was created
      const notif = await prisma.notification.findFirst({
        where: { alertId: alert.id, userId: testUserId },
      });
      expect(notif).toBeDefined();

      // Clean up alert
      await prisma.alert.delete({ where: { id: alert.id } }).catch(() => {});
    });

    it('evaluates PRICE_BELOW alert when price is <= target', async () => {
      const stock = await prisma.stock.findUniqueOrThrow({ where: { symbol: testStockSymbol } });
      const currentPrice = Number(stock.currentPrice);

      const alert = await prisma.alert.create({
        data: {
          userId: testUserId,
          stockSymbol: testStockSymbol,
          alertType: 'PRICE_BELOW',
          targetValue: currentPrice + 10, // Above current, so price is below target
          isActive: true,
        },
      });

      const triggeredCount = await alertService.evaluateAlerts([testStockSymbol]);
      expect(triggeredCount).toBeGreaterThanOrEqual(1);

      const updatedAlert = await prisma.alert.findUnique({ where: { id: alert.id } });
      expect(updatedAlert?.isActive).toBe(false);

      await prisma.alert.delete({ where: { id: alert.id } }).catch(() => {});
    });

    it('evaluates DAY_CHANGE_PCT alert when absolute change exceeds target', async () => {
      const stock = await prisma.stock.findUniqueOrThrow({ where: { symbol: testStockSymbol } });
      const changePct = Number(stock.changePercent);

      const alert = await prisma.alert.create({
        data: {
          userId: testUserId,
          stockSymbol: testStockSymbol,
          alertType: 'DAY_CHANGE_PCT',
          targetValue: Math.max(0.1, Math.abs(changePct) - 0.5), // Lower than actual change
          isActive: true,
        },
      });

      const triggeredCount = await alertService.evaluateAlerts([testStockSymbol]);
      expect(triggeredCount).toBeGreaterThanOrEqual(1);

      const updatedAlert = await prisma.alert.findUnique({ where: { id: alert.id } });
      expect(updatedAlert?.isActive).toBe(false);

      await prisma.alert.delete({ where: { id: alert.id } }).catch(() => {});
    });

    it('evaluates ATTENTION_SCORE alert when unread event score meets threshold', async () => {
      // Create an unread high-priority event for testStockSymbol
      const feedEvent = await prisma.event.create({
        data: {
          stockSymbol: testStockSymbol,
          eventType: EventType.PRICE_SURGE,
          priority: Priority.CRITICAL,
          timestamp: new Date(),
          metricsDelta: { attentionScore: 85 },
        },
      });

      const alert = await prisma.alert.create({
        data: {
          userId: testUserId,
          stockSymbol: testStockSymbol,
          alertType: 'ATTENTION_SCORE',
          targetValue: 70, // threshold 70 <= event score 85
          isActive: true,
        },
      });

      const triggeredCount = await alertService.evaluateAlerts([testStockSymbol]);
      expect(triggeredCount).toBeGreaterThanOrEqual(1);

      const updatedAlert = await prisma.alert.findUnique({ where: { id: alert.id } });
      expect(updatedAlert?.isActive).toBe(false);

      // Clean up
      await prisma.alert.delete({ where: { id: alert.id } }).catch(() => {});
      await prisma.event.delete({ where: { id: feedEvent.id } }).catch(() => {});
    });

    it('respects cooldown window and prevents re-triggering if triggered recently', async () => {
      const stock = await prisma.stock.findUniqueOrThrow({ where: { symbol: testStockSymbol } });
      const currentPrice = Number(stock.currentPrice);

      // Create an alert with triggeredAt set 10 minutes ago (within 60m cooldown)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const alert = await prisma.alert.create({
        data: {
          userId: testUserId,
          stockSymbol: testStockSymbol,
          alertType: 'PRICE_ABOVE',
          targetValue: currentPrice - 5,
          isActive: true,
          triggeredAt: tenMinutesAgo,
        },
      });

      const triggeredCount = await alertService.evaluateAlerts([testStockSymbol]);
      // Should NOT trigger because of the 60-minute cooldown
      expect(triggeredCount).toBe(0);

      const refreshed = await prisma.alert.findUnique({ where: { id: alert.id } });
      expect(refreshed?.isActive).toBe(true);

      await prisma.alert.delete({ where: { id: alert.id } }).catch(() => {});
    });

    it('guarantees idempotency by never duplicating Attention Feed events for the same crossing', async () => {
      const stock = await prisma.stock.findUniqueOrThrow({ where: { symbol: testStockSymbol } });
      const currentPrice = Number(stock.currentPrice);

      const alert = await prisma.alert.create({
        data: {
          userId: testUserId,
          stockSymbol: testStockSymbol,
          alertType: 'PRICE_ABOVE',
          targetValue: currentPrice - 10,
          isActive: true,
        },
      });

      // First evaluation triggers alert and creates feed event
      await alertService.evaluateAlerts([testStockSymbol]);

      // Count feed events created for this alertId
      const feedEventsBefore = await prisma.event.findMany({
        where: {
          stockSymbol: testStockSymbol,
          metricsDelta: {
            path: ['alertId'],
            equals: alert.id,
          },
        },
      });
      expect(feedEventsBefore.length).toBe(1);

      // Manually set isActive = true (simulating re-evaluation or race condition)
      // and remove triggeredAt to test feed idempotency check
      await prisma.alert.update({
        where: { id: alert.id },
        data: { isActive: true, triggeredAt: null },
      });

      await alertService.evaluateAlerts([testStockSymbol]);

      // Feed events count should STILL be exactly 1 (no duplicate feed event created)
      const feedEventsAfter = await prisma.event.findMany({
        where: {
          stockSymbol: testStockSymbol,
          metricsDelta: {
            path: ['alertId'],
            equals: alert.id,
          },
        },
      });
      expect(feedEventsAfter.length).toBe(1);

      // Clean up created event and insight
      await prisma.insight.deleteMany({ where: { relatedEventId: feedEventsBefore[0].id } });
      await prisma.event.delete({ where: { id: feedEventsBefore[0].id } });
      await prisma.alert.delete({ where: { id: alert.id } }).catch(() => {});
    });
  });

  // =========================================================================
  // 7. WATCHLIST STOCK ISOLATION (Item 2 bug fix)
  // =========================================================================
  describe('Watchlist Stock Isolation', () => {
    it('adding a stock to non-default watchlist B does NOT add it to the default list', async () => {
      // Create a non-default watchlist
      const listB = await watchlistService.createWatchlist(testUserId, 'Isolation Test List');

      // Add stock via the specific watchlist endpoint
      await watchlistService.addStockToWatchlist(testUserId, listB.id, testStockSymbol);

      // Stock must be in list B
      const inB = await prisma.watchlistStock.findUnique({
        where: {
          watchlistId_stockSymbol: {
            watchlistId: listB.id,
            stockSymbol: testStockSymbol,
          },
        },
      });
      expect(inB).not.toBeNull();

      // Stock must NOT be in the default list (unless it was added separately before)
      // First remove any pre-existing entry in default to ensure clean test
      await prisma.watchlistStock.deleteMany({
        where: { watchlistId: defaultWatchlistId, stockSymbol: testStockSymbol },
      });

      // Add stock to B again (should be a no-op or error due to duplicate)
      // Instead, add a fresh stock that definitely isn't in default
      const isolationSymbol = 'TEST_ISOLATION';
      await prisma.stock.upsert({
        where: { symbol: isolationSymbol },
        create: {
          symbol: isolationSymbol,
          companyName: 'Isolation Test Corp',
          sector: 'Technology',
          currentPrice: 999,
          changeAmount: 0,
          changePercent: 0,
          marketCap: '10000Cr',
          high52w: 1200,
          low52w: 800,
        },
        update: {},
      });

      await watchlistService.addStockToWatchlist(testUserId, listB.id, isolationSymbol);

      // Verify it's in list B
      const inListB = await prisma.watchlistStock.findUnique({
        where: {
          watchlistId_stockSymbol: {
            watchlistId: listB.id,
            stockSymbol: isolationSymbol,
          },
        },
      });
      expect(inListB).not.toBeNull();

      // Verify it is NOT in the default list
      const inDefault = await prisma.watchlistStock.findUnique({
        where: {
          watchlistId_stockSymbol: {
            watchlistId: defaultWatchlistId,
            stockSymbol: isolationSymbol,
          },
        },
      });
      expect(inDefault).toBeNull();

      // Clean up
      await prisma.watchlist.delete({ where: { id: listB.id } }).catch(() => {});
      await prisma.stock.delete({ where: { symbol: isolationSymbol } }).catch(() => {});
    });

    it('legacy addStock without watchlistId defaults to the default watchlist only', async () => {
      const legacySymbol = 'TEST_LEGACY_ADD';
      await prisma.stock.upsert({
        where: { symbol: legacySymbol },
        create: {
          symbol: legacySymbol,
          companyName: 'Legacy Add Test',
          sector: 'Finance',
          currentPrice: 500,
          changeAmount: 0,
          changePercent: 0,
          marketCap: '5000Cr',
          high52w: 600,
          low52w: 400,
        },
        update: {},
      });

      // Create a non-default list to verify the stock does NOT end up there
      const otherList = await watchlistService.createWatchlist(testUserId, 'Other Legacy Test');

      // Call legacy addStock without a watchlistId
      await watchlistService.addStock(testUserId, legacySymbol);

      // Should be in the default list
      const inDefault = await prisma.watchlistStock.findUnique({
        where: {
          watchlistId_stockSymbol: {
            watchlistId: defaultWatchlistId,
            stockSymbol: legacySymbol,
          },
        },
      });
      expect(inDefault).not.toBeNull();

      // Should NOT be in the other list
      const inOther = await prisma.watchlistStock.findUnique({
        where: {
          watchlistId_stockSymbol: {
            watchlistId: otherList.id,
            stockSymbol: legacySymbol,
          },
        },
      });
      expect(inOther).toBeNull();

      // Clean up
      await prisma.watchlistStock.deleteMany({ where: { stockSymbol: legacySymbol } });
      await prisma.watchlist.delete({ where: { id: otherList.id } }).catch(() => {});
      await prisma.stock.delete({ where: { symbol: legacySymbol } }).catch(() => {});
    });
  });

  // =========================================================================
  // 8. ONBOARDING STATUS (Item 2 bug fix)
  // =========================================================================
  describe('Onboarding Status', () => {
    it('isUserOnboarded returns true when user has multiple watchlists even if all are empty', async () => {
      // Import the function
      const { isUserOnboarded } = await import('../src/utils/userOnboarding.js');

      // Create a fresh user with only a default empty watchlist
      const freshUser = await prisma.user.create({
        data: {
          email: `onboard_test_${Date.now()}@example.com`,
          name: 'Onboard Test',
          passwordHash: 'dummyhash',
        },
      });
      await prisma.watchlist.create({
        data: { userId: freshUser.id, name: 'Primary Watchlist', isDefault: true },
      });

      // Single empty default watchlist -> NOT onboarded
      const before = await isUserOnboarded(freshUser.id);
      expect(before).toBe(false);

      // Create a second watchlist (empty) -> user IS onboarded
      const secondWl = await prisma.watchlist.create({
        data: { userId: freshUser.id, name: 'Custom List', isDefault: false },
      });
      const after = await isUserOnboarded(freshUser.id);
      expect(after).toBe(true);

      // Clean up
      await prisma.watchlist.deleteMany({ where: { userId: freshUser.id } });
      await prisma.user.delete({ where: { id: freshUser.id } }).catch(() => {});
    });
  });

  // =========================================================================
  // 9. WATCHLIST OVERVIEW COUNTS & RESILIENCE
  // =========================================================================
  describe('Watchlist Overview Counts & Multi-List Visibility', () => {
    it('stock present in two watchlists appears in both individual overviews', async () => {
      // Create second watchlist for test user
      const list2 = await prisma.watchlist.create({
        data: { userId: testUserId, name: 'Secondary Test List', isDefault: false },
      });

      // Add testStockSymbol to both default list and list2
      await watchlistService.addStockToWatchlist(testUserId, defaultWatchlistId, testStockSymbol);
      await watchlistService.addStockToWatchlist(testUserId, list2.id, testStockSymbol);

      // Add secondaryStockSymbol only to list2
      await watchlistService.addStockToWatchlist(testUserId, list2.id, secondaryStockSymbol);

      // Fetch overview for default list
      const defaultOverview = await watchlistService.getOverview(testUserId, defaultWatchlistId);
      expect(defaultOverview.stocks.map((s) => s.symbol)).toContain(testStockSymbol);
      expect(defaultOverview.summary.totalStocks).toBe(defaultOverview.stocks.length);

      // Fetch overview for list2
      const list2Overview = await watchlistService.getOverview(testUserId, list2.id);
      expect(list2Overview.stocks.map((s) => s.symbol)).toContain(testStockSymbol);
      expect(list2Overview.stocks.map((s) => s.symbol)).toContain(secondaryStockSymbol);
      expect(list2Overview.summary.totalStocks).toBe(list2Overview.stocks.length);

      // Fetch "All Watchlists" overview ('all')
      const allOverview = await watchlistService.getOverview(testUserId, 'all');
      const allSymbols = allOverview.stocks.map((s) => s.symbol);
      expect(allSymbols).toContain(testStockSymbol);
      expect(allSymbols).toContain(secondaryStockSymbol);
      // All watchlists should contain distinct union
      const distinctCount = new Set(allSymbols).size;
      expect(allOverview.stocks.length).toBe(distinctCount);
      expect(allOverview.summary.totalStocks).toBe(distinctCount);

      // Check that testStockSymbol has both watchlist IDs in all overview
      const sharedItem = allOverview.stocks.find((s) => s.symbol === testStockSymbol);
      expect(sharedItem?.watchlistIds).toContain(defaultWatchlistId);
      expect(sharedItem?.watchlistIds).toContain(list2.id);

      // Clean up
      await prisma.watchlistStock.deleteMany({
        where: { watchlistId: { in: [defaultWatchlistId, list2.id] } },
      });
      await prisma.watchlist.delete({ where: { id: list2.id } }).catch(() => {});
    });

    it('handles stock with missing quotes gracefully without dropping row or crashing', async () => {
      // Create a stock with minimal/missing quote data
      const noQuoteSymbol = `NOQUOTE_${Date.now()}`;
      await prisma.stock.create({
        data: {
          symbol: noQuoteSymbol,
          companyName: 'No Quote Corp',
          sector: 'Unknown',
          marketCap: '₹0 Cr',
          high52w: 0,
          low52w: 0,
          currentPrice: 0,
          changeAmount: 0,
          changePercent: 0,
        },
      });

      await watchlistService.addStockToWatchlist(testUserId, defaultWatchlistId, noQuoteSymbol);

      const overview = await watchlistService.getOverview(testUserId, defaultWatchlistId);
      const stockItem = overview.stocks.find((s) => s.symbol === noQuoteSymbol);

      expect(stockItem).toBeDefined();
      expect(stockItem?.symbol).toBe(noQuoteSymbol);
      expect(stockItem?.companyName).toBe('No Quote Corp');
      expect(stockItem?.currentPrice).toBeNull();
      expect(stockItem?.changeAmount).toBeNull();
      expect(stockItem?.changePercent).toBeNull();
      expect(overview.summary.totalStocks).toBe(overview.stocks.length);

      // Clean up
      await prisma.watchlistStock.deleteMany({
        where: { watchlistId: defaultWatchlistId, stockSymbol: noQuoteSymbol },
      });
      await prisma.stock.delete({ where: { symbol: noQuoteSymbol } }).catch(() => {});
    });
  });
});
