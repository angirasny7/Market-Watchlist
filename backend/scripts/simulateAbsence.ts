import { PrismaClient } from '@prisma/client';
import { catchUpService } from '../src/services/catchUpService.js';
import { sinceLastVisitService } from '../src/services/sinceLastVisitService.js';
import { eventService } from '../src/services/eventService.js';

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

  // 3. Query sinceLastVisit intelligence
  console.log(`\n📊 Querying sinceLastVisitService.getIntelligenceSinceLastVisit()...`);
  const intelligence = await sinceLastVisitService.getIntelligenceSinceLastVisit(userId);
  console.log(`Intelligence Summary:`, {
    awayDuration: intelligence.awayDuration,
    newEventsCount: intelligence.newEventsCount,
    criticalEventsCount: intelligence.criticalEventsCount,
    watchlistEventsCount: intelligence.watchlistEventsCount,
    newInsightsCount: intelligence.newInsights.length,
    latestDigestHeadline: intelligence.latestDigest?.headline || 'None',
  });

  // 4. Query Attention Feed events
  console.log(`\n📬 Querying Attention Feed events via eventService.getEvents()...`);
  const feed = await eventService.getEvents({ userId, limit: 10 });
  console.log(`Feed Items Returned: ${feed.length}`);

  for (let i = 0; i < Math.min(feed.length, 5); i++) {
    const ev = feed[i];
    const score = (ev as any).scoring?.finalScore ?? (ev.metricsDelta as any)?.attentionScore ?? 50;
    const pri = ev.priority;
    const what = (ev.metricsDelta as any)?.detectionReason || (ev as any).whatHappened || 'N/A';
    const why = (ev.metricsDelta as any)?.enrichment?.summary || (ev as any).enrichment?.summary || 'N/A';
    const evidenceCount = (ev.metricsDelta as any)?.enrichment?.evidence?.length || 0;
    console.log(`  [${i + 1}] ${ev.stockSymbol} | ${pri} (Score: ${score})`);
    console.log(`      What: ${what}`);
    console.log(`      Why: ${why}`);
    console.log(`      Evidence sources: ${evidenceCount}`);
  }

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
