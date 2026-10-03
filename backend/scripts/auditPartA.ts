import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('PART A COMPREHENSIVE DATA AUDIT');
  console.log('========================================\n');

  // 1. User & Watchlist
  const user = await prisma.user.findFirst({ where: { email: 'alex@example.com' } });
  if (!user) {
    console.error('User alex@example.com not found!');
    return;
  }
  const userId = user.id;

  const ws = await prisma.watchlistStock.findMany({
    where: { watchlist: { userId } },
    select: { stockSymbol: true },
  });
  const symbols = [...new Set(ws.map((w) => w.stockSymbol))];
  console.log(`User: ${user.name} (${user.email}, ID: ${userId})`);
  console.log(`Monitored Stocks (${symbols.length}): ${symbols.join(', ')}\n`);

  // 2. A1: Stale text & Baked prices in events
  console.log('--- A1: Baked Prices & String Interpolation in Events ---');
  const allEvents = await prisma.event.findMany({
    where: { stockSymbol: { in: symbols } },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`Total events for user stocks: ${allEvents.length}`);

  const bakedTextEvents = allEvents.filter((e) => {
    const d = (e.metricsDelta as any) || {};
    const reason = d.detectionReason || '';
    const summary = d.enrichment?.summary || '';
    const headline = d.headline || '';
    return (
      reason.includes('since your last visit') ||
      reason.includes('->') ||
      summary.includes('->') ||
      headline.includes('->') ||
      /\d+\.\d{2}\s*->\s*\d+\.\d{2}/.test(reason) ||
      /\+\d+\.\d+%/.test(reason)
    );
  });
  console.log(`Events with baked price text / arrow strings: ${bakedTextEvents.length}`);
  for (const e of bakedTextEvents.slice(0, 10)) {
    const d = (e.metricsDelta as any) || {};
    console.log(`  [${e.stockSymbol}] ${e.eventType} (${e.timestamp.toISOString()})`);
    console.log(`    DetectionReason: ${d.detectionReason}`);
    console.log(`    Price in metricsDelta: ${d.price} | baseline: ${d.baselinePrice} | change%: ${d.changePercent}`);
    console.log(`    Enrichment summary: ${d.enrichment?.summary}`);
  }

  // Check where 1942.50 comes from
  console.log('\n--- Where does 1942.50 or 1035.00 come from? ---');
  const infyStock = await prisma.stock.findUnique({ where: { symbol: 'INFY' } });
  console.log('Stock table INFY:', {
    currentPrice: infyStock?.currentPrice ? Number(infyStock.currentPrice) : null,
    changePercent: infyStock?.changePercent ? Number(infyStock.changePercent) : null,
    updatedAt: infyStock?.updatedAt?.toISOString(),
  });

  // Check all INFY events
  const infyEvents = allEvents.filter((e) => e.stockSymbol === 'INFY');
  console.log(`INFY events count: ${infyEvents.length}`);
  for (const e of infyEvents) {
    const d = (e.metricsDelta as any) || {};
    console.log(`  ID: ${e.id} | ${e.eventType} | ${e.priority} | ${e.timestamp.toISOString()}`);
    console.log(`    Reason: ${d.detectionReason}`);
    console.log(`    price: ${d.price}, baselinePrice: ${d.baselinePrice}, changePercent: ${d.changePercent}`);
  }

  // 3. A2: Old / demo events
  console.log('\n--- A2: Demo / Seed Events in DB ---');
  const demoEvents = await prisma.event.findMany({
    where: {
      OR: [
        { id: { startsWith: 'demo_' } },
        { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
        { metricsDelta: { path: ['isDemo'], equals: true } },
      ],
    },
    orderBy: { timestamp: 'desc' },
  });
  console.log(`Total demo/seed events in DB: ${demoEvents.length}`);
  for (const e of demoEvents) {
    const d = (e.metricsDelta as any) || {};
    console.log(`  ID: ${e.id} | ${e.stockSymbol} | ${e.eventType} | ${e.priority} | ${e.timestamp.toISOString()} | isDemo: ${d.isDemo}`);
  }

  // Check if any "Sep 5" event exists in general
  const sep5Events = await prisma.event.findMany({
    where: {
      timestamp: {
        gte: new Date('2026-09-04T00:00:00Z'),
        lte: new Date('2026-09-06T23:59:59Z'),
      },
    },
  });
  console.log(`\nEvents between Sep 4-6, 2026: ${sep5Events.length}`);
  for (const e of sep5Events) {
    const d = (e.metricsDelta as any) || {};
    console.log(`  ID: ${e.id} | ${e.stockSymbol} | ${e.eventType} | ${e.timestamp.toISOString()} | Reason: ${d.detectionReason || 'None'}`);
  }

  // 4. A3: Contradictory data in Reliance event
  console.log('\n--- A3: Reliance Events Data Inspection ---');
  const relStock = await prisma.stock.findUnique({ where: { symbol: 'RELIANCE' } });
  console.log('Stock table RELIANCE:', {
    currentPrice: relStock?.currentPrice ? Number(relStock.currentPrice) : null,
    changePercent: relStock?.changePercent ? Number(relStock.changePercent) : null,
    high52w: relStock?.high52w ? Number(relStock.high52w) : null,
    low52w: relStock?.low52w ? Number(relStock.low52w) : null,
    updatedAt: relStock?.updatedAt?.toISOString(),
  });

  const relEvents = allEvents.filter((e) => e.stockSymbol === 'RELIANCE');
  console.log(`RELIANCE events count: ${relEvents.length}`);
  for (const e of relEvents) {
    const d = (e.metricsDelta as any) || {};
    console.log(`  ID: ${e.id} | ${e.eventType} | ${e.priority} | ${e.timestamp.toISOString()}`);
    console.log(`    Reason: ${d.detectionReason}`);
    console.log(`    price: ${d.price}, baselinePrice: ${d.baselinePrice}, changePercent: ${d.changePercent}`);
    console.log(`    volume: ${d.volume}, avgVol20D: ${d.avgVolume20D}`);
    console.log(`    enrichment: ${d.enrichment?.summary}`);
  }

  // 5. A4: News rows inspection
  console.log('\n--- A4: News Rows Audit ---');
  const allNews = await prisma.news.findMany({
    orderBy: { publishedAt: 'desc' },
  });
  console.log(`Total news rows in DB: ${allNews.length}`);
  const newsBySymbol = new Map<string, number>();
  for (const n of allNews) {
    newsBySymbol.set(n.stockSymbol, (newsBySymbol.get(n.stockSymbol) || 0) + 1);
  }
  console.log('News count by symbol:');
  for (const [sym, cnt] of newsBySymbol.entries()) {
    console.log(`  ${sym}: ${cnt} news items`);
  }

  console.log('\nSample news items:');
  for (const n of allNews.slice(0, 8)) {
    console.log(`  [${n.stockSymbol}] "${n.headline}" | Source: ${n.source} | Publisher: ${n.publisher} | URL: ${n.url} | Date: ${n.publishedAt.toISOString()}`);
  }

  // 6. A5: Unread Counts Breakdown
  console.log('\n--- A5: Unread Counts Audit ---');
  const windowDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const inWindowEvents = allEvents.filter((e) => e.timestamp >= windowDate);
  const readRows = await prisma.userEventRead.findMany({ where: { userId } });
  const readEventIds = new Set(readRows.map((r) => r.eventId));

  const unreadEvents = inWindowEvents.filter((e) => !readEventIds.has(e.id));
  const unreadClusters = new Set<string>();
  for (const e of unreadEvents) {
    const day = e.timestamp.toISOString().split('T')[0];
    unreadClusters.add(`${e.stockSymbol}|${day}`);
  }

  console.log(`Total user events in DB: ${allEvents.length}`);
  console.log(`In-window (30D) events: ${inWindowEvents.length}`);
  console.log(`Read event rows for user: ${readRows.length}`);
  console.log(`Unread raw events: ${unreadEvents.length}`);
  console.log(`Unread clusters (stock + day): ${unreadClusters.size}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
