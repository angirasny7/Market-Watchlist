import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'alex@example.com' },
    include: { userState: true },
  });

  if (!user || !user.userState) {
    console.error('❌ User alex@example.com not found!');
    return;
  }

  console.log('================ BEFORE REPAIR ================');
  console.log('UserState ID:', user.userState.id);
  console.log('User ID:', user.id);
  console.log('lastLoginAt:', user.userState.lastLoginAt);
  console.log('lastActivityAt:', user.userState.lastActivityAt);
  console.log('lastLogoutAt:', user.userState.lastLogoutAt);
  console.log('lastSeenAt:', user.userState.lastSeenAt);
  console.log('previousSessionAt:', user.userState.previousSessionAt);
  console.log('previousSessionEndedAt:', user.userState.previousSessionEndedAt);
  console.log('previousSessionStartedAt:', (user.userState as any).previousSessionStartedAt);
  console.log('previousSessionEndReason:', (user.userState as any).previousSessionEndReason);
  console.log('caughtUpAt:', user.userState.caughtUpAt);
  console.log('preferences:', JSON.stringify(user.userState.preferences));

  // The real previous session end was 1 Oct 2026 09:30:50 UTC (Thu 1 Oct 3:00 PM IST)
  // before the 90-day simulation script erroneously set it to 5 Jul 2026.
  const realPreviousEnd = new Date('2026-10-01T09:30:50.870Z');
  const realPreviousStart = new Date('2026-10-01T04:00:00.000Z');

  const updatedState = await prisma.$transaction(async (tx) => {
    return tx.userState.update({
      where: { userId: user.id },
      data: {
        lastLogoutAt: realPreviousEnd,
        previousSessionAt: realPreviousEnd,
        previousSessionEndedAt: realPreviousEnd,
        previousSessionStartedAt: realPreviousStart,
        previousSessionEndReason: 'logout',
        lastLoginAt: new Date('2026-10-03T13:20:00.000Z'),
        lastActivityAt: new Date(),
      },
    });
  });

  console.log('\n================ AFTER REPAIR ================');
  console.log('UserState ID:', updatedState.id);
  console.log('User ID:', updatedState.userId);
  console.log('lastLoginAt:', updatedState.lastLoginAt);
  console.log('lastActivityAt:', updatedState.lastActivityAt);
  console.log('lastLogoutAt:', updatedState.lastLogoutAt);
  console.log('lastSeenAt:', updatedState.lastSeenAt);
  console.log('previousSessionAt:', updatedState.previousSessionAt);
  console.log('previousSessionEndedAt:', updatedState.previousSessionEndedAt);
  console.log('previousSessionStartedAt:', (updatedState as any).previousSessionStartedAt);
  console.log('previousSessionEndReason:', (updatedState as any).previousSessionEndReason);
  console.log('caughtUpAt:', updatedState.caughtUpAt);
  console.log('preferences:', JSON.stringify(updatedState.preferences));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
