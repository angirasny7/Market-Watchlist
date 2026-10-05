import { prisma } from '../src/config/prisma.js';
import { feedService } from '../src/services/feedService.js';
import { memoryService } from '../src/services/memoryService.js';
import { watchlistService } from '../src/services/watchlistService.js';

async function auditFeedAndMemory() {
  console.log('========================================================================');
  console.log('  COMPREHENSIVE AUDIT: ATTENTION FEED, MARKET MEMORY & READ/SAVED STATE');
  console.log('========================================================================\n');

  const alex = await prisma.user.findUnique({
    where: { email: 'alex@example.com' },
    include: {
      userState: true,
      watchlists: {
        include: {
          stocks: true,
        },
      },
    },
  });

  if (!alex) {
    console.error('User alex@example.com not found!');
    return;
  }

  const userId = alex.id;
  console.log(`👤 User: ${alex.name} (${alex.email}) | ID: ${userId}`);
  console.log(`📅 Previous Session Ended At: ${alex.userState?.previousSessionEndedAt?.toISOString() || 'None'}`);
  console.log(`📅 Last Login At:             ${alex.userState?.lastLoginAt?.toISOString() || 'None'}`);
  console.log(`📅 Last Activity At:          ${alex.userState?.lastActivityAt?.toISOString() || 'None'}\n`);

  // 1. Table Row Counts for User
  const [readsCount, savesCount, digestReadsCount, totalEventsInDb, totalStocksInDb] = await Promise.all([
    prisma.userEventRead.count({ where: { userId } }),
    prisma.userSavedEvent.count({ where: { userId } }),
    prisma.userDigestRead.count({ where: { userId } }),
    prisma.event.count(),
    prisma.stock.count(),
  ]);

  console.log(`📊 Current Table Counts for Alex:`);
  console.log(`  • UserEventRead rows:   ${readsCount}`);
  console.log(`  • UserSavedEvent rows:  ${savesCount}`);
  console.log(`  • UserDigestRead rows:  ${digestReadsCount}`);
  console.log(`  • Total Events in DB:   ${totalEventsInDb}`);
  console.log(`  • Total Stocks in DB:   ${totalStocksInDb}\n`);

  // 2. Monitored Symbols
  const monitoredStocks = alex.watchlists.flatMap((w) => w.stocks);
  const monitoredSymbols = Array.from(new Set(monitoredStocks.map((s) => s.stockSymbol))).sort();
  console.log(`📋 Monitored Symbols (${monitoredSymbols.length}): [${monitoredSymbols.join(', ')}]\n`);

  // 3. Event Types in DB and Creators
  const eventTypeCounts = await prisma.event.groupBy({
    by: ['eventType'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  console.log(`🏷️ Event Types in DB Breakdown:`);
  console.table(eventTypeCounts.map((e) => ({ 'Event Type': e.eventType, Count: e._count.id })));

  // 4. Feed Counts per Window
  const [summary, feedSince, feed24h, feed7d, feed30d] = await Promise.all([
    feedService.getSummary(userId),
    feedService.getFeed(userId, { window: 'sinceLastVisit', limit: 1000 }),
    feedService.getFeed(userId, { window: '24h', limit: 1000 }),
    feedService.getFeed(userId, { window: '7d', limit: 1000 }),
    feedService.getFeed(userId, { window: '30d', limit: 1000 }),
  ]);

  console.log(`\n📰 Attention Feed Counts:`);
  console.log(`  • Feed Summary unreadClusters: ${summary.unreadClusters}`);
  console.log(`  • Feed Summary needAttention:  ${summary.needAttentionCount}`);
  console.log(`  • Window Breakdown:`, summary.windowCounts);
  console.log(`  • Clustered Items Count:`);
  console.log(`    - Since Last Visit: ${feedSince.total} total, ${feedSince.unreadCount} unread`);
  console.log(`    - Last 24 Hours:    ${feed24h.total} total, ${feed24h.unreadCount} unread`);
  console.log(`    - Last 7 Days:      ${feed7d.total} total, ${feed7d.unreadCount} unread`);
  console.log(`    - Last 30 Days:     ${feed30d.total} total, ${feed30d.unreadCount} unread`);

  // 5. Watchlist Overview Unseen Updates
  const overview = await watchlistService.getOverview(userId, 'all');
  console.log(`\n👁️ Watchlist Overview Summary:`);
  console.log(`  • Total Stocks Monitored: ${overview.summary.totalStocks}`);
  console.log(`  • Unseen Updates Count:   ${overview.summary.unseenUpdates}`);
  console.log(`  • Need Attention Count:   ${overview.summary.needAttention}`);

  // 6. Market Memory Counts
  const memoryCounts = await memoryService.getMemoryCounts(userId);
  console.log(`\n🧠 Market Memory Counts:`);
  console.log(`  • Archived (Read) Count:  ${memoryCounts.archivedCount}`);
  console.log(`  • Saved Count:            ${memoryCounts.savedCount}`);
  console.log(`  • Total Memory Items:     ${memoryCounts.totalCount}`);

  // 7. Retention Analysis: How many unhandled items older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const readEventIds = (await prisma.userEventRead.findMany({ where: { userId }, select: { eventId: true } })).map((r) => r.eventId);
  const savedEventIds = (await prisma.userSavedEvent.findMany({ where: { userId }, select: { eventId: true } })).map((s) => s.eventId);
  const handledIds = new Set([...readEventIds, ...savedEventIds]);

  const monitoredEvents = await prisma.event.findMany({
    where: {
      stockSymbol: { in: monitoredSymbols },
      AND: [{ OR: [{ userId: null }, { userId }] }],
      isSimulated: false,
    },
    select: { id: true, stockSymbol: true, occurredAt: true, timestamp: true },
  });

  const olderThan30dUnhandled = monitoredEvents.filter((e) => {
    const time = e.occurredAt || e.timestamp;
    return time < thirtyDaysAgo && !handledIds.has(e.id);
  });

  console.log(`\n⏳ Retention Analysis (30-day window):`);
  console.log(`  • Total Monitored Events in DB:            ${monitoredEvents.length}`);
  console.log(`  • Handled Events (Read or Saved):          ${monitoredEvents.filter((e) => handledIds.has(e.id)).length}`);
  console.log(`  • Unhandled Events within 30 days:         ${monitoredEvents.filter((e) => !handledIds.has(e.id) && (e.occurredAt || e.timestamp) >= thirtyDaysAgo).length}`);
  console.log(`  • DRY-RUN: Unhandled Events older than 30d (would be auto-archived): ${olderThan30dUnhandled.length}`);

  console.log('========================================================================\n');
}

auditFeedAndMemory()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
