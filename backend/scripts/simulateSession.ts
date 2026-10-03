import { PrismaClient } from '@prisma/client';
import { catchUpService } from '../src/services/catchUpService.js';
import { feedService } from '../src/services/feedService.js';
import { formatEventTime, formatEventTooltip } from '../../src/lib/formatEventTime.js';

const prisma = new PrismaClient();

interface SimulationArgs {
  userId?: string;
  logout?: string;
  login?: string;
  days?: number;
}

function parseArgs(): SimulationArgs {
  const args = process.argv.slice(2);
  const result: SimulationArgs = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--logout' && args[i + 1]) {
      result.logout = args[i + 1];
      i++;
    } else if (args[i] === '--login' && args[i + 1]) {
      result.login = args[i + 1];
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      result.days = parseFloat(args[i + 1]);
      i++;
    } else if (args[i] === '--user' && args[i + 1]) {
      result.userId = args[i + 1];
      i++;
    }
  }

  return result;
}

export async function runSessionSimulation(options: {
  userId?: string;
  logoutDate: Date;
  loginDate: Date;
  label?: string;
}) {
  const { logoutDate, loginDate, label } = options;

  // Find target user
  let user = options.userId
    ? await prisma.user.findUnique({ where: { id: options.userId } })
    : await prisma.user.findFirst({
        where: { email: { not: '' } },
        include: { userState: true, watchlists: true },
      });

  if (!user) {
    console.error('❌ No user found to simulate session.');
    return;
  }

  const userId = user.id;

  console.log(`\n======================================================================`);
  console.log(`🔍 SESSION SIMULATION: ${label || 'Custom Session Window'}`);
  console.log(`👤 User: ${user.email} (${userId})`);
  console.log(`🚪 Logout / Previous Session Ended: ${logoutDate.toISOString()} (${logoutDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`);
  console.log(`🔑 Login / Current Session Start:   ${loginDate.toISOString()} (${loginDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`);
  const gapHours = (loginDate.getTime() - logoutDate.getTime()) / (1000 * 60 * 60);
  console.log(`⏱️ Absence Gap: ${gapHours.toFixed(1)} hours (${(gapHours / 24).toFixed(2)} days)`);
  console.log(`======================================================================`);

  // 1. Set server-side session state
  await prisma.user.update({
    where: { id: userId },
    data: {
      previousLoginAt: logoutDate,
      lastLoginAt: loginDate,
    },
  });

  await prisma.userState.upsert({
    where: { userId },
    create: {
      userId,
      lastLogoutAt: logoutDate,
      lastActivityAt: loginDate,
      lastLoginAt: loginDate,
      previousSessionAt: logoutDate,
      previousSessionEndedAt: logoutDate,
    },
    update: {
      lastLogoutAt: logoutDate,
      lastActivityAt: loginDate,
      lastLoginAt: loginDate,
      previousSessionAt: logoutDate,
      previousSessionEndedAt: logoutDate,
    },
  });

  // 2. Run catchUpService
  console.log(`\n🔄 Running catch-up pipeline for user's monitored stocks...`);
  const catchUpRes = await catchUpService.catchUpForUser(userId);
  console.log(`✓ Catch-up completed in ${catchUpRes.durationMs}ms:`, {
    since: catchUpRes.since,
    monitoredSymbols: catchUpRes.watchlistSymbols.length,
    eventsCreated: catchUpRes.eventsCreated,
    digestsCreated: catchUpRes.digestsCreated,
  });

  // 3. Query Feed across all windows
  const [sinceFeed, feed24h, feed7d, feed30d] = await Promise.all([
    feedService.getFeed(userId, { window: 'sinceLastVisit', limit: 100 }),
    feedService.getFeed(userId, { window: '24h', limit: 100 }),
    feedService.getFeed(userId, { window: '7d', limit: 100 }),
    feedService.getFeed(userId, { window: '30d', limit: 100 }),
  ]);

  console.log(`\n📊 Window Comparison Counts:`);
  console.table([
    { Window: 'Since Last Visit', Items: sinceFeed.total, Unread: sinceFeed.unreadCount },
    { Window: 'Last 24 Hours', Items: feed24h.total, Unread: feed24h.unreadCount },
    { Window: 'Last 7 Days', Items: feed7d.total, Unread: feed7d.unreadCount },
    { Window: 'Last 30 Days', Items: feed30d.total, Unread: feed30d.unreadCount },
  ]);

  console.log(`\n📋 Feed Items in "Since Last Visit" Window (${sinceFeed.items.length} items):`);
  if (sinceFeed.items.length === 0) {
    console.log(`  (No events recorded in this gap - e.g. markets closed or no price anomalies)`);
  } else {
    const tableData = sinceFeed.items.map((it) => ({
      Symbol: it.stockSymbol,
      Priority: it.priorityLabel,
      Headline: it.headline.length > 45 ? it.headline.substring(0, 42) + '...' : it.headline,
      TimeLabel: formatEventTime(it),
      AuditDate: formatEventTooltip(it),
    }));
    console.table(tableData);
  }
}

async function main() {
  const args = parseArgs();

  if (args.logout && args.login) {
    const logoutDate = new Date(args.logout);
    const loginDate = new Date(args.login);
    await runSessionSimulation({
      userId: args.userId,
      logoutDate,
      loginDate,
      label: `Explicit Window: ${args.logout} -> ${args.login}`,
    });
  } else if (args.days) {
    const loginDate = new Date();
    const logoutDate = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
    await runSessionSimulation({
      userId: args.userId,
      logoutDate,
      loginDate,
      label: `Absence Gap of ${args.days} Days`,
    });
  } else {
    // Run default suite: User's exact example (Sat 3 Oct 18:50 IST -> Sun 4 Oct 17:00 IST), plus 2, 19, and 90 days!
    console.log('🚀 Running Complete Test Matrix (User Example + 2d, 19d, 90d gaps)...');

    // Exact user scenario: 2026-10-03T18:50:00+05:30 -> 2026-10-04T17:00:00+05:30
    await runSessionSimulation({
      logoutDate: new Date('2026-10-03T18:50:00+05:30'),
      loginDate: new Date('2026-10-04T17:00:00+05:30'),
      label: 'USER EXACT SCENARIO: Sat 3 Oct 6:50 PM IST → Sun 4 Oct 5:00 PM IST',
    });

    // 2 Days Gap
    await runSessionSimulation({
      logoutDate: new Date('2026-10-01T18:50:00+05:30'),
      loginDate: new Date('2026-10-03T18:50:00+05:30'),
      label: '2 DAYS GAP: Thu 1 Oct 6:50 PM IST → Sat 3 Oct 6:50 PM IST',
    });

    // 19 Days Gap
    await runSessionSimulation({
      logoutDate: new Date('2026-09-14T18:50:00+05:30'),
      loginDate: new Date('2026-10-03T18:50:00+05:30'),
      label: '19 DAYS GAP: Mon 14 Sep 6:50 PM IST → Sat 3 Oct 6:50 PM IST',
    });

    // 90 Days Gap
    await runSessionSimulation({
      logoutDate: new Date('2026-07-05T18:50:00+05:30'),
      loginDate: new Date('2026-10-03T18:50:00+05:30'),
      label: '90 DAYS GAP: Sun 5 Jul 6:50 PM IST → Sat 3 Oct 6:50 PM IST',
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
