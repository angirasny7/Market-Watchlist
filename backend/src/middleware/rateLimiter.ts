import { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipInTests?: boolean;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => {
      const user = (req as any).user;
      return user?.userId || req.ip || 'anonymous';
    },
    skipInTests = false,
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (record.resetTime <= now) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 60000)).unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (skipInTests && process.env.NODE_ENV === 'test') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || record.resetTime <= now) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      res.status(429).json({
        success: false,
        error: message,
      });
      return;
    }

    next();
  };
}
