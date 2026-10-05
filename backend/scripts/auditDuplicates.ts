import { prisma } from '../src/config/prisma.js';

async function auditDuplicates() {
  console.log('========================================================================');
  console.log('  TOP 10 STOCK-DAYS BY EVENT COUNT & DUPLICATE ANALYSIS');
  console.log('========================================================================\n');

  const events = await prisma.event.findMany({
    orderBy: { timestamp: 'desc' },
    select: {
      id: true,
      stockSymbol: true,
      eventType: true,
      timestamp: true,
      occurredAt: true,
      occurredOn: true,
      createdAt: true,
      metricsDelta: true,
      userId: true,
      isSimulated: true,
    },
  });

  // Group by (stockSymbol, calendarDay)
  const groups = new Map<string, typeof events>();

  for (const e of events) {
    const time = e.occurredAt || e.occurredOn || e.timestamp;
    const dayStr = time.toISOString().slice(0, 10);
    const key = `${e.stockSymbol}__${dayStr}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(e);
  }

  // Sort groups by count desc
  const sortedGroups = Array.from(groups.entries())
    .map(([key, evts]) => {
      const [symbol, day] = key.split('__');
      return { symbol, day, count: evts.length, events: evts };
    })
    .sort((a, b) => b.count - a.count);

  console.log(`Total Stock-Day Groups: ${sortedGroups.length}`);
  console.log(`Top 10 Stock-Days with Highest Event Counts:\n`);

  for (let i = 0; i < Math.min(10, sortedGroups.length); i++) {
    const g = sortedGroups[i];
    console.log(`#${i + 1}: ${g.symbol} on ${g.day} (${g.count} events)`);
    for (const e of g.events.slice(0, 6)) {
      const m = (e.metricsDelta as any) || {};
      console.log(`    - ID: ${e.id.padEnd(36)} | Type: ${e.eventType.padEnd(16)} | Created: ${e.createdAt.toISOString()} | Occurred: ${(e.occurredAt || e.timestamp).toISOString()} | Reason: ${m.detectionReason || m.headline || 'N/A'}`);
    }
    if (g.events.length > 6) {
      console.log(`    ... and ${g.events.length - 6} more events`);
    }
    console.log('');
  }

  console.log('========================================================================\n');
}

auditDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
