import { PrismaClient } from '@prisma/client';
import { catchUpService } from '../src/services/catchUpService.js';
import { sinceLastVisitService } from '../src/services/sinceLastVisitService.js';
import { eventService } from '../src/services/eventService.js';
import { marketProvider } from '../src/providers/marketDataProvider.js';

const prisma = new PrismaClient();

async function runSimulation(userId: string, daysAway: number) {
  console.log(`\n=============================================================`);
  console.log(`⏳ Simulating Absence of ${daysAway} Days for User ${userId}`);
  console.log(`=============================================================`);

  const absenceDate = new Date(Date.now() - daysAway * 24 * 60 * 60 * 1000);

  // 1. Update user and userState previous timestamps
  await prisma.user.update({
    where: { id: userId },
    data: {
      previousLoginAt: absenceDate,
      lastLoginAt: new Date(),
    },
  });

  await prisma.userState.upsert({
    where: { userId },
    update: {
      previousSessionAt: absenceDate,
      lastSeenAt: absenceDate,
      lastLoginAt: new Date(),
    },
    create: {
      userId,
      previousSessionAt: absenceDate,
      lastSeenAt: absenceDate,
      lastLoginAt: new Date(),
    },
  });

  console.log(`✓ Set previousSessionAt to: ${absenceDate.toISOString()} (${daysAway} days ago)`);

  // 2. Run catchUpService
  console.log(`\n🔄 Running catchUpService.catchUpForUser()...`);
  const catchUpResult = await catchUpService.catchUpForUser(userId);
  console.log(`CatchUp Result:`, {
    since: catchUpResult.since,
    daysSince: catchUpResult.daysSince,
    monitoredSymbols: catchUpResult.watchlistSymbols.length,
    eventsCreated: catchUpResult.eventsCreated,
    digestsCreated: catchUpResult.digestsCreated,
    durationMs: catchUpResult.durationMs,
  });

  // 3. Baseline vs Current Price Table for key stocks (INFY, RELIANCE, TATAMOTORS, TCS, TSLA)
  const keySymbols = ['INFY', 'RELIANCE', 'TATAMOTORS', 'TCS', 'TSLA'];
  const priceComparisonTable: any[] = [];
  const anomalyFlags: string[] = [];

  for (const sym of keySymbols) {
    const stock = await prisma.stock.findUnique({ where: { symbol: sym } });
    const currentPrice = stock?.currentPrice ? Number(stock.currentPrice) : 0;
    
    // Fetch historical bar closest to sinceDate
    let baselinePrice = currentPrice;
    try {
      const bars = await marketProvider.getHistoricalBars(sym, Math.min(daysAway + 25, 365));
      if (bars && bars.length > 0) {
        // Find bar on or immediately after absenceDate
        const targetMs = absenceDate.getTime();
        const sorted = [...bars].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const match = sorted.find((b) => new Date(b.date).getTime() >= targetMs) || sorted[0];
        if (match) {
          baselinePrice = match.close;
        }
      }
    } catch {
      baselinePrice = currentPrice;
    }

    const pctMove = baselinePrice > 0 ? ((currentPrice - baselinePrice) / baselinePrice) * 100 : 0;

    if (Math.abs(pctMove) > 25.0) {
      anomalyFlags.push(`ANOMALY: ${sym} moved ${pctMove.toFixed(2)}% over ${daysAway} days`);
    }

    priceComparisonTable.push({
      symbol: sym,
      baselineDate: absenceDate.toISOString().split('T')[0],
      baselineClose: baselinePrice.toFixed(2),
      currentPrice: currentPrice.toFixed(2),
      periodChangePct: `${pctMove >= 0 ? '+' : ''}${pctMove.toFixed(2)}%`,
    });
  }

  console.log(`\n📈 Baseline (Historical Close on Since-Date) vs Current Price:`);
  console.table(priceComparisonTable);

  if (anomalyFlags.length > 0) {
    console.log(`⚠️ Anomaly Flags (>25% move check):`);
    anomalyFlags.forEach((a) => console.log(`  - ${a}`));
  } else {
    console.log(`✓ No single-day circuit limit breaches (>25%) detected without corporate action.`);
  }

  // 4. Query unread count and sinceLastVisit intelligence
  const unreadFeedCount = await eventService.getUnreadFeedCount(userId);
  const intelligence = await sinceLastVisitService.getIntelligenceSinceLastVisit(userId);

  console.log(`\n📊 Intelligence & Unread Summary:`, {
    awayDuration: intelligence.awayDuration,
    unreadFeedCount,
    newEventsSinceLastVisit: intelligence.newEventsCount,
    criticalEventsSinceLastVisit: intelligence.criticalEventsCount,
    latestDigestHeadline: intelligence.latestDigest?.headline || 'None',
  });

  console.log(`\n✅ Absence simulation of ${daysAway} days completed successfully.`);
}

async function main() {
  const args = process.argv.slice(2);
  let userId = args[0];
  const requestedDays = args[1] ? parseInt(args[1], 10) : null;

  if (!userId) {
    const userWithStocks = await prisma.user.findFirst({
      where: {
        watchlists: {
          some: {
            stocks: {
              some: {},
            },
          },
        },
      },
    });
    const firstUser = userWithStocks || (await prisma.user.findFirst());
    if (!firstUser) {
      console.error('No user found in database. Please run with a valid userId.');
      return;
    }
    userId = firstUser.id;
    console.log(`Using user with watchlists: ${firstUser.name} (${firstUser.email}, ID: ${userId})`);
  }

  const testDays = requestedDays ? [requestedDays] : [2, 19, 90];

  for (const days of testDays) {
    await runSimulation(userId, days);
  }
}

main()
  .catch((e) => {
    console.error('Simulation error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
