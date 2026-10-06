import { prisma } from '../src/config/prisma.js';
import { feedService } from '../src/services/feedService.js';
import { userVisitService } from '../src/services/userVisitService.js';
import { memoryService } from '../src/services/memoryService.js';
import { watchlistService } from '../src/services/watchlistService.js';

async function run() {
  const user = await prisma.user.findUnique({
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

  if (!user) {
    console.log('User alex@example.com not found');
    return;
  }

  console.log('=== REAL USER STATE (alex@example.com) ===');
  console.log('User ID:', user.id);
  console.log('Created At:', user.createdAt);
  console.log('UserState in DB:', {
    lastLoginAt: user.userState?.lastLoginAt,
    lastActivityAt: user.userState?.lastActivityAt,
    feedBoundaryAt: user.userState?.feedBoundaryAt,
    lastFeedViewedAt: user.userState?.lastFeedViewedAt,
    previousSessionStartedAt: user.userState?.previousSessionStartedAt,
    previousSessionEndedAt: user.userState?.previousSessionEndedAt,
    previousSessionEndReason: user.userState?.previousSessionEndReason,
  });

  const visitInfo = await userVisitService.resolveVisitBoundary(user.id);
  console.log('\n=== VISIT BOUNDARY RESOLUTION ===', visitInfo);

  const [feedCounts, memoryCounts, summary, overview] = await Promise.all([
    feedService.getFeedCounts(user.id),
    memoryService.getMemoryCounts(user.id),
    feedService.getSummary(user.id, { window: 'sinceLastVisit' }),
    watchlistService.getOverview(user.id, 'all'),
  ]);

  console.log('\n=== COUNTS ACROSS ALL 4 LOCATIONS ===');
  console.log('1. Feed Header Window Counts:', feedCounts.windowCounts);
  console.log('2. Sidebar Badge (Since Last Visit unread):', feedCounts.sinceLastVisit);
  console.log('3. Watchlist "Unseen Updates" Card:', overview.summary.unseenUpdates);
  console.log('4. Market Memory Tabs:', {
    Saved: memoryCounts.savedCount,
    Read: memoryCounts.archivedCount,
    Deleted: memoryCounts.deletedCount,
    Total: memoryCounts.totalCount,
  });

  console.log('\n=== CURRENT FEED PREVIEW (Since Last Visit) ===');
  const feedSinceLastVisit = await feedService.getFeed(user.id, { window: 'sinceLastVisit' });
  console.log(`Feed item count: ${feedSinceLastVisit.items.length}`);
  for (const item of feedSinceLastVisit.items.slice(0, 5)) {
    console.log(`- [${item.priorityLabel}] ${item.stockSymbol}: ${item.headline} (${item.whyShown})`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
