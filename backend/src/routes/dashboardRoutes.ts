import { Router, Response, NextFunction } from 'express';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.js';
import { sinceLastVisitService } from '../services/sinceLastVisitService.js';
import { serializeBigInt } from '../utils/json.js';
import { prisma } from '../config/prisma.js';
import { MarketMood } from '@prisma/client';

const router = Router();

/**
 * GET /api/dashboard
 * 
 * Answers the core product questions for the authenticated user:
 * 1. What changed since I last visited?
 * 2. Why did it change?
 * 3. Why should I care?
 * 
 * Strictly requires valid JWT. Returns 401 Unauthorized for anonymous requests.
 */
router.get('/', authenticateJwt, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // 1. Generate Since-Last-Visit Intelligence for authenticated user
    const summary = await sinceLastVisitService.getIntelligenceSinceLastVisit(userId);
    const isOnboarded = summary.watchlistSymbols.length > 0;

    // 2. Compute Market Mood
    let marketMood: MarketMood = summary.latestDigest?.marketMood || MarketMood.NEUTRAL;
    if (!summary.latestDigest) {
      const stocks = await prisma.stock.findMany({ select: { changePercent: true } });
      const avgChange = stocks.reduce((sum, s) => sum + Number(s.changePercent), 0) / Math.max(1, stocks.length);
      marketMood = avgChange >= 0.5 ? MarketMood.BULLISH : avgChange <= -0.5 ? MarketMood.BEARISH : MarketMood.NEUTRAL;
    }

    // 3. Construct Attention Summary (Strictly watchlist scoped)
    let attentionSummary: string;
    if (!isOnboarded) {
      attentionSummary = 'No watchlist found. Create your first watchlist to start receiving personalized market intelligence.';
    } else {
      const wlCritical = summary.watchlistCriticalCount;
      const trackedList = summary.watchlistSymbols.join(', ');
      attentionSummary = wlCritical > 0
        ? `${wlCritical} high-priority developments detected in your tracked watchlist (${trackedList}) while you were away (${summary.awayDuration}).`
        : `Market conditions remained balanced across your tracked stocks (${trackedList}) over the past ${summary.awayDuration}.`;
    }

    // 4. Resolve authenticated user and userState from database for dynamic greeting & session timestamps
    const [dbUser, userState] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, lastLoginAt: true, previousLoginAt: true },
      }),
      prisma.userState.findUnique({
        where: { userId },
      }),
    ]);

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const userName = dbUser?.name || 'Investor';
    const greeting = `${timeOfDay}, ${userName}`;

    const effectivePreviousLogin =
      dbUser?.previousLoginAt?.toISOString() ||
      userState?.previousSessionAt?.toISOString() ||
      null;

    const responsePayload = {
      isOnboarded,
      awayDuration: summary.awayDuration,
      attentionSummary,
      greeting,
      userName,
      lastLoginAt: dbUser?.lastLoginAt ? dbUser.lastLoginAt.toISOString() : null,
      previousLoginAt: effectivePreviousLogin,
      previousSessionAt: userState?.previousSessionAt ? userState.previousSessionAt.toISOString() : effectivePreviousLogin,
      lastLogoutAt: userState?.lastLogoutAt ? userState.lastLogoutAt.toISOString() : null,
      currentDevice: {
        deviceType: userState?.currentDeviceType || 'Desktop',
        deviceName: userState?.currentDeviceName || 'Desktop',
      },
      previousDevice: userState?.previousDeviceType
        ? {
            deviceType: userState.previousDeviceType,
            deviceName: userState.previousDeviceName || userState.previousDeviceType,
          }
        : null,
      eventsAwayCount: summary.watchlistEventsCount > 0 ? summary.watchlistEventsCount : summary.newEventsCount,
      insightsAwayCount: summary.newInsights.length,
      user: {
        id: dbUser?.id,
        name: dbUser?.name,
        email: dbUser?.email,
        lastLoginAt: dbUser?.lastLoginAt ? dbUser.lastLoginAt.toISOString() : null,
        previousLoginAt: effectivePreviousLogin,
      },
      criticalEvents: summary.criticalEvents,
      topInsights: summary.newInsights,
      latestDigest: summary.latestDigest,
      marketMood,
      watchlistSummary: {
        symbols: summary.watchlistSymbols,
        eventsCount: summary.watchlistEventsCount,
        criticalCount: summary.watchlistCriticalCount,
      },
    };

    res.status(200).json({
      success: true,
      ...serializeBigInt(responsePayload),
      data: serializeBigInt(responsePayload),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
