import { prisma } from '../src/config/prisma.js';
import { watchlistService } from '../src/services/watchlistService.js';

async function run() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    console.log(`\n######################################################################`);
    console.log(`USER: ${user.email} (${user.id})`);
    console.log(`######################################################################`);
    const wls = await prisma.watchlist.findMany({
      where: { userId: user.id },
      include: { stocks: { include: { stock: true } } },
      orderBy: { createdAt: 'asc' },
    });

  for (const wl of wls) {
    console.log(`\n=== Watchlist: "${wl.name}" (ID: ${wl.id}) ===`);
    console.log('DB watchlist_stocks:');
    for (const ws of wl.stocks) {
      console.log(`  • Symbol: ${ws.stockSymbol} | Stock record exists: ${!!ws.stock} | isPinned: ${ws.isPinned} | Price: ${ws.stock?.currentPrice} | Change: ${ws.stock?.changePercent}% | Sector: ${ws.stock?.sector}`);
    }
    const overview = await watchlistService.getOverview(user.id, wl.id);
    console.log(`Overview returned ${overview.stocks.length} stocks:`);
    for (const s of overview.stocks) {
      console.log(`  -> Symbol: ${s.symbol} | attentionLevel: ${s.attentionLevel} | Price: ${s.currentPrice} | isPinned: ${s.isPinned}`);
    }
    }
  }

  await prisma.$disconnect();
}

run().catch(console.error);
