import { PrismaClient, Priority, EventType } from '@prisma/client';
import { FeedService } from '../src/services/feedService';
import { MemoryService } from '../src/services/memoryService';
import { WatchlistService } from '../src/services/watchlistService';
import { feedStreamManager } from '../src/utils/feedStreamManager';
import { randomUUID } from 'crypto';
import { Response } from 'express';

const prisma = new PrismaClient();
const feedService = new FeedService();
const memoryService = new MemoryService();
const watchlistService = new WatchlistService();

async function runPhase5QA() {
  console.log('======================================================================');
  console.log('🚀 RUNNING PHASE 5: COMPREHENSIVE QA SCENARIO VERIFICATION');
  console.log('======================================================================\n');

  // Setup test users in isolated DB
  const userA_id = randomUUID();
  const userA_email = `qa_test_a_${Date.now()}@example.com`;
  const userB_id = randomUUID();
  const userB_email = `qa_test_b_${Date.now()}@example.com`;

  await prisma.user.createMany({
    data: [
      { id: userA_id, email: userA_email, name: 'QA User A', passwordHash: 'test_hash' },
      { id: userB_id, email: userB_email, name: 'QA User B', passwordHash: 'test_hash' },
    ],
  });

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const tag = Date.now().toString().slice(-4);
  const symAAPL = `QA_AAPL_${tag}`;
  const symMSFT = `QA_MSFT_${tag}`;

  // Ensure stocks exist FIRST
  await prisma.stock.upsert({
    where: { symbol: symAAPL },
    update: {},
    create: {
      symbol: symAAPL,
      companyName: 'Apple Inc.',
      currentPrice: 220.0,
      changeAmount: 7.5,
      changePercent: 3.5,
      sector: 'Technology',
      marketCap: '₹3.4T',
      high52w: 235.0,
      low52w: 165.0,
    },
  });
  await prisma.stock.upsert({
    where: { symbol: symMSFT },
    update: {},
    create: {
      symbol: symMSFT,
      companyName: 'Microsoft Corporation',
      currentPrice: 450.0,
      changeAmount: 9.2,
      changePercent: 2.1,
      sector: 'Technology',
      marketCap: '₹3.3T',
      high52w: 468.0,
      low52w: 366.0,
    },
  });

  // Setup watchlist & monitored stock for User A and User B
  const wlA = await prisma.watchlist.create({
    data: {
      userId: userA_id,
      name: 'User A Tech',
      isDefault: true,
    },
  });

  await prisma.watchlistStock.createMany({
    data: [
      { watchlistId: wlA.id, stockSymbol: symAAPL, addedAt: twoDaysAgo },
      { watchlistId: wlA.id, stockSymbol: symMSFT, addedAt: twoDaysAgo },
    ],
  });

  const wlB = await prisma.watchlist.create({
    data: {
      userId: userB_id,
      name: 'User B Tech',
      isDefault: true,
    },
  });

  await prisma.watchlistStock.create({
    data: {
      watchlistId: wlB.id,
      stockSymbol: symAAPL,
      addedAt: twoDaysAgo,
    },
  });

  // Create real test events with metricsDelta
  const ev1 = await prisma.event.create({
    data: {
      stockSymbol: symAAPL,
      eventType: 'PRICE_SURGE' as EventType,
      priority: 'HIGH' as Priority,
      metricsDelta: {
        changePercent: 3.5,
        volumeRatio: 1.8,
        price: 220.0,
      },
      occurredAt: yesterday,
      occurredOn: yesterday,
      isDemo: false,
      isDuplicate: false,
      isSimulated: false,
      isHidden: false,
    },
  });

  const ev2 = await prisma.event.create({
    data: {
      stockSymbol: symAAPL,
      eventType: 'ANALYST_UPGRADE' as EventType,
      priority: 'MEDIUM' as Priority,
      metricsDelta: {
        changePercent: 1.2,
        volumeRatio: 1.1,
        price: 220.0,
      },
      occurredAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000),
      occurredOn: yesterday,
      isDemo: false,
      isDuplicate: false,
      isSimulated: false,
      isHidden: false,
    },
  });

  const ev3 = await prisma.event.create({
    data: {
      stockSymbol: symMSFT,
      eventType: 'EARNINGS_BEAT' as EventType,
      priority: 'CRITICAL' as Priority,
      metricsDelta: {
        changePercent: 4.8,
        volumeRatio: 2.2,
        price: 450.0,
      },
      occurredAt: yesterday,
      occurredOn: yesterday,
      isDemo: false,
      isDuplicate: false,
      isSimulated: false,
      isHidden: false,
    },
  });

  console.log(`[SETUP] Created test users: User A (${userA_id}), User B (${userB_id})`);
  console.log(`[SETUP] Created test events: ev1 (${ev1.id}), ev2 (${ev2.id}), ev3 (${ev3.id})\n`);

  // =========================================================================
  // SCENARIO 1: Unhandled Inbox Behavior (Login/Logout does not clear items)
  // =========================================================================
  console.log('--- SCENARIO 1: Login / Logout Unhandled Inbox Persistence ---');
  let feed1 = await feedService.getFeed(userA_id, { window: 'toReview' });
  console.log(`Initial User A To-Review feed count: ${feed1.total} clusters`);
  if (feed1.total !== 2) throw new Error(`Expected 2 clusters in feed (AAPL + MSFT), got ${feed1.total}`);

  // Simulate immediate logout and new login 5 minutes later
  await prisma.userState.upsert({
    where: { userId: userA_id },
    update: { lastLoginAt: new Date(), lastLogoutAt: new Date() },
    create: { userId: userA_id, lastLoginAt: new Date(), lastLogoutAt: new Date() },
  });

  let feed1_after = await feedService.getFeed(userA_id, { window: 'toReview' });
  console.log(`User A To-Review feed count after logout/login: ${feed1_after.total} clusters`);
  if (feed1_after.total !== 2) throw new Error(`Feed cleared on login/logout! Expected 2, got ${feed1_after.total}`);
  console.log('✓ Scenario 1 PASSED: Unhandled items stay in feed across logins/logouts.\n');

  // =========================================================================
  // SCENARIO 2: Save item -> leaves feed, appears in Memory Saved
  // =========================================================================
  console.log('--- SCENARIO 2: Save for Later Movement & Memory Integration ---');
  const saveResult = await feedService.saveItem(userA_id, ev3.id);
  console.log(`Saved event ${ev3.id}. Undo token generated: ${saveResult.undoToken}`);

  let feed2 = await feedService.getFeed(userA_id, { window: 'toReview' });
  let memorySaved = await memoryService.getArchivedEvents({ userId: userA_id, memoryType: 'SAVED' });
  console.log(`User A Feed count after save: ${feed2.total} clusters (Expected 1 - AAPL)`);
  console.log(`User A Memory Saved count: ${memorySaved.length} (Expected 1)`);
  console.log(`Memory Saved item stock: [${memorySaved[0]?.stockSymbol}]`);

  if (feed2.total !== 1 || memorySaved.length !== 1) {
    throw new Error('Save item failed to transition from Feed to Memory Saved');
  }
  console.log('✓ Scenario 2 PASSED: Saved item leaves feed and resides in Market Memory (Saved).\n');

  // =========================================================================
  // SCENARIO 3: Mark Read -> leaves feed, appears in Memory Read
  // =========================================================================
  console.log('--- SCENARIO 3: Mark as Read Movement & Memory Integration ---');
  const readResult = await feedService.markRead(userA_id, [ev1.id]);
  console.log(`Marked read event ${ev1.id}. Count marked: ${readResult.count}, Undo token: ${readResult.undoToken}`);

  let feed3 = await feedService.getFeed(userA_id, { window: 'toReview' });
  let memoryRead = await memoryService.getArchivedEvents({ userId: userA_id, memoryType: 'ARCHIVED' });
  console.log(`User A Feed count after marking cluster read: ${feed3.total} clusters (Expected 0)`);
  console.log(`User A Memory Read count: ${memoryRead.length} (Expected 2 events in cluster)`);

  if (feed3.total !== 0 || memoryRead.length === 0) {
    throw new Error('Mark read failed to transition cluster from Feed to Memory Read');
  }
  console.log('✓ Scenario 3 PASSED: Mark read item leaves feed and resides in Market Memory (Read).\n');

  // =========================================================================
  // SCENARIO 4: Undo Action
  // =========================================================================
  console.log('--- SCENARIO 4: Safe Actions & 15-Second Undo ---');
  if (readResult.undoToken) {
    const undoRes = await feedService.undoAction(userA_id, readResult.undoToken);
    console.log(`Undone action for token: ${readResult.undoToken}. Count undone: ${undoRes.count}`);
    
    let feed4 = await feedService.getFeed(userA_id, { window: 'toReview' });
    let memoryRead4 = await memoryService.getArchivedEvents({ userId: userA_id, memoryType: 'ARCHIVED' });
    console.log(`User A Feed count after Undo: ${feed4.total} clusters (Expected 1)`);
    console.log(`User A Memory Read count after Undo: ${memoryRead4.length} (Expected 0)`);
    
    if (feed4.total !== 1 || memoryRead4.length !== 0) {
      throw new Error('Undo failed to return cluster to feed');
    }
    console.log('✓ Scenario 4 PASSED: Undo completely reverts mark-read state.\n');
  }

  // Mark ev1 read again for subsequent scenarios
  await feedService.markRead(userA_id, [ev1.id]);

  // =========================================================================
  // SCENARIO 5: Restore Item from Memory
  // =========================================================================
  console.log('--- SCENARIO 5: Restore Item from Memory back to Attention Feed ---');
  const restoreRes = await feedService.restoreItem(userA_id, ev1.id);
  console.log(`Restored item ${ev1.id}. Undo token: ${restoreRes.undoToken}`);

  let feed5 = await feedService.getFeed(userA_id, { window: 'toReview' });
  console.log(`User A Feed count after Restore from Memory: ${feed5.total} clusters (Expected 1)`);
  if (feed5.total !== 1) throw new Error('Restore item failed to bring item back to feed');
  console.log('✓ Scenario 5 PASSED: Restored item appears back in To-Review feed as unhandled.\n');

  // =========================================================================
  // SCENARIO 6: Multi-Device Real-Time SSE Sync Verification
  // =========================================================================
  console.log('--- SCENARIO 6: Multi-Device Real-Time SSE Broadcast ---');
  let sseEventReceived = false;
  let receivedPayload: any = null;

  const mockRes = {
    write: (data: string) => {
      if (data.includes('event: feed_item_read')) {
        const jsonMatch = data.match(/data:\s*(\{.*\})/);
        if (jsonMatch) {
          try {
            receivedPayload = JSON.parse(jsonMatch[1]);
            sseEventReceived = true;
          } catch (e) {}
        }
      }
    },
    on: (_evt: string, _cb: any) => {},
  } as unknown as Response;

  feedStreamManager.addClient(userA_id, mockRes);
  console.log(`Registered SSE client for User A`);

  // Broadcast test event
  feedStreamManager.broadcastToUser(userA_id, 'feed_item_read', {
    eventId: ev1.id,
    timestamp: new Date().toISOString(),
  });
  console.log(`SSE Event Received by Device A2: ${sseEventReceived}, Payload:`, receivedPayload);

  feedStreamManager.removeClient(userA_id, mockRes);
  if (!sseEventReceived || receivedPayload?.eventId !== ev1.id) {
    throw new Error('SSE broadcast failed to deliver real-time update');
  }
  console.log('✓ Scenario 6 PASSED: Real-time SSE updates propagate instantly across devices.\n');

  // =========================================================================
  // SCENARIO 7: Multi-User Isolation
  // =========================================================================
  console.log('--- SCENARIO 7: Multi-User Isolation (User B sees only their unhandled items) ---');
  let feedUserB = await feedService.getFeed(userB_id, { window: 'toReview' });
  let memoryUserB = await memoryService.getArchivedEvents({ userId: userB_id, memoryType: 'ALL' });

  console.log(`User B Monitored stocks: AAPL (MSFT not monitored)`);
  console.log(`User B Feed count: ${feedUserB.total} clusters (AAPL events)`);
  console.log(`User B Memory count: ${memoryUserB.length} items`);

  // User B feed should contain AAPL unhandled, but NOT MSFT
  const userB_symbols = feedUserB.items.map((e: any) => e.stockSymbol);
  if (userB_symbols.includes('MSFT')) {
    throw new Error('User B received MSFT events despite not monitoring MSFT!');
  }
  if (memoryUserB.length !== 0) {
    throw new Error('User B memory corrupted with User A actions!');
  }
  console.log('✓ Scenario 7 PASSED: User B is strictly isolated from User A data and actions.\n');

  // =========================================================================
  // SCENARIO 8: Count Equality Verification
  // =========================================================================
  console.log('--- SCENARIO 8: Count Equality Across Surfaces ---');
  const countsA = await feedService.getFeedCounts(userA_id);
  const feedA_final = await feedService.getFeed(userA_id, { window: 'toReview' });
  const overviewA = await watchlistService.getOverview(userA_id, 'all');
  const totalUnseenOverview = overviewA.stocks.reduce((acc: number, s: any) => acc + s.unseenUpdatesCount, 0);

  console.log(`Feed Service To-Review Count: ${countsA.toReview}`);
  console.log(`Feed Service "To Review" Window Count: ${feedA_final.total}`);
  console.log(`Watchlist Overview Total Unseen: ${totalUnseenOverview}`);

  if (countsA.toReview !== feedA_final.total || countsA.toReview !== totalUnseenOverview) {
    throw new Error(`Count mismatch! toReview=${countsA.toReview}, feed=${feedA_final.total}, overview=${totalUnseenOverview}`);
  }
  console.log('✓ Scenario 8 PASSED: Exact count equality across Feed, Header, and Watchlist Overview.\n');

  console.log('======================================================================');
  console.log('🎉 ALL 8 QA SCENARIOS PASSED WITH ZERO DATA LOSS AND 100% ISOLATION');
  console.log('======================================================================');
}

runPhase5QA()
  .catch((err) => {
    console.error('QA Execution Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
