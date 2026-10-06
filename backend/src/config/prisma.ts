import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// If running in test environment or under Vitest, load .env.test if present
if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
  try {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });
  } catch {
    // Ignore if file doesn't exist
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

const dbUrl = (process.env.NODE_ENV === 'test' || process.env.VITEST) && process.env.DATABASE_URL_TEST
  ? process.env.DATABASE_URL_TEST
  : process.env.DATABASE_URL;

export const prisma =
  global.__prismaClient ||
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prismaClient = prisma;
}
