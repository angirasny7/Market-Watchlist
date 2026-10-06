import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const duplicateReads = await prisma.userEventRead.findMany({
    where: {
      event: { isDuplicate: true },
    },
    include: { event: true },
  });

  const duplicateSaves = await prisma.userSavedEvent.findMany({
    where: {
      event: { isDuplicate: true },
    },
    include: { event: true },
  });

  console.log(`Duplicate Reads across all users: ${duplicateReads.length}`);
  for (const r of duplicateReads) {
    console.log(`User: ${r.userId}, DuplicateEventId: ${r.eventId} -> Canonical: ${r.event.canonicalEventId}`);
    if (r.event.canonicalEventId) {
      await prisma.userEventRead.upsert({
        where: { userId_eventId: { userId: r.userId, eventId: r.event.canonicalEventId } },
        create: {
          userId: r.userId,
          eventId: r.event.canonicalEventId,
          readAt: r.readAt,
          readSource: r.readSource,
        },
        update: {
          readAt: r.readAt,
          readSource: r.readSource,
        },
      });
      console.log(`  -> Carried read state to canonical event ${r.event.canonicalEventId}`);
    }
  }

  console.log(`\nDuplicate Saves across all users: ${duplicateSaves.length}`);
  for (const s of duplicateSaves) {
    console.log(`User: ${s.userId}, DuplicateEventId: ${s.eventId} -> Canonical: ${s.event.canonicalEventId}`);
    if (s.event.canonicalEventId) {
      await prisma.userSavedEvent.upsert({
        where: { userId_eventId: { userId: s.userId, eventId: s.event.canonicalEventId } },
        create: {
          userId: s.userId,
          eventId: s.event.canonicalEventId,
          savedAt: s.savedAt,
        },
        update: {
          savedAt: s.savedAt,
        },
      });
      console.log(`  -> Carried save state to canonical event ${s.event.canonicalEventId}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
