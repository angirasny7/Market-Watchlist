import { prisma } from '../src/config/prisma.js';

async function flagNonRealAndDuplicates() {
  console.log('========================================================================');
  console.log('  FLAG NON-REAL EVENTS & DEDUPLICATE STOCK-DAY EVENTS');
  console.log('========================================================================\n');

  // 1. Flag demo and seed events
  const demoSeedUpdated = await prisma.event.updateMany({
    where: {
      OR: [
        { id: { startsWith: 'demo_' } },
        { id: { in: ['evt_001', 'evt_002', 'evt_003', 'evt_004'] } },
      ],
    },
    data: {
      isDemo: true,
      isHidden: true,
    },
  });
  console.log(`✓ Flagged ${demoSeedUpdated.count} seed/demo events as isDemo = true, isHidden = true`);

  // 2. Flag heuristic template events created from news headlines on Sept 4-5
  const templateTypes: any[] = ['EARNINGS_BEAT', 'DIVIDEND_ANNOUNCED', 'ANALYST_UPGRADE', 'MANAGEMENT_CHANGE', 'EARNINGS_MISS'];
  const templateEvents = await prisma.event.findMany({
    where: {
      eventType: { in: templateTypes },
    },
    select: { id: true, eventType: true, stockSymbol: true, metricsDelta: true },
  });

  const templateIdsToFlag: string[] = [];
  for (const t of templateEvents) {
    const m = (t.metricsDelta as any) || {};
    // If reason mentions "catalyst detected" or "Corporate capital distribution action" from early template engine
    if (m.detectionReason?.includes('catalyst detected') || m.detectionReason?.includes('Corporate capital distribution action') || m.isDemo) {
      templateIdsToFlag.push(t.id);
    }
  }

  if (templateIdsToFlag.length > 0) {
    const templateUpdated = await prisma.event.updateMany({
      where: { id: { in: templateIdsToFlag } },
      data: { isDemo: true, isHidden: true },
    });
    console.log(`✓ Flagged ${templateUpdated.count} heuristic template events as isDemo = true, isHidden = true`);
  }

  // 3. Flag cumulative "+X% since your last visit" events as isHidden = true
  const allEvents = await prisma.event.findMany({
    select: { id: true, eventType: true, periodStart: true, metricsDelta: true },
  });

  const cumulativeIds: string[] = [];
  for (const e of allEvents) {
    const m = (e.metricsDelta as any) || {};
    if (
      e.periodStart !== null ||
      e.eventType === ('CUMULATIVE_MOVE' as any) ||
      m.headline?.includes('since your last visit') ||
      m.detectionReason?.includes('since your last visit') ||
      m.summary?.includes('since your last visit')
    ) {
      cumulativeIds.push(e.id);
    }
  }

  if (cumulativeIds.length > 0) {
    const cumulativeUpdated = await prisma.event.updateMany({
      where: { id: { in: cumulativeIds } },
      data: { isHidden: true },
    });
    console.log(`✓ Flagged ${cumulativeUpdated.count} cumulative 'since last visit' events as isHidden = true`);
  }

  // 4. Duplicate resolution: group remaining visible events by (stockSymbol, calendarDay, eventType, userId)
  const activeEvents = await prisma.event.findMany({
    where: { isHidden: false, isDemo: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true, stockSymbol: true, eventType: true, timestamp: true, occurredAt: true, occurredOn: true, userId: true },
  });

  const groupMap = new Map<string, typeof activeEvents>();

  for (const ev of activeEvents) {
    const time = ev.occurredAt || ev.occurredOn || ev.timestamp;
    const dayStr = time.toISOString().slice(0, 10);
    const userKey = ev.userId || 'PUBLIC';
    const key = `${ev.stockSymbol}__${dayStr}__${ev.eventType}__${userKey}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(ev);
  }

  const duplicateIdsToFlag: { id: string; canonicalId: string }[] = [];

  for (const [key, evts] of groupMap.entries()) {
    if (evts.length > 1) {
      const canonical = evts[0]; // keep earliest created
      for (let i = 1; i < evts.length; i++) {
        duplicateIdsToFlag.push({ id: evts[i].id, canonicalId: canonical.id });
      }
    }
  }

  console.log(`\nIdentified ${duplicateIdsToFlag.length} duplicate event instances across ${groupMap.size} distinct stock-day-type slots.`);

  for (const item of duplicateIdsToFlag) {
    await prisma.event.update({
      where: { id: item.id },
      data: {
        isDuplicate: true,
        isHidden: true,
        canonicalEventId: item.canonicalId,
      },
    });
  }

  console.log(`✓ Flagged ${duplicateIdsToFlag.length} duplicates as isDuplicate = true, isHidden = true (canonical pointers preserved).`);
  console.log('========================================================================\n');
}

flagNonRealAndDuplicates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
