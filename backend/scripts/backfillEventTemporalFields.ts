import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfill() {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      timestamp: true,
      createdAt: true,
      metricsDelta: true,
      occurredOn: true,
      periodStart: true,
      detectedAt: true,
    },
  });

  console.log(`Found ${events.length} events to backfill.`);

  let updatedCount = 0;
  for (const e of events) {
    const delta = (e.metricsDelta as any) || {};
    const isCumulative = Boolean(delta.isCumulativeReturnEvent);

    let occurredOn: Date = e.occurredOn || e.timestamp;
    let periodStart: Date | null = e.periodStart;
    let detectedAt: Date = e.detectedAt || e.createdAt || e.timestamp;

    if (isCumulative) {
      if (delta.baselineDate) {
        periodStart = new Date(delta.baselineDate);
      } else if (delta.sinceDate) {
        periodStart = new Date(delta.sinceDate);
      } else {
        // Fallback: 2 days before timestamp
        periodStart = new Date(new Date(e.timestamp).getTime() - 2 * 24 * 60 * 60 * 1000);
      }
    }

    await prisma.event.update({
      where: { id: e.id },
      data: {
        occurredOn,
        periodStart,
        detectedAt,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully backfilled ${updatedCount} events with occurredOn, periodStart, and detectedAt.`);
}

backfill().catch(console.error).finally(() => prisma.$disconnect());
