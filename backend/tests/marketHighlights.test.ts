import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../src/config/prisma.js';
import { marketUniverseService } from '../src/services/marketUniverseService.js';
import bcrypt from 'bcryptjs';

describe('Market Highlights & Universe Service', () => {
  beforeEach(async () => {
    // Ensure test universe is seeded
    await marketUniverseService.ensureUniverseSeeded();
  });

  it('correctly calculates market breadth across universe stocks', async () => {
    // Upsert known test stock quotes
    await prisma.stock.upsert({
      where: { symbol: 'INFY' },
      update: { currentPrice: 1950, changeAmount: 50, changePercent: 2.63, high52w: 1960, low52w: 1350 },
      create: { symbol: 'INFY', companyName: 'Infosys', sector: 'Information Technology', currentPrice: 1950, changeAmount: 50, changePercent: 2.63, marketCap: '₹8 Lakh Cr', high52w: 1960, low52w: 1350 },
    });
    await prisma.stock.upsert({
      where: { symbol: 'TCS' },
      update: { currentPrice: 4500, changeAmount: -90, changePercent: -1.96, high52w: 4600, low52w: 3300 },
      create: { symbol: 'TCS', companyName: 'TCS Ltd', sector: 'Information Technology', currentPrice: 4500, changeAmount: -90, changePercent: -1.96, marketCap: '₹16 Lakh Cr', high52w: 4600, low52w: 3300 },
    });

    const highlights = await marketUniverseService.getMarketHighlights();
    expect(highlights.breadth).toBeDefined();
    expect(highlights.breadth.total).toBeGreaterThanOrEqual(2);
    expect(highlights.breadth.advancers).toBeGreaterThanOrEqual(1);
    expect(highlights.breadth.decliners).toBeGreaterThanOrEqual(1);
    expect(typeof highlights.breadth.advancerPercent).toBe('number');
  });

  it('correctly aggregates sector averages and lead stock contributors', async () => {
    const highlights = await marketUniverseService.getMarketHighlights();
    expect(highlights.sectors).toBeDefined();
    expect(Array.isArray(highlights.sectors)).toBe(true);

    const itSector = highlights.sectors.find((s) => s.sector === 'Information Technology');
    if (itSector) {
      expect(typeof itSector.changePercent).toBe('number');
      expect(typeof itSector.stockCount).toBe('number');
      expect(itSector.leadStock).toBeDefined();
      expect(['ACCELERATING', 'STABLE', 'WEAKENING']).toContain(itSector.momentum);
    }
  });

  it('categorizes India VIX plain-language levels accurately based on thresholds', async () => {
    // 1. Test Calm regime (<15)
    await prisma.marketIndexQuote.upsert({
      where: { symbol: '^INDIAVIX' },
      update: { currentPrice: 13.5, changeAmount: -0.5, changePercent: -3.57, category: 'VOLATILITY', name: 'INDIA VIX' },
      create: { symbol: '^INDIAVIX', name: 'INDIA VIX', category: 'VOLATILITY', currentPrice: 13.5, changeAmount: -0.5, changePercent: -3.57 },
    });

    let highlights = await marketUniverseService.getMarketHighlights(undefined, true);
    expect(highlights.volatility.level).toBe('CALM');
    expect(highlights.volatility.levelDescription).toContain('Low systemic volatility');

    // 2. Test Elevated regime (>20)
    await prisma.marketIndexQuote.upsert({
      where: { symbol: '^INDIAVIX' },
      update: { currentPrice: 22.4, changeAmount: 3.2, changePercent: 16.67, category: 'VOLATILITY', name: 'INDIA VIX' },
      create: { symbol: '^INDIAVIX', name: 'INDIA VIX', category: 'VOLATILITY', currentPrice: 22.4, changeAmount: 3.2, changePercent: 16.67 },
    });

    highlights = await marketUniverseService.getMarketHighlights(undefined, true);
    expect(highlights.volatility.level).toBe('ELEVATED');
    expect(highlights.volatility.levelDescription).toContain('Elevated volatility');
  });

  it('provides strict user isolation for personal watchlist exposure', async () => {
    // Setup test users
    const pwd = await bcrypt.hash('TestPass123!', 4);
    const userA = await prisma.user.create({
      data: { email: `user_exp_a_${Date.now()}@test.com`, name: 'User A', passwordHash: pwd, isTestUser: true },
    });
    const userB = await prisma.user.create({
      data: { email: `user_exp_b_${Date.now()}@test.com`, name: 'User B', passwordHash: pwd, isTestUser: true },
    });

    // User A tracks INFY (IT)
    const wlA = await prisma.watchlist.create({
      data: { userId: userA.id, name: 'User A List', isDefault: true },
    });
    await prisma.watchlistStock.create({
      data: { watchlistId: wlA.id, stockSymbol: 'INFY' },
    });

    // User B tracks RELIANCE (Energy)
    const wlB = await prisma.watchlist.create({
      data: { userId: userB.id, name: 'User B List', isDefault: true },
    });
    await prisma.watchlistStock.create({
      data: { watchlistId: wlB.id, stockSymbol: 'RELIANCE' },
    });

    const highlightsA = await marketUniverseService.getMarketHighlights(userA.id);
    const highlightsB = await marketUniverseService.getMarketHighlights(userB.id);

    expect(highlightsA.exposure).toBeDefined();
    expect(highlightsB.exposure).toBeDefined();

    expect(highlightsA.exposure?.topSector).toBe('Information Technology');
    expect(highlightsB.exposure?.topSector).toBe('Oil Gas & Consumable Fuels');

    // Clean up
    await prisma.watchlistStock.deleteMany({ where: { watchlistId: { in: [wlA.id, wlB.id] } } });
    await prisma.watchlist.deleteMany({ where: { id: { in: [wlA.id, wlB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
  });

  it('handles unauthenticated requests by returning null exposure', async () => {
    const highlights = await marketUniverseService.getMarketHighlights();
    expect(highlights.exposure).toBeNull();
    expect(highlights.pulse).toBeDefined();
    expect(highlights.indices.length).toBeGreaterThan(0);
    expect(highlights.freshness.provider).toBe('Yahoo Finance Real-Time Market Provider');
  });
});
