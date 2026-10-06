-- CreateTable
CREATE TABLE IF NOT EXISTS "market_universe" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "indexName" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_universe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "market_index_quotes" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "currentPrice" DECIMAL(12,2) NOT NULL,
    "changeAmount" DECIMAL(12,2) NOT NULL,
    "changePercent" DECIMAL(8,2) NOT NULL,
    "dayHigh" DECIMAL(12,2),
    "dayLow" DECIMAL(12,2),
    "exchange" TEXT,
    "delayMinutes" INTEGER NOT NULL DEFAULT 15,
    "sparkline" JSONB,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_index_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "market_universe_indexName_symbol_key" ON "market_universe"("indexName", "symbol");
CREATE INDEX IF NOT EXISTS "market_universe_indexName_idx" ON "market_universe"("indexName");
CREATE INDEX IF NOT EXISTS "market_universe_symbol_idx" ON "market_universe"("symbol");
CREATE INDEX IF NOT EXISTS "market_universe_sector_idx" ON "market_universe"("sector");

CREATE UNIQUE INDEX IF NOT EXISTS "market_index_quotes_symbol_key" ON "market_index_quotes"("symbol");
CREATE INDEX IF NOT EXISTS "market_index_quotes_category_idx" ON "market_index_quotes"("category");
