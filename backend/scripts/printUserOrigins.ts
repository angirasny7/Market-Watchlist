import { prisma } from '../src/config/prisma.js';

async function printUnsureUsers() {
  const sureTestEmails = [
    'demo@example.com',
    'sim_user@marketwatch.test',
    'test_secondary@marketwatch.test',
  ];

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

  console.log('Detailed Inspection of Users:');
  for (const u of users) {
    const email = u.email.toLowerCase();
    const isAlex = email === 'alex@example.com';
    const isKnownTest =
      email.startsWith('test_') ||
      email.startsWith('multi_') ||
      email.startsWith('perf_') ||
      email.startsWith('jwt_test_') ||
      email.startsWith('auth_') ||
      email.startsWith('sim_') ||
      email.includes('marketwatch.test') ||
      email.includes('test.com') ||
      email.includes('example.org') ||
      sureTestEmails.includes(email);

    const stocks = u.watchlists.flatMap((w) => w.stocks.map((s) => s.stockSymbol));

    console.log(
      `[${isAlex ? 'REAL' : isKnownTest ? 'TEST' : 'UNSURE'}] ${u.id} | ${u.email.padEnd(45)} | ${u.name.padEnd(20)} | ${u.createdAt.toISOString().slice(0, 10)} | Watchlists: ${u.watchlists.length} | Stocks (${stocks.length}): [${stocks.slice(0, 5).join(', ')}${stocks.length > 5 ? '...' : ''}]`
    );
  }
}

printUnsureUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
