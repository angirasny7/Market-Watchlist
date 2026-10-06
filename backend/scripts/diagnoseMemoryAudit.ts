import { prisma } from '../src/config/prisma.js';
import { memoryService } from '../src/services/memoryService.js';
import { feedService } from '../src/services/feedService.js';

async function main() {
  console.log('========================================================================');
  console.log('  READ-ONLY DIAGNOSTIC AUDIT: USER MARKET MEMORY (alex@example.com)');
  console.log('========================================================================\n');

  const alex = await prisma.user.findUnique({
    where: { email: 'alex@example.com' },
    include: {
      watchlists: { include: { stocks: true } },
    },
  });

  if (!alex) {
    console.error('User alex@example.com not found in database.');
    return;
  }

  console.log(`👤 User: ${alex.name} (${alex.id})`);

  // 1. Raw user_saved_events rows
  const userSaves = await prisma.userSavedEvent.findMany({
    where: { userId: alex.id },
    include: { event: true },
    orderBy: { savedAt: 'desc' },
  });

  console.log(`\n--- Raw user_saved_events Rows (${userSaves.length} total) ---`);
  for (const s of userSaves) {
    const ev = s.event;
    console.log(`- SavedRow ID: ${s.id}, savedAt: ${s.savedAt.toISOString()}, note: "${s.note || ''}"`);
    console.log(`  Linked Event ID: ${ev.id}`);
    console.log(`  Stock: ${ev.stockSymbol}, Type: ${ev.eventType}, OccurredAt: ${ev.occurredAt?.toISOString() || ev.timestamp.toISOString()}`);
    console.log(`  Flags: isDemo=${ev.isDemo}, isHidden=${ev.isHidden}, isDuplicate=${ev.isDuplicate}, isInvalidated=${ev.isInvalidated}, isSimulated=${ev.isSimulated}`);
    console.log(`  CanonicalEventId: ${ev.canonicalEventId || 'none'}`);
  }

  // 2. Raw user_event_reads rows
  const userReads = await prisma.userEventRead.findMany({
    where: { userId: alex.id },
    include: { event: true },
    orderBy: { readAt: 'desc' },
  });

  console.log(`\n--- Raw user_event_reads Rows (${userReads.length} total) ---`);
  for (const r of userReads) {
    const ev = r.event;
    console.log(`- ReadRow ID: ${r.id}, readAt: ${r.readAt.toISOString()}, readSource: ${r.readSource}`);
    console.log(`  Linked Event ID: ${ev.id}`);
    console.log(`  Stock: ${ev.stockSymbol}, Type: ${ev.eventType}, OccurredAt: ${ev.occurredAt?.toISOString() || ev.timestamp.toISOString()}`);
    console.log(`  Flags: isDemo=${ev.isDemo}, isHidden=${ev.isHidden}, isDuplicate=${ev.isDuplicate}, isInvalidated=${ev.isInvalidated}, isSimulated=${ev.isSimulated}`);
    console.log(`  CanonicalEventId: ${ev.canonicalEventId || 'none'}`);
  }

  // 3. Compare with MemoryService list results
  const [savedItems, readItems, deletedItems, memoryCounts, feedCounts] = await Promise.all([
    memoryService.getArchivedEvents({ userId: alex.id, memoryType: 'SAVED' }),
    memoryService.getArchivedEvents({ userId: alex.id, memoryType: 'ARCHIVED' }),
    memoryService.getArchivedEvents({ userId: alex.id, memoryType: 'DELETED' }),
    memoryService.getMemoryCounts(alex.id),
    feedService.getFeedCounts(alex.id),
  ]);

  console.log('\n--- MemoryService & FeedCounts Response ---');
  console.log('Memory Counts from getMemoryCounts:', memoryCounts);
  console.log('Feed Counts from getFeedCounts:', {
    savedCount: feedCounts.savedCount,
    readCount: feedCounts.readCount,
    deletedCount: feedCounts.deletedCount,
  });
  console.log(`Saved Items Returned by getArchivedEvents: ${savedItems.length}`);
  console.log(`Read Items Returned by getArchivedEvents: ${readItems.length}`);
  console.log(`Deleted Items Returned by getArchivedEvents: ${deletedItems.length}`);

  console.log('\n--- Saved Items in List ---');
  for (const it of savedItems) {
    console.log(`  Visible Saved Card -> ID: ${it.id}, Stock: ${it.stockSymbol}, Headline: "${it.headline}"`);
  }

  console.log('\n--- Read Items in List ---');
  for (const it of readItems) {
    console.log(`  Visible Read Card -> ID: ${it.id}, Stock: ${it.stockSymbol}, Headline: "${it.headline}"`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
