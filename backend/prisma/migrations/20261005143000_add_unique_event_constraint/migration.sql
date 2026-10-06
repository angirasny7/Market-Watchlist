-- Migration: 20261005143000_add_unique_event_constraint
-- Enforces database-level idempotency for events per stock, calendar day, and event type

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "occurredOn" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3);
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "detectedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "events_public_unique_day_idx" 
ON "events" ("stockSymbol", "occurredOn", "eventType") 
WHERE "userId" IS NULL AND "isDuplicate" = false;

CREATE UNIQUE INDEX IF NOT EXISTS "events_user_unique_day_idx" 
ON "events" ("stockSymbol", "occurredOn", "eventType", "userId") 
WHERE "userId" IS NOT NULL AND "isDuplicate" = false;
