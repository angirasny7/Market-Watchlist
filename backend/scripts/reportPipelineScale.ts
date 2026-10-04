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

  const totalRealUsers = await prisma.user.count({ where: { isTestUser: false } });
  const totalTestUsers = await prisma.user.count({ where: { isTestUser: true } });
  const totalRealWatchlists = await prisma.watchlist.count({ where: { user: { isTestUser: false } } });
  const totalRealWatchlistStocks = await prisma.watchlistStock.count({ where: { watchlist: { user: { isTestUser: false } } } });

  const realWatchlistStocks = await prisma.watchlistStock.findMany({
    where: { watchlist: { user: { isTestUser: false } } },
    select: { stockSymbol: true, watchlist: { select: { userId: true } } },
  });

  const distinctMonitoredSymbols = Array.from(
    new Set(realWatchlistStocks.map((ws) => ws.stockSymbol.toUpperCase().trim()))
  ).sort();

  const totalCatalogStocks = await prisma.stock.count();

  // Symbol distribution across real users
  const symbolUserMap = new Map<string, Set<string>>();
  for (const item of realWatchlistStocks) {
    const sym = item.stockSymbol.toUpperCase().trim();
    const uSet = symbolUserMap.get(sym) || new Set<string>();
    uSet.add(item.watchlist.userId);
    symbolUserMap.set(sym, uSet);
  }

  console.log(`📊 Multi-User Statistics (Production Real Accounts):`);
  console.log(`  • Active Real Users: ${totalRealUsers} (Flagged Test Users Excluded: ${totalTestUsers})`);
  console.log(`  • Real User Watchlists: ${totalRealWatchlists}`);
  console.log(`  • Real Watchlist Stock Entries: ${totalRealWatchlistStocks}`);
  console.log(`  • Master Stock Catalog Size: ${totalCatalogStocks} symbols`);
  console.log(`  • Distinct Monitored Symbols (Union of Real Watchlists): ${distinctMonitoredSymbols.length} symbols\n`);

  console.log(`📈 Distinct Monitored Symbols (Union):`);
  console.log(`  [${distinctMonitoredSymbols.join(', ')}]\n`);

  console.log(`🔍 Monitored Stock Distribution Across Real Users:`);
  const sortedOverlap = Array.from(symbolUserMap.entries()).sort(
    (a, b) => b[1].size - a[1].size
  );
  sortedOverlap.slice(0, 15).forEach(([sym, users]) => {
    console.log(`  • ${sym.padEnd(12)} -> Tracked by ${users.size} real user(s)`);
  });

  console.log(`\n⚙️ Pipeline Execution Scaling Analysis:`);
  console.log(`  • Provider Sync Model: Deduplicated symbol-set batching.`);
  console.log(`  • Quotes Sync Calls Per Cycle: ${distinctMonitoredSymbols.length} provider requests (O(distinct_symbols), independent of user count).`);
  console.log(`  • Deduplication Savings: ${totalRealWatchlistStocks - distinctMonitoredSymbols.length} redundant calls saved across real user watchlists.`);
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
