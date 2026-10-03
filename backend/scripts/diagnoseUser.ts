import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      userState: true,
      watchlists: { include: { stocks: true } },
    },
  });

  for (const u of users) {
    const totalStocks = u.watchlists.reduce((acc, w) => acc + w.stocks.length, 0);
    console.log('====================================================');
    console.log(`USER: ${u.email} (ID: ${u.id}, Name: ${u.name})`);
    console.log(`User.lastLoginAt: ${u.lastLoginAt}`);
    console.log(`Watchlists: ${u.watchlists.length}, Total Stocks: ${totalStocks}`);
    console.log('UserState:');
    console.log(JSON.stringify(u.userState, null, 2));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
