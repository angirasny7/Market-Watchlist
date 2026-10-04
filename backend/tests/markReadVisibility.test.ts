import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { authService } from '../src/services/authService.js';
import { feedService } from '../src/services/feedService.js';
import { eventService } from '../src/services/eventService.js';

describe('Mark-Read & Save Visibility Validation (Item 4)', () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let publicEventId: string;
  let privateUserAEventId: string;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Register User A
    const regA = await authService.register({
      name: 'User A Visibility',
      email: `user_a_${timestamp}@visibility.test`,
      password: 'Password123!@#',
    });
    userA = { id: regA.user.id, email: regA.user.email };

    // Register User B
    const regB = await authService.register({
      name: 'User B Visibility',
      email: `user_b_${timestamp}@visibility.test`,
      password: 'Password123!@#',
    });
    userB = { id: regB.user.id, email: regB.user.email };

    // User A monitors AAPL
    const watchlistA = await prisma.watchlist.findFirst({ where: { userId: userA.id } });
    if (watchlistA) {
      await prisma.watchlistStock.create({
        data: {
          watchlistId: watchlistA.id,
          stockSymbol: 'AAPL',
        },
      });
    }

    // User B monitors INFY only (not AAPL)
    const watchlistB = await prisma.watchlist.findFirst({ where: { userId: userB.id } });
    if (watchlistB) {
      await prisma.watchlistStock.create({
        data: {
          watchlistId: watchlistB.id,
          stockSymbol: 'INFY',
        },
      });
    }

    // Create a public event for AAPL
    const pubEv = await prisma.event.create({
      data: {
        stockSymbol: 'AAPL',
        eventType: 'PRICE_SURGE',
        priority: 'HIGH',
        occurredAt: new Date(),
        detectedAt: new Date(),
        metricsDelta: { priceChange: 5.0, price: 220 },
        userId: null,
      },
    });
    publicEventId = pubEv.id;

    // Create a private cumulative event strictly for User A on AAPL
    const privEv = await prisma.event.create({
      data: {
        stockSymbol: 'AAPL',
        eventType: 'PRICE_SURGE',
        priority: 'HIGH',
        occurredAt: new Date(),
        detectedAt: new Date(),
        metricsDelta: { priceChange: 12.0, price: 220 },
        userId: userA.id,
      },
    });
    privateUserAEventId = privEv.id;
  });

  afterAll(async () => {
    if (publicEventId) await prisma.event.delete({ where: { id: publicEventId } }).catch(() => {});
    if (privateUserAEventId) await prisma.event.delete({ where: { id: privateUserAEventId } }).catch(() => {});
    if (userA?.id) await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    if (userB?.id) await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    await prisma.$disconnect();
  });

  describe('1. Unmonitored Stock Protection', () => {
    it('User B attempting to mark read an unmonitored stock event writes 0 rows to user_event_reads', async () => {
      // User B does not monitor AAPL
      const res = await feedService.markRead(userB.id, [publicEventId]);
      expect(res.count).toBe(0);

      const userBReads = await prisma.userEventRead.count({
        where: { userId: userB.id, eventId: publicEventId },
      });
      expect(userBReads).toBe(0);
    });

    it('User B attempting to toggleSave an unmonitored stock event throws 404', async () => {
      await expect(feedService.toggleSave(userB.id, publicEventId)).rejects.toThrow();

      const userBSaves = await prisma.userSavedEvent.count({
        where: { userId: userB.id, eventId: publicEventId },
      });
      expect(userBSaves).toBe(0);
    });
  });

  describe('2. Private User Event Isolation', () => {
    it('User B cannot mark read or save User A private cumulative event', async () => {
      const res = await feedService.markRead(userB.id, [privateUserAEventId]);
      expect(res.count).toBe(0);

      await expect(eventService.markEventRead(privateUserAEventId, userB.id)).rejects.toThrow();
      await expect(eventService.saveEventForLater(privateUserAEventId, userB.id)).rejects.toThrow();

      const readCount = await prisma.userEventRead.count({
        where: { userId: userB.id, eventId: privateUserAEventId },
      });
      expect(readCount).toBe(0);
    });
  });

  describe('3. Legitimate Monitored Stock Read & Save for User A', () => {
    it('User A can successfully mark read and toggle save monitored events', async () => {
      const markRes = await feedService.markRead(userA.id, [publicEventId]);
      expect(markRes.count).toBeGreaterThanOrEqual(1);

      const readRow = await prisma.userEventRead.findUnique({
        where: { userId_eventId: { userId: userA.id, eventId: publicEventId } },
      });
      expect(readRow).toBeDefined();

      const saveRes = await feedService.toggleSave(userA.id, publicEventId);
      expect(saveRes.isSaved).toBe(true);

      const saveRow = await prisma.userSavedEvent.findUnique({
        where: { userId_eventId: { userId: userA.id, eventId: publicEventId } },
      });
      expect(saveRow).toBeDefined();
    });
  });
});
