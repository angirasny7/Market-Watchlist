import { PrismaClient } from '@prisma/client';

let queries: string[] = [];
let isTracking = false;

const customPrisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

(customPrisma as any).$on('query', (e: any) => {
  if (isTracking) {
    queries.push(e.query);
  }
});

// Set global.__prismaClient before importing services so they use customPrisma
(global as any).__prismaClient = customPrisma;

async function run() {
  const { watchlistService } = await import('../src/services/watchlistService.js');
  const prisma = customPrisma;

  console.log('📊 [Performance Check] Testing getOverview query count for N+1 query safety...\n');

  // 1. Get or create test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `perf_test_${Date.now()}@test.com`,
        name: 'Perf Test User',
        passwordHash: 'dummy',
      },
    });
  }
  const userId = user.id;

  // Ensure user has at least one watchlist
  let wl = await prisma.watchlist.findFirst({ where: { userId } });
  if (!wl) {
    wl = await prisma.watchlist.create({
      data: { userId, name: 'Perf Watchlist', isDefault: true },
    });
  }

  // Fetch available catalog stocks
  const catalogStocks = await prisma.stock.findMany({ take: 6 });
  if (catalogStocks.length < 4) {
    throw new Error('Need at least 4 catalog stocks in DB to run performance test.');
  }

  const stockA = catalogStocks[0].symbol;
  const stockB = catalogStocks[1].symbol;
  const stockC = catalogStocks[2].symbol;
  const stockD = catalogStocks[3].symbol;

  // Clean watchlist stocks for user
  await prisma.watchlistStock.deleteMany({
    where: { watchlist: { userId } },
  });

  // Setup State 1: Watchlist has 1 stock
  await prisma.watchlistStock.create({
    data: { watchlistId: wl.id, stockSymbol: stockA },
  });

  // Benchmark Run 1: 1 stock in watchlist
  queries = [];
  isTracking = true;
  await watchlistService.getOverview(userId, 'all');
  isTracking = false;
  const countRun1 = queries.length;
  const queriesRun1 = [...queries];

  console.log(`🔹 Run 1 (1 stock in watchlist): ${countRun1} database queries executed.`);
  queriesRun1.forEach((q, i) => {
    // Truncate long SQL statements for readability
    const preview = q.length > 90 ? q.slice(0, 90) + '...' : q;
    console.log(`   ${i + 1}. ${preview}`);
  });

  // Setup State 2: Watchlist has 4 stocks
  await prisma.watchlistStock.createMany({
    data: [
      { watchlistId: wl.id, stockSymbol: stockB },
      { watchlistId: wl.id, stockSymbol: stockC },
      { watchlistId: wl.id, stockSymbol: stockD },
    ],
  });

  // Benchmark Run 2: 4 stocks in watchlist (4x increase in stocks)
  queries = [];
  isTracking = true;
  await watchlistService.getOverview(userId, 'all');
  isTracking = false;
  const countRun2 = queries.length;
  const queriesRun2 = [...queries];

  console.log(`\n🔹 Run 2 (4 stocks in watchlist): ${countRun2} database queries executed.`);
  queriesRun2.forEach((q, i) => {
    const preview = q.length > 90 ? q.slice(0, 90) + '...' : q;
    console.log(`   ${i + 1}. ${preview}`);
  });

  // Verification & Assertions
  console.log('\n--------------------------------------------------');
  console.log(`Results: Run 1 (1 stock) = ${countRun1} queries | Run 2 (4 stocks) = ${countRun2} queries`);

  if (countRun1 === countRun2) {
    console.log(`✅ PASS: Query count is STRICTLY CONSTANT (${countRun1} queries) regardless of stock count.`);
    console.log('✅ PASS: Zero N+1 queries detected in getOverview endpoint.');
  } else {
    console.error(`❌ FAIL: Query count grew from ${countRun1} to ${countRun2} with more stocks! Potential N+1 query detected.`);
    process.exit(1);
  }

  await customPrisma.$disconnect();
}

run().catch((err) => {
  console.error('\n❌ Performance test failed:', err);
  process.exit(1);
});
