import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allEvents = await prisma.event.findMany({
    select: {
      id: true,
      stockSymbol: true,
      eventType: true,
      timestamp: true,
      occurredAt: true,
      createdAt: true,
      isDuplicate: true,
      metricsDelta: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group all events by stockSymbol + calendarDay
  const dayMap = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    const evDate = new Date(ev.occurredAt || ev.timestamp);
    const dayStr = evDate.toISOString().split('T')[0];
    const key = `${ev.stockSymbol} on ${dayStr}`;
    const list = dayMap.get(key) || [];
    list.push(ev);
    dayMap.set(key, list);
  }

  // Sort by count descending
  const sortedDays = Array.from(dayMap.entries()).sort((a, b) => b[1].length - a[1].length);

  console.log('=== TOP 10 STOCK-DAYS BY EVENT COUNT BEFORE FIX ===\n');
  sortedDays.slice(0, 10).forEach(([dayKey, evts], idx) => {
    console.log(`Rank #${idx + 1}: ${dayKey} -> Total Events: ${evts.length}`);
    // Print individual events in this group
    evts.slice(0, 6).forEach((e) => {
      const delta = (e.metricsDelta as any) || {};
      const job = delta.isCumulativeReturnEvent ? 'catchUpService' : (e.id.startsWith('evt_') ? 'seed' : 'changeDetectionJob');
      console.log(`    - ID: ${e.id.slice(0, 8)}... | Type: ${e.eventType} | CreatedAt: ${e.createdAt.toISOString()} | OccurredAt: ${e.occurredAt?.toISOString() || e.timestamp.toISOString()} | Job: ${job}`);
    });
    if (evts.length > 6) {
      console.log(`    ... and ${evts.length - 6} more duplicate rows on this day.`);
    }
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
