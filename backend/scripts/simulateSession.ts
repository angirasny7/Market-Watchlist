import { prisma } from '../src/config/prisma.js';
import { catchUpService } from '../src/services/catchUpService.js';
import { feedService } from '../src/services/feedService.js';
import { formatEventTime, formatEventTooltip } from '../../src/lib/formatEventTime.js';

interface SimulationArgs {
  userId?: string;
  logout?: string;
  login?: string;
  days?: number;
  confirm?: boolean;
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
    } else if (args[i] === '--confirm') {
      result.confirm = true;
    }
  }

  return result;
}

/**
 * Ensures a dedicated simulation user exists with standard watchlist stocks.
 * Safe simulation user is isolated and never alters real user accounts.
 */
export async function getOrCreateSimulationUser() {
  const simEmail = 'sim_user@marketwatch.test';
  let user = await prisma.user.findUnique({
    where: { email: simEmail },
    include: { userState: true, watchlists: { include: { stocks: true } } },
  });

  if (!user) {
    user = await prisma.user.upsert({
      where: { email: simEmail },
      create: {
        email: simEmail,
        name: 'Simulation User (Isolated)',
        passwordHash: '$2b$10$simulatedUserPasswordHashNotForLogin',
        userState: {
          create: {
            currentDeviceName: 'Simulated Desktop',
            currentDeviceType: 'DESKTOP',
          },
        },
        watchlists: {
          create: {
            name: 'Simulated Watchlist',
            isDefault: true,
          },
        },
      },
      update: {},
      include: { userState: true, watchlists: { include: { stocks: true } } },
    });


    // Populate standard stock universe into sim user watchlist
    const standardStocks = ['INFY', 'TCS', 'RELIANCE', 'TATAMOTORS', 'HDFCBANK', 'PERSISTENT', 'COFORGE', 'TSLA', 'AMD', 'NFLX'];
    const wl = user.watchlists[0];
    for (const sym of standardStocks) {
      const stockExists = await prisma.stock.findUnique({ where: { symbol: sym } });
      if (stockExists) {
        await prisma.watchlistStock.create({
          data: {
            watchlistId: wl.id,
            stockSymbol: sym,
          },
        }).catch(() => {});
      }
    }

    user = await prisma.user.findUnique({
      where: { email: simEmail },
      include: { userState: true, watchlists: { include: { stocks: true } } },
    });
  }

  return user!;
}

export async function runSessionSimulation(options: {
  userId?: string;
  logoutDate: Date;
  loginDate: Date;
  label?: string;
  confirm?: boolean;
}) {
  const { logoutDate, loginDate, label, confirm } = options;

  let targetUserId = options.userId;
  let isRealUser = false;
  let userSnapshot: any = null;

  if (targetUserId) {
    if (!confirm) {
      console.warn('⚠️  Targeting an existing user requires --confirm flag to prevent unintentional state modification.');
      console.warn('   Defaulting to isolated simulation user instead.');
      const simUser = await getOrCreateSimulationUser();
      targetUserId = simUser.id;
    } else {
      isRealUser = true;
      const realUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { userState: true },
      });
      if (realUser) {
        userSnapshot = {
          lastLoginAt: realUser.lastLoginAt,
          previousLoginAt: realUser.previousLoginAt,
          userState: realUser.userState ? { ...realUser.userState } : null,
        };
        console.warn(`⚠️  WARNING: Running simulation on user ${realUser.email}. State will be strictly restored.`);
      }
    }
  } else {
    const simUser = await getOrCreateSimulationUser();
    targetUserId = simUser.id;
  }

  const userId = targetUserId!;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { userState: true, watchlists: { include: { stocks: true } } },
    });

    if (!user) {
      console.error('❌ User not found for simulation.');
      return;
    }

    const absenceMs = loginDate.getTime() - logoutDate.getTime();
    const absenceHours = (absenceMs / (60 * 60 * 1000)).toFixed(1);
    const absenceDays = (absenceMs / (24 * 60 * 60 * 1000)).toFixed(2);

    console.log(`\n======================================================================`);
    console.log(`🔍 SESSION SIMULATION: ${label || 'Custom Window'}`);
    console.log(`👤 User: ${user.email} (${user.id})`);
    console.log(`🚪 Logout / Previous Session Ended: ${logoutDate.toISOString()} (${logoutDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`);
    console.log(`🔑 Login / Current Session Start:   ${loginDate.toISOString()} (${loginDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST)`);
    console.log(`⏱️ Absence Gap: ${absenceHours} hours (${absenceDays} days)`);
    console.log(`======================================================================\n`);

    // Temporarily set simulation user's session boundary
    await prisma.userState.upsert({
      where: { userId },
      update: {
        lastLogoutAt: logoutDate,
        previousSessionAt: logoutDate,
        previousSessionEndedAt: logoutDate,
        previousSessionStartedAt: new Date(logoutDate.getTime() - 2 * 60 * 60 * 1000),
        previousSessionEndReason: 'logout',
        lastLoginAt: loginDate,
        lastActivityAt: loginDate,
      },
      create: {
        userId,
        lastLogoutAt: logoutDate,
        previousSessionAt: logoutDate,
        previousSessionEndedAt: logoutDate,
        previousSessionStartedAt: new Date(logoutDate.getTime() - 2 * 60 * 60 * 1000),
        previousSessionEndReason: 'logout',
        lastLoginAt: loginDate,
        lastActivityAt: loginDate,
      },
    });

    console.log(`🔄 Running catch-up pipeline for user's monitored stocks...`);
    const catchUpRes = await catchUpService.catchUpForUser(userId);
    console.log(`✓ Catch-up completed in ${catchUpRes.durationMs}ms:`, {
      since: catchUpRes.since,
      monitoredSymbols: catchUpRes.watchlistSymbols.length,
      eventsCreated: catchUpRes.eventsCreated,
      digestsCreated: catchUpRes.digestsCreated,
    });

    // Query Feed across all windows relative to the simulated login session
    const [sinceFeed, feed24h, feed7d, feed30d] = await Promise.all([
      feedService.getFeed(userId, { window: 'sinceLastVisit' }),
      feedService.getFeed(userId, { window: '24h' }),
      feedService.getFeed(userId, { window: '7d' }),
      feedService.getFeed(userId, { window: '30d' }),
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
      const tableData = sinceFeed.items.slice(0, 30).map((it) => ({
        Symbol: it.stockSymbol,
        Priority: it.priorityLabel,
        Headline: it.headline.length > 45 ? it.headline.substring(0, 42) + '...' : it.headline,
        TimeLabel: formatEventTime(it),
        AuditDate: formatEventTooltip(it),
      }));
      console.table(tableData);
    }
  } finally {
    if (isRealUser && userSnapshot && options.userId) {
      // Restore the real user's exact state
      if (userSnapshot.userState) {
        await prisma.userState.update({
          where: { userId: options.userId },
          data: {
            lastLoginAt: userSnapshot.userState.lastLoginAt,
            lastActivityAt: userSnapshot.userState.lastActivityAt,
            lastLogoutAt: userSnapshot.userState.lastLogoutAt,
            lastSeenAt: userSnapshot.userState.lastSeenAt,
            previousSessionAt: userSnapshot.userState.previousSessionAt,
            previousSessionEndedAt: userSnapshot.userState.previousSessionEndedAt,
            previousSessionStartedAt: userSnapshot.userState.previousSessionStartedAt,
            previousSessionEndReason: userSnapshot.userState.previousSessionEndReason,
            caughtUpAt: userSnapshot.userState.caughtUpAt,
            preferences: userSnapshot.userState.preferences,
          },
        });
      }
      await prisma.user.update({
        where: { id: options.userId },
        data: {
          lastLoginAt: userSnapshot.lastLoginAt,
          previousLoginAt: userSnapshot.previousLoginAt,
        },
      });
      console.log(`\n✓ Original user state restored for ${options.userId}.`);
    }
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
      confirm: args.confirm,
      label: `Explicit Window: ${args.logout} -> ${args.login}`,
    });
  } else if (args.days) {
    const loginDate = new Date();
    const logoutDate = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);
    await runSessionSimulation({
      userId: args.userId,
      logoutDate,
      loginDate,
      confirm: args.confirm,
      label: `${args.days}-Day Absence Simulation`,
    });
  } else {
    // Default: simulate weekend gap
    const logoutDate = new Date('2026-10-03T13:20:00.000Z');
    const loginDate = new Date('2026-10-04T11:30:00.000Z');
    await runSessionSimulation({
      userId: args.userId,
      logoutDate,
      loginDate,
      confirm: args.confirm,
      label: `Default Weekend Gap Simulation (Sat 3 Oct 18:50 IST -> Sun 4 Oct 17:00 IST)`,
    });
  }
}

if (process.argv[1] && (process.argv[1].includes('simulateSession.ts') || process.argv[1].includes('simulateSession.js'))) {
  main()
    .catch((e) => {
      console.error('Simulation error:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
