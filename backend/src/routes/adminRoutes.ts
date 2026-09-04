import { Router, Request, Response, NextFunction } from 'express';
import { runSyncStocksJob } from '../jobs/syncStocksJob.js';
import { runNewsSyncJob } from '../jobs/newsSyncJob.js';
import { runChangeDetectionJob } from '../jobs/changeDetectionJob.js';
import { insightGenerationService } from '../services/insightGenerationService.js';
import { runDigestGenerationJob } from '../jobs/digestGenerationJob.js';
import { runMarketIntelligencePipeline } from '../jobs/scheduler.js';
import { prisma } from '../config/prisma.js';
import { serializeBigInt } from '../utils/json.js';

const router = Router();

/**
 * POST /api/admin/run-stock-sync
 * Development & testing manual trigger for stock quote synchronization
 */
router.post('/run-stock-sync', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[AdminAPI] Manual stock synchronization trigger requested.');
    const result = await runSyncStocksJob();
    res.status(200).json({
      success: true,
      message: 'Stock synchronization executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/run-news-sync
 * Development & testing manual trigger for financial news synchronization
 */
router.post('/run-news-sync', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[AdminAPI] Manual news synchronization trigger requested.');
    const result = await runNewsSyncJob();
    res.status(200).json({
      success: true,
      message: 'News synchronization executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/run-pipeline
 * Runs full sequential pipeline: sync -> change detection -> insights -> digest
 */
router.post('/run-pipeline', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[AdminAPI] Manual Market Intelligence Pipeline trigger requested.');
    const result = await runMarketIntelligencePipeline();
    res.status(200).json({
      success: true,
      message: 'Market Intelligence Pipeline executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/run-change-detection
 */
router.post('/run-change-detection', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await runChangeDetectionJob();
    res.status(200).json({
      success: true,
      message: 'Change detection executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/run-insight-generation
 */
router.post('/run-insight-generation', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await insightGenerationService.runInsightGeneration();
    res.status(200).json({
      success: true,
      message: 'Insight generation executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/run-digest-generation
 */
router.post('/run-digest-generation', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await runDigestGenerationJob({ force: true });
    res.status(200).json({
      success: true,
      message: 'Digest generation executed successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/admin/job-runs
 * Returns system background job execution history for observability
 */
router.get('/job-runs', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const runs = await prisma.systemJobRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    res.status(200).json({
      success: true,
      count: runs.length,
      data: serializeBigInt(runs),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
