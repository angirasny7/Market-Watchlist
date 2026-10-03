import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../src/index.js';

describe('Auth Enforcement & Bypass Prevention Test Suite (Item 1)', () => {
  const fakeUserId = '99999999-9999-9999-9999-999999999999';
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  const protectedEndpoints = [
    { method: 'GET', path: '/api/feed' },
    { method: 'GET', path: '/api/feed/summary' },
    { method: 'GET', path: '/api/watchlists' },
    { method: 'GET', path: '/api/alerts' },
    { method: 'GET', path: '/api/notifications' },
    { method: 'GET', path: '/api/events' },
    { method: 'GET', path: '/api/digests' },
    { method: 'GET', path: '/api/memory/events' },
    { method: 'GET', path: '/api/user/state' },
  ];

  for (const endpoint of protectedEndpoints) {
    it(`Rejects request with only x-user-id header on ${endpoint.method} ${endpoint.path} with 401`, async () => {
      const res = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'x-user-id': fakeUserId,
          'Content-Type': 'application/json',
        },
      });

      expect(res.status).toBe(401);
      const json: any = await res.json();
      expect(json.success).toBe(false);
    });

    it(`Rejects unauthenticated request with no headers on ${endpoint.method} ${endpoint.path} with 401`, async () => {
      const res = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
      });

      expect(res.status).toBe(401);
      const json: any = await res.json();
      expect(json.success).toBe(false);
    });
  }
});
