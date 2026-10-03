import { prisma } from '../src/config/prisma.js';
import { feedService } from '../src/services/feedService.js';
import { formatVisitTime } from '../../src/lib/dateUtils.js';

async function main() {
  const alex = await prisma.user.findFirst({
    where: { email: 'alex@example.com' },
    include: { userState: true },
  });

  if (!alex || !alex.userState) {
    console.error('User or user state not found for alex@example.com');
    return;
  }

  console.log('=== BEFORE REPAIR: USER STATE ===');
  console.log(JSON.stringify(alex.userState, null, 2));

  // 1. Identify simulation digests and events
  // Simulation runs created digests with titles/headlines like '91-Day Market Dossier', '20-Day Market Dossier',
  // or generated at timestamps corresponding to simulateSession runs (13:50Z to 13:57Z on 2026-10-03).
  const simDigests = await prisma.digest.findMany({
    where: {
      OR: [
        { headline: { contains: '91-Day' } },
        { headline: { contains: '20-Day' } },
        { timeRange: { contains: '91 Days' } },
        { timeRange: { contains: '20 Days' } },
      ],
    },
  });

  console.log(`\nFound ${simDigests.length} simulation-created digests:`);
  console.table(simDigests.map((d) => ({ id: d.id, headline: d.headline, timeRange: d.timeRange, createdAt: d.createdAt.toISOString() })));

  // 2. Perform Transactional Repair
  const result = await prisma.$transaction(async (tx) => {
    // Flag simulation digests
    if (simDigests.length > 0) {
      await tx.digest.updateMany({
        where: { id: { in: simDigests.map((d) => d.id) } },
        data: { isSimulated: true },
      });
    }

    // Set provable real session timestamps
    const realSessionStart = new Date('2026-10-03T09:25:00.000Z'); // Sat 3 Oct 2:55 PM IST (start of alert editing & feed review)
    const realSessionEnd = new Date('2026-10-03T09:57:20.356Z');   // Sat 3 Oct 3:27:20 PM IST (latest UserEventRead in DB)

    const updatedState = await tx.userState.update({
      where: { userId: alex.id },
      data: {
        previousSessionStartedAt: realSessionStart,
        previousSessionEndedAt: realSessionEnd,
        previousSessionAt: realSessionEnd,
        previousSessionEndReason: 'inactivity',
        lastLogoutAt: realSessionEnd,
        lastSeenAt: realSessionEnd,
        // Current active session
        lastLoginAt: alex.userState?.lastLoginAt || new Date(),
        lastActivityAt: new Date(),
        caughtUpAt: null,
      },
    });

    return updatedState;
  });

  console.log('\n=== AFTER REPAIR: USER STATE ===');
  console.log(JSON.stringify(result, null, 2));

  // 3. Evaluate exact window counts & label
  const summary = await feedService.getSummary(alex.id, { window: 'sinceLastVisit' });
  const visitLabel = formatVisitTime({
    timestamp: result.previousSessionEndedAt,
    endReason: result.previousSessionEndReason,
    timeZone: 'Asia/Kolkata',
  });

  console.log('\n=== REPAIRED FEED PRESENTATION & COUNTS ===');
  console.log('Session Visit Label:', visitLabel.label);
  console.log('Session Popover Note:', `Previous Visit End: ${result.previousSessionEndedAt?.toISOString()} (${visitLabel.timeZoneAbbr})`);
  console.log('Window Counts:', summary.windowCounts);
  console.log('Unread Items in Window:', summary.unreadClusters);
  console.log('Need Attention Count:', summary.needAttentionCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
