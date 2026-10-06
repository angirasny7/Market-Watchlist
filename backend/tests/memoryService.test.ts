import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { memoryService } from '../src/services/memoryService.js';
import { Priority, EventType } from '@prisma/client';

describe('Market Memory Single Source of Truth & Invariants', () => {
  let user1Id: string;
  let user2Id: string;
  let stockSymbol1 = 'TESTMEM1';
  let stockSymbol2 = 'TESTMEM2';
  let event1Id: string;
  let event2Id: string;
  let event3Id: string;

  beforeAll(async () => {
    // 1. Create 2 isolated test users
    const user1 = await prisma.user.create({
      data: {
        email: `mem_test_u1_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        name: 'Memory Test User 1',
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `mem_test_u2_${Date.now()}@example.com`,
        passwordHash: 'hash123',
        name: 'Memory Test User 2',
      },
    });
    user2Id = user2.id;

    // 2. Create test stocks
    await prisma.stock.upsert({
      where: { symbol: stockSymbol1 },
      create: {
        symbol: stockSymbol1,
        companyName: 'Test Memory Corp 1',
        sector: 'Technology',
        exchange: 'NSE',
        currency: '₹',
        currentPrice: 2500.0,
        changeAmount: 85.0,
        changePercent: 3.5,
        marketCap: '500B',
        high52w: 2600.0,
        low52w: 1800.0,
      },
      update: {
        currentPrice: 2500.0,
      },
    });

    await prisma.stock.upsert({
      where: { symbol: stockSymbol2 },
      create: {
        symbol: stockSymbol2,
        companyName: 'Test Memory Corp 2',
        sector: 'Finance',
        exchange: 'NSE',
        currency: '₹',
        currentPrice: 1000.0,
        changeAmount: -20.0,
        changePercent: -2.0,
        marketCap: '200B',
        high52w: 1200.0,
        low52w: 900.0,
      },
      update: {
        currentPrice: 1000.0,
      },
    });

    // 3. Create test events
    const ev1 = await prisma.event.create({
      data: {
        stockSymbol: stockSymbol1,
        eventType: EventType.PRICE_SURGE,
        priority: Priority.HIGH,
        timestamp: new Date(Date.now() - 3600 * 1000),
        occurredAt: new Date(Date.now() - 3600 * 1000),
        detectedAt: new Date(Date.now() - 3600 * 1000),
        metricsDelta: { headline: 'Test Corp 1 Surges 3.5%' },
        isDemo: false,
        isHidden: false,
        isDuplicate: false,
        isInvalidated: false,
        isSimulated: false,
      },
    });
    event1Id = ev1.id;

    const ev2 = await prisma.event.create({
      data: {
        stockSymbol: stockSymbol2,
        eventType: EventType.PRICE_DROP,
        priority: Priority.CRITICAL,
        timestamp: new Date(Date.now() - 7200 * 1000),
        occurredAt: new Date(Date.now() - 7200 * 1000),
        detectedAt: new Date(Date.now() - 7200 * 1000),
        metricsDelta: { headline: 'Test Corp 2 Drops 2%' },
        isDemo: false,
        isHidden: false,
        isDuplicate: false,
        isInvalidated: false,
        isSimulated: false,
      },
    });
    event2Id = ev2.id;

    const ev3 = await prisma.event.create({
      data: {
        stockSymbol: stockSymbol1,
        eventType: EventType.VOLUME_SPIKE,
        priority: Priority.MEDIUM,
        timestamp: new Date(Date.now() - 10800 * 1000),
        occurredAt: new Date(Date.now() - 10800 * 1000),
        detectedAt: new Date(Date.now() - 10800 * 1000),
        metricsDelta: { headline: 'Test Corp 1 Volume Spike 2.5x' },
        isDemo: false,
        isHidden: false,
        isDuplicate: false,
        isInvalidated: false,
        isSimulated: false,
      },
    });
    event3Id = ev3.id;

    // Seed initial states for user 1:
    // Event 1 -> Saved (with priceAtSave 2000.00 and note)
    await prisma.userSavedEvent.create({
      data: {
        userId: user1Id,
        eventId: event1Id,
        savedAt: new Date(),
        priceAtSave: 2000.0,
        note: 'Breakout observation note',
      },
    });

    // Event 2 -> Read
    await prisma.userEventRead.create({
      data: {
        userId: user1Id,
        eventId: event2Id,
        readAt: new Date(),
        readSource: 'manual',
      },
    });

    // Event 3 -> Deleted (expires in 30 days)
    await prisma.userEventDelete.create({
      data: {
        userId: user1Id,
        eventId: event3Id,
        deletedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records safely
    const uIds = [user1Id, user2Id].filter(Boolean);
    const evIds = [event1Id, event2Id, event3Id].filter(Boolean);
    const syms = [stockSymbol1, stockSymbol2].filter(Boolean);

    if (uIds.length > 0) {
      await prisma.userSavedEvent.deleteMany({ where: { userId: { in: uIds } } });
      await prisma.userEventRead.deleteMany({ where: { userId: { in: uIds } } });
      await prisma.userEventDelete.deleteMany({ where: { userId: { in: uIds } } });
    }
    if (evIds.length > 0) {
      await prisma.event.deleteMany({ where: { id: { in: evIds } } });
    }
    if (syms.length > 0) {
      await prisma.stock.deleteMany({ where: { symbol: { in: syms } } });
    }
    if (uIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: uIds } } });
    }
  });

  it('1. Count invariant: getMemoryCounts matches getMemoryItems length exactly', async () => {
    const counts = await memoryService.getMemoryCounts(user1Id);
    const savedRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED' });
    const readRes = await memoryService.getMemoryItems(user1Id, { tab: 'READ' });
    const deletedRes = await memoryService.getMemoryItems(user1Id, { tab: 'DELETED' });

    expect(counts.savedCount).toBe(savedRes.items.length);
    expect(counts.readCount).toBe(readRes.items.length);
    expect(counts.deletedCount).toBe(deletedRes.items.length);
    expect(counts.savedCount).toBe(1);
    expect(counts.readCount).toBe(1);
    expect(counts.deletedCount).toBe(1);
  });

  it('2. Saved items contain accurate priceAtSave, delta % and note', async () => {
    const savedRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED' });
    const item = savedRes.items.find((i) => i.id === event1Id);

    expect(item).toBeDefined();
    expect(item?.priceAtSave).toBe(2000.0);
    expect(item?.currentPrice).toBe(2500.0);
    // (2500 - 2000) / 2000 * 100 = 25.00%
    expect(item?.priceChangeSinceSaved).toBe(25.0);
    expect(item?.note).toBe('Breakout observation note');
  });

  it('3. updateNote updates and clears personal note correctly', async () => {
    // Update note
    const updateRes = await memoryService.updateNote(user1Id, event1Id, 'Updated strategic hypothesis');
    expect(updateRes.success).toBe(true);
    expect(updateRes.note).toBe('Updated strategic hypothesis');

    let savedRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED' });
    let item = savedRes.items.find((i) => i.id === event1Id);
    expect(item?.note).toBe('Updated strategic hypothesis');

    // Filter hasNote
    const hasNoteRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED', hasNote: true });
    expect(hasNoteRes.items.length).toBe(1);

    // Clear note
    await memoryService.updateNote(user1Id, event1Id, null);
    savedRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED' });
    item = savedRes.items.find((i) => i.id === event1Id);
    expect(item?.note).toBeNull();

    const emptyNoteRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED', hasNote: true });
    expect(emptyNoteRes.items.length).toBe(0);
  });

  it('4. Search, priority filter, and sorting work correctly', async () => {
    // Search by ticker
    const searchRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED', search: 'TESTMEM1' });
    expect(searchRes.items.length).toBe(1);

    // Search for non-existent text
    const noMatchRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED', search: 'NONEXISTENT' });
    expect(noMatchRes.items.length).toBe(0);

    // Filter by priority
    const prioRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED', priority: 'HIGH' });
    expect(prioRes.items.length).toBe(1);

    const wrongPrioRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED', priority: 'LOW' });
    expect(wrongPrioRes.items.length).toBe(0);
  });

  it('5. User isolation: user 2 sees 0 memory items from user 1', async () => {
    const user2Counts = await memoryService.getMemoryCounts(user2Id);
    expect(user2Counts.savedCount).toBe(0);
    expect(user2Counts.readCount).toBe(0);
    expect(user2Counts.deletedCount).toBe(0);

    const user2Saved = await memoryService.getMemoryItems(user2Id, { tab: 'SAVED' });
    expect(user2Saved.items.length).toBe(0);
  });

  it('6. restoreToFeed removes item from memory and returns valid undo token', async () => {
    const restoreRes = await memoryService.restoreToFeed(user1Id, event2Id);
    expect(restoreRes.success).toBe(true);
    expect(restoreRes.undoToken).toBeDefined();

    const readRes = await memoryService.getMemoryItems(user1Id, { tab: 'READ' });
    expect(readRes.items.some((i) => i.id === event2Id)).toBe(false);
  });

  it('7. Deleting a saved item moves it into DELETED tab with 30-day expiration', async () => {
    // Import feedService to perform soft deletion
    const { feedService } = await import('../src/services/feedService.js');
    const deleteRes = await feedService.deleteItem(user1Id, event1Id);
    expect(deleteRes.deleted).toBe(true);

    // Saved count should now be 0, Deleted count should include event1Id
    const counts = await memoryService.getMemoryCounts(user1Id);
    expect(counts.savedCount).toBe(0);

    const savedRes = await memoryService.getMemoryItems(user1Id, { tab: 'SAVED' });
    expect(savedRes.items.some((i) => i.id === event1Id)).toBe(false);

    const deletedRes = await memoryService.getMemoryItems(user1Id, { tab: 'DELETED' });
    expect(deletedRes.items.some((i) => i.id === event1Id)).toBe(true);
  });

  it('8. Permanently deleting an item removes it completely from DELETED tab and updates count', async () => {
    const permDeleteRes = await memoryService.permanentlyDeleteItem(user1Id, event1Id);
    expect(permDeleteRes.success).toBe(true);
    expect(permDeleteRes.eventId).toBe(event1Id);

    const counts = await memoryService.getMemoryCounts(user1Id);
    // event3Id was initial deleted event, event1Id was deleted then permanently deleted
    expect(counts.deletedCount).toBe(1);

    const deletedRes = await memoryService.getMemoryItems(user1Id, { tab: 'DELETED' });
    expect(deletedRes.items.some((i) => i.id === event1Id)).toBe(false);
  });
});
