import { beforeAll } from 'vitest';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '../src/config/prisma.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

beforeAll(async () => {
  const testUrl = process.env.DATABASE_URL_TEST;
  if (testUrl && testUrl.includes('_test')) {
    try {
      execSync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: testUrl },
        stdio: 'ignore',
      });
    } catch {
      // Ignored if docker/db is not active
    }

    // Seed master catalog test stocks concurrently-safe
    const standardStocks = [
      ['INFY', 'Infosys Limited', 'Technology', 'NSE', '₹', 1850.0, 12.0, 0.65, '7.5L Cr', 1950.0, 1350.0],
      ['TCS', 'Tata Consultancy Services', 'Technology', 'NSE', '₹', 4200.0, -15.0, -0.35, '15L Cr', 4500.0, 3400.0],
      ['RELIANCE', 'Reliance Industries', 'Energy', 'NSE', '₹', 2950.0, 30.0, 1.02, '20L Cr', 3050.0, 2200.0],
      ['HDFCBANK', 'HDFC Bank Limited', 'Financials', 'NSE', '₹', 1680.0, 8.5, 0.51, '12L Cr', 1750.0, 1380.0],
      ['AAPL', 'Apple Inc.', 'Technology', 'NASDAQ', '$', 180.0, 2.5, 1.4, '3T', 199.0, 140.0],
    ];

    for (const [sym, name, sec, ex, cur, price, chg, pct, cap, high, low] of standardStocks) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "public"."stocks" ("symbol", "companyName", "sector", "exchange", "currency", "currentPrice", "changeAmount", "changePercent", "marketCap", "high52w", "low52w", "updatedAt")
          VALUES ('${sym}', '${name}', '${sec}', '${ex}', '${cur}', ${price}, ${chg}, ${pct}, '${cap}', ${high}, ${low}, NOW())
          ON CONFLICT ("symbol") DO UPDATE SET "currentPrice" = ${price}, "updatedAt" = NOW();
        `);
      } catch {
        // Safe to ignore in parallel test runner
      }
    }
  }
});

