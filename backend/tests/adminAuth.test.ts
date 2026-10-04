import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import jwt from 'jsonwebtoken';
import app from '../src/index.js';
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/env.js';
import { authService } from '../src/services/authService.js';

describe('Admin Routes & Provider Status Authorization Suite (Item 1)', () => {
  let server: http.Server;
  let baseUrl: string;

  let normalUser: { id: string; email: string; token: string };
  let adminUser: { id: string; email: string; token: string };

  const adminSecret = 'test-admin-secret-key-12345';

  beforeAll(async () => {
    process.env.ADMIN_SECRET = adminSecret;

    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    const timestamp = Date.now();

    // 1. Create normal user (role: USER)
    const regNormal = await authService.register({
      name: 'Normal User',
      email: `normal_${timestamp}@adminauth.test`,
      password: 'Password123!@#',
    });
    normalUser = {
      id: regNormal.user.id,
      email: regNormal.user.email,
      token: regNormal.token,
    };

    // 2. Create admin user (role: ADMIN)
    const regAdmin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: `admin_${timestamp}@adminauth.test`,
        passwordHash: 'dummy_hash',
        role: 'ADMIN',
        isTestUser: true,
      },
    });

    const adminToken = jwt.sign(
      { userId: regAdmin.id, email: regAdmin.email, role: 'ADMIN' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    adminUser = {
      id: regAdmin.id,
      email: regAdmin.email,
      token: adminToken,
    };
  });

  afterAll(async () => {
    if (normalUser?.id) await prisma.user.delete({ where: { id: normalUser.id } }).catch(() => {});
    if (adminUser?.id) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    await prisma.$disconnect();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Unauthenticated requests to /api/admin/* return 401', () => {
    it('GET /api/admin/job-runs returns 401 without auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/job-runs`);
      expect(res.status).toBe(401);
      const json: any = await res.json();
      expect(json.success).toBe(false);
    });

    it('POST /api/admin/run-pipeline returns 401 without auth', async () => {
      const res = await fetch(`${baseUrl}/api/admin/run-pipeline`, { method: 'POST' });
      expect(res.status).toBe(401);
    });

    it('GET /api/providers/status returns 401 without auth', async () => {
      const res = await fetch(`${baseUrl}/api/providers/status`);
      expect(res.status).toBe(401);
    });
  });

  describe('2. Normal user (role: USER) receives 403 Forbidden on /api/admin/*', () => {
    it('GET /api/admin/job-runs returns 403 for standard user', async () => {
      const res = await fetch(`${baseUrl}/api/admin/job-runs`, {
        headers: { Authorization: `Bearer ${normalUser.token}` },
      });
      expect(res.status).toBe(403);
      const json: any = await res.json();
      expect(json.message).toContain('Forbidden');
    });

    it('POST /api/admin/run-pipeline returns 403 for standard user', async () => {
      const res = await fetch(`${baseUrl}/api/admin/run-pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${normalUser.token}` },
      });
      expect(res.status).toBe(403);
    });

    it('GET /api/providers/status returns 403 for standard user', async () => {
      const res = await fetch(`${baseUrl}/api/providers/status`, {
        headers: { Authorization: `Bearer ${normalUser.token}` },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('3. Admin user (role: ADMIN) or x-admin-secret receives 200 OK', () => {
    it('GET /api/admin/job-runs returns 200 for ADMIN token', async () => {
      const res = await fetch(`${baseUrl}/api/admin/job-runs`, {
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it('GET /api/admin/job-runs returns 200 with x-admin-secret header', async () => {
      const res = await fetch(`${baseUrl}/api/admin/job-runs`, {
        headers: { 'x-admin-secret': adminSecret },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
    });

    it('GET /api/providers/status returns 200 for ADMIN token', async () => {
      const res = await fetch(`${baseUrl}/api/providers/status`, {
        headers: { Authorization: `Bearer ${adminUser.token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.marketProvider).toBeDefined();
    }, 15000);
  });
});
