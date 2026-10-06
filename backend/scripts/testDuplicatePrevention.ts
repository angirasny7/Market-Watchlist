import { PrismaClient } from '@prisma/client';
import { runChangeDetectionJob } from '../src/jobs/changeDetectionJob.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Testing Pipeline & Ingestion Idempotency ---');
  
  const eventsBefore = await prisma.event.count({ where: { isDuplicate: false } });
  console.log(`Total non-duplicate events in DB before: ${eventsBefore}`);
  
  // Run change detection
  console.log('Running runChangeDetectionJob (Run 1)...');
  const res1 = await runChangeDetectionJob();
  console.log(`Run 1 created: ${res1.eventsCreated} events, skipped duplicate: ${res1.eventsSkippedDuplicate}`);

  const eventsMid = await prisma.event.count({ where: { isDuplicate: false } });
  console.log(`Total non-duplicate events after Run 1: ${eventsMid}`);

  console.log('Running runChangeDetectionJob (Run 2 - immediate repeat)...');
  const res2 = await runChangeDetectionJob();
  console.log(`Run 2 created: ${res2.eventsCreated} events, skipped duplicate: ${res2.eventsSkippedDuplicate}`);

  const eventsAfter = await prisma.event.count({ where: { isDuplicate: false } });
  console.log(`Total non-duplicate events after Run 2: ${eventsAfter}`);
  
  console.log(`Delta between Run 1 and Run 2: ${eventsAfter - eventsMid} (Expected: 0)`);

  await prisma.$disconnect();
}

main().catch(console.error);
