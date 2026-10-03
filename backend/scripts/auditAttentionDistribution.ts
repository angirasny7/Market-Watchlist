import { PrismaClient, Priority } from '@prisma/client';
import { attentionScoringService } from '../src/services/attentionScoringService.js';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'alex@example.com' },
  });

  const userId = user?.id;
  const userWatchlists = await prisma.watchlistStock.findMany({
    where: { watchlist: { userId } },
    select: { stockSymbol: true },
  });
  const symbols = Array.from(new Set(userWatchlists.map((w) => w.stockSymbol)));

  console.log(`Auditing attention levels for ${symbols.length} stocks of User ${user?.name} (${user?.email})...\n`);

  const events = await prisma.event.findMany({
    where: {
      stockSymbol: { in: symbols },
      NOT: [
        { id: { startsWith: 'demo_' } },
        { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
      ],
    },
  });

  console.log(`Total active events for user stocks: ${events.length}`);

  const countsCurrent: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const e of events) {
    countsCurrent[e.priority] = (countsCurrent[e.priority] || 0) + 1;
  }

  console.log('\n--- CURRENT DB EVENT PRIORITIES ---');
  console.table(countsCurrent);

  // Recalculate using updated scoring
  const countsRecalculated: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const e of events) {
    const delta = (e.metricsDelta as any) || {};
    const res = attentionScoringService.calculateScore({
      changePercent: Number(delta.changePercent ?? 0),
      volume: Number(delta.volume ?? 1000000),
      avgVolume20D: Number(delta.avgVolume20D ?? 1000000),
      eventType: e.eventType,
      eventTimestamp: e.timestamp,
    });
    countsRecalculated[res.priority] = (countsRecalculated[res.priority] || 0) + 1;
  }

  console.log('\n--- RECALCULATED EVENT PRIORITIES ---');
  console.table(countsRecalculated);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
