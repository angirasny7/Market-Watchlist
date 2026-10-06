import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('Applying additive Feed v2 migration statement by statement...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."events"
      ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "source" TEXT,
      ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "sourceTrustTier" TEXT,
      ADD COLUMN IF NOT EXISTS "meaningfulnessScore" INTEGER,
      ADD COLUMN IF NOT EXISTS "whyShown" TEXT,
      ADD COLUMN IF NOT EXISTS "sources" JSONB;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "public"."user_states"
      ADD COLUMN IF NOT EXISTS "feedBoundaryAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "lastFeedViewedAt" TIMESTAMP(3);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."user_event_deletes" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "eventId" TEXT NOT NULL,
      "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "user_event_deletes_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "user_event_deletes_userId_eventId_key" ON "public"."user_event_deletes"("userId", "eventId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "user_event_deletes_userId_idx" ON "public"."user_event_deletes"("userId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "user_event_deletes_eventId_idx" ON "public"."user_event_deletes"("eventId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "user_event_deletes_expiresAt_idx" ON "public"."user_event_deletes"("expiresAt");
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_event_deletes_userId_fkey'
      ) THEN
        ALTER TABLE "public"."user_event_deletes"
          ADD CONSTRAINT "user_event_deletes_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_event_deletes_eventId_fkey'
      ) THEN
        ALTER TABLE "public"."user_event_deletes"
          ADD CONSTRAINT "user_event_deletes_eventId_fkey"
          FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log('✓ All additive columns, indexes and tables created successfully.');
}

applyMigration()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
