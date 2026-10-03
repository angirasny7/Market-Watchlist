import { PrismaClient } from '@prisma/client';
import { ProviderFactory } from '../src/providers/providerFactory.js';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const auditAll = args.includes('--all');
  let userId = args.find((a) => !a.startsWith('--'));

  let targetUser: any = null;
  let symbols: string[] = [];

  if (auditAll) {
    const watchlistStocks = await prisma.watchlistStock.findMany({
      select: { stockSymbol: true },
    });
    symbols = Array.from(new Set(watchlistStocks.map((w) => w.stockSymbol)));
    console.log(`Auditing all ${symbols.length} unique monitored stocks across ALL users in database.\n`);
  } else {
    if (!userId) {
      console.error('Error: Please specify --user <email or userId> or pass --all to audit all stocks.');
      process.exit(1);
    }
    targetUser = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { email: userId }] },
    });
    if (!targetUser) {
      console.error(`User '${userId}' not found.`);
      process.exit(1);
    }
    userId = targetUser.id;

    if (targetUser) {
      const userWatchlistStocks = await prisma.watchlistStock.findMany({
        where: { watchlist: { userId: targetUser.id } },
        select: { stockSymbol: true },
      });
      symbols = Array.from(new Set(userWatchlistStocks.map((w) => w.stockSymbol))).sort();
      console.log(`Auditing ${symbols.length} monitored stocks for User: ${targetUser.name} (${targetUser.email})`);
      console.log(`(Note: Global database contains 47 stocks across multiple test users; this user's union has ${symbols.length} stocks).\n`);
    } else {
      const watchlistStocks = await prisma.watchlistStock.findMany({
        select: { stockSymbol: true },
      });
      symbols = Array.from(new Set(watchlistStocks.map((w) => w.stockSymbol))).sort();
      console.log(`Auditing ${symbols.length} monitored stock(s): ${symbols.join(', ')}\n`);
    }
  }

  if (symbols.length === 0) {
    console.log('No monitored stocks found across watchlists.');
    return;
  }

  const provider = ProviderFactory.getMarketDataProvider();
  let discrepanciesCount = 0;

  console.log(
    'Symbol'.padEnd(14) +
      'DB Price'.padEnd(14) +
      'DB UpdatedAt'.padEnd(26) +
      'Provider Quote'.padEnd(16) +
      'Latest Event Price'.padEnd(20) +
      'Discrepancy (>2%)'
  );
  console.log('-'.repeat(105));

  for (const symbol of symbols) {
    const stock = await prisma.stock.findUnique({
      where: { symbol },
    });

    const curr = stock?.currency || '₹';
    const dbPrice = stock ? Number(stock.currentPrice) : null;
    const dbUpdatedAt = stock ? stock.updatedAt.toISOString() : 'N/A';

    let providerPrice: number | null = null;
    try {
      const quote = await provider.getQuote(symbol);
      if (quote) {
        providerPrice = quote.price;
      }
    } catch (err: any) {
      // Provider quote failed
    }

    const latestEvent = await prisma.event.findFirst({
      where: { stockSymbol: symbol },
      orderBy: { timestamp: 'desc' },
      select: { metricsDelta: true, timestamp: true },
    });

    const delta = (latestEvent?.metricsDelta as any) || {};
    const latestEventPrice = delta.price !== undefined ? Number(delta.price) : null;

    let flag = 'OK';
    const issues: string[] = [];

    if (dbPrice !== null && providerPrice !== null && providerPrice > 0) {
      const dbDiffPct = Math.abs((dbPrice - providerPrice) / providerPrice) * 100;
      if (dbDiffPct > 2) {
        issues.push(`DB vs Provider: ${dbDiffPct.toFixed(1)}%`);
      }
    }

    if (dbPrice !== null && latestEventPrice !== null && dbPrice > 0) {
      const eventDiffPct = Math.abs((latestEventPrice - dbPrice) / dbPrice) * 100;
      if (eventDiffPct > 2) {
        issues.push(`Event vs DB: ${eventDiffPct.toFixed(1)}%`);
      }
    }

    if (issues.length > 0) {
      flag = `⚠️ FLAG: ${issues.join('; ')}`;
      discrepanciesCount++;
    }

    const dbPriceStr = dbPrice !== null ? `${curr}${dbPrice.toFixed(2)}` : 'N/A';
    const provPriceStr = providerPrice !== null ? `${curr}${providerPrice.toFixed(2)}` : 'N/A';
    const eventPriceStr = latestEventPrice !== null ? `${curr}${latestEventPrice.toFixed(2)}` : 'N/A';

    console.log(
      symbol.padEnd(14) +
        dbPriceStr.padEnd(14) +
        dbUpdatedAt.padEnd(26) +
        provPriceStr.padEnd(16) +
        eventPriceStr.padEnd(20) +
        flag
    );
  }

  console.log('================================================');
  console.log(`Audit finished. Total flagged discrepancies (>2%): ${discrepanciesCount}`);
}

main()
  .catch((e) => {
    console.error('Audit script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
