const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const p = new PrismaClient();
async function main() {
  const evs = await p.event.findMany({ select: { id: true, stockSymbol: true } });
  console.log('Total events in DB:', evs.length);
  console.log('Symbols with events:', [...new Set(evs.map(e => e.stockSymbol))]);
  await p.$disconnect();
}
main().catch(console.error);
