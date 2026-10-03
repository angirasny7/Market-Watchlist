import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    orderBy: { timestamp: 'asc' },
  });

  console.log(`Total events in database: ${events.length}`);

  const groupMap = new Map<string, Array<{ id: string; timestamp: Date; priority: string }>>();

  for (const e of events) {
    const day = e.timestamp.toISOString().split('T')[0];
    const key = `${e.stockSymbol}|${day}|${e.eventType}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push({ id: e.id, timestamp: e.timestamp, priority: e.priority });
  }

  const duplicates: Array<{ key: string; count: number; events: any[] }> = [];

  for (const [key, list] of groupMap.entries()) {
    if (list.length > 1) {
      duplicates.push({ key, count: list.length, events: list });
    }
  }

  console.log(`\nDuplicate groups found: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('DUPLICATE LIST:');
    for (const d of duplicates) {
      console.log(`- Key [${d.key}]: ${d.count} events -> IDs: ${d.events.map((e) => e.id).join(', ')}`);
    }
  } else {
    console.log('Zero duplicate events found across stockSymbol + calendar day + eventType.');
  }

  // Check read status preservation
  const readRows = await prisma.userEventRead.findMany();
  console.log(`\nTotal UserEventRead rows in DB: ${readRows.length}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
