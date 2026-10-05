import { prisma } from '../src/config/prisma.js';

async function classifyEvents() {
  console.log('========================================================================');
  console.log('  EXHAUSTIVE CLASSIFICATION AUDIT OF ALL MONITORED EVENTS (ALEX)');
  console.log('========================================================================\n');

  const alex = await prisma.user.findUnique({
    where: { email: 'alex@example.com' },
    include: {
      watchlists: {
        include: { stocks: true },
      },
    },
  });

  if (!alex) {
    console.error('User alex@example.com not found');
    return;
  }

  const monitoredSymbols = Array.from(new Set(alex.watchlists.flatMap((w) => w.stocks.map((s) => s.stockSymbol))));
  console.log(`👤 User: ${alex.name} (${alex.id})`);
  console.log(`📋 Monitored Symbols (${monitoredSymbols.length}): ${monitoredSymbols.join(', ')}\n`);

  // Query all events for monitored symbols visible to alex
  const events = await prisma.event.findMany({
    where: {
      stockSymbol: { in: monitoredSymbols },
      AND: [{ OR: [{ userId: null }, { userId: alex.id }] }],
    },
    include: {
      userReads: { where: { userId: alex.id } },
      userSaves: { where: { userId: alex.id } },
    },
    orderBy: { timestamp: 'desc' },
  });

  console.log(`Total Monitored Events in DB: ${events.length}\n`);

  // Classification categories
  let demoCount = 0;
  let simulatedCount = 0;
  let cumulativeCount = 0;
  let privateCount = 0;
  let readHandledCount = 0;
  let savedHandledCount = 0;
  let realProviderCount = 0;

  const typeCounts: Record<string, number> = {};
  const originCounts: Record<string, number> = {
    'Initial Seed (evt_*)': 0,
    'Demo Seed (demo_*)': 0,
    'Simulation / Absence (isSimulated=true)': 0,
    'Cumulative Move (since your last visit)': 0,
    'Change Detection Job (UUID)': 0,
    'CatchUp Service (UUID)': 0,
    'Alert Engine (UUID)': 0,
    'Other': 0,
  };

  const nonRealTypes: Record<string, number> = {
    EARNINGS_BEAT: 0,
    DIVIDEND_ANNOUNCED: 0,
    ANALYST_UPGRADE: 0,
    MANAGEMENT_CHANGE: 0,
    EARNINGS_MISS: 0,
  };

  for (const e of events) {
    typeCounts[e.eventType] = (typeCounts[e.eventType] || 0) + 1;

    const metrics = (e.metricsDelta as any) || {};
    const isDemo = e.id.startsWith('demo_') || e.id.startsWith('evt_') || metrics.isDemo === true;
    const isSimulated = e.isSimulated;
    const isCumulative = e.eventType === ('CUMULATIVE_MOVE' as any) ||
      (metrics.headline && metrics.headline.includes('since your last visit')) ||
      (metrics.detectionReason && metrics.detectionReason.includes('since your last visit')) ||
      (e.periodStart !== null);
    const isPrivate = e.userId !== null;
    const isRead = e.userReads.length > 0;
    const isSaved = e.userSaves.length > 0;

    if (isDemo) demoCount++;
    if (isSimulated) simulatedCount++;
    if (isCumulative) cumulativeCount++;
    if (isPrivate) privateCount++;
    if (isRead) readHandledCount++;
    if (isSaved) savedHandledCount++;

    if (!isDemo && !isSimulated && !isCumulative) {
      realProviderCount++;
    }

    if (e.id.startsWith('evt_')) {
      originCounts['Initial Seed (evt_*)']++;
    } else if (e.id.startsWith('demo_')) {
      originCounts['Demo Seed (demo_*)']++;
    } else if (isSimulated) {
      originCounts['Simulation / Absence (isSimulated=true)']++;
    } else if (isCumulative) {
      originCounts['Cumulative Move (since your last visit)']++;
    } else if (metrics.detectionReason?.includes('ChangeDetectionJob') || metrics.detectedBy === 'ChangeDetectionJob') {
      originCounts['Change Detection Job (UUID)']++;
    } else if (metrics.detectionReason?.includes('CatchUp') || metrics.source === 'CatchUpService') {
      originCounts['CatchUp Service (UUID)']++;
    } else {
      originCounts['Change Detection Job (UUID)']++;
    }

    if (nonRealTypes[e.eventType] !== undefined) {
      nonRealTypes[e.eventType]++;
    }
  }

  console.log('📊 Category Breakdown:');
  console.log(`  • Demo / Seed Rows:                       ${demoCount}`);
  console.log(`  • Simulated (isSimulated=true):            ${simulatedCount}`);
  console.log(`  • Cumulative Moves ("since last visit"):   ${cumulativeCount}`);
  console.log(`  • Private to Alex (userId not null):      ${privateCount}`);
  console.log(`  • Handled in Read (UserEventRead):         ${readHandledCount}`);
  console.log(`  • Handled in Saved (UserSavedEvent):       ${savedHandledCount}`);
  console.log(`  • Real Provider / Live Market Events:      ${realProviderCount}\n`);

  console.log('🏷️ Event Types Distribution:');
  console.table(Object.entries(typeCounts).map(([type, count]) => ({ 'Event Type': type, Count: count })));

  console.log('🔍 Origin Breakdown:');
  console.table(Object.entries(originCounts).map(([origin, count]) => ({ Origin: origin, Count: count })));

  console.log('🔎 Specific Non-Real / Template Types Details:');
  console.table(Object.entries(nonRealTypes).map(([type, count]) => ({ 'Event Type': type, Count: count })));

  // Detailed inspect of non-real types
  const sampleNonReal = events.filter((e) => ['EARNINGS_BEAT', 'DIVIDEND_ANNOUNCED', 'ANALYST_UPGRADE', 'MANAGEMENT_CHANGE', 'EARNINGS_MISS'].includes(e.eventType));
  console.log(`\nSamples of Template Event Rows (${sampleNonReal.length} total):`);
  for (const s of sampleNonReal) {
    const m = (s.metricsDelta as any) || {};
    console.log(`- ID: ${s.id} | Symbol: ${s.stockSymbol} | Type: ${s.eventType} | Date: ${s.timestamp.toISOString()} | Reason: ${m.detectionReason || m.headline || 'N/A'}`);
  }

  console.log('========================================================================\n');
}

classifyEvents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
