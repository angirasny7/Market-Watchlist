import { PrismaClient } from '@prisma/client';
import { feedService } from '../src/services/feedService.js';
import { memoryService } from '../src/services/memoryService.js';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: { in: ['alex@example.com', 'alice@example.com', 'usr_angira_001@example.com'] },
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  console.log('\n=== REAL USER FEED COUNTS & STATE AUDIT ===');
  for (const u of users) {
    const counts = await feedService.getFeedCounts(u.id);
    const feed = await feedService.getFeed(u.id, { window: 'toReview', limit: 10 });
    const memoryRead = await memoryService.getArchivedEvents({ userId: u.id, memoryType: 'READ', limit: 5 });
    const memorySaved = await memoryService.getArchivedEvents({ userId: u.id, memoryType: 'SAVED', limit: 5 });

    console.log(`\n------------------------------------------------------------`);
    console.log(`User: ${u.email} (${u.name}, ID: ${u.id})`);
    console.log(`Created At: ${u.createdAt.toISOString()}`);
    console.log(`Feed Counts:`, JSON.stringify(counts, null, 2));
    console.log(`Unhandled Feed Sample Items (Top 3):`);
    feed.items.slice(0, 3).forEach((item) => {
      console.log(`  - [${item.stockSymbol}] ${item.headline} (${item.date}, Priority: ${item.priorityLabel}, isNew: ${item.isNew})`);
    });
    console.log(`Market Memory Read Sample Count: ${memoryRead.length}`);
    console.log(`Market Memory Saved Sample Count: ${memorySaved.length}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
