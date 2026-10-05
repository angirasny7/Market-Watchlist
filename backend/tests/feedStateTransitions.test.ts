import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { feedService } from '../src/services/feedService.js';
import { memoryService } from '../src/services/memoryService.js';
import { watchlistService } from '../src/services/watchlistService.js';

const prisma = new PrismaClient();

describe('Phase 1: Feed State Transitions, Safe Actions & Memory Integrity', () => {
  let userAId: string;
  let userBId: string;
  let testStockSymbol = 'INFY';
  let createdEventIds: string[] = [];

  beforeAll(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Create isolated test users
    const userA = await prisma.user.upsert({
      where: { email: 'test_phase1_usera@marketwatch.test' },
      update: { isTestUser: true, createdAt: thirtyDaysAgo },
      create: {
        email: 'test_phase1_usera@marketwatch.test',
        name: 'Phase 1 User A',
        passwordHash: 'dummy_hash',
        isTestUser: true,
        createdAt: thirtyDaysAgo,
        userState: {
          create: {
            previousSessionEndedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            previousSessionAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.upsert({
      where: { email: 'test_phase1_userb@marketwatch.test' },
      update: { isTestUser: true, createdAt: thirtyDaysAgo },
      create: {
        email: 'test_phase1_userb@marketwatch.test',
        name: 'Phase 1 User B',
        passwordHash: 'dummy_hash',
        isTestUser: true,
        createdAt: thirtyDaysAgo,
        userState: {
          create: {
            previousSessionEndedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            previousSessionAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
        },
      },
    });
    userBId = userB.id;

    // Explicitly ensure user createdAt is 30 days ago in DB
    await prisma.user.updateMany({
      where: { id: { in: [userAId, userBId] } },
      data: { createdAt: thirtyDaysAgo },
    });

    // Clean any prior state for these test users
    await prisma.userEventRead.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.userSavedEvent.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.watchlistStock.deleteMany({ where: { watchlist: { userId: { in: [userAId, userBId] } } } });

    // Set up watchlists
    const [wlA] = await watchlistService.getUserWatchlists(userAId);
    const [wlB] = await watchlistService.getUserWatchlists(userBId);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.watchlistStock.create({
      data: { watchlistId: wlA.id, stockSymbol: testStockSymbol, addedAt: sevenDaysAgo },
    });
    await prisma.watchlistStock.create({
      data: { watchlistId: wlB.id, stockSymbol: testStockSymbol, addedAt: sevenDaysAgo },
    });

    // Create a series of distinct real test events within 7 days
    const ev1 = await prisma.event.create({
      data: {
        stockSymbol: testStockSymbol,
        eventType: 'PRICE_SURGE',
        priority: 'HIGH',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        occurredOn: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        occurredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(),
        isDemo: false,
        metricsDelta: { changePercent: 5.2, price: 1850 },
      },
    });

    const ev2 = await prisma.event.create({
      data: {
        stockSymbol: testStockSymbol,
        eventType: 'VOLUME_SPIKE',
        priority: 'MEDIUM',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        occurredOn: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        occurredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(),
        isDemo: false,
        metricsDelta: { changePercent: 1.2, volumeRatio: 2.5 },
      },
    });

    const evOldBeforeWatched = await prisma.event.create({
      data: {
        stockSymbol: testStockSymbol,
        eventType: 'PRICE_DROP',
        priority: 'LOW',
        timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        occurredOn: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        occurredAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(),
        isDemo: false,
        metricsDelta: { changePercent: -5.1 },
      },
    });

    createdEventIds = [ev1.id, ev2.id, evOldBeforeWatched.id];
  });

  afterAll(async () => {
    if (createdEventIds.length > 0) {
      await prisma.userEventRead.deleteMany({ where: { eventId: { in: createdEventIds } } });
      await prisma.userSavedEvent.deleteMany({ where: { eventId: { in: createdEventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    }
    await prisma.$disconnect();
  });

  it('1. watchedSince scoping: events occurred before user watched the stock are excluded', async () => {
    const feed = await feedService.getFeed(userAId, { window: '30d' });
    const allMemberIds = feed.items.flatMap((i) => [i.id, ...i.memberEventIds]);

    // evOldBeforeWatched happened 20 days ago, stock watched since 7 days ago -> must be excluded
    expect(allMemberIds).not.toContain(createdEventIds[2]);
    // ev1 and ev2 happened within 7 days -> must be present
    expect(allMemberIds).toContain(createdEventIds[0]);
    expect(allMemberIds).toContain(createdEventIds[1]);
  });

  it('2. Attention Feed is an inbox: unhandled events stay in feed across sessions', async () => {
    const initialCounts = await feedService.getFeedCounts(userAId);
    expect(initialCounts.toReview).toBeGreaterThanOrEqual(1);

    const initialFeed = await feedService.getFeed(userAId, { window: 'toReview' });
    expect(initialFeed.items.length).toBeGreaterThanOrEqual(1);
  });

  it('3. Mark as read: item leaves feed and moves to Market Memory Read', async () => {
    const targetEventId = createdEventIds[0];

    const markRes = await feedService.markRead(userAId, { eventIds: [targetEventId] });
    expect(markRes.success).toBe(true);
    expect(markRes.undoToken).toBeTruthy();

    // Leaves feed
    const feedAfter = await feedService.getFeed(userAId, { window: 'toReview' });
    const feedAllIds = feedAfter.items.flatMap((i) => [i.id, ...i.memberEventIds]);
    expect(feedAllIds).not.toContain(targetEventId);

    // Appears in Market Memory Read
    const memoryRead = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'READ' });
    const memoryIds = memoryRead.map((m) => m.id);
    expect(memoryIds).toContain(targetEventId);

    // User B is unaffected (multi-user isolation)
    const userBFeed = await feedService.getFeed(userBId, { window: 'toReview' });
    const userBAllIds = userBFeed.items.flatMap((i) => [i.id, ...i.memberEventIds]);
    expect(userBAllIds).toContain(targetEventId);
  });

  it('4. Undo mark as read: reverses read action and restores item to Attention Feed', async () => {
    const targetEventId = createdEventIds[0];
    const markRes = await feedService.markRead(userAId, { eventIds: [targetEventId] });

    const undoRes = await feedService.undoAction(userAId, markRes.undoToken);
    expect(undoRes.undone).toBe(true);

    // Returns to feed
    const feedAfterUndo = await feedService.getFeed(userAId, { window: 'toReview' });
    const feedAllIds = feedAfterUndo.items.flatMap((i) => [i.id, ...i.memberEventIds]);
    expect(feedAllIds).toContain(targetEventId);

    // Removed from Memory Read
    const memoryRead = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'READ' });
    expect(memoryRead.map((m) => m.id)).not.toContain(targetEventId);
  });

  it('5. Save for later: item leaves feed and appears in Market Memory Saved', async () => {
    const targetEventId = createdEventIds[1];

    const saveRes = await feedService.saveItem(userAId, targetEventId);
    expect(saveRes.isSaved).toBe(true);
    expect(saveRes.undoToken).toBeTruthy();

    // Leaves feed
    const feedAfter = await feedService.getFeed(userAId, { window: 'toReview' });
    const feedAllIds = feedAfter.items.flatMap((i) => [i.id, ...i.memberEventIds]);
    expect(feedAllIds).not.toContain(targetEventId);

    // Appears in Memory Saved
    const memorySaved = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'SAVED' });
    expect(memorySaved.map((m) => m.id)).toContain(targetEventId);
  });

  it('6. Unsave: if never read, returns to Attention Feed as unhandled', async () => {
    const targetEventId = createdEventIds[1];

    const unsaveRes = await feedService.unsaveItem(userAId, targetEventId);
    expect(unsaveRes.isSaved).toBe(false);
    expect(unsaveRes.isInFeed).toBe(true);

    // Returns to feed
    const feedAfter = await feedService.getFeed(userAId, { window: 'toReview' });
    const feedAllIds = feedAfter.items.flatMap((i) => [i.id, ...i.memberEventIds]);
    expect(feedAllIds).toContain(targetEventId);
  });

  it('7. Restore item: removes read/saved and brings item back to feed', async () => {
    const targetEventId = createdEventIds[0];
    await feedService.markRead(userAId, { eventIds: [targetEventId] });

    const restoreRes = await feedService.restoreItem(userAId, targetEventId);
    expect(restoreRes.restored).toBe(true);

    const feedAfter = await feedService.getFeed(userAId, { window: 'toReview' });
    const feedAllIds = feedAfter.items.flatMap((i) => [i.id, ...i.memberEventIds]);
    expect(feedAllIds).toContain(targetEventId);
  });

  it('8. Count safety guard: refuses bulk read if count differs by > +/- 2', async () => {
    await expect(
      feedService.markRead(userAId, {
        filter: 'toReview',
        expectedCount: 999, // deliberate huge mismatch
      })
    ).rejects.toThrow(/Count mismatch/);
  });

  it('9. Single counts function: getFeedCounts returns identical counts matching feed and memory', async () => {
    const counts = await feedService.getFeedCounts(userAId);
    const feed = await feedService.getFeed(userAId, { window: 'toReview', limit: 1000 });
    const memoryRead = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'READ' });
    const memorySaved = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'SAVED' });

    expect(counts.toReview).toBe(feed.items.length);
    expect(counts.readCount).toBe(memoryRead.length);
    expect(counts.savedCount).toBe(memorySaved.length);
  });
});
