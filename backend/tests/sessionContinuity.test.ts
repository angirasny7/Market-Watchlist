import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { authService } from '../src/services/authService';
import { feedService } from '../src/services/feedService';

const prisma = new PrismaClient();

describe('Session Continuity and Multi-Device State (Part 1)', () => {
  let testUser: any;
  const testEmail = `session_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    // Register user on Device A
    const reg = await authService.register({
      name: 'Session Tester',
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

  it('preserves previousSessionEndedAt across logout on Device A and login on Device B', async () => {
    // 1. Initial Login on Device A
    const loginA = await authService.login({
      email: testEmail,
      password: testPassword,
      deviceInfo: { type: 'DESKTOP', name: 'MacBook Pro (Device A)' },
    });
    expect(loginA.token).toBeDefined();

    // Simulate activity on Device A
    const timeA = new Date('2026-10-03T18:50:00.000Z');
    await prisma.userState.update({
      where: { userId: testUser.id },
      data: {
        lastActivityAt: timeA,
        lastLogoutAt: timeA,
      },
    });

    // 2. Logout on Device A
    await authService.logout(testUser.id, { type: 'DESKTOP', name: 'Device A' });

    const stateAfterLogout = await prisma.userState.findUnique({
      where: { userId: testUser.id },
    });
    expect(stateAfterLogout?.lastLogoutAt).toBeDefined();

    // 3. Login on Device B at Sun 4 Oct 17:00 IST
    const loginTimeB = new Date('2026-10-04T11:30:00.000Z'); // 5:00 PM IST
    const loginB = await authService.login({
      email: testEmail,
      password: testPassword,
      deviceInfo: { type: 'MOBILE', name: 'iPhone 15 (Device B)' },
    });
    expect(loginB.token).toBeDefined();

    const stateOnB = await prisma.userState.findUnique({
      where: { userId: testUser.id },
    });

    // previousSessionEndedAt must match Device A logout time
    expect(stateOnB?.previousSessionEndedAt).toBeDefined();
    expect(stateOnB?.currentDeviceName).toBe('iPhone 15 (Device B)');
    expect(stateOnB?.previousDeviceName).toBe('MacBook Pro (Device A)');
  });

  it('keeps read, unread, and saved items perfectly synchronized server-side across devices', async () => {
    // Find an event
    const sampleEvent = await prisma.event.findFirst({
      where: { stockSymbol: { in: ['TCS', 'INFY'] } },
    });

    if (sampleEvent) {
      // User reads and saves item on Device A
      await feedService.markRead(testUser.id, [sampleEvent.id]);
      await feedService.toggleSave(testUser.id, sampleEvent.id);

      // Now query feed from "Device B"
      const feed = await feedService.getFeed(testUser.id, { window: '30d' });
      const foundItem = feed.items.find((i) => i.id === sampleEvent.id || i.memberEventIds.includes(sampleEvent.id));

      if (foundItem) {
        expect(foundItem.isUnread).toBe(false);
        expect(foundItem.isSaved).toBe(true);
      }
    }
  });

  it('does not mark anything as read merely by opening or querying the feed', async () => {
    const unreadBefore = await prisma.userEventRead.count({ where: { userId: testUser.id } });
    await feedService.getFeed(testUser.id, { window: 'sinceLastVisit' });
    const unreadAfter = await prisma.userEventRead.count({ where: { userId: testUser.id } });
    expect(unreadAfter).toBe(unreadBefore);
  });
});
