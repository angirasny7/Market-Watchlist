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

// Middleware
const corsOriginEnv = process.env.CORS_ORIGIN || config.corsOrigin;
const allowedOrigins = corsOriginEnv
  ? corsOriginEnv.split(',').map((origin) => origin.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

// Health check endpoints (supports both /health and /api/health directly)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'smart-market-watchlist-backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Root & API welcome endpoints (supports both / and /api)
const welcomeHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    message: 'Smart Market Watchlist API Engine',
    version: '1.0.0',
    documentation: '/api/health',
  });
};
app.get('/', welcomeHandler);
app.get('/api', welcomeHandler);

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
  const PORT = config.port;
  app.listen(PORT, () => {
    console.log(`🚀 Smart Market Watchlist Backend running on port ${PORT}`);
    console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
    console.log(`🔌 Provider status available at: http://localhost:${PORT}/api/providers/status`);

    // Initialize real-time synchronization scheduler
    startScheduler();

    // Verify and seed master stock catalog without resetting data
    stockService.ensureMasterCatalogSeeded().catch((err) => {
      console.error('[Startup] Failed to auto-seed master stock catalog:', err);
    });
  });
}

export default app;

