import { prisma } from '../src/config/prisma.js';

async function auditDigests() {
  const digests = await prisma.digest.findMany({
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Total digests in database: ${digests.length}\n`);

  const summary = digests.map((d) => ({
    id: d.id,
    headline: d.headline,
    timeRange: d.timeRange,
    userId: d.userId,
    userEmail: d.user?.email || 'SYSTEM/NULL',
    isSimulated: d.isSimulated,
    createdAt: d.createdAt.toISOString().slice(0, 10),
  }));

  console.table(summary.slice(0, 30));

  const nullUserDigests = digests.filter((d) => !d.userId);
  console.log(`\nDigests with userId: null (${nullUserDigests.length}):`);
  for (const d of nullUserDigests) {
    console.log(`- ID: ${d.id} | Headline: "${d.headline}" | Range: "${d.timeRange}" | isSimulated: ${d.isSimulated}`);
  }
}

auditDigests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
