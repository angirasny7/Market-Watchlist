import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../src/index.js';
import { prisma } from '../src/config/prisma.js';
import { authService } from '../src/services/authService.js';
import { feedService } from '../src/services/feedService.js';

describe('Heartbeat & Session Cursor Isolation (Item 5)', () => {
  let server: http.Server;
  let baseUrl: string;
  let user: { id: string; email: string; token: string };

  const fixedPreviousSessionEnded = new Date('2026-10-01T10:00:00.000Z');
  const fixedLastSeenAt = new Date('2026-10-01T10:00:00.000Z');

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
    const reg = await authService.register({
      name: `Heartbeat Test User ${timestamp}`,
      email: `heartbeat_${timestamp}@session.test`,
      password: 'Password123!@#',
    });

    user = {
      id: reg.user.id,
      email: reg.user.email,
      token: reg.token,
    };

    // Set initial userState with established previousSessionEndedAt and lastSeenAt
    await prisma.userState.update({
      where: { userId: user.id },
      data: {
        previousSessionEndedAt: fixedPreviousSessionEnded,
        previousSessionAt: fixedPreviousSessionEnded,
        lastSeenAt: fixedLastSeenAt,
      },
    });
  });

  afterAll(async () => {
    if (user?.id) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
    await prisma.$disconnect();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Unauthenticated Heartbeat Protection', () => {
    it('PATCH /api/auth/heartbeat returns 401 without auth token', async () => {
      const res = await fetch(`${baseUrl}/api/auth/heartbeat`, { method: 'PATCH' });
      expect(res.status).toBe(401);
    });
  });

  describe('2. Heartbeat preserves session boundary cursors', () => {
    it('updates lastActivityAt without altering lastSeenAt or previousSessionEndedAt', async () => {
      const stateBefore = await prisma.userState.findUnique({
        where: { userId: user.id },
      });
      expect(stateBefore).toBeDefined();
      const originalActivity = stateBefore!.lastActivityAt.getTime();

      // Wait a tiny bit so timestamp advances
      await new Promise((r) => setTimeout(r, 20));

      const res = await fetch(`${baseUrl}/api/auth/heartbeat`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      expect(res.status).toBe(200);

      const stateAfter = await prisma.userState.findUnique({
        where: { userId: user.id },
      });
      expect(stateAfter).toBeDefined();

      // 1. lastActivityAt advanced
      expect(stateAfter!.lastActivityAt.getTime()).toBeGreaterThan(originalActivity);

      // 2. previousSessionEndedAt remains exactly unchanged
      expect(stateAfter!.previousSessionEndedAt?.toISOString()).toBe(fixedPreviousSessionEnded.toISOString());

      // 3. lastSeenAt remains exactly unchanged
      expect(stateAfter!.lastSeenAt?.toISOString()).toBe(fixedLastSeenAt.toISOString());

      // 4. previousSessionAt remains exactly unchanged
      expect(stateAfter!.previousSessionAt?.toISOString()).toBe(fixedPreviousSessionEnded.toISOString());
    });

    it('Since last visit feed summary maintains stable date across heartbeats', async () => {
      const summaryBefore = await feedService.getSummary(user.id);

      // Send another heartbeat
      await fetch(`${baseUrl}/api/auth/heartbeat`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const summaryAfter = await feedService.getSummary(user.id);
      expect(summaryAfter.lastLogin).toBe(summaryBefore.lastLogin);
    });
  });

  describe('3. Logout User Identity Verification', () => {
    it('POST /api/auth/logout sets lastLogoutAt for authenticated user only', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'attempted-foreign-user-id' }),
      });
      expect(res.status).toBe(200);

      const state = await prisma.userState.findUnique({
        where: { userId: user.id },
      });
      expect(state?.lastLogoutAt).toBeDefined();
      expect(state?.previousSessionEndReason).toBe('logout');
    });
  });
});
