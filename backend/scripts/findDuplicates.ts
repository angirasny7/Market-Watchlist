import { prisma } from '../src/config/prisma.js';

async function check() {
  const users = await prisma.user.findMany({
    include: {
      watchlists: {
        include: {
          stocks: true,
        },
      },
    },
  });

  let totalDupesFound = 0;
  console.log('--- Duplicate Check Report ---');
  for (const u of users) {
    const defaultWl = u.watchlists.find((w) => w.isDefault);
    const nonDefaultWls = u.watchlists.filter((w) => !w.isDefault);
    if (!defaultWl || nonDefaultWls.length === 0) continue;

    const defaultSymbols = new Set(defaultWl.stocks.map((s) => s.stockSymbol));
    for (const nwl of nonDefaultWls) {
      const duplicates = nwl.stocks.filter((s) => defaultSymbols.has(s.stockSymbol));
      if (duplicates.length > 0) {
        totalDupesFound += duplicates.length;
        console.log(`User: ${u.email}`);
        console.log(`  Default List: "${defaultWl.name}"`);
        console.log(`  Non-Default List: "${nwl.name}"`);
        console.log(`  Duplicated stocks: ${duplicates.map((d) => d.stockSymbol).join(', ')}`);
      }
    }
  }

  if (totalDupesFound === 0) {
    console.log('No duplicate stock entries found between Primary and non-default watchlists.');
  } else {
    console.log(`Total duplicated entries found: ${totalDupesFound}`);
  }

  await prisma.$disconnect();
}

check().catch((err) => {
  console.error(err);
  process.exit(1);
});
