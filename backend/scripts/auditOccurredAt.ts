import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: { stock: true },
  });

  console.log(`Total events in DB: ${events.length}`);

  let backfilledCount = 0;
  let providerBarCount = 0;
  let corporateEventCount = 0;
  let newsCount = 0;

  const sampleRows: any[] = [];

  for (const e of events) {
    const delta = (e.metricsDelta as any) || {};
    let source = 'UNKNOWN';

    if (e.eventType === 'EARNINGS_BEAT' || e.eventType === 'EARNINGS_MISS' || e.eventType === 'DIVIDEND_ANNOUNCED') {
      source = 'Corporate Event Calendar';
      corporateEventCount++;
    } else if (delta.providerBarDate || delta.tradingDate || e.occurredOn) {
      source = 'Provider Daily Bar Date';
      providerBarCount++;
    } else if (e.occurredAt && e.occurredAt.getTime() === e.createdAt.getTime()) {
      source = 'Backfilled from createdAt/timestamp';
      backfilledCount++;
    } else {
      source = 'Ingestion Pipeline Event';
      providerBarCount++;
    }

    if (sampleRows.length < 25) {
      sampleRows.push({
        id: e.id,
        symbol: e.stockSymbol,
        type: e.eventType,
        occurredAt: e.occurredAt?.toISOString() || 'NULL',
        occurredOn: e.occurredOn?.toISOString()?.split('T')[0] || 'NULL',
        createdAt: e.createdAt.toISOString(),
        source,
      });
    }
  }

  console.log('\n📊 Summary of Event Date Sources:');
  console.log(`- Provider Bar / Market Date: ${providerBarCount}`);
  console.log(`- Corporate Event Calendar: ${corporateEventCount}`);
  console.log(`- Backfilled from createdAt: ${backfilledCount}`);

  console.log('\n📋 Sample 25 Event Rows:');
  console.table(sampleRows);
}

main().finally(() => prisma.$disconnect());
