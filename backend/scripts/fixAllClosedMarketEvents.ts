import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRemaining() {
  const mondayClose = new Date('2026-10-05T10:00:00.000Z');

  const res = await prisma.event.updateMany({
    where: {
      occurredAt: { gte: new Date('2026-10-06T00:00:00.000Z') },
      eventType: { in: ['PRICE_SURGE', 'PRICE_DROP', 'VOLUME_SPIKE', 'FIFTY_TWO_WEEK_HIGH', 'FIFTY_TWO_WEEK_LOW'] },
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

  console.log(`✓ Corrected ${res.count} closed market price/volume events to Monday session close time.`);
}

fixRemaining()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
