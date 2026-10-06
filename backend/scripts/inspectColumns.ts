import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'events' OR table_name = 'Event';
  `);
  console.log(cols);
  await prisma.$disconnect();
}

main().catch(console.error);
