import { prisma } from '../src/config/prisma.js';
import { ProviderFactory } from '../src/providers/providerFactory.js';
import { isAnyMarketOpen } from '../src/utils/marketHours.js';

async function checkData() {
  console.log('═══════════════════════════════════════════════════════════════════════════════════');
  console.log('                 🔍 SMART MARKET WATCHLIST — DATA INTEGRITY AUDIT                  ');
  console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

  const marketOpen = isAnyMarketOpen();
  console.log(`🕒 Market Session Status: ${marketOpen ? '🟢 OPEN (Active Trading)' : '🔴 CLOSED (Off-Hours)'}`);
  console.log(`⏰ Current Timestamp: ${new Date().toISOString()}\n`);

  // 1. Fetch monitored stocks
  const watchlistStocks = await prisma.watchlistStock.findMany({
    select: { stockSymbol: true },
    distinct: ['stockSymbol'],
  });

  const monitoredSymbols = watchlistStocks.map((ws) => ws.stockSymbol);
  const stocks = await prisma.stock.findMany({
    where: monitoredSymbols.length > 0 ? { symbol: { in: monitoredSymbols } } : undefined,
    orderBy: { symbol: 'asc' },
  });

  if (stocks.length === 0) {
    console.log('⚠️ No stocks found in database.');
    await prisma.$disconnect();
    return;
  }

  console.log(`📊 Monitored Stocks Count: ${stocks.length}\n`);

  const provider = ProviderFactory.getMarketDataProvider();
  console.log(`🔌 Configured Provider: ${provider.providerName}\n`);

  const rows: any[] = [];
  const flags: string[] = [];

  for (const stock of stocks) {
    let providerPrice = '—';
    let providerTime = '—';
    let providerStatus = 'OK';

    try {
      const quote = await provider.getQuote(stock.symbol);
      if (quote) {
        providerPrice = `${quote.currency || '₹'}${quote.price.toFixed(2)}`;
        providerTime = quote.timestamp ? quote.timestamp.toLocaleTimeString() : 'now';
      } else {
        providerStatus = 'NO_DATA';
      }
    } catch (err: any) {
      providerStatus = `ERR: ${err.message}`;
    }

    const dbPrice = Number(stock.currentPrice);
    const dbUpdatedAt = new Date(stock.updatedAt);
    const ageHours = (Date.now() - dbUpdatedAt.getTime()) / (1000 * 60 * 60);

    // Heuristic: Flag if price is perfectly round (like 1000.00) matching seed data
    const isRoundSeed = dbPrice > 0 && Number.isInteger(dbPrice) && dbPrice % 100 === 0;

    // Heuristic: Flag if stale during market hours (> 2 hours old)
    const isStale = marketOpen && ageHours > 2;

    const rowFlags: string[] = [];
    if (isRoundSeed) rowFlags.push('SEED_VALUE?');
    if (isStale) rowFlags.push(`STALE (${ageHours.toFixed(1)}h)`);
    if (providerStatus !== 'OK') rowFlags.push(providerStatus);

    if (rowFlags.length > 0) {
      flags.push(`${stock.symbol}: ${rowFlags.join(', ')}`);
    }

    rows.push({
      Symbol: stock.symbol,
      Exchange: stock.exchange,
      'DB Price': `${stock.currency || '₹'}${dbPrice.toFixed(2)}`,
      'DB Updated': dbUpdatedAt.toLocaleTimeString() + ` (${ageHours.toFixed(1)}h ago)`,
      'Provider Price': providerPrice,
      'Provider Time': providerTime,
      Status: rowFlags.length > 0 ? `⚠️ ${rowFlags.join(' | ')}` : '✅ Live',
    });
  }

  console.table(rows);

  console.log('\n───────────────────────────────────────────────────────────────────────────────────');
  if (flags.length > 0) {
    console.log(`⚠️ Integrity Warnings (${flags.length}):`);
    for (const f of flags) {
      console.log(`  • ${f}`);
    }
  } else {
    console.log('✅ All monitored stock prices and timestamps are valid and synchronized.');
  }
  console.log('───────────────────────────────────────────────────────────────────────────────────\n');

  await prisma.$disconnect();
}

checkData().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
