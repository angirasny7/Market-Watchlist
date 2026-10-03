import { prisma } from '../src/config/prisma.js';
import { watchlistService } from '../src/services/watchlistService.js';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('             🔍 WATCHLIST COUNTS & ROW RENDER INTEGRITY AUDIT                 ');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  // Find users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  for (const user of users) {
    console.log(`👤 User: ${user.name || 'Unnamed'} (${user.email}) [ID: ${user.id}]\n`);

    // 1. Fetch user watchlists via DB directly
    const userWatchlists = await prisma.watchlist.findMany({
      where: { userId: user.id },
      include: {
        stocks: {
          include: {
            stock: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch via watchlistService.getUserWatchlists
    const serviceWatchlists = await watchlistService.getUserWatchlists(user.id);

    // 3. For each watchlist, compare DB rows vs service stockCount vs overview
    const tableData: any[] = [];
    const missingDetails: string[] = [];

    // Also check "ALL" overview
    const allOverview = await watchlistService.getOverview(user.id, 'all');
    const allDbRows = await prisma.watchlistStock.findMany({
      where: { watchlist: { userId: user.id } },
      include: { stock: true },
    });
    const allUniqueSymbols = new Set(allDbRows.map((r) => r.stockSymbol));

    tableData.push({
      'Watchlist Name': '🌐 All Watchlists (Union)',
      'Watchlist ID': 'all',
      'DB Rows (Raw)': allDbRows.length,
      'Unique Symbols (DB)': allUniqueSymbols.size,
      'Service stockCount': 'N/A',
      'Overview Summary Total': allOverview.summary.totalStocks,
      'Overview stocks[].length': allOverview.stocks.length,
      Match: allOverview.stocks.length === allUniqueSymbols.size ? '✅' : '❌ MISMATCH',
    });

    for (const wl of userWatchlists) {
      const swl = serviceWatchlists.find((s) => s.id === wl.id);
      const overview = await watchlistService.getOverview(user.id, wl.id);

      const dbSymbols = wl.stocks.map((s) => s.stockSymbol);
      const overviewSymbols = overview.stocks.map((s) => s.symbol);

      const missingInOverview = dbSymbols.filter((sym) => !overviewSymbols.includes(sym));

      if (missingInOverview.length > 0) {
        for (const sym of missingInOverview) {
          const wsRow = wl.stocks.find((s) => s.stockSymbol === sym);
          const hasStockRecord = Boolean(wsRow?.stock);
          const reason = !hasStockRecord
            ? 'Orphan row: Symbol does not exist in master `Stock` table'
            : 'Dropped during overview transformation/filtering';
          missingDetails.push(`  • Watchlist "${wl.name}" (${wl.id}): Symbol "${sym}" missing from overview. Reason: ${reason}`);
        }
      }

      tableData.push({
        'Watchlist Name': wl.name + (wl.isDefault ? ' (Default)' : ''),
        'Watchlist ID': wl.id,
        'DB Rows (Raw)': wl.stocks.length,
        'Unique Symbols (DB)': new Set(dbSymbols).size,
        'Service stockCount': swl?.stockCount ?? 0,
        'Overview Summary Total': overview.summary.totalStocks,
        'Overview stocks[].length': overview.stocks.length,
        Match:
          wl.stocks.length === (swl?.stockCount ?? 0) &&
          wl.stocks.length === overview.summary.totalStocks &&
          wl.stocks.length === overview.stocks.length
            ? '✅'
            : '❌ MISMATCH',
      });
    }

    console.table(tableData);

    if (missingDetails.length > 0) {
      console.log('\n⚠️ Missing Symbols Details:');
      for (const d of missingDetails) {
        console.log(d);
      }
    } else {
      console.log('\n✅ No missing symbols detected.');
    }

    // Check symbols in watchlist_stocks that don't exist in stock table
    const allMasterStocks = await prisma.stock.findMany({ select: { symbol: true } });
    const masterSymbolSet = new Set(allMasterStocks.map((s) => s.symbol));
    const rawOrphans = allDbRows.filter((r) => !masterSymbolSet.has(r.stockSymbol));

    if (rawOrphans.length > 0) {
      console.log(`\n🚨 Orphan watchlist_stocks rows (Symbol NOT in Stock master table):`);
      for (const o of rawOrphans) {
        console.log(`  • WatchlistStock [id: ${o.id}, watchlistId: ${o.watchlistId}, stockSymbol: ${o.stockSymbol}, isPinned: ${o.isPinned}, addedAt: ${o.addedAt.toISOString()}]`);
      }
    } else {
      console.log('\n✅ No orphan watchlist_stocks rows found.');
    }

    console.log('\n───────────────────────────────────────────────────────────────────────────────\n');
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
