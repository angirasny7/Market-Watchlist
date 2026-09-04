import cron from 'node-cron';
import { runSyncStocksJob, SyncStocksResult } from './syncStocksJob.js';
import { runNewsSyncJob } from './newsSyncJob.js';
import { runChangeDetectionJob, ChangeDetectionResult } from './changeDetectionJob.js';
import { insightGenerationService, InsightGenerationResult } from '../services/insightGenerationService.js';
import { runDigestGenerationJob, DigestGenerationResult } from './digestGenerationJob.js';

let lastStockSyncTime: Date | null = null;
let lastNewsSyncTime: Date | null = null;
let isPipelineInProgress = false;
let isNewsSyncInProgress = false;

export function recordStockSyncCompleted(): void {
  lastStockSyncTime = new Date();
}

export function recordNewsSyncCompleted(): void {
  lastNewsSyncTime = new Date();
}

export function getSchedulerState() {
  return {
    lastStockSync: lastStockSyncTime ? lastStockSyncTime.toISOString() : null,
    lastNewsSync: lastNewsSyncTime ? lastNewsSyncTime.toISOString() : null,
    isPipelineInProgress,
    isNewsSyncInProgress,
  };
}

export interface PipelineExecutionResult {
  stockResult: SyncStocksResult;
  changeResult: ChangeDetectionResult;
  insightResult: InsightGenerationResult;
  digestResult: DigestGenerationResult;
}

/**
 * Sequential Pipeline Orchestrator:
 * syncStocksJob -> changeDetectionJob -> insightGenerationJob -> digestGenerationJob
 */
export async function runMarketIntelligencePipeline(): Promise<PipelineExecutionResult> {
  console.log('🔄 [Pipeline] Starting automated Market Intelligence Pipeline execution...');
  
  // Step 1: Real-time Quote Sync
  const stockResult = await runSyncStocksJob();

  // Step 2: Automated Anomaly Change Detection
  const changeResult = await runChangeDetectionJob();

  // Step 3: Rule-based Causal Insight Generation
  const insightResult = await insightGenerationService.runInsightGeneration();

  // Step 4: Market Memory Digest Synthesis
  const digestResult = await runDigestGenerationJob();

  console.log('✨ [Pipeline] Automated Market Intelligence Pipeline finished successfully.');

  return {
    stockResult,
    changeResult,
    insightResult,
    digestResult,
  };
}

/**
 * Initializes background synchronization crons:
 * - Market Intelligence Pipeline: Every 5 minutes (sync -> change detection -> insights -> digest)
 * - Financial news: Every 15 minutes
 * Also triggers warm-up execution on boot.
 */
export function startScheduler(): void {
  console.log('⏰ [Scheduler] Initializing background market & news synchronization engines...');

  // 1. Intelligence Pipeline: Every 5 minutes (*/5 * * * *)
  cron.schedule('*/5 * * * *', async () => {
    if (isPipelineInProgress) {
      console.warn('[Scheduler] Previous Market Intelligence Pipeline still in progress. Skipping cycle.');
      return;
    }

    try {
      isPipelineInProgress = true;
      await runMarketIntelligencePipeline();
      lastStockSyncTime = new Date();
    } catch (err: any) {
      console.error('[Scheduler] Scheduled intelligence pipeline failed:', err.message);
    } finally {
      isPipelineInProgress = false;
    }
  });

  // 2. News Sync: Every 15 minutes (*/15 * * * *)
  cron.schedule('*/15 * * * *', async () => {
    if (isNewsSyncInProgress) {
      console.warn('[Scheduler] Previous newsSyncJob still in progress. Skipping cycle.');
      return;
    }

    try {
      isNewsSyncInProgress = true;
      await runNewsSyncJob();
      lastNewsSyncTime = new Date();
    } catch (err: any) {
      console.error('[Scheduler] Scheduled newsSyncJob failed:', err.message);
    } finally {
      isNewsSyncInProgress = false;
    }
  });

  // 3. Immediate Warm-Up Synchronization on Boot
  setTimeout(async () => {
    console.log('⚡ [Scheduler] Executing boot warm-up synchronization...');
    try {
      isPipelineInProgress = true;
      await runMarketIntelligencePipeline();
      lastStockSyncTime = new Date();
    } catch (e: any) {
      console.error('[Scheduler] Initial intelligence pipeline warm-up failed:', e.message);
    } finally {
      isPipelineInProgress = false;
    }

    try {
      isNewsSyncInProgress = true;
      await runNewsSyncJob();
      lastNewsSyncTime = new Date();
    } catch (e: any) {
      console.error('[Scheduler] Initial news warm-up failed:', e.message);
    } finally {
      isNewsSyncInProgress = false;
    }
  }, 1000);

  console.log('✅ [Scheduler] Crons registered: Market Intelligence Pipeline (5m), newsSyncJob (15m).');
}
