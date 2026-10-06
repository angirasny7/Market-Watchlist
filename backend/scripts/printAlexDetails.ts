import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'alex@example.com' },
    select: { id: true, email: true },
  });

  if (!user) return;

  const reads = await prisma.userEventRead.findMany({
    where: { userId: user.id },
    include: { event: true },
  });

  const saves = await prisma.userSavedEvent.findMany({
    where: { userId: user.id },
    include: { event: true },
  });

  console.log(`Total Reads for Alex: ${reads.length}`);
  reads.forEach((r, idx) => {
    console.log(`Read #${idx + 1}: ID=${r.id}, EventId=${r.eventId}, ReadAt=${r.readAt.toISOString()}, ReadSource=${r.readSource}`);
    console.log(`  Event: Stock=${r.event.stockSymbol}, Type=${r.event.eventType}, Timestamp=${r.event.timestamp.toISOString()}`);
    console.log(`  Flags: isDemo=${r.event.isDemo}, isHidden=${r.event.isHidden}, isDuplicate=${r.event.isDuplicate}, isInvalidated=${r.event.isInvalidated}, Canonical=${r.event.canonicalEventId}`);
  });

  console.log(`\nTotal Saves for Alex: ${saves.length}`);
  saves.forEach((s, idx) => {
    console.log(`Save #${idx + 1}: ID=${s.id}, EventId=${s.eventId}, SavedAt=${s.savedAt.toISOString()}`);
    console.log(`  Event: Stock=${s.event.stockSymbol}, Type=${s.event.eventType}, Timestamp=${s.event.timestamp.toISOString()}`);
    console.log(`  Flags: isDemo=${s.event.isDemo}, isHidden=${s.event.isHidden}, isDuplicate=${s.event.isDuplicate}, isInvalidated=${s.event.isInvalidated}, Canonical=${rCanonical(s.event)}`);
  });

  function rCanonical(e: any) {
    return e.canonicalEventId;
  }

  await prisma.$disconnect();
}

main().catch(console.error);
