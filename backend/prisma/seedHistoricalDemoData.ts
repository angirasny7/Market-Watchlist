import { PrismaClient, EventType, Priority } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Historical Pattern Demo Seed Script
 * 
 * NOTE: Demo-only backfilled data, not real market history.
 * Seeds historical events (dated 7-10 days in the past) and matching stock price history
 * bars at T+0 and T+5 days so that the deterministic historicalPatternService has >=5
 * empirical samples to evaluate for demo purposes.
 * 
 * Run manually via:
 * npm run prisma:seed-historical-demo
 */
async function main() {
  console.log('🏛️ Starting Historical Pattern Demo Data Seed...');

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Ensure stocks exist before attaching events
  const existingStocks = await prisma.stock.findMany({ select: { symbol: true, currentPrice: true } });
  if (existingStocks.length === 0) {
    console.error('❌ No stocks found in database. Run npm run prisma:seed first.');
    process.exit(1);
  }

  const stockMap = new Map(existingStocks.map((s) => [s.symbol, Number(s.currentPrice)]));
  const candidateSymbols = ['TATAMOTORS', 'RELIANCE', 'HDFCBANK', 'INFY', 'TCS', 'ICICIBANK'];
  const symbolsToUse = candidateSymbols.filter((s) => stockMap.has(s));

  if (symbolsToUse.length < 3) {
    // Fall back to any available stock symbols
    symbolsToUse.push(...existingStocks.slice(0, 6).map((s) => s.symbol));
  }

  console.log(`Using stocks for historical demo seed: ${symbolsToUse.join(', ')}`);

  // Target event types to seed with >= 5 samples each
  const demoConfigs = [
    {
      eventType: EventType.VOLUME_SPIKE,
      daysAgo: 8,
      forwardReturns: [+2.4, +3.1, -1.2, +4.0, +1.8, +2.9],
    },
    {
      eventType: EventType.PRICE_SURGE,
      daysAgo: 7,
      forwardReturns: [+1.9, +4.5, +3.2, -0.8, +2.1, +3.8],
    },
  ];

  let eventsSeeded = 0;
  let priceBarsSeeded = 0;

  for (const config of demoConfigs) {
    for (let i = 0; i < config.forwardReturns.length; i++) {
      const symbol = symbolsToUse[i % symbolsToUse.length];
      const basePrice = stockMap.get(symbol) || 1000;
      const returnPct = config.forwardReturns[i];
      const forwardPrice = parseFloat((basePrice * (1 + returnPct / 100)).toFixed(2));

      // Event date: e.g. 8 days ago
      const eventTimestamp = new Date(now - config.daysAgo * dayMs + i * 3600 * 1000);
      // Forward bar date: 5 days after event (e.g. 3 days ago)
      const forwardTimestamp = new Date(eventTimestamp.getTime() + 5 * dayMs);

      const eventId = `demo_hist_${config.eventType.toLowerCase()}_${symbol}_${i + 1}`;

      // Check if event already exists
      const existing = await prisma.event.findUnique({ where: { id: eventId } });
      if (!existing) {
        await prisma.event.create({
          data: {
            id: eventId,
            stockSymbol: symbol,
            eventType: config.eventType,
            priority: Priority.HIGH,
            timestamp: eventTimestamp,
            metricsDelta: {
              price: basePrice,
              changePercent: 3.5,
              volumeRatio: 2.1,
              detectionReason: `Historical Demo Seed: ${config.eventType}`,
              enrichment: {
                summary: `Demonstration historical event for empirical backtesting verification.`,
                confidenceScore: 85,
                possibleDrivers: [`Demonstration baseline driver for ${symbol}`],
                evidence: [
                  {
                    title: `Exchange Filing Demo Record - ${symbol}`,
                    source: 'BSE Corporate Announcement',
                    sourceType: 'ANNOUNCEMENT',
                    url: 'https://www.bseindia.com',
                  },
                ],
              },
            },
          },
        });
        eventsSeeded++;
      }

      // Add baseline stock price history bar at event timestamp
      await prisma.stockPriceHistory.create({
        data: {
          stockSymbol: symbol,
          price: basePrice,
          changePercent: 0,
          volume: BigInt(5000000),
          timestamp: eventTimestamp,
        },
      });
      priceBarsSeeded++;

      // Add forward stock price history bar at event timestamp + 5 days
      await prisma.stockPriceHistory.create({
        data: {
          stockSymbol: symbol,
          price: forwardPrice,
          changePercent: returnPct,
          volume: BigInt(5200000),
          timestamp: forwardTimestamp,
        },
      });
      priceBarsSeeded++;
    }
  }

  console.log(`✓ Seeded ${eventsSeeded} historical demo events and ${priceBarsSeeded} price history checkpoints.`);
  console.log('✨ Demo historical backfill complete. historicalPatternService can now observe >=5 samples for demo testing.');
}

main()
  .catch((e) => {
    console.error('Error seeding historical demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
