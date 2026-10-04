import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { PrismaClient, EventType, Priority } from '@prisma/client';
import app from '../src/index.js';
import { authService } from '../src/services/authService.js';
import { watchlistService } from '../src/services/watchlistService.js';
import { alertService } from '../src/services/alertService.js';

const prisma = new PrismaClient();

describe('Complete Route Ownership & Resource Isolation Test Matrix (Item 5)', () => {
  let server: http.Server;
  let baseUrl: string;

  let userA: { id: string; email: string; token: string; defaultWatchlistId: string };
  let userB: { id: string; email: string; token: string; defaultWatchlistId: string };

  let userACustomWatchlistId: string;
  let userAAlertId: string;
  let userAPersonalDigestId: string;
  let userAPersonalEventId: string;
  let userANotificationId: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    const timestamp = Date.now();

    // 1. Register User A
    const regA = await authService.register({
      name: 'Owner User A',
      email: `owner_a_${timestamp}@ownership.test`,
      password: 'Password123!@#',
    });
    userA = {
      id: regA.user.id,
      email: regA.user.email,
      token: regA.token,
      defaultWatchlistId: regA.defaultWatchlistId!,
    };

    // 2. Register User B
    const regB = await authService.register({
      name: 'Attacker User B',
      email: `attacker_b_${timestamp}@ownership.test`,
      password: 'Password123!@#',
    });
    userB = {
      id: regB.user.id,
      email: regB.user.email,
      token: regB.token,
      defaultWatchlistId: regB.defaultWatchlistId!,
    };

    // 3. Create User A Custom Watchlist
    const customWl = await watchlistService.createWatchlist(userA.id, 'Alpha Private Fund');
    userACustomWatchlistId = customWl.id;

    // 4. Create User A Alert
    const alertA = await alertService.createAlert(userA.id, {
      stockSymbol: 'INFY',
      alertType: 'PRICE_ABOVE',
      targetValue: 2000,
    });
    userAAlertId = alertA.id;

    // 5. Create User A Personal Event
    const eventA = await prisma.event.create({
      data: {
        stockSymbol: 'INFY',
        eventType: EventType.PRICE_SURGE,
        priority: Priority.CRITICAL,
        userId: userA.id,
        timestamp: new Date(),
        occurredOn: new Date(),
        occurredAt: new Date(),
        metricsDelta: { changePercent: 15.0 },
      },
    });
    userAPersonalEventId = eventA.id;

    // 6. Create User A Personal Digest
    const digestA = await prisma.digest.create({
      data: {
        userId: userA.id,
        headline: 'User A Private Dossier',
        executiveSummary: 'Private summary for User A only',
        marketMood: 'BULLISH',
        timeRange: 'Today',
        benchmarkCloses: {},
        read: false,
      },
    });
    userAPersonalDigestId = digestA.id;

    // 7. Create User A Notification
    const notifA = await prisma.notification.create({
      data: {
        userId: userA.id,
        title: 'User A Private Notification',
        message: 'Confidential alert triggered',
        type: 'ALERT_TRIGGERED',
        isRead: false,
      },
    });
    userANotificationId = notifA.id;
  });

  afterAll(async () => {
    // Cleanup User A & B resources
    if (userANotificationId) await prisma.notification.delete({ where: { id: userANotificationId } }).catch(() => {});
    if (userAPersonalDigestId) await prisma.digest.delete({ where: { id: userAPersonalDigestId } }).catch(() => {});
    if (userAPersonalEventId) await prisma.event.delete({ where: { id: userAPersonalEventId } }).catch(() => {});
    if (userAAlertId) await prisma.alert.delete({ where: { id: userAAlertId } }).catch(() => {});
    if (userACustomWatchlistId) await prisma.watchlist.delete({ where: { id: userACustomWatchlistId } }).catch(() => {});
    if (userA?.id) await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    if (userB?.id) await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    await prisma.$disconnect();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Watchlists Route Ownership (/api/watchlists/*)', () => {
    it('User B cannot GET User A custom watchlist', async () => {
      const res = await fetch(`${baseUrl}/api/watchlists/${userACustomWatchlistId}`, {
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot PATCH User A custom watchlist', async () => {
      const res = await fetch(`${baseUrl}/api/watchlists/${userACustomWatchlistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Hacked Name' }),
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot DELETE User A custom watchlist', async () => {
      const res = await fetch(`${baseUrl}/api/watchlists/${userACustomWatchlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot add stock to User A watchlist', async () => {
      const res = await fetch(`${baseUrl}/api/watchlists/${userACustomWatchlistId}/stocks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol: 'TCS' }),
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot remove stock from User A watchlist', async () => {
      const res = await fetch(`${baseUrl}/api/watchlists/${userACustomWatchlistId}/stocks/INFY`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot toggle pin in User A watchlist', async () => {
      const res = await fetch(`${baseUrl}/api/watchlists/${userACustomWatchlistId}/stocks/INFY/pin`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('2. Alerts Route Ownership (/api/alerts/*)', () => {
    it('User B cannot UPDATE User A alert', async () => {
      const res = await fetch(`${baseUrl}/api/alerts/${userAAlertId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetValue: 3000 }),
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot DELETE User A alert', async () => {
      const res = await fetch(`${baseUrl}/api/alerts/${userAAlertId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('3. Notifications Route Ownership (/api/notifications/*)', () => {
    it('User B cannot mark User A notification as read', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${userANotificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('4. Digests Route Ownership (/api/digests/*)', () => {
    it('User B cannot GET User A personal digest', async () => {
      const res = await fetch(`${baseUrl}/api/digests/${userAPersonalDigestId}`, {
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot mark User A personal digest read', async () => {
      const res = await fetch(`${baseUrl}/api/digests/${userAPersonalDigestId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('5. Feed & Events Route Ownership (/api/feed/* & /api/events/*)', () => {
    it('User B cannot GET details for User A personal event', async () => {
      const res = await fetch(`${baseUrl}/api/feed/items/${userAPersonalEventId}/details`, {
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot toggle save for User A personal event', async () => {
      const res = await fetch(`${baseUrl}/api/feed/items/${userAPersonalEventId}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot mark read User A personal event via /api/events', async () => {
      const res = await fetch(`${baseUrl}/api/events/${userAPersonalEventId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });

    it('User B cannot save User A personal event via /api/events', async () => {
      const res = await fetch(`${baseUrl}/api/events/${userAPersonalEventId}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('6. Memory & User State Route Isolation', () => {
    it('User B memory counts reflect 0 while User A has saved and archived events', async () => {
      // User A reads and saves an event
      await fetch(`${baseUrl}/api/feed/mark-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${userA.token}` },
      });

      const resB = await fetch(`${baseUrl}/api/memory/counts`, {
        headers: { Authorization: `Bearer ${userB.token}` },
      });

      expect(resB.status).toBe(200);
      const jsonB: any = await resB.json();
      expect(jsonB.data.archivedCount).toBe(0);
      expect(jsonB.data.savedCount).toBe(0);
    });

    it('User B cannot access or modify User A state or preferences', async () => {
      const stateBRes = await fetch(`${baseUrl}/api/user/state`, {
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      expect(stateBRes.status).toBe(200);
      const stateB: any = await stateBRes.json();
      expect(stateB.data.userId).toBe(userB.id);
      expect(stateB.data.email).toBe(userB.email);

      const prefBRes = await fetch(`${baseUrl}/api/user/preferences`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${userB.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: { viewMode: 'compact' } }),
      });
      expect(prefBRes.status).toBe(200);

      // Verify User A preferences remain untouched
      const stateARes = await fetch(`${baseUrl}/api/user/state`, {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      const stateA: any = await stateARes.json();
      expect(stateA.data.preferences?.viewMode).not.toBe('compact');
    });
  });
});
