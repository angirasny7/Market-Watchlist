import { prisma } from '../src/config/prisma.js';
import { catchUpService } from '../src/services/catchUpService.js';
import { eventService } from '../src/services/eventService.js';
import { alertService } from '../src/services/alertService.js';
import { watchlistService } from '../src/services/watchlistService.js';

export async function runUnionWatchlistVerification() {
  console.log('🧪 [Union Verification] Starting union watchlist monitoring verification...');

  // 1. Get or create a test user
  let user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No user found in database to test.');
  }
  const userId = user.id;

  // 2. Ensure user has a default watchlist and a non-default watchlist
  let defaultWl = await prisma.watchlist.findFirst({
    where: { userId, isDefault: true },
  });
  if (!defaultWl) {
    defaultWl = await prisma.watchlist.create({
      data: { userId, name: 'Default Watchlist', isDefault: true },
    });
  }

  const nonDefaultName = 'Non-Default Growth Alpha';
  let nonDefaultWl = await prisma.watchlist.findFirst({
    where: { userId, name: nonDefaultName },
  });
  if (!nonDefaultWl) {
    nonDefaultWl = await prisma.watchlist.create({
      data: { userId, name: nonDefaultName, isDefault: false },
    });
  }

  // 3. Find a stock to place strictly in the non-default watchlist
  const allStocks = await prisma.stock.findMany({ take: 5 });
  if (allStocks.length < 2) {
    throw new Error('Need at least 2 stocks in master catalog to test.');
  }

  const testStock = allStocks[allStocks.length - 1];
  const testSymbol = testStock.symbol;

  // Remove testSymbol from default watchlist if present
  await prisma.watchlistStock.deleteMany({
    where: { watchlistId: defaultWl.id, stockSymbol: testSymbol },
  });

  // Ensure testSymbol is in the non-default watchlist
  const existingInNonDefault = await prisma.watchlistStock.findFirst({
    where: { watchlistId: nonDefaultWl.id, stockSymbol: testSymbol },
  });
  if (!existingInNonDefault) {
    await prisma.watchlistStock.create({
      data: { watchlistId: nonDefaultWl.id, stockSymbol: testSymbol },
    });
  }

  console.log(`✓ Configured ${testSymbol}: ONLY in non-default watchlist "${nonDefaultName}" (NOT in default list).`);

  // 4. Test catchUpService monitoring set
  const catchUpResult = await catchUpService.catchUpForUser(userId);
  const inCatchUp = catchUpResult.watchlistSymbols.includes(testSymbol);
  console.log(`✓ catchUpService monitoring set includes ${testSymbol}: ${inCatchUp}`);
  if (!inCatchUp) {
    throw new Error(`catchUpService failed to include non-default watchlist stock ${testSymbol}`);
  }

  // 5. Test event feed: ensure events for testSymbol have inWatchlist === true
  // Create a synthetic event if none exists so we can verify
  let event = await prisma.event.findFirst({
    where: { stockSymbol: testSymbol },
  });
  if (!event) {
    event = await prisma.event.create({
      data: {
        stockSymbol: testSymbol,
        eventType: 'PRICE_SURGE',
        priority: 'HIGH',
        headline: `${testSymbol} anomalous move test`,
        summary: `Testing union monitoring for ${testSymbol}`,
        metricsDelta: { changePercent: 5.5, attentionScore: 68 },
        timestamp: new Date(),
      },
    });
  }

  // Query events via eventService for this user
  const userEvents = await eventService.getEvents({ userId, unreadOnly: false });
  const stockEvent = userEvents.find((e) => e.stockSymbol === testSymbol);
  const inWatchlistFlag = stockEvent ? stockEvent.inWatchlist : null;
  console.log(`✓ eventService feed event for ${testSymbol} has inWatchlist=${inWatchlistFlag}`);
  if (inWatchlistFlag !== true) {
    throw new Error(`eventService feed failed to tag ${testSymbol} as inWatchlist`);
  }

  // 6. Test alert evaluation: create an alert on testSymbol and evaluate
  const currentPrice = Number(testStock.currentPrice);
  const alert = await alertService.createAlert(userId, {
    stockSymbol: testSymbol,
    alertType: 'PRICE_ABOVE',
    targetValue: currentPrice - 1, // Will trigger immediately
  });

  const triggeredCount = await alertService.evaluateAlerts([testSymbol]);
  console.log(`✓ alertService evaluated and triggered alert on ${testSymbol}: count = ${triggeredCount}`);
  if (triggeredCount === 0) {
    throw new Error(`alertService failed to trigger alert on non-default watchlist stock ${testSymbol}`);
  }

  // Clean up alert
  await alertService.deleteAlert(userId, alert.id);

  // 7. Test overview endpoint union
  const overview = await watchlistService.getOverview(userId, 'all');
  const inOverview = overview.stocks.some((s) => s.symbol === testSymbol);
  console.log(`✓ watchlistService.getOverview('all') includes ${testSymbol}: ${inOverview}`);
  if (!inOverview) {
    throw new Error(`getOverview('all') failed to include non-default watchlist stock ${testSymbol}`);
  }

  console.log('🎉 [Union Verification] Succeeded: Non-default watchlist stocks receive events, appear in feed, trigger alerts, and appear in overview union!');
}

runUnionWatchlistVerification()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
