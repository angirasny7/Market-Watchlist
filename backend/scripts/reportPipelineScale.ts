import { prisma } from '../src/config/prisma.js';

/**
 * Pipeline Scale & Symbol Monitoring Report
 *
 * Inspects all watchlists across all registered users, computes the union of distinct symbols,
 * and analyzes provider query efficiency, batching, and scaling metrics.
 */
async function reportPipelineScale() {
  console.log('========================================================================');
  console.log('  PIPELINE SCALE & MULTI-USER SYMBOL MONITORING REPORT');
  console.log('========================================================================\n');

  const totalUsers = await prisma.user.count();
  const totalWatchlists = await prisma.watchlist.count();
  const totalWatchlistStocks = await prisma.watchlistStock.count();

  const allWatchlistStocks = await prisma.watchlistStock.findMany({
    select: { stockSymbol: true, watchlist: { select: { userId: true } } },
  });

  const distinctMonitoredSymbols = Array.from(
    new Set(allWatchlistStocks.map((ws) => ws.stockSymbol.toUpperCase().trim()))
  ).sort();

  const totalCatalogStocks = await prisma.stock.count();

  // Symbol distribution across users
  const symbolUserMap = new Map<string, Set<string>>();
  for (const item of allWatchlistStocks) {
    const sym = item.stockSymbol.toUpperCase().trim();
    const uSet = symbolUserMap.get(sym) || new Set<string>();
    uSet.add(item.watchlist.userId);
    symbolUserMap.set(sym, uSet);
  }

  console.log(`📊 Global Multi-User Statistics:`);
  console.log(`  • Total Registered Users: ${totalUsers}`);
  console.log(`  • Total User Watchlists: ${totalWatchlists}`);
  console.log(`  • Total Watchlist Stock Entries: ${totalWatchlistStocks}`);
  console.log(`  • Master Stock Catalog Size: ${totalCatalogStocks} symbols`);
  console.log(`  • Distinct Monitored Symbols (Union): ${distinctMonitoredSymbols.length} symbols\n`);

  console.log(`📈 Distinct Monitored Symbols (Union of All Watchlists):`);
  console.log(`  [${distinctMonitoredSymbols.join(', ')}]\n`);

  console.log(`🔍 Top Overlapping Monitored Stocks Across Multiple Users:`);
  const sortedOverlap = Array.from(symbolUserMap.entries()).sort(
    (a, b) => b[1].size - a[1].size
  );
  sortedOverlap.slice(0, 10).forEach(([sym, users]) => {
    console.log(`  • ${sym.padEnd(12)} -> Tracked by ${users.size} user(s)`);
  });

  console.log(`\n⚙️ Pipeline Execution Scaling Analysis:`);
  console.log(`  • Provider Sync Model: Deduplicated symbol-set batching.`);
  console.log(`  • Quotes Sync Calls Per Cycle: ${distinctMonitoredSymbols.length} provider requests (O(distinct_symbols), independent of user count).`);
  console.log(`  • Deduplication Savings: ${totalWatchlistStocks - distinctMonitoredSymbols.length} redundant calls saved across user watchlists.`);
  console.log(`  • Rate Limit Protection: Per-symbol try/catch with SystemJobRun error logging and backoff.`);
  console.log(`  • Time Complexity: O(U) symbol aggregation -> O(S_distinct) provider fetches.\n`);

  console.log('========================================================================\n');
}

reportPipelineScale()
  .catch((err) => {
    console.error('Error generating pipeline scale report:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
