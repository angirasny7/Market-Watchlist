import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { runSessionSimulation, getOrCreateSimulationUser } from '../scripts/simulateSession';

const prisma = new PrismaClient();

describe('Simulation Safety and Real User Isolation (Item 0.c)', () => {
  let realUser: any;
  let originalState: any;

  beforeAll(async () => {
    realUser = await prisma.user.findFirst({
      where: { email: 'alex@example.com' },
      include: { userState: true },
    });
    if (realUser && realUser.userState) {
      originalState = {
        lastLoginAt: realUser.userState.lastLoginAt?.toISOString(),
        lastActivityAt: realUser.userState.lastActivityAt?.toISOString(),
        lastLogoutAt: realUser.userState.lastLogoutAt?.toISOString(),
        previousSessionEndedAt: realUser.userState.previousSessionEndedAt?.toISOString(),
        preferences: JSON.stringify(realUser.userState.preferences),
      };
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. Default simulation runs against isolated sim_user and never touches real user', async () => {
    const simUser = await getOrCreateSimulationUser();
    expect(simUser.email).toBe('sim_user@marketwatch.test');

    // Run simulation without --user
    await runSessionSimulation({
      logoutDate: new Date('2026-10-03T13:20:00.000Z'),
      loginDate: new Date('2026-10-04T11:30:00.000Z'),
      label: 'Automated Safety Test',
    });

    if (realUser) {
      const checkUser = await prisma.user.findUnique({
        where: { id: realUser.id },
        include: { userState: true },
      });

      expect(checkUser?.userState?.previousSessionEndedAt?.toISOString()).toBe(
        originalState.previousSessionEndedAt
      );
      expect(checkUser?.userState?.lastLogoutAt?.toISOString()).toBe(
        originalState.lastLogoutAt
      );
    }
  }, 30000);

  it('2. Simulation targeting existing user with --confirm restores state in finally block', async () => {
    if (!realUser) return;

    await runSessionSimulation({
      userId: realUser.id,
      confirm: true,
      logoutDate: new Date('2026-07-05T13:20:00.000Z'),
      loginDate: new Date('2026-10-03T13:20:00.000Z'),
      label: 'Target User Test With Restore',
    });

    const checkUser = await prisma.user.findUnique({
      where: { id: realUser.id },
      include: { userState: true },
    });

    expect(checkUser?.userState?.previousSessionEndedAt?.toISOString()).toBe(
      originalState.previousSessionEndedAt
    );
    expect(checkUser?.userState?.lastLogoutAt?.toISOString()).toBe(
      originalState.lastLogoutAt
    );
  }, 30000);
});

