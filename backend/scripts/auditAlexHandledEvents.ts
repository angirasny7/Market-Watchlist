import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'alex@example.com' },
    select: { id: true, email: true, createdAt: true },
  });

  if (!user) {
    console.log('User alex@example.com not found');
    return;
  }

  const reads = await prisma.userEventRead.findMany({
    where: { userId: user.id },
    include: {
      event: {
        select: {
          id: true,
          stockSymbol: true,
          eventType: true,
          timestamp: true,
          occurredAt: true,
          occurredOn: true,
          createdAt: true,
          isDemo: true,
          isHidden: true,
          isDuplicate: true,
          isInvalidated: true,
          canonicalEventId: true,
          metricsDelta: true,
        },
      },
    },
  });

  const saves = await prisma.userSavedEvent.findMany({
    where: { userId: user.id },
    include: {
      event: {
        select: {
          id: true,
          stockSymbol: true,
          eventType: true,
          timestamp: true,
          occurredAt: true,
          occurredOn: true,
          createdAt: true,
          isDemo: true,
          isHidden: true,
          isDuplicate: true,
          isInvalidated: true,
          canonicalEventId: true,
          metricsDelta: true,
        },
      },
    },
  });

  console.log('=== USER READ ROWS ===');
  console.log(JSON.stringify(reads, null, 2));

  console.log('\n=== USER SAVED ROWS ===');
  console.log(JSON.stringify(saves, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
