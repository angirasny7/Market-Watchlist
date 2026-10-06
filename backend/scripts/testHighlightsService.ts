import { marketUniverseService } from '../src/services/marketUniverseService.js';
import { prisma } from '../src/config/prisma.js';

async function test() {
  console.log('1. Seeding universe...');
  const seeded = await marketUniverseService.ensureUniverseSeeded();
  console.log(`Seeded universe items: ${seeded}`);

  console.log('2. Syncing benchmark quotes...');
  await marketUniverseService.syncBenchmarkQuotes();
  console.log('Benchmark quotes synced.');

  console.log('3. Getting market highlights...');
  const highlights = await marketUniverseService.getMarketHighlights();
  console.log('Highlights pulse:', highlights.pulse);
  console.log('Indices count:', highlights.indices.length);
  console.log('Breadth:', highlights.breadth);
  console.log('Sectors count:', highlights.sectors.length);
  console.log('India movers:', {
    gainers: highlights.movers.india.gainers.length,
    losers: highlights.movers.india.losers.length,
    mostActive: highlights.movers.india.mostActive.length,
  });
  console.log('US movers:', {
    gainers: highlights.movers.us.gainers.length,
    losers: highlights.movers.us.losers.length,
    mostActive: highlights.movers.us.mostActive.length,
  });
  console.log('Volatility:', highlights.volatility);
  console.log('Global cues count:', highlights.globalCues.length);
  console.log('Headlines count:', highlights.headlines.length);

  await prisma.$disconnect();
}

test().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
