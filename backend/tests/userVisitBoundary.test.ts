import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { userVisitService } from '../src/services/userVisitService.js';
import { feedService } from '../src/services/feedService.js';

describe('Stage B: User Visit Boundary & Session Lifecycle (B1 - B5)', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Ensure test user exists
    const user = await prisma.user.upsert({
      where: { email: 'visit_boundary_test@marketwatch.test' },
      update: { isTestUser: true },
      create: {
        email: 'visit_boundary_test@marketwatch.test',
        name: 'Visit Boundary Tester',
        passwordHash: 'dummy_hash',
        isTestUser: true,
      },
    });
    testUserId = user.id;
  });

  beforeEach(async () => {
    // Clean user state for each test
    await prisma.userState.deleteMany({ where: { userId: testUserId } });
  });

  it('1. Brand new user has no boundary (first session) and no 2-day fallback', async () => {
    const boundaryInfo = await userVisitService.resolveVisitBoundary(testUserId);

    expect(boundaryInfo.isFirstSession).toBe(true);
    expect(boundaryInfo.hasBoundary).toBe(false);
    expect(boundaryInfo.feedBoundaryAt).toBeNull();
    expect(boundaryInfo.timeAwayFormatted).toBe('Welcome');
    expect(boundaryInfo.endReason).toBe('first_session');

    // Summary must return isFirstSession = true and 0 items for sinceLastVisit
    const summary = await feedService.getSummary(testUserId, { window: 'sinceLastVisit' });
    expect(summary.isFirstSession).toBe(true);
    expect(summary.hasBoundary).toBe(false);
    expect(summary.unreadClusters).toBe(0);
  });

  it('2. Login and logout in 1 second without viewing feed preserves boundary', async () => {
    const initialBoundary = new Date('2026-10-01T10:00:00.000Z');
    await prisma.userState.create({
      data: {
        userId: testUserId,
        feedBoundaryAt: initialBoundary,
        lastFeedViewedAt: new Date('2026-10-01T09:59:00.000Z'), // Viewed in older session
        previousSessionStartedAt: new Date('2026-10-01T09:50:00.000Z'),
        previousSessionEndedAt: initialBoundary,
        lastActivityAt: initialBoundary,
        lastLogoutAt: initialBoundary,
      },
    });

    // Step 1: User logs in at 10:30:00 (no feed view during this session)
    await userVisitService.trackActivity(testUserId, { isLogin: true });

    // Step 2: User logs out 1 second later at 10:30:01
    await userVisitService.recordLogout(testUserId);

    // Step 3: Later, user logs in again at 11:00:00
    await userVisitService.trackActivity(testUserId, { isLogin: true });

    const state = await prisma.userState.findUnique({ where: { userId: testUserId } });
    // feedBoundaryAt MUST remain initialBoundary because feed was NEVER viewed in the 1-sec visit!
    expect(state?.feedBoundaryAt?.toISOString()).toBe(initialBoundary.toISOString());
  });

  it('3. A visit WITH a feed view advances the boundary to that visit end', async () => {
    const initialBoundary = new Date('2026-10-01T10:00:00.000Z');
    await prisma.userState.create({
      data: {
        userId: testUserId,
        feedBoundaryAt: initialBoundary,
        lastFeedViewedAt: new Date('2026-10-01T09:59:00.000Z'),
        previousSessionStartedAt: new Date('2026-10-01T09:50:00.000Z'),
        previousSessionEndedAt: initialBoundary,
      },
    });

    // Step 1: Login at 10:30
    await userVisitService.trackActivity(testUserId, { isLogin: true });

    // Step 2: User looks at feed for >= 3 seconds (POST /feed/viewed)
    await userVisitService.recordFeedViewed(testUserId);

    // Step 3: User logs out at 10:35
    const logoutTime = new Date();
    await userVisitService.recordLogout(testUserId);

    // Step 4: Next visit starts at 11:00
    await userVisitService.trackActivity(testUserId, { isLogin: true });

    const state = await prisma.userState.findUnique({ where: { userId: testUserId } });
    // Boundary MUST advance to the previous visit's end!
    expect(state?.feedBoundaryAt).toBeDefined();
    expect(new Date(state!.feedBoundaryAt!).getTime()).toBeGreaterThanOrEqual(logoutTime.getTime() - 1000);
  });

  it('4. Idle/background tab without user interaction does not extend activity', async () => {
    const baseline = new Date(Date.now() - 5000);
    await prisma.userState.create({
      data: {
        userId: testUserId,
        lastActivityAt: baseline,
        previousSessionStartedAt: baseline,
      },
    });

    // Heartbeat sent with userInteractedRecently: false (tab was in background)
    await userVisitService.trackActivity(testUserId, {
      isHeartbeat: true,
      userInteractedRecently: false,
    });

    const state = await prisma.userState.findUnique({ where: { userId: testUserId } });
    expect(state?.lastActivityAt?.toISOString()).toBe(baseline.toISOString());
  });

  it('5. 43-minute sleep starts a new visit, while 10-minute idle gap stays in current visit', async () => {
    const sessionStart = new Date(Date.now() - 60 * 60 * 1000);
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

    await prisma.userState.create({
      data: {
        userId: testUserId,
        lastActivityAt: tenMinsAgo,
        previousSessionStartedAt: sessionStart,
      },
    });

    // 10 minutes gap (< 30 min SESSION_IDLE_MINUTES)
    const result10 = await userVisitService.trackActivity(testUserId, { userInteractedRecently: true });
    expect(result10.isNewVisit).toBe(false);

    // Set lastActivityAt to 43 minutes ago
    const fortyThreeMinsAgo = new Date(Date.now() - 43 * 60 * 1000);
    await prisma.userState.update({
      where: { userId: testUserId },
      data: { lastActivityAt: fortyThreeMinsAgo },
    });

    // 43 minutes gap (>= 30 min)
    const result43 = await userVisitService.trackActivity(testUserId, { userInteractedRecently: true });
    expect(result43.isNewVisit).toBe(true);
  });

  it('6. Page refresh within active visit does not move feedBoundaryAt', async () => {
    const boundary = new Date('2026-10-01T10:00:00.000Z');
    const sessionStart = new Date();

    await prisma.userState.create({
      data: {
        userId: testUserId,
        feedBoundaryAt: boundary,
        previousSessionStartedAt: sessionStart,
        lastActivityAt: sessionStart,
      },
    });

    // Refresh triggers trackActivity without login/idle gap
    const refreshResult = await userVisitService.trackActivity(testUserId);
    expect(refreshResult.isNewVisit).toBe(false);

    const boundaryInfo = await userVisitService.resolveVisitBoundary(testUserId);
    expect(boundaryInfo.feedBoundaryAt?.toISOString()).toBe(boundary.toISOString());
  });
});
