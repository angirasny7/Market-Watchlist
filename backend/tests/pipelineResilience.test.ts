import { describe, it, expect, vi } from 'vitest';
import { runSyncStocksJob } from '../src/jobs/syncStocksJob.js';
import { ProviderFactory } from '../src/providers/providerFactory.js';
import { prisma } from '../src/config/prisma.js';

describe('Pipeline Batching, Concurrency & Rate Limit Retry Suite (Item 6)', () => {
  it('1. Provider backoff retry succeeds when provider throws 429 Rate Limit twice', async () => {
    let callCount = 0;
    const retryableOperation = async () => {
      callCount++;
      if (callCount < 3) {
        const err: any = new Error('429 Too Many Requests: Rate limit exceeded');
        err.status = 429;
        throw err;
      }
      return { price: 1550, symbol: 'INFY' };
    };

    // Use YahooFinanceProvider executeWithRetry method via provider instance
    const provider: any = ProviderFactory.getMarketDataProvider();
    const result = await provider.executeWithRetry(
      retryableOperation,
      'testRateLimitRetry',
      3,
      10 // fast delay for unit test
    );

    expect(callCount).toBe(3);
    expect(result.price).toBe(1550);
  });

  it('2. runSyncStocksJob synchronizes target symbols in concurrency-limited batches with error isolation', async () => {
    // Ensure test symbols exist in database
    await prisma.stock.upsert({
      where: { symbol: 'INFY' },
      update: {},
      create: {
        symbol: 'INFY',
        companyName: 'Infosys Ltd',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 1500,
        changeAmount: 0,
        changePercent: 0,
        high52w: 1900,
        low52w: 1300,
        marketCap: '₹6.2T',
      },
    });

    await prisma.stock.upsert({
      where: { symbol: 'TCS' },
      update: {},
      create: {
        symbol: 'TCS',
        companyName: 'Tata Consultancy Services',
        sector: 'Technology',
        currency: '₹',
        currentPrice: 3000,
        changeAmount: 0,
        changePercent: 0,
        high52w: 4200,
        low52w: 2800,
        marketCap: '₹11.0T',
      },
    });

    const result = await runSyncStocksJob(['INFY', 'TCS']);
    expect(result.totalTracked).toBe(2);
    expect(result.successCount).toBeGreaterThanOrEqual(1);
    expect(result.durationMs).toBeGreaterThan(0);
  }, 20000);
});
