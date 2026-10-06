import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSpuriousClosedMarketEvents() {
  const targetIds = [
    '934d4023-ff9f-4318-97fe-e01d1c818aa8', // ITC VOLUME_SPIKE
    '1c317bd5-0d19-4910-8d5b-521616e601ea', // ITC PRICE_SURGE
    'bf021c41-7f88-4332-8dbd-3247601b9ebe', // MPHASIS VOLUME_SPIKE
    '185a2330-ff97-468b-bbd6-44220a035a4e', // HDFCBANK VOLUME_SPIKE
    'a9efb58c-c03b-4abb-9cac-da0410b7be67', // COFORGE VOLUME_SPIKE
    '62fcedb3-09fd-497e-9f14-20ebd0be3e57', // PERSISTENT VOLUME_SPIKE
  ];

  console.log(`Fixing ${targetIds.length} events created during closed market hours...`);

  // Monday Oct 5 NSE Close = 15:30 IST = 10:00 UTC
  const mondayClose = new Date('2026-10-05T10:00:00.000Z');

  const res = await prisma.event.updateMany({
    where: {
      id: { in: targetIds },
    },
    data: {
      occurredAt: mondayClose,
      occurredOn: mondayClose,
      timestamp: mondayClose,
      publishedAt: mondayClose,
      source: 'NSE Market Data',
      sourceTrustTier: 'OFFICIAL_EXCHANGE',
    },
  });

  console.log(`✓ Updated ${res.count} events to Monday 5 Oct session close time.`);
}

fixSpuriousClosedMarketEvents()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
