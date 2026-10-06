import { PrismaClient, EventType } from '@prisma/client';
import { meaningfulnessScoreService } from '../src/services/meaningfulnessScoreService';
import { FeedService } from '../src/services/feedService';
import { formatEventTime } from '../../src/lib/formatEventTime';

const prisma = new PrismaClient();
const feedService = new FeedService();

async function auditScoreDistribution() {
  console.log('======================================================================');
  console.log('📈 STAGE A SCORE DISTRIBUTION & FEED AUDIT (Items A5, A8)');
  console.log('======================================================================\n');

  // 1. Fetch all non-demo, non-duplicate events for Alex's monitored stocks
  const user = await prisma.user.findUnique({
    where: { email: 'alex@example.com' },
    include: {
      watchlists: {
        include: {
          stocks: true,
        },
      },
    },
  });

  if (!user) {
    console.log('User alex@example.com not found');
    return;
  }

  const monitoredSymbols = Array.from(
    new Set(user.watchlists.flatMap((w) => w.stocks.map((s) => s.stockSymbol)))
  );

  const allEvents = await prisma.event.findMany({
    where: {
      stockSymbol: { in: monitoredSymbols },
      isDemo: false,
      isHidden: false,
      isDuplicate: false,
      isInvalidated: false,
    },
    include: {
      stock: true,
    },
    orderBy: { occurredAt: 'desc' },
  });

  console.log(`Auditing ${allEvents.length} real events for ${monitoredSymbols.length} monitored stocks...\n`);

  let mainCount = 0; // >= 40
  let minorCount = 0; // 20 - 39
  let hiddenCount = 0; // < 20

  const scores: number[] = [];
  const eventTypeCounts: Record<string, number> = {};
  const dayCounts: Record<string, number> = {};

  const evaluatedEvents = allEvents.map((ev) => {
    const delta = (ev.metricsDelta as any) || {};
    const changePct = typeof delta.changePercent === 'number' ? delta.changePercent : Number(ev.stock.changePercent);
    const volRatio = typeof delta.volumeRatio === 'number' ? delta.volumeRatio : 1.0;

    const res = meaningfulnessScoreService.calculateScore({
      eventType: ev.eventType,
      changePercent: changePct,
      volumeRatio: volRatio,
      trustTier: (ev.sourceTrustTier as any) || 'OFFICIAL_EXCHANGE',
      sourceCount: 1,
    });

    scores.push(res.score);
    if (res.tier === 'MAIN') mainCount++;
    else if (res.tier === 'MINOR') minorCount++;
    else hiddenCount++;

    eventTypeCounts[ev.eventType] = (eventTypeCounts[ev.eventType] || 0) + 1;

    const dayKey = ev.occurredAt
      ? ev.occurredAt.toISOString().split('T')[0]
      : ev.occurredOn
      ? ev.occurredOn.toISOString().split('T')[0]
      : ev.timestamp.toISOString().split('T')[0];
    dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;

    return {
      id: ev.id,
      symbol: ev.stockSymbol,
      type: ev.eventType,
      day: dayKey,
      score: res.score,
      tier: res.tier,
      priority: res.priorityLabel,
      whyShown: res.whyShown,
      label: formatEventTime({
        occurredAt: ev.occurredAt,
        occurredOn: ev.occurredOn,
        timestamp: ev.timestamp,
        eventType: ev.eventType,
        exchange: ev.stock.exchange,
        source: ev.source,
      }),
    };
  });

  // Print Summary Distribution
  console.log('--- 1. SCORE TIER BREAKDOWN ---');
  console.log(`• Main Feed (Score >= 40): ${mainCount} items (${((mainCount / allEvents.length) * 100).toFixed(1)}%)`);
  console.log(`• Minor Updates (Score 20-39): ${minorCount} items (${((minorCount / allEvents.length) * 100).toFixed(1)}%)`);
  console.log(`• Hidden / Low Signal (Score < 20): ${hiddenCount} items (${((hiddenCount / allEvents.length) * 100).toFixed(1)}%)\n`);

  console.log('--- 2. REAL COUNTS PER EVENT TYPE ---');
  console.table(
    Object.entries(eventTypeCounts).map(([type, count]) => ({
      'Event Type': type,
      Count: count,
    }))
  );

  console.log('--- 3. REAL COUNTS PER DAY ---');
  console.table(
    Object.entries(dayCounts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 10)
      .map(([day, count]) => ({
        Date: day,
        'Event Count': count,
      }))
  );

  console.log('--- 4. SAMPLE FEED CARDS (WHAT FEED SHOWS RIGHT NOW) ---');
  const sampleFeed = evaluatedEvents.filter((e) => e.tier === 'MAIN').slice(0, 6);
  console.table(sampleFeed);

  console.log('\n======================================================================');
  console.log('✓ SCORE DISTRIBUTION AUDIT COMPLETE');
  console.log('======================================================================');
}

auditScoreDistribution()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
