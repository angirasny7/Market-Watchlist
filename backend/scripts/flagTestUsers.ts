import { prisma } from '../src/config/prisma.js';

async function flagTestUsers() {
  console.log('========================================================================');
  console.log('  FLAG TEST USERS & AUDIT REAL VS TEST SYMBOL MONITORING');
  console.log('========================================================================\n');

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

  const sureTestIds: string[] = [];
  const unsureIds: string[] = [];
  const realIds: string[] = [];

  for (const u of users) {
    const email = u.email.toLowerCase();
    if (email === 'alex@example.com') {
      realIds.push(u.id);
    } else if (u.id === 'usr_angira_001') {
      unsureIds.push(u.id);
    } else {
      sureTestIds.push(u.id);
    }
  }

  console.log(`📌 User Classification:`);
  console.log(`  • Real User Accounts (${realIds.length}):`);
  for (const id of realIds) {
    const u = users.find((x) => x.id === id)!;
    console.log(`    - ID: ${u.id} | Email: ${u.email} | Name: ${u.name}`);
  }

  console.log(`\n  • Unsure User Accounts (${unsureIds.length}):`);
  for (const id of unsureIds) {
    const u = users.find((x) => x.id === id)!;
    console.log(`    - ID: ${u.id} | Email: ${u.email} | Name: ${u.name}`);
  }

  console.log(`\n  • Sure Test Accounts To Flag (${sureTestIds.length}):`);
  console.log(`    Total: ${sureTestIds.length} users\n`);

  // Flag sure test users with isTestUser = true
  const updated = await prisma.user.updateMany({
    where: { id: { in: sureTestIds } },
    data: { isTestUser: true },
  });
  console.log(`✓ Updated ${updated.count} test user accounts to isTestUser = true\n`);

  // Ensure real and unsure users are isTestUser = false
  await prisma.user.updateMany({
    where: { id: { in: [...realIds, ...unsureIds] } },
    data: { isTestUser: false },
  });

  // Calculate Real Monitored Symbols (where isTestUser = false)
  const realWatchlistStocks = await prisma.watchlistStock.findMany({
    where: { watchlist: { user: { isTestUser: false } } },
    select: { stockSymbol: true },
  });
  const realSymbols = Array.from(new Set(realWatchlistStocks.map((ws) => ws.stockSymbol.toUpperCase().trim()))).sort();

  // Calculate Test Monitored Symbols (where isTestUser = true)
  const testWatchlistStocks = await prisma.watchlistStock.findMany({
    where: { watchlist: { user: { isTestUser: true } } },
    select: { stockSymbol: true },
  });
  const testSymbols = Array.from(new Set(testWatchlistStocks.map((ws) => ws.stockSymbol.toUpperCase().trim()))).sort();

  // Calculate All Distinct Monitored Symbols
  const allDistinctSymbols = Array.from(new Set([...realSymbols, ...testSymbols])).sort();

  // Symbols monitored ONLY by test users
  const testOnlySymbols = testSymbols.filter((s) => !realSymbols.includes(s));

  console.log(`📊 Monitored Symbol Comparison:`);
  console.log(`  • Real Monitored Symbols Count: ${realSymbols.length}`);
  console.log(`  • Real Monitored Symbols List: [${realSymbols.join(', ')}]\n`);

  console.log(`  • Previous Unfiltered Distinct Symbols Count: ${allDistinctSymbols.length}`);
  console.log(`  • Test-Only Symbols (monitored ONLY because of test accounts): ${testOnlySymbols.length}`);
  console.log(`  • Test-Only Symbols List: [${testOnlySymbols.join(', ')}]\n`);

  console.log('========================================================================\n');
}

flagTestUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
