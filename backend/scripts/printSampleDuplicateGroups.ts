import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const duplicateEvents = await prisma.event.findMany({
    where: { isDuplicate: true },
    select: {
      id: true,
      stockSymbol: true,
      eventType: true,
      timestamp: true,
      occurredAt: true,
      createdAt: true,
      canonicalEventId: true,
      metricsDelta: true,
    },
    take: 5,
  });

  console.log('=== 5 SAMPLE DUPLICATE GROUPS (KEPT VS HIDDEN EVENT) ===\n');
  for (let i = 0; i < duplicateEvents.length; i++) {
    const dup = duplicateEvents[i];
    const canonical = await prisma.event.findUnique({
      where: { id: dup.canonicalEventId! },
      select: {
        id: true,
        stockSymbol: true,
        eventType: true,
        timestamp: true,
        occurredAt: true,
        createdAt: true,
        isDuplicate: true,
        isHidden: true,
        metricsDelta: true,
      },
    });

    console.log(`Group #${i + 1} [Stock: ${dup.stockSymbol}, Type: ${dup.eventType}]:`);
    console.log(`  ✓ SURVIVING (Canonical ID: ${canonical?.id})`);
    console.log(`      Created: ${canonical?.createdAt.toISOString()}`);
    console.log(`      Occurred: ${canonical?.occurredAt?.toISOString() || canonical?.timestamp.toISOString()}`);
    console.log(`      Flags: isDuplicate=${canonical?.isDuplicate}, isHidden=${canonical?.isHidden}`);
    console.log(`  ✗ HIDDEN DUPLICATE (Duplicate ID: ${dup.id})`);
    console.log(`      Created: ${dup.createdAt.toISOString()}`);
    console.log(`      Occurred: ${dup.occurredAt?.toISOString() || dup.timestamp.toISOString()}`);
    console.log(`      Canonical Pointer: ${dup.canonicalEventId}\n`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
