import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, EventType, Priority } from '@prisma/client';
import { runChangeDetectionJob } from '../src/jobs/changeDetectionJob.js';

const prisma = new PrismaClient();

describe('Idempotent Event Deduplication (F0.8)', () => {
  const testSymbol = 'TEST_DEDUP_CO';

  beforeAll(async () => {
    // Ensure clean test stock with >5% price move to trigger PRICE_SURGE
    await prisma.stock.upsert({
      where: { symbol: testSymbol },
      update: {
        companyName: 'Test Dedup Corp',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 150.0,
        changeAmount: 10.0,
        changePercent: 7.14,
        volume: BigInt(5000000),
        avgVolume20D: BigInt(2000000),
        high52w: 200.0,
        low52w: 100.0,
        marketCap: '1000 Cr',
      },
      create: {
        symbol: testSymbol,
        companyName: 'Test Dedup Corp',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 150.0,
        changeAmount: 10.0,
        changePercent: 7.14,
        volume: BigInt(5000000),
        avgVolume20D: BigInt(2000000),
        high52w: 200.0,
        low52w: 100.0,
        marketCap: '1000 Cr',
      },
    });

    // Clean any prior events for this symbol
    await prisma.event.deleteMany({
      where: {
        stockSymbol: testSymbol,
      },
    });
  });

  afterAll(async () => {
    await prisma.event.deleteMany({ where: { stockSymbol: testSymbol } });
    await prisma.stock.deleteMany({ where: { symbol: testSymbol } });
    await prisma.$disconnect();
  });

  it('creates an event on first run and updates the existing event on second run without creating duplicates', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Run change detection job first time
    const result1 = await runChangeDetectionJob();
    expect(result1.eventsCreated).toBeGreaterThanOrEqual(1);

    const eventsAfterFirstRun = await prisma.event.findMany({
      where: {
        stockSymbol: testSymbol,
        eventType: EventType.PRICE_SURGE,
      },
    });
    expect(eventsAfterFirstRun.length).toBe(1);
    const firstEventId = eventsAfterFirstRun[0].id;

    // 2. Update stock price slightly higher (+8.5%)
    await prisma.stock.update({
      where: { symbol: testSymbol },
      data: {
        currentPrice: 152.0,
        changePercent: 8.5,
      },
    });

    // 3. Run change detection job second time on same day
    const result2 = await runChangeDetectionJob();
    expect(result2.eventsSkippedDuplicate).toBeGreaterThanOrEqual(1);

    // Verify NO second event row was created
    const eventsAfterSecondRun = await prisma.event.findMany({
      where: {
        stockSymbol: testSymbol,
        eventType: EventType.PRICE_SURGE,
      },
    });
    expect(eventsAfterSecondRun.length).toBe(1);
    expect(eventsAfterSecondRun[0].id).toBe(firstEventId);

    // Verify metrics updated
    const metrics = eventsAfterSecondRun[0].metricsDelta as any;
    expect(metrics.changePercent).toBe(8.5);
    expect(metrics.price).toBe(152.0);
  });
});
