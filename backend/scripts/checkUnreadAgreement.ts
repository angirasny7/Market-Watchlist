import { PrismaClient } from '@prisma/client';
import { eventService } from '../src/services/eventService.js';
import { watchlistService } from '../src/services/watchlistService.js';

const prisma = new PrismaClient();

async function main() {
  const userArg = process.argv.slice(2).find((a, i, arr) => arr[i - 1] === '--user') || process.argv.slice(2)[0];
  if (!userArg) {
    console.error('Usage: npx tsx backend/scripts/checkUnreadAgreement.ts --user <email or userId>');
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: userArg }, { id: userArg }] },
  });
  if (!user) {
    console.error(`User '${userArg}' not found.`);
    return;
  }

  const userId = user.id;

  // 1. Single source of truth backend count
  const unreadFeedCount = await eventService.getUnreadFeedCount(userId);

  // 2. Feed events query (what FeedHeader and MarkAllRead receive)
  const feedEvents = await eventService.getEvents({ userId });
  const feedUnreadEvents = feedEvents.filter((e) => !e.read);

  // 3. Watchlist overview for "all"
  const allOverview = await watchlistService.getOverview(userId, 'all');

  console.log(`=== UNREAD COUNT AUDIT FOR USER: ${user.name} (${user.email}, ID: ${userId}) ===\n`);
  console.log(`1. eventService.getUnreadFeedCount (Backend Truth): ${unreadFeedCount}`);
  console.log(`2. Feed Events total: ${feedEvents.length}, Unread: ${feedUnreadEvents.length}`);
  console.log(`3. (a) Mark All Read Button Count: ${unreadFeedCount}`);
  console.log(`   (b) Feed Header Unread Count: ${feedUnreadEvents.length}`);
  console.log(`   (c) Sidebar Badge Count: ${feedUnreadEvents.length > 99 ? '99+' : feedUnreadEvents.length}`);
  console.log(`   (d) Watchlist Unseen Updates Card (All Watchlists): ${allOverview.summary.unseenUpdates}`);

  // Also check per-watchlist counts
  const watchlists = await watchlistService.getUserWatchlists(userId);
  console.log('\n--- Per-Watchlist Unseen Updates ---');
  for (const wl of watchlists) {
    const wlOverview = await watchlistService.getOverview(userId, wl.id);
    console.log(`- Watchlist "${wl.name}" (ID: ${wl.id}): ${wlOverview.summary.unseenUpdates} unseen updates across ${wlOverview.summary.totalStocks} stocks`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
