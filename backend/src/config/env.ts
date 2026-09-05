import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/smart_market_watchlist?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'smart_market_watchlist_jwt_secret_key_2026_super_secure_production_grade',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '180d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  marketProvider: (process.env.MARKET_PROVIDER || 'yahoo').toLowerCase(),
  newsProvider: (process.env.NEWS_PROVIDER || 'rss').toLowerCase(),
  newsApiKey: process.env.NEWS_API_KEY || '',
};

