import { prisma } from '../src/config/prisma.js';

async function flagGapDigests() {
  console.log('========================================================================');
  console.log('  AUDIT & FLAG UNASSIGNED GAP DIGESTS');
  console.log('========================================================================\n');

  // Find all unassigned digests (userId is null)
  const unassigned = await prisma.digest.findMany({
    where: { userId: null },
    select: { id: true, headline: true, timeRange: true, isSimulated: true },
  });

  console.log(`Found ${unassigned.length} total digests with userId: null\n`);

  const gapDigests = unassigned.filter((d) =>
    d.headline.includes('Day Market Dossier') ||
    d.headline.includes('Gap Dossier') ||
    d.timeRange.includes('Days')
  );

  console.log(`Identified ${gapDigests.length} unassigned multi-day gap dossiers:`);
  for (const d of gapDigests) {
    console.log(`- ID: ${d.id} | Headline: "${d.headline}" | Range: "${d.timeRange}"`);
  }

  if (gapDigests.length > 0) {
    const updated = await prisma.digest.updateMany({
      where: { id: { in: gapDigests.map((d) => d.id) } },
      data: { isSimulated: true },
    });
    console.log(`\n✓ Flagged ${updated.count} unassigned gap dossiers as isSimulated = true\n`);
  }

  // Count remaining legitimate market-wide daily digests
  const marketWide = await prisma.digest.count({
    where: { userId: null, isSimulated: false },
  });
  console.log(`Legitimate market-wide daily session digests (userId: null, isSimulated: false): ${marketWide}`);
  console.log('========================================================================\n');
}

flagGapDigests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
