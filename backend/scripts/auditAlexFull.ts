import { prisma } from '../src/config/prisma.js';

async function main() {
  const alex = await prisma.user.findFirst({
    where: { email: 'alex@example.com' },
    include: {
      userState: true,
      watchlists: {
        include: {
          stocks: true,
        },
      },
      alerts: true,
      notifications: true,
      eventReads: true,
      savedEvents: true,
    },
  });

  if (!alex) {
    console.log('User alex@example.com not found.');
    return;
  }

  console.log('=== ALEX USER RECORD ===');
  console.log('ID:', alex.id);
  console.log('Created At:', alex.createdAt.toISOString());
  console.log('Last Login At:', alex.lastLoginAt?.toISOString() || null);
  console.log('Last Logout At:', alex.lastLogoutAt?.toISOString() || null);

  console.log('\n=== USER STATE RECORD ===');
  console.log(JSON.stringify(alex.userState, null, 2));

  console.log('\n=== WATCHLISTS & STOCKS TIMESTAMPS ===');
  for (const wl of alex.watchlists) {
    console.log(`Watchlist: ${wl.name} (ID: ${wl.id}, Created: ${wl.createdAt.toISOString()}, Updated: ${wl.updatedAt.toISOString()})`);
    for (const s of wl.stocks) {
      console.log(`  - ${s.stockSymbol} (Added: ${s.addedAt.toISOString()})`);
    }
  }

  console.log('\n=== ALERTS TIMESTAMPS ===');
  for (const a of alex.alerts) {
    console.log(`Alert ${a.id} on ${a.stockSymbol} (${a.alertType}): Created ${a.createdAt.toISOString()}, Updated ${a.updatedAt.toISOString()}`);
  }

  console.log('\n=== NOTIFICATIONS TIMESTAMPS ===');
  for (const n of alex.notifications) {
    console.log(`Notification ${n.id}: Created ${n.createdAt.toISOString()}, Read: ${n.read}`);
  }

  console.log('\n=== EVENT READS TIMESTAMPS ===');
  for (const r of alex.eventReads) {
    console.log(`EventRead: Event ${r.eventId} Read At: ${r.readAt.toISOString()}`);
  }

  console.log('\n=== SAVED EVENTS TIMESTAMPS ===');
  for (const s of alex.savedEvents) {
    console.log(`SavedEvent: Event ${s.eventId} Saved At: ${s.savedAt.toISOString()}`);
  }

  console.log('\n=== RECENT SYSTEM JOB RUNS ===');
  const jobRuns = await prisma.systemJobRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 20,
  });
  console.table(
    jobRuns.map((j) => ({
      id: j.id,
      job: j.jobName,
      status: j.status,
      startedAt: j.startedAt.toISOString(),
      completedAt: j.completedAt?.toISOString(),
      records: j.recordsProcessed,
      error: j.errorMessage?.slice(0, 40),
    }))
  );

  console.log('\n=== MARKET MEMORY DIGESTS ===');
  const digests = await prisma.digest.findMany({
    include: {
      userReads: true,
      digestEvents: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  console.table(
    digests.map((d) => ({
      id: d.id,
      headline: d.headline.slice(0, 35),
      timeRange: d.timeRange,
      mood: d.marketMood,
      createdAt: d.createdAt.toISOString(),
      eventsCount: d.digestEvents.length,
      userReads: d.userReads.map((a) => `${a.userId} at ${a.readAt.toISOString()}`).join(', ') || 'NONE',
    }))
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
