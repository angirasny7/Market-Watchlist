import { PrismaClient } from '@prisma/client';
import { isEventDemo } from '../src/services/eventService.js';

const prisma = new PrismaClient();

async function main() {
  const allEvents = await prisma.event.findMany({
    orderBy: { timestamp: 'desc' },
  });

  console.log(`Total events in database: ${allEvents.length}\n`);

  const demoEvents = allEvents.filter((e) => isEventDemo(e));

  console.log(`Excluded Demo / Seed Events Count: ${demoEvents.length}\n`);
  console.log('--- EXCLUDED DEMO / SEED EVENTS TABLE ---');
  console.table(
    demoEvents.map((e) => {
      const delta = (e.metricsDelta as any) || {};
      return {
        id: e.id,
        stockSymbol: e.stockSymbol,
        eventType: e.eventType,
        priority: e.priority,
        timestamp: e.timestamp.toISOString(),
        isDemo: delta.isDemo ?? false,
        reason: (delta.detectionReason || '').slice(0, 40),
      };
    })
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
