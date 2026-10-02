import { Router, Request, Response } from 'express';
import { runMarketIntelligencePipeline, isPipelineRunning } from '../jobs/scheduler.js';
import { serializeBigInt } from '../utils/json.js';

const router = Router();

/**
 * POST /api/internal/run-pipeline
 * 
 * Protected by header `x-cron-secret` matching env CRON_SECRET.
 * If CRON_SECRET is unset: return 503.
 * If x-cron-secret does not match: return 401.
 * Guard against concurrent runs using isPipelineRunning().
 */
router.post('/run-pipeline', async (req: Request, res: Response): Promise<void> => {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    res.status(503).json({
      success: false,
      error: 'CRON_SECRET is not configured on server.',
    });
    return;
  }

  const providedSecret = req.headers['x-cron-secret'];
  if (!providedSecret || providedSecret !== configuredSecret) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: invalid or missing x-cron-secret header.',
    });
    return;
  }

  if (isPipelineRunning()) {
    res.status(409).json({
      success: false,
      message: 'Pipeline is currently already in progress.',
    });
    return;
  }

  try {
    const summary = await runMarketIntelligencePipeline();
    res.status(200).json({
      success: true,
      message: 'Market intelligence pipeline executed successfully.',
      summary: serializeBigInt(summary),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Pipeline execution failed.',
    });
  }
});

export default router;
