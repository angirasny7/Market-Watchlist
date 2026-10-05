-- AlterEnum
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'NEWS';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'FILING';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'CUMULATIVE_MOVE';

-- AlterTable
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isInvalidated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isDuplicate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "canonicalEventId" TEXT;

-- AlterTable
ALTER TABLE "user_event_reads" ADD COLUMN IF NOT EXISTS "readSource" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "user_event_reads" ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "user_saved_events" ADD COLUMN IF NOT EXISTS "restoredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_isDemo_idx" ON "events"("isDemo");
CREATE INDEX IF NOT EXISTS "events_isHidden_idx" ON "events"("isHidden");
CREATE INDEX IF NOT EXISTS "events_isDuplicate_idx" ON "events"("isDuplicate");
CREATE INDEX IF NOT EXISTS "user_event_reads_readSource_idx" ON "user_event_reads"("readSource");
