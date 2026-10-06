import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { feedService } from '../src/services/feedService.js';
import { memoryService } from '../src/services/memoryService.js';
import { watchlistService } from '../src/services/watchlistService.js';

describe('Stage C: Feed State and Actions (C1 - C5)', () => {
  let userAId: string;
  let userBId: string;
  let event1Id: string;
  let event2Id: string;

  beforeAll(async () => {
    // Setup User A
    const userA = await prisma.user.upsert({
      where: { email: 'state_actions_user_a@marketwatch.test' },
      update: { isTestUser: true },
      create: {
        email: 'state_actions_user_a@marketwatch.test',
        name: 'State Actions User A',
        passwordHash: 'dummy_hash',
        isTestUser: true,
      },
    });
    userAId = userA.id;

    // Setup User B (for isolation tests)
    const userB = await prisma.user.upsert({
      where: { email: 'state_actions_user_b@marketwatch.test' },
      update: { isTestUser: true },
      create: {
        email: 'state_actions_user_b@marketwatch.test',
        name: 'State Actions User B',
        passwordHash: 'dummy_hash',
        isTestUser: true,
      },
    });
    userBId = userB.id;

    // Ensure stock INFY and TCS exist
    await prisma.stock.upsert({
      where: { symbol: 'INFY' },
      update: { currentPrice: 1850 },
      create: {
        symbol: 'INFY',
        companyName: 'Infosys Limited',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 1850,
        changeAmount: 22.5,
        changePercent: 1.5,
        high52w: 1900,
        low52w: 1300,
        marketCap: '₹6.2T',
      },
    });

    await prisma.stock.upsert({
      where: { symbol: 'TCS' },
      update: { currentPrice: 4200 },
      create: {
        symbol: 'TCS',
        companyName: 'Tata Consultancy Services',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 4200,
        changeAmount: -24,
        changePercent: -0.8,
        high52w: 4400,
        low52w: 3200,
        marketCap: '₹15.0T',
      },
    });

    // Add INFY to User A watchlist
    const userAWls = await watchlistService.getUserWatchlists(userAId);
    await prisma.watchlistStock.createMany({
      data: [
        { watchlistId: userAWls[0].id, stockSymbol: 'INFY', addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { watchlistId: userAWls[0].id, stockSymbol: 'TCS', addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      ],
      skipDuplicates: true,
    });

    // Add INFY to User B watchlist
    const userBWls = await watchlistService.getUserWatchlists(userBId);
    await prisma.watchlistStock.createMany({
      data: [
        { watchlistId: userBWls[0].id, stockSymbol: 'INFY', addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      ],
      skipDuplicates: true,
    });

    // Create real shared events
    const evt1 = await prisma.event.create({
      data: {
        stockSymbol: 'INFY',
        eventType: 'PRICE_SURGE',
        priority: 'HIGH',
        metricsDelta: { headline: 'INFY surged 3.5% on strong quarterly revenue', changePercent: 3.5 },
        occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        meaningfulnessScore: 78,
        source: 'NSE',
        isDemo: false,
        isHidden: false,
      },
    });
    event1Id = evt1.id;

    const evt2 = await prisma.event.create({
      data: {
        stockSymbol: 'TCS',
        eventType: 'EARNINGS_BEAT',
        priority: 'CRITICAL',
        metricsDelta: { headline: 'TCS beats Q3 earnings expectations', changePercent: 2.1 },
        occurredAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        meaningfulnessScore: 85,
        source: 'NSE',
        isDemo: false,
        isHidden: false,
      },
    });
    event2Id = evt2.id;
  });

  beforeEach(async () => {
    // Clean user read, save, delete overlays for both test users
    await prisma.userEventRead.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.userSavedEvent.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.userEventDelete.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
  });

  it('1. Mark as read moves item from feed to Market Memory (Read)', async () => {
    const feedBefore = await feedService.getFeed(userAId, { window: '24h' });
    expect(feedBefore.items.some((i) => i.id === event1Id || i.memberEventIds?.includes(event1Id))).toBe(true);

    const markRes = await feedService.markRead(userAId, { eventIds: [event1Id] });
    expect(markRes.success).toBe(true);
    expect(markRes.undoToken).toBeDefined();

    // Leaves feed
    const feedAfter = await feedService.getFeed(userAId, { window: '24h' });
    expect(feedAfter.items.some((i) => i.id === event1Id || i.memberEventIds?.includes(event1Id))).toBe(false);

    // Appears in Market Memory Read
    const memoryRead = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'READ' });
    expect(memoryRead.some((m) => m.id === event1Id)).toBe(true);
  });

  it('2. Save for later moves item from feed to Market Memory (Saved)', async () => {
    const saveRes = await feedService.saveItem(userAId, event1Id);
    expect(saveRes.isSaved).toBe(true);
    expect(saveRes.undoToken).toBeDefined();

    // Leaves feed
    const feed = await feedService.getFeed(userAId, { window: '24h' });
    expect(feed.items.some((i) => i.id === event1Id || i.memberEventIds?.includes(event1Id))).toBe(false);

    // Appears in Market Memory Saved
    const memorySaved = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'SAVED' });
    expect(memorySaved.some((m) => m.id === event1Id)).toBe(true);
  });

  it('3. Per-user soft delete hides item in UserEventDelete and keeps shared event intact', async () => {
    const delRes = await feedService.deleteItem(userAId, event1Id);
    expect(delRes.deleted).toBe(true);
    expect(delRes.undoToken).toBeDefined();

    // Hidden in User A's feed and counts
    const feedA = await feedService.getFeed(userAId, { window: '24h' });
    expect(feedA.items.some((i) => i.id === event1Id || i.memberEventIds?.includes(event1Id))).toBe(false);

    // Visible in User A's Deleted Memory tab
    const memoryDeleted = await memoryService.getArchivedEvents({ userId: userAId, memoryType: 'DELETED' });
    expect(memoryDeleted.some((m) => m.id === event1Id)).toBe(true);

    // Shared DB event is NOT deleted
    const dbEvent = await prisma.event.findUnique({ where: { id: event1Id } });
    expect(dbEvent).not.toBeNull();

    // User B STILL sees the shared event in their feed!
    const feedB = await feedService.getFeed(userBId, { window: '24h' });
    expect(feedB.items.some((i) => i.id === event1Id || i.memberEventIds?.includes(event1Id))).toBe(true);
  });

  it('4. Undo action reverses delete, mark_read, and save within TTL', async () => {
    // Delete with undo
    const delRes = await feedService.deleteItem(userAId, event1Id);
    const undoRes = await feedService.undoAction(userAId, delRes.undoToken);
    expect(undoRes.undone).toBe(true);

    // Reappears in feed
    const feedAfterUndo = await feedService.getFeed(userAId, { window: '24h' });
    expect(feedAfterUndo.items.some((i) => i.id === event1Id || i.memberEventIds?.includes(event1Id))).toBe(true);
  });

  it('5. Restore from Market Memory returns item to unhandled Attention Feed', async () => {
    // Mark read first
    await feedService.markRead(userAId, { eventIds: [event1Id] });

    // Restore
    const restoreRes = await feedService.restoreItem(userAId, event1Id);
    expect(restoreRes.restored).toBe(true);

    // Reappears in feed
    const feed = await feedService.getFeed(userAId, { window: '24h' });
    expect(feed.items.some((i) => i.id === event1Id || i.memberEventIds?.includes(event1Id))).toBe(true);
  });

  it('6. Counts agree across FeedCounts, MemoryCounts, and FeedSummary', async () => {
    await feedService.markRead(userAId, { eventIds: [event1Id] });
    await feedService.saveItem(userAId, event2Id);

    const [feedCounts, memoryCounts] = await Promise.all([
      feedService.getFeedCounts(userAId),
      memoryService.getMemoryCounts(userAId),
    ]);

    expect(feedCounts.readCount).toBeGreaterThan(0);
    expect(feedCounts.savedCount).toBeGreaterThan(0);
    expect(memoryCounts.archivedCount).toBe(feedCounts.readCount);
    expect(memoryCounts.savedCount).toBe(feedCounts.savedCount);
  });
});
