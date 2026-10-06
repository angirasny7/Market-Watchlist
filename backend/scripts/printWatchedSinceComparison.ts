import { PrismaClient } from '@prisma/client';
import { feedService } from '../src/services/feedService.js';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Item 3: watchedSince Verification (Alice vs Alex) ===');

  const alex = await prisma.user.findUnique({ where: { email: 'alex@example.com' } });
  const alice = await prisma.user.findFirst({ where: { email: { contains: 'alice' } } });

  if (!alex) {
    console.log('Alex not found!');
    return;
  }
  console.log(`Alex: ID=${alex.id}, Email=${alex.email}`);

  // Fetch Alex's feed
  const alexFeed = await feedService.getFeed(alex.id, {
    window: '30d',
    limit: 100,
  });
  console.log(`Alex Feed Count (window: 30d): ${alexFeed.items.length}`);

  if (alice) {
    console.log(`Alice: ID=${alice.id}, Email=${alice.email}`);
    const aliceFeed = await feedService.getFeed(alice.id, {
      window: '30d',
      limit: 100,
    });
    console.log(`Alice Feed Count (window: 30d): ${aliceFeed.items.length}`);
  } else {
    console.log('No Alice user found, listing users and their watchlists...');
    const users = await prisma.user.findMany({
      include: {
        watchlists: {
          include: {
            stocks: true,
          }
        }
      }
    });
    for (const u of users) {
      const feed = await feedService.getFeed(u.id, {
        window: '30d',
        limit: 100,
      });
      console.log(`User ${u.email} (${u.id}): ${u.watchlists.length} watchlists, ${feed.items.length} feed items`);
    }
  }

  // Print Alex's watchlist items and watchedSince timestamps
  const alexWatchlists = await prisma.watchlist.findMany({
    where: { userId: alex.id },
    include: { stocks: true },
  });
  console.log('\n--- Alex Watchlist Items and Effective watchedSince ---');
  const alexMap = new Map<string, Date>();
  for (const wl of alexWatchlists) {
    for (const item of wl.stocks) {
      const existing = alexMap.get(item.stockSymbol);
      if (!existing || item.addedAt < existing) {
        alexMap.set(item.stockSymbol, item.addedAt);
      }
    }
  }
  for (const [stock, addedAt] of alexMap.entries()) {
    console.log(`Stock: ${stock.padEnd(12)} | watchedSince: ${addedAt.toISOString()}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
