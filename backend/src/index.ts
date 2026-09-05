import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { activityTracker } from './middleware/activityTracker.js';
import { startScheduler } from './jobs/scheduler.js';
import { stockService } from './services/stockService.js';

const app = express();

// Global BigInt JSON serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

// CORS configuration supporting single origin, comma-separated list, or wildcard
const corsOrigin = config.corsOrigin;
const allowedOrigins = corsOrigin === '*'
  ? '*'
  : corsOrigin.includes(',')
  ? corsOrigin.split(',').map((o) => o.trim())
  : corsOrigin;

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: allowedOrigins !== '*',
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Activity Tracking Middleware (UserState.lastActivityAt auto-update)
app.use(activityTracker);


// Request logger
app.use((req, _res, next) => {
  if (config.nodeEnv === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

// Root welcome
app.get('/', (_req, res) => {
  res.json({
    message: 'Smart Market Watchlist API Engine',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Mount API routes
app.use('/api', apiRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`🚀 Smart Market Watchlist Backend running on port ${config.port} [${config.nodeEnv}]`);
    console.log(`📡 Health check available at: /api/health`);
    console.log(`🔌 Provider status available at: /api/providers/status`);

    // Initialize real-time synchronization scheduler
    startScheduler();

    // Verify and seed master stock catalog without resetting data
    stockService.ensureMasterCatalogSeeded().catch((err) => {
      console.error('[Startup] Failed to auto-seed master stock catalog:', err);
    });
  });
}

export default app;

