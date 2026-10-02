import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

if (nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smart_market_watchlist?schema=public',
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'smart_market_watchlist_jwt_secret_key_2026_super_secure_production_grade'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '180d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  marketProvider: (process.env.MARKET_PROVIDER || 'yahoo').toLowerCase(),
  newsProvider: (process.env.NEWS_PROVIDER || 'rss').toLowerCase(),
  newsApiKey: process.env.NEWS_API_KEY || '',
  cronSecret: process.env.CRON_SECRET || '',
  enableInternalCron: process.env.ENABLE_INTERNAL_CRON !== 'false',
};


