-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'PRO', 'ADMIN');

-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('PRE_MARKET', 'REGULAR_OPEN', 'POST_MARKET', 'CLOSED', 'HALTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PRICE_SURGE', 'PRICE_DROP', 'VOLUME_SPIKE', 'EARNINGS_BEAT', 'EARNINGS_MISS', 'DIVIDEND_ANNOUNCED', 'FIFTY_TWO_WEEK_HIGH', 'FIFTY_TWO_WEEK_LOW', 'ANALYST_UPGRADE', 'MANAGEMENT_CHANGE');

-- CreateEnum
CREATE TYPE "NewsSentiment" AS ENUM ('BULLISH', 'BEARISH', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "MarketMood" AS ENUM ('BULLISH', 'EXTREME_GREED', 'NEUTRAL', 'CHOPPY', 'BEARISH');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDigestViewedId" TEXT,
    "lastDigestAcknowledgedId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Primary Watchlist',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_stocks" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "symbol" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'NSE',
    "currency" TEXT NOT NULL DEFAULT '₹',
    "currentPrice" DECIMAL(12,2) NOT NULL,
    "changeAmount" DECIMAL(12,2) NOT NULL,
    "changePercent" DECIMAL(8,2) NOT NULL,
    "volume" BIGINT NOT NULL DEFAULT 0,
    "avgVolume20D" BIGINT NOT NULL DEFAULT 0,
    "marketCap" TEXT NOT NULL,
    "peRatio" DECIMAL(8,2),
    "high52w" DECIMAL(12,2) NOT NULL,
    "low52w" DECIMAL(12,2) NOT NULL,
    "sparkline" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "stock_price_history" (
    "id" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "changePercent" DECIMAL(8,2) NOT NULL,
    "volume" BIGINT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sentiment" "NewsSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "metricsDelta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "relatedEventId" TEXT NOT NULL,
    "stockSymbol" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "possibleExplanation" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "confidenceScore" DECIMAL(4,3) NOT NULL,
    "sources" JSONB NOT NULL,
    "historicalPattern" TEXT,
    "forwardProbability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digests" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeRange" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "marketMood" "MarketMood" NOT NULL DEFAULT 'NEUTRAL',
    "benchmarkCloses" JSONB NOT NULL,
    "forwardPerformanceMap" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digest_events" (
    "id" TEXT NOT NULL,
    "digestId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digest_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digest_insights" (
    "id" TEXT NOT NULL,
    "digestId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digest_insights_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "user_states_userId_key" ON "user_states"("userId");
CREATE INDEX "user_states_userId_lastActivityAt_idx" ON "user_states"("userId", "lastActivityAt");
CREATE INDEX "watchlists_userId_isDefault_idx" ON "watchlists"("userId", "isDefault");
CREATE INDEX "watchlist_stocks_watchlistId_idx" ON "watchlist_stocks"("watchlistId");
CREATE INDEX "watchlist_stocks_stockSymbol_idx" ON "watchlist_stocks"("stockSymbol");
CREATE UNIQUE INDEX "watchlist_stocks_watchlistId_stockSymbol_key" ON "watchlist_stocks"("watchlistId", "stockSymbol");

CREATE INDEX "stocks_sector_idx" ON "stocks"("sector");
CREATE INDEX "stocks_exchange_idx" ON "stocks"("exchange");
CREATE INDEX "stock_price_history_stockSymbol_timestamp_idx" ON "stock_price_history"("stockSymbol", "timestamp" DESC);

CREATE INDEX "news_stockSymbol_publishedAt_idx" ON "news"("stockSymbol", "publishedAt" DESC);
CREATE INDEX "news_publishedAt_idx" ON "news"("publishedAt" DESC);

CREATE INDEX "events_stockSymbol_timestamp_idx" ON "events"("stockSymbol", "timestamp" DESC);
CREATE INDEX "events_priority_timestamp_idx" ON "events"("priority", "timestamp" DESC);
CREATE INDEX "events_eventType_idx" ON "events"("eventType");

CREATE INDEX "insights_relatedEventId_idx" ON "insights"("relatedEventId");
CREATE INDEX "insights_stockSymbol_idx" ON "insights"("stockSymbol");
CREATE INDEX "insights_confidenceScore_idx" ON "insights"("confidenceScore" DESC);

CREATE INDEX "digests_timestamp_idx" ON "digests"("timestamp" DESC);
CREATE INDEX "digest_events_digestId_idx" ON "digest_events"("digestId");
CREATE INDEX "digest_events_eventId_idx" ON "digest_events"("eventId");
CREATE UNIQUE INDEX "digest_events_digestId_eventId_key" ON "digest_events"("digestId", "eventId");

CREATE INDEX "digest_insights_digestId_idx" ON "digest_insights"("digestId");
CREATE INDEX "digest_insights_insightId_idx" ON "digest_insights"("insightId");
CREATE UNIQUE INDEX "digest_insights_digestId_insightId_key" ON "digest_insights"("digestId", "insightId");

-- AddForeignKeys
ALTER TABLE "user_states" ADD CONSTRAINT "user_states_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlists" ADD CONSTRAINT "watchlists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlist_stocks" ADD CONSTRAINT "watchlist_stocks_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "watchlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watchlist_stocks" ADD CONSTRAINT "watchlist_stocks_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_price_history" ADD CONSTRAINT "stock_price_history_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "news" ADD CONSTRAINT "news_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "events" ADD CONSTRAINT "events_stockSymbol_fkey" FOREIGN KEY ("stockSymbol") REFERENCES "stocks"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "insights" ADD CONSTRAINT "insights_relatedEventId_fkey" FOREIGN KEY ("relatedEventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "digest_events" ADD CONSTRAINT "digest_events_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "digests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digest_events" ADD CONSTRAINT "digest_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "digest_insights" ADD CONSTRAINT "digest_insights_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "digests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "digest_insights" ADD CONSTRAINT "digest_insights_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
