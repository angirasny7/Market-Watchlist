import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import app from '../src/index.js';
import { prisma } from '../src/config/prisma.js';
import { authService } from '../src/services/authService.js';
import { stockService } from '../src/services/stockService.js';
import { ProviderFactory } from '../src/providers/providerFactory.js';


describe('Public Endpoints & Provider Quota Protection (Item 3)', () => {
  let server: http.Server;
  let baseUrl: string;
  let testUser: { id: string; email: string; token: string };

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
      name: 'Quota Test User',
      email: `quota_${timestamp}@providerquota.test`,
      password: 'Password123!@#',
    });

    testUser = {
      id: reg.user.id,
      email: reg.user.email,
      token: reg.token,
    };

    await prisma.stock.upsert({
      where: { symbol: 'AAPL' },
      create: {
        symbol: 'AAPL',
        companyName: 'Apple Inc.',
        sector: 'Technology',
        exchange: 'NASDAQ',
        currency: '$',
        currentPrice: 180.0,
        changeAmount: 2.5,
        changePercent: 1.4,
        marketCap: '3T',
        high52w: 199.0,
        low52w: 140.0,
      },
      update: {},
    });

    await prisma.stock.upsert({
      where: { symbol: 'RELIANCE' },
      create: {
        symbol: 'RELIANCE',
        companyName: 'Reliance Industries',
        sector: 'Energy',
        exchange: 'NSE',
        currency: '₹',
        currentPrice: 2950.0,
        changeAmount: 30.0,
        changePercent: 1.0,
        marketCap: '20L Cr',
        high52w: 3000.0,
        low52w: 2200.0,
      },
      update: {},
    });
  });

  afterAll(async () => {
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
    await prisma.$disconnect();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('1. Authentication Requirement on Stock History', () => {
    it('GET /api/stocks/:symbol/history returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/api/stocks/AAPL/history?range=1M`);
      expect(res.status).toBe(401);
      const json: any = await res.json();
      expect(json.message).toBeDefined();
    });

    it('GET /api/stocks/:symbol/history returns 200 with valid JWT Bearer token', async () => {
      const res = await fetch(`${baseUrl}/api/stocks/AAPL/history?range=1M`, {
        headers: { Authorization: `Bearer ${testUser.token}` },
      });
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.symbol).toBe('AAPL');
      expect(Array.isArray(json.data.dataPoints)).toBe(true);
      expect(json.data.dataPoints.length).toBeGreaterThan(0);
    });
  });

  describe('2. In-Memory Request Coalescing and Caching', () => {
    it('coalesces concurrent simultaneous requests for the same symbol into a single provider invocation', async () => {
      stockService.clearHistoryCache();

      const provider = ProviderFactory.getMarketDataProvider();
      let callCount = 0;
      const originalGetBars = provider.getHistoricalBars.bind(provider);

      vi.spyOn(provider, 'getHistoricalBars').mockImplementation(async (sym, days) => {
        callCount++;
        // Add a slight artificial delay to ensure concurrency window
        await new Promise((r) => setTimeout(r, 50));
        return originalGetBars(sym, days);
      });

      // Launch 3 simultaneous requests for RELIANCE (1M)
      const [res1, res2, res3] = await Promise.all([
        stockService.getStockHistory('RELIANCE', '1M'),
        stockService.getStockHistory('RELIANCE', '1M'),
        stockService.getStockHistory('RELIANCE', '1M'),
      ]);

      expect(res1.symbol).toBe('RELIANCE');
      expect(res2.symbol).toBe('RELIANCE');
      expect(res3.symbol).toBe('RELIANCE');
      expect(res1.dataPoints.length).toBe(res2.dataPoints.length);

      // Verify that provider was called at most once for the 3 concurrent requests
      expect(callCount).toBeLessThanOrEqual(1);

      vi.restoreAllMocks();
    });

    it('serves subsequent requests from TTL in-memory cache without calling provider', async () => {
      const provider = ProviderFactory.getMarketDataProvider();
      let callCount = 0;

      vi.spyOn(provider, 'getHistoricalBars').mockImplementation(async (sym, days) => {
        callCount++;
        return [];
      });

      // First call populates cache
      await stockService.getStockHistory('TCS', '1M');
      // Second call should hit cache
      await stockService.getStockHistory('TCS', '1M');

      expect(callCount).toBe(1);

      vi.restoreAllMocks();
    });
  });

  describe('3. Public Endpoints DB Isolation', () => {
    it('GET /api/stocks returns catalog directly from database', async () => {
      const res = await fetch(`${baseUrl}/api/stocks`);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.count).toBeGreaterThan(0);
    });

    it('GET /api/news returns stored articles directly from database', async () => {
      const res = await fetch(`${baseUrl}/api/news`);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });
});
