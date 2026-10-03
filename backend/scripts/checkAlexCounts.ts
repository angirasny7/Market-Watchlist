import { PrismaClient } from '@prisma/client';
import { feedService } from '../src/services/feedService.js';
import { formatVisitTime } from '../../src/lib/dateUtils.js';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'alex@example.com' },
    include: { userState: true },
  });

  if (!user || !user.userState) {
    console.error('User not found');
    return;
  }

  const summary = await feedService.getSummary(user.id);
  const visitLabel = formatVisitTime({
    timestamp: summary.lastVisitAt,
    endReason: summary.previousSessionEndReason,
    timeZone: 'Asia/Kolkata',
  });

  console.log('================ REAL USER ACCOUNT STATUS ================');
  console.log('User:', user.email, `(${user.id})`);
  console.log('Stored lastLoginAt:', user.userState.lastLoginAt);
  console.log('Stored lastLogoutAt:', user.userState.lastLogoutAt);
  console.log('Stored lastActivityAt:', user.userState.lastActivityAt);
  console.log('Stored previousSessionEndedAt:', user.userState.previousSessionEndedAt);
  console.log('Stored previousSessionEndReason:', (user.userState as any).previousSessionEndReason);
  console.log('\nExact Label Produced:');
  console.log(`"${visitLabel.label}"`);
  console.log('\nWindow Counts:');
  console.table(summary.windowCounts);
  console.log('Unread updates:', summary.unreadClusters);
  console.log('Need attention count:', summary.needAttentionCount);
}

main().finally(() => prisma.$disconnect());
