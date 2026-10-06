import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying additive unique index migration...');
  
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "events_public_unique_day_idx" 
    ON "events" ("stockSymbol", "occurredOn", "eventType") 
    WHERE "userId" IS NULL AND "isDuplicate" = false;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "events_user_unique_day_idx" 
    ON "events" ("stockSymbol", "occurredOn", "eventType", "userId") 
    WHERE "userId" IS NOT NULL AND "isDuplicate" = false;
  `);

  console.log('Successfully applied additive unique index migration: 20261005143000_add_unique_event_constraint');
  await prisma.$disconnect();
}

main().catch(console.error);
