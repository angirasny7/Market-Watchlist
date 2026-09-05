const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const evs = await p.event.findMany({ select: { id: true, stockSymbol: true } });
  console.log('Total events in DB:', evs.length);
  console.log('Symbols with events:', [...new Set(evs.map(e => e.stockSymbol))]);
  const stocks = await p.stock.findMany({ select: { symbol: true } });
  console.log('Stocks in DB:', stocks.map(s => s.symbol));
  await p.$disconnect();
}
main().catch(console.error);
