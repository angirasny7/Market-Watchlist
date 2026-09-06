-- CreateEnum safely
DO $$ BEGIN
    CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable user_states
ALTER TABLE "user_states" 
ADD COLUMN IF NOT EXISTS "currentDeviceName" TEXT NOT NULL DEFAULT 'Laptop',
ADD COLUMN IF NOT EXISTS "currentDeviceType" TEXT NOT NULL DEFAULT 'DESKTOP',
ADD COLUMN IF NOT EXISTS "lastLogoutAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "previousDeviceName" TEXT,
ADD COLUMN IF NOT EXISTS "previousDeviceType" TEXT,
ADD COLUMN IF NOT EXISTS "previousSessionAt" TIMESTAMP(3);

-- AlterTable users
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "previousLoginAt" TIMESTAMP(3);

-- CreateTable system_job_runs
CREATE TABLE IF NOT EXISTS "system_job_runs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "system_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_event_reads
CREATE TABLE IF NOT EXISTS "user_event_reads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_event_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_digest_reads
CREATE TABLE IF NOT EXISTS "user_digest_reads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "digestId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_digest_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable user_saved_events
CREATE TABLE IF NOT EXISTS "user_saved_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "system_job_runs_jobName_startedAt_idx" ON "system_job_runs"("jobName", "startedAt" DESC);
CREATE INDEX IF NOT EXISTS "system_job_runs_status_idx" ON "system_job_runs"("status");

CREATE INDEX IF NOT EXISTS "user_event_reads_userId_idx" ON "user_event_reads"("userId");
CREATE INDEX IF NOT EXISTS "user_event_reads_eventId_idx" ON "user_event_reads"("eventId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_event_reads_userId_eventId_key" ON "user_event_reads"("userId", "eventId");

CREATE INDEX IF NOT EXISTS "user_digest_reads_userId_idx" ON "user_digest_reads"("userId");
CREATE INDEX IF NOT EXISTS "user_digest_reads_digestId_idx" ON "user_digest_reads"("digestId");
CREATE UNIQUE INDEX IF NOT EXISTS "user_digest_reads_userId_digestId_key" ON "user_digest_reads"("userId", "digestId");

CREATE INDEX IF NOT EXISTS "user_saved_events_userId_idx" ON "user_saved_events"("userId");
CREATE INDEX IF NOT EXISTS "user_saved_events_eventId_idx" ON "user_saved_events"("eventId");
CREATE INDEX IF NOT EXISTS "user_saved_events_userId_savedAt_idx" ON "user_saved_events"("userId", "savedAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "user_saved_events_userId_eventId_key" ON "user_saved_events"("userId", "eventId");

-- AddForeignKeys safely
DO $$ BEGIN
    ALTER TABLE "user_event_reads" ADD CONSTRAINT "user_event_reads_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_event_reads" ADD CONSTRAINT "user_event_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_digest_reads" ADD CONSTRAINT "user_digest_reads_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "digests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_digest_reads" ADD CONSTRAINT "user_digest_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_saved_events" ADD CONSTRAINT "user_saved_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_saved_events" ADD CONSTRAINT "user_saved_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
