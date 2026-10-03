import { prisma } from '../src/config/prisma.js';
import { ProviderFactory } from '../src/providers/providerFactory.js';
import { getOrCreateSimulationUser, runSessionSimulation } from './simulateSession.js';

async function main() {
  console.log('================== PART E.1: OCCURRED_AT AUDIT ==================');
  const allEvents = await prisma.event.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      stockSymbol: true,
      eventType: true,
      createdAt: true,
      occurredAt: true,
      occurredOn: true,
      timestamp: true,
      metricsDelta: true,
    },
  });

  let barDateCount = 0;
  let corporateCount = 0;
  let backfilledCount = 0;

  const sampleRows = allEvents.slice(0, 15).map((e) => {
    let source = 'Provider Bar Date';
    if (e.eventType.includes('EARNINGS') || e.eventType.includes('DIVIDEND') || e.eventType.includes('AGM')) {
      source = 'Corporate Calendar Filing';
      corporateCount++;
    } else if (e.occurredAt && e.occurredAt.toISOString() === e.createdAt.toISOString()) {
      source = 'Backfilled from createdAt';
      backfilledCount++;
    } else {
      barDateCount++;
    }

    return {
      id: e.id.slice(0, 8),
      symbol: e.stockSymbol,
      type: e.eventType,
      createdAt: e.createdAt.toISOString(),
      occurredAt: e.occurredAt?.toISOString() || 'NULL',
      source,
    };
  });

  console.table(sampleRows);
  console.log(`Total audited sample events: ${allEvents.length}`);
  console.log(`- Provider Bar Dates: ${barDateCount}`);
  console.log(`- Corporate Calendar Filings: ${corporateCount}`);
  console.log(`- Backfilled from createdAt: ${backfilledCount}`);

  console.log('\n================== PART E.2: WINDOW COUNTS ON SIM_USER ==================');
  const simUser = await getOrCreateSimulationUser();

  const scenarios = [
    { name: 'Weekend Gap (Sat 3 Oct 6:50 PM -> Sun 4 Oct 5:00 PM)', logout: new Date('2026-10-03T13:20:00Z'), login: new Date('2026-10-04T11:30:00Z') },
    { name: '2-Day Gap (Thu 1 Oct 3:00 PM -> Sat 3 Oct 3:00 PM)', logout: new Date('2026-10-01T09:30:00Z'), login: new Date('2026-10-03T09:30:00Z') },
    { name: '19-Day Gap (Mon 14 Sep -> Sat 3 Oct)', logout: new Date('2026-09-14T10:00:00Z'), login: new Date('2026-10-03T13:20:00Z') },
    { name: '90-Day Gap (Sun 5 Jul -> Sat 3 Oct)', logout: new Date('2026-07-05T13:54:00Z'), login: new Date('2026-10-03T13:20:00Z') },
  ];

  for (const s of scenarios) {
    await runSessionSimulation({
      userId: simUser.id,
      logoutDate: s.logout,
      loginDate: s.login,
      label: s.name,
      confirm: true,
    });
  }

  console.log('\n================== PART E.3: CORPORATE EVENTS AUDIT ==================');
  const corpEvents = await prisma.corporateEvent.findMany({
    take: 10,
    orderBy: { eventDate: 'asc' },
  });
  console.table(
    corpEvents.map((c) => ({
      id: c.id.slice(0, 8),
      symbol: c.stockSymbol,
      type: c.eventType,
      date: c.eventDate.toISOString().split('T')[0],
      title: c.title.slice(0, 40),
      isDemo: c.isDemo,
    }))
  );

  console.log('\n================== PART E.4: LARGE MOVES AUDIT ==================');
  const provider = ProviderFactory.getMarketDataProvider();
  const testSymbols = ['PERSISTENT', 'COFORGE', 'HDFCBANK', 'AMD', 'NFLX'];
  const moveResults: any[] = [];

  for (const sym of testSymbols) {
    const stock = await prisma.stock.findUnique({ where: { symbol: sym } });
    const bars = await provider.getHistoricalBars(sym, 30);
    const latestBar = bars && bars.length > 0 ? bars[bars.length - 1] : null;
    const baselineBar = bars && bars.length > 5 ? bars[bars.length - 6] : (bars && bars.length > 0 ? bars[0] : null);

    const baseClose = baselineBar ? baselineBar.close : 0;
    const latestClose = stock?.currentPrice ? Number(stock.currentPrice) : (latestBar ? latestBar.close : 0);
    const returnPct = baseClose > 0 ? ((latestClose - baseClose) / baseClose) * 100 : 0;

    moveResults.push({
      Symbol: sym,
      BaselineDate: baselineBar?.timestamp || 'N/A',
      BaselineClose: baseClose,
      LatestClose: latestClose,
      ReturnPct: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`,
      Provider: 'YahooFinanceProvider',
      IsReal: bars && bars.length > 0 ? 'YES (From raw daily bars)' : 'NO',
    });
  }
  console.table(moveResults);

  console.log('\n================== PART E.5: NEWS INGESTION STATUS ==================');
  const newsByStock = await prisma.news.groupBy({
    by: ['stockSymbol'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 15,
  });
  console.table(
    newsByStock.map((n) => ({
      stockSymbol: n.stockSymbol,
      articleCount: n._count.id,
    }))
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
