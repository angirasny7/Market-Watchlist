import { prisma } from '../src/config/prisma.js';
import { feedService } from '../src/services/feedService.js';

async function reportWatchedSinceAlex() {
  console.log('========================================================================');
  console.log('  ALEX@EXAMPLE.COM: PER-WINDOW COUNTS BEFORE VS AFTER WATCHEDSINCE SCOPING');
  console.log('========================================================================\n');

  const alex = await prisma.user.findUnique({
    where: { email: 'alex@example.com' },
    include: {
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

  console.log(`👤 User: ${alex.name} (${alex.email}) | ID: ${alex.id}`);
  const watchedStocks = alex.watchlists.flatMap((w) => w.stocks);
  console.log(`📋 Total Monitored Stocks in Watchlists: ${watchedStocks.length}`);
  for (const s of watchedStocks) {
    console.log(`   - Symbol: ${s.stockSymbol.padEnd(12)} | Watchlist: ${s.watchlistId} | AddedAt: ${s.addedAt.toISOString()}`);
  }

  const windows: Array<'sinceLastVisit' | '24h' | '7d' | '30d'> = ['sinceLastVisit', '24h', '7d', '30d'];

  const results: any[] = [];

  for (const w of windows) {
    const feed = await feedService.getFeed(alex.id, { window: w, limit: 1000 });
    results.push({
      Window: w,
      'Total Items (Clustered)': feed.total,
      'Unread Items': feed.unreadCount,
      'Has More': feed.hasMore,
    });
  }

  console.log('\n📊 Current Per-Window Counts (With WatchedSince Scoping Active):');
  console.table(results);

  // Summary counts
  const summary = await feedService.getSummary(alex.id);
  console.log('\n📌 Summary API Output:');
  console.log(`  • Unread Clusters (Total): ${summary.unreadClusters}`);
  console.log(`  • Need Attention Count (High + Critical): ${summary.needAttentionCount}`);
  console.log(`  • Window Counts Breakdown:`, summary.windowCounts);
  console.log(`  • Markets Closed: ${summary.marketsClosed}`);
  console.log('========================================================================\n');
}

reportWatchedSinceAlex()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
