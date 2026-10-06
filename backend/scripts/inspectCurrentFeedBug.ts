import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectBug() {
  const user = await prisma.user.findUnique({
    where: { email: 'alex@example.com' },
    include: {
      userState: true,
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

  console.log('=== USER STATE FOR alex@example.com ===');
  console.log('User ID:', user.id);
  console.log('UserState:', {
    lastLoginAt: user.userState?.lastLoginAt,
    lastActivityAt: user.userState?.lastActivityAt,
    lastLogoutAt: user.userState?.lastLogoutAt,
    previousSessionAt: user.userState?.previousSessionAt,
    previousSessionEndedAt: user.userState?.previousSessionEndedAt,
    previousSessionStartedAt: user.userState?.previousSessionStartedAt,
    lastSeenAt: user.userState?.lastSeenAt,
  });

  const monitoredSymbols = Array.from(
    new Set(user.watchlists.flatMap((w) => w.stocks.map((s) => s.stockSymbol)))
  );
  console.log('\nMonitored symbols count:', monitoredSymbols.length, monitoredSymbols);

  const boundary = user.userState?.previousSessionEndedAt || user.userState?.previousSessionAt || new Date(0);
  console.log('\nCalculated Window Boundary:', boundary.toISOString());

  const recentEvents = await prisma.event.findMany({
    where: {
      stockSymbol: { in: monitoredSymbols },
      isHidden: false,
      isDuplicate: false,
      isInvalidated: false,
      isDemo: false,
      OR: [
        { occurredAt: { gte: boundary } },
        { AND: [{ occurredAt: null }, { occurredOn: { gte: boundary } }] },
        { AND: [{ occurredAt: null }, { occurredOn: null }, { timestamp: { gte: boundary } }] },
      ],
    },
    include: {
      stock: true,
    },
    orderBy: { timestamp: 'desc' },
  });

  console.log(`\n=== EVENTS IN "SINCE LAST VISIT" WINDOW (${recentEvents.length} events) ===`);
  for (const ev of recentEvents) {
    console.log({
      id: ev.id,
      stock: ev.stockSymbol,
      type: ev.eventType,
      priority: ev.priority,
      createdAt: ev.createdAt?.toISOString(),
      timestamp: ev.timestamp?.toISOString(),
      occurredAt: ev.occurredAt?.toISOString(),
      occurredOn: ev.occurredOn?.toISOString(),
      periodStart: ev.periodStart?.toISOString(),
      detectedAt: ev.detectedAt?.toISOString(),
      metricsDelta: ev.metricsDelta,
    });
  }

  // Also inspect latest SystemJobRun to see which jobs ran
  const recentJobRuns = await prisma.systemJobRun.findMany({
    take: 10,
    orderBy: { startedAt: 'desc' },
  });
  console.log('\n=== RECENT SYSTEM JOB RUNS ===');
  for (const job of recentJobRuns) {
    console.log({
      jobName: job.jobName,
      status: job.status,
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      details: job.details,
    });
  }
}

inspectBug()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
