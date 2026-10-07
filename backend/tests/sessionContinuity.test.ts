import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { authService } from '../src/services/authService';
import { feedService } from '../src/services/feedService';
import { formatVisitTime } from '../../src/lib/dateUtils';

const prisma = new PrismaClient();

describe('Session Continuity and Multi-Device State (Item 0.d, 0.e & Item 3)', () => {
  let testUser: any;
  const testEmail = `session_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    // Register user on Device A
    const reg = await authService.register({
      name: `Session Continuity Tester ${Date.now()}`,
      email: testEmail,
      password: testPassword,
      deviceInfo: { type: 'DESKTOP', name: 'MacBook Pro (Device A)' },
    });
    testUser = reg.user;

    // Attach TCS and INFY to user's default watchlist
    const ws = await prisma.watchlist.findFirst({ where: { userId: testUser.id } });
    if (ws) {
      await prisma.watchlistStock.createMany({
        data: [
          { watchlistId: ws.id, stockSymbol: 'TCS' },
          { watchlistId: ws.id, stockSymbol: 'INFY' },
        ],
        skipDuplicates: true,
      });
    }
  });

  afterAll(async () => {
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. Exact session rule: Login Sat 17:30, Logout Sat 18:00, Login Sun 10:00 -> window start is Sat 18:00', async () => {
    const sat1730 = new Date('2026-10-03T12:00:00.000Z'); // 17:30 IST
    const sat1800 = new Date('2026-10-03T12:30:00.000Z'); // 18:00 IST

    // Set state as if user logged in at 17:30 and logged out at 18:00
    await prisma.userState.update({
      where: { userId: testUser.id },
      data: {
        lastLoginAt: sat1730,
        lastActivityAt: sat1800,
        lastLogoutAt: sat1800,
      },
    });
    await prisma.user.update({
      where: { id: testUser.id },
      data: { lastLoginAt: sat1730 },
    });

    // Login on Sun at 10:00 IST
    const sun1000 = new Date('2026-10-04T04:30:00.000Z');
    await authService.login({
      email: testEmail,
      password: testPassword,
      deviceInfo: { type: 'MOBILE', name: 'iPhone 15' },
    });

    const state = await prisma.userState.findUnique({
      where: { userId: testUser.id },
    });

    // previousSessionEndedAt must be exactly Sat 18:00
    expect(state?.previousSessionEndedAt?.toISOString()).toBe(sat1800.toISOString());
    expect(state?.previousSessionEndReason).toBe('logout');

    // Item 3: Current login time (Sun 10:00) is never in the max
    expect(state?.previousSessionEndedAt?.getTime()).toBeLessThan(new Date().getTime());
  });

  it('2. Page refresh, heartbeat and navigation do NOT move the window start', async () => {
    const stateBefore = await prisma.userState.findUnique({ where: { userId: testUser.id } });
    const baselineStart = stateBefore?.previousSessionEndedAt?.toISOString();

    // Heartbeat update
    await authService.updateHeartbeat(testUser.id);

    // Summary call
    const summary = await feedService.getSummary(testUser.id);
    expect(new Date(summary.lastVisitAt).toISOString()).toBe(baselineStart);

    // Feed call
    const feed = await feedService.getFeed(testUser.id, { window: 'sinceLastVisit' });
    expect(feed).toBeDefined();

    const stateAfter = await prisma.userState.findUnique({ where: { userId: testUser.id } });
    expect(stateAfter?.previousSessionEndedAt?.toISOString()).toBe(baselineStart);
  });

  it('3. Quick second login within 30 minutes continues the previous boundary (does not advance it)', async () => {
    const stateBefore = await prisma.userState.findUnique({ where: { userId: testUser.id } });
    const baselineStart = stateBefore?.previousSessionEndedAt?.toISOString();

    // Second login immediately (within 30s)
    await authService.login({
      email: testEmail,
      password: testPassword,
      deviceInfo: { type: 'TABLET', name: 'iPad' },
    });

    const stateAfter = await prisma.userState.findUnique({ where: { userId: testUser.id } });
    expect(stateAfter?.previousSessionEndedAt?.toISOString()).toBe(baselineStart);
  });

  it('4. If tab was closed without logout, boundary is the last recorded activity', async () => {
    const closedTabActivity = new Date(Date.now() - 45 * 60 * 1000); // 45 min ago (beyond 30m session timeout)
    await prisma.userState.update({
      where: { userId: testUser.id },
      data: {
        lastActivityAt: closedTabActivity,
        lastLogoutAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Old logout from days ago
        lastSeenAt: closedTabActivity,
      },
    });

    // Login after inactivity
    await authService.login({
      email: testEmail,
      password: testPassword,
      deviceInfo: { type: 'DESKTOP', name: 'Work PC' },
    });

    const state = await prisma.userState.findUnique({ where: { userId: testUser.id } });
    expect(state?.previousSessionEndedAt?.toISOString()).toBe(closedTabActivity.toISOString());
    expect(state?.previousSessionEndReason).toBe('inactivity');

    // Label formatting check
    const labelRes = formatVisitTime({
      timestamp: state?.previousSessionEndedAt,
      endReason: state?.previousSessionEndReason,
      timeZone: 'Asia/Kolkata',
    });
    expect(labelRes.prefix).toBe('Last active');
  });

  it('5. Multi-device consistency: Device A logout, Device B login with skewed client clock yields identical server timestamps', async () => {
    // Logout on Device A
    const logoutTime = new Date('2026-10-03T13:20:00.000Z');
    await prisma.userState.update({
      where: { userId: testUser.id },
      data: {
        lastLogoutAt: logoutTime,
        lastActivityAt: logoutTime,
      },
    });

    // Login on Device B
    const loginRes = await authService.login({
      email: testEmail,
      password: testPassword,
      deviceInfo: { type: 'MOBILE', name: 'Device B (Skewed Clock)' },
    });

    const stateOnB = loginRes.userState;
    expect(stateOnB.previousSessionEndedAt).toBeDefined();

    // Client clock on Device B is skewed by +2 hours
    const deviceBSkewOffset = -2 * 60 * 60 * 1000;
    const labelA = formatVisitTime({
      timestamp: stateOnB.previousSessionEndedAt,
      endReason: 'logout',
      timeZone: 'Asia/Kolkata',
      serverNowOffsetMs: 0,
    });

    const labelB = formatVisitTime({
      timestamp: stateOnB.previousSessionEndedAt,
      endReason: 'logout',
      timeZone: 'Asia/Kolkata',
      serverNowOffsetMs: deviceBSkewOffset,
    });

    expect(labelA.formattedDate).toBe(labelB.formattedDate);
    expect(labelB.formattedDate).toContain('IST');
  });
});
