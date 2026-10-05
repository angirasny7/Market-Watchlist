import { prisma } from '../src/config/prisma.js';

async function checkUsers() {
  const users = await prisma.user.findMany({
    include: {
      watchlists: {
        include: {
          stocks: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  for (const u of users) {
    if (!u.isTestUser || u.email.includes('alex') || u.email.includes('angira')) {
      const stockCount = u.watchlists.flatMap((w) => w.stocks).length;
      console.log(`User: ${u.name} | Email: ${u.email} | ID: ${u.id} | CreatedAt: ${u.createdAt.toISOString()} | isTestUser: ${u.isTestUser} | Monitored Stocks: ${stockCount}`);
      for (const w of u.watchlists) {
        console.log(`  - Watchlist: "${w.name}" (${w.id}) | Stocks: ${w.stocks.length}`);
        if (w.stocks.length > 0) {
          const earliestAdded = w.stocks.reduce((min, s) => s.addedAt < min ? s.addedAt : min, w.stocks[0].addedAt);
          console.log(`    Earliest stock addedAt: ${earliestAdded.toISOString()}`);
        }
      }
    }
  }
}

checkUsers().finally(() => prisma.$disconnect());
