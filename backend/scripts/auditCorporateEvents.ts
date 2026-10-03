import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const corpEvents = await prisma.corporateEvent.findMany({
    orderBy: { eventDate: 'desc' },
  });

  console.log(`Total corporate events in DB: ${corpEvents.length}`);

  const demoEvents = corpEvents.filter((c) => c.isDemo);
  const realEvents = corpEvents.filter((c) => !c.isDemo);

  console.log(`- Real Corporate Events: ${realEvents.length}`);
  console.log(`- Demo / Seed Corporate Events: ${demoEvents.length}`);

  console.log('\n📋 Sample Corporate Events:');
  console.table(
    corpEvents.slice(0, 20).map((c) => ({
      id: c.id,
      symbol: c.stockSymbol,
      type: c.eventType,
      date: c.eventDate.toISOString().split('T')[0],
      title: c.title,
      isDemo: c.isDemo,
      createdAt: c.createdAt.toISOString(),
    }))
  );
}

main().finally(() => prisma.$disconnect());
