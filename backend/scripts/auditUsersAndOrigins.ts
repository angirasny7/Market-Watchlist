import { prisma } from '../src/config/prisma.js';

async function auditUsersAndOrigins() {
  const users = await prisma.user.findMany({
    include: {
      watchlists: {
        include: {
          stocks: true,
        },
      },
      alerts: true,
      userState: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total Users in DB: ${users.length}\n`);

  const results: any[] = [];
  const sureTestIds: string[] = [];
  const unsureIds: string[] = [];
  const realUserIds: string[] = [];

  for (const u of users) {
    const totalWatchlists = u.watchlists.length;
    const totalStocks = u.watchlists.reduce((acc, w) => acc + w.stocks.length, 0);
    const totalAlerts = u.alerts.length;
    const email = u.email.toLowerCase();

    let likelyOrigin = 'Unknown / Manual Registration';
    let isSureTest = false;

    if (email === 'alex@example.com') {
      likelyOrigin = 'PRIMARY REAL USER (Alex)';
      realUserIds.push(u.id);
    } else if (email === 'demo@example.com' || email.includes('demo')) {
      likelyOrigin = 'Demo Seed / Demo Account';
      isSureTest = true;
    } else if (email.startsWith('multi_') || email.includes('multi_user')) {
      likelyOrigin = 'backend/tests/multiUser.test.ts';
      isSureTest = true;
    } else if (email.startsWith('perf_test_') || email.includes('perf_')) {
      likelyOrigin = 'backend/scripts/testOverviewPerformance.ts';
      isSureTest = true;
    } else if (email.startsWith('test_secondary') || email.includes('marketwatch.test')) {
      likelyOrigin = 'backend/tests/simulationSafety.test.ts';
      isSureTest = true;
    } else if (email.startsWith('test_') || email.startsWith('sim_') || email.includes('test.com') || email.includes('example.org')) {
      likelyOrigin = 'Automated Test Suite / Integration Test';
      isSureTest = true;
    } else if (email.includes('test') || email.includes('synthetic') || email.includes('fixture')) {
      likelyOrigin = 'Synthetic Test Fixture';
      isSureTest = true;
    } else {
      unsureIds.push(u.id);
    }

    if (isSureTest) {
      sureTestIds.push(u.id);
    }

    results.push({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
      watchlists: totalWatchlists,
      stocks: totalStocks,
      alerts: totalAlerts,
      likelyOrigin,
      isSureTest,
    });
  }

  console.table(
    results.map((r) => ({
      ID: r.id.slice(0, 8) + '...',
      Email: r.email,
      CreatedAt: r.createdAt.split('T')[0],
      Lists: r.watchlists,
      Stocks: r.stocks,
      Alerts: r.alerts,
      LikelyOrigin: r.likelyOrigin,
      Test: r.isSureTest ? 'YES' : 'NO',
    }))
  );

  console.log(`\n========================================================`);
  console.log(`Real Users (${realUserIds.length}):`);
  console.log(realUserIds);
  console.log(`\nSure Test Users (${sureTestIds.length}):`);
  console.log(sureTestIds);
  console.log(`\nUnsure Users (${unsureIds.length}):`);
  console.log(unsureIds);
  console.log(`========================================================\n`);
}

auditUsersAndOrigins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
