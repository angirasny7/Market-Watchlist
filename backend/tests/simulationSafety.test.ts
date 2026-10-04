import { describe, it, expect } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { runSessionSimulation, getOrCreateSimulationUser } from '../scripts/simulateSession.js';

describe('Simulation Safety and Real User Isolation (Item 0.c)', () => {
  it('1. Default simulation runs against isolated sim_user and never touches real user', async () => {
    const simUser = await getOrCreateSimulationUser();
    expect(simUser.email).toBe('sim_user@marketwatch.test');

    // Snapshot real user state to verify it is untouched
    const realUserBefore = await prisma.user.findFirst({
      where: { email: 'alex@example.com' },
      include: { userState: true },
    });

    // Run simulation without --user (defaults to sim_user)
    await runSessionSimulation({
      logoutDate: new Date('2026-10-03T13:20:00.000Z'),
      loginDate: new Date('2026-10-04T11:30:00.000Z'),
      label: 'Automated Safety Test',
    });

    if (realUserBefore) {
      const realUserAfter = await prisma.user.findUnique({
        where: { id: realUserBefore.id },
        include: { userState: true },
      });

      expect(realUserAfter?.userState?.previousSessionEndedAt?.toISOString()).toBe(
        realUserBefore.userState?.previousSessionEndedAt?.toISOString()
      );
      expect(realUserAfter?.userState?.lastLogoutAt?.toISOString()).toBe(
        realUserBefore.userState?.lastLogoutAt?.toISOString()
      );
    }
  }, 60000);

  it('2. Simulation targeting test user with --confirm restores state in finally block', async () => {
    // Create dedicated secondary test user to verify restoration without touching alex
    const testUser = await prisma.user.upsert({
      where: { email: 'test_secondary@marketwatch.test' },
      update: {},
      create: {
        email: 'test_secondary@marketwatch.test',
        name: 'Secondary Test User',
        passwordHash: 'dummy_hash',
        userState: {
          create: {
            previousSessionEndedAt: new Date('2026-09-20T10:00:00Z'),
            lastLogoutAt: new Date('2026-09-20T10:00:00Z'),
          },
        },
      },
      include: { userState: true },
    });

    const expectedPreviousEnded = testUser.userState?.previousSessionEndedAt?.toISOString();

    await runSessionSimulation({
      userId: testUser.id,
      confirm: true,
      logoutDate: new Date('2026-07-05T13:20:00.000Z'),
      loginDate: new Date('2026-10-03T13:20:00.000Z'),
      label: 'Target Test User With Restore',
    });

    const checkUser = await prisma.user.findUnique({
      where: { id: testUser.id },
      include: { userState: true },
    });

    expect(checkUser?.userState?.previousSessionEndedAt?.toISOString()).toBe(
      expectedPreviousEnded
    );
  }, 30000);
});

