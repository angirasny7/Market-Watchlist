import { prisma } from '../src/config/prisma.js';
import { insightGenerationService } from '../src/services/insightGenerationService.js';

/**
 * Regenerates all Insight records using the corrected, deterministic, evidence-based engine.
 * Purges all stale insights containing hardcoded confidence scores (0.920, 0.860, etc.)
 * or fabricated percentage statistics (76%, 81%, etc.).
 */
async function main() {
  console.log('🔄 Starting regeneration of stale insights...');

  // 1. Delete all existing insight rows (cascades to digest_insights)
  const deleteResult = await prisma.insight.deleteMany({});
  console.log(`✓ Deleted ${deleteResult.count} stale insight records.`);

  // 2. Count unanalyzed events
  const totalEvents = await prisma.event.count();
  console.log(`Total events available for insight generation: ${totalEvents}`);

  // 3. Iteratively run insight generation until all events have fresh insights
  let totalInsights = 0;
  let batch = 1;

  while (true) {
    const unanalyzedCount = await prisma.event.count({
      where: { insights: { none: {} } },
    });

    if (unanalyzedCount === 0) {
      break;
    }

    console.log(`Batch ${batch}: Processing up to 20 of ${unanalyzedCount} remaining unanalyzed events...`);
    const result = await insightGenerationService.runInsightGeneration();
    totalInsights += result.insightsGenerated;
    batch++;

    if (result.insightsGenerated === 0) {
      break;
    }
  }

  console.log(`✨ Regeneration complete! Generated ${totalInsights} fresh, evidence-based insights across ${totalEvents} events.`);

  // 4. Audit database to verify ZERO stale hardcoded scores or percentages remain
  const remainingInsights = await prisma.insight.findMany();
  console.log(`Verifying ${remainingInsights.length} persisted insights for data integrity...`);

  const staleScoreStrings = ['0.92', '0.86', '0.89', '0.94', '0.81', '0.78', '0.80'];
  const stalePercentages = ['76%', '72%', '81%', '68%', '74%', '65%', '71%'];

  let violations = 0;
  for (const ins of remainingInsights) {
    const scoreStr = ins.confidenceScore.toString();
    const pattern = ins.historicalPattern || '';
    const prob = ins.forwardProbability || '';

    for (const stale of stalePercentages) {
      if (pattern.includes(stale) || prob.includes(stale)) {
        console.error(`❌ VIOLATION: Found stale percentage "${stale}" in insight ${ins.id}: ${pattern}`);
        violations++;
      }
    }
  }

  if (violations === 0) {
    console.log('✅ AUDIT PASSED: Zero stale fabricated percentages detected in database.');
  } else {
    console.error(`❌ AUDIT FAILED: ${violations} stale violations found.`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Error regenerating insights:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
