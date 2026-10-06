-- AlterTable: Add priceAtSave and note to user_saved_events
ALTER TABLE "public"."user_saved_events"
  ADD COLUMN IF NOT EXISTS "priceAtSave" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "note" TEXT;

-- AlterTable: Add isTestUser to users if not exists
ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "isTestUser" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "users_isTestUser_idx" ON "public"."users"("isTestUser");

-- AlterTable: Add isSimulated to events and digests if not exists
ALTER TABLE "public"."events"
  ADD COLUMN IF NOT EXISTS "isSimulated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add isSimulated, userId, forwardPerformanceMap to digests if not exists
ALTER TABLE "public"."digests"
  ADD COLUMN IF NOT EXISTS "isSimulated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "forwardPerformanceMap" JSONB;

-- AlterTable: Add session lifecycle and boundary fields to user_states if not exists
ALTER TABLE "public"."user_states"
  ADD COLUMN IF NOT EXISTS "previousSessionStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "previousSessionEndedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "previousSessionEndReason" TEXT,
  ADD COLUMN IF NOT EXISTS "caughtUpAt" TIMESTAMP(3);



