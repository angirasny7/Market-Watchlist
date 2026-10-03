import { PrismaClient } from '@prisma/client';
import { ProviderFactory } from '../src/providers/providerFactory.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Running Price Consistency Audit Script...');
  console.log('================================================');

  // 1. Gather all monitored stocks (union of all watchlist stocks)
  const watchlistStocks = await prisma.watchlistStock.findMany({
    select: { stockSymbol: true },
  });
  const symbols = Array.from(new Set(watchlistStocks.map((w) => w.stockSymbol)));

  if (symbols.length === 0) {
    console.log('No monitored stocks found across watchlists.');
    return;
  }

  console.log(`Auditing ${symbols.length} monitored stock(s): ${symbols.join(', ')}\n`);

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

    const dbPriceStr = dbPrice !== null ? `₹${dbPrice.toFixed(2)}` : 'N/A';
    const provPriceStr = providerPrice !== null ? `₹${providerPrice.toFixed(2)}` : 'N/A';
    const eventPriceStr = latestEventPrice !== null ? `₹${latestEventPrice.toFixed(2)}` : 'N/A';

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
