import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest, AuthenticatedUserPayload } from './authMiddleware.js';

// In-memory cache for throttling activity writes: userId -> timestamp (ms)
const lastActivityRecorded = new Map<string, number>();

// Minimum 60 seconds between DB writes per user
const MIN_UPDATE_INTERVAL_MS = 60 * 1000;

/**
 * Activity Tracker Middleware
 * 
 * Automatically updates UserState.lastActivityAt whenever an authenticated user
 * accesses application resources (Dashboard, Attention Feed, Watchlist, Market Memory, Highlights).
 * - Bypasses health checks, static assets, and preflight requests.
 * - Throttles database writes to once per 60 seconds per user.
 */
export async function activityTracker(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Ignore preflight, static assets, and health/status endpoints
  const path = req.path.toLowerCase();
  if (
    req.method === 'OPTIONS' ||
    path === '/health' ||
    path === '/api/health' ||
    path.startsWith('/providers/status') ||
    path.startsWith('/api/providers/status') ||
    path.endsWith('.ico') ||
    path.endsWith('.png') ||
    path.endsWith('.js') ||
    path.endsWith('.css')
  ) {
    return next();
  }

  // 2. Resolve user ID from request or Authorization header
  let userId = req.user?.userId;

  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUserPayload;
        userId = decoded.userId;
        req.user = decoded; // Populate for downstream handlers
      } catch {
        // Invalid or expired token - proceed without tracking
      }
    }
  }

  // 3. If unauthenticated, continue without tracking
  if (!userId) {
    return next();
  }

  // 4. Check throttle interval (60s)
  const now = Date.now();
  const lastRecorded = lastActivityRecorded.get(userId) || 0;

  if (now - lastRecorded >= MIN_UPDATE_INTERVAL_MS) {
    lastActivityRecorded.set(userId, now);

    // Asynchronous non-blocking update to UserState
    prisma.userState
      .upsert({
        where: { userId },
        create: {
          userId,
          lastActivityAt: new Date(now),
        },
        update: {
          lastActivityAt: new Date(now),
        },
      })
      .catch((err) => {
        console.warn(`[ActivityTracker] Failed to update lastActivityAt for ${userId}: ${err.message}`);
      });
  }

  next();
}

/**
 * Utility to clear or inspect throttle cache (useful for testing)
 */
export function resetActivityThrottle(userId?: string): void {
  if (userId) {
    lastActivityRecorded.delete(userId);
  } else {
    lastActivityRecorded.clear();
  }
}
