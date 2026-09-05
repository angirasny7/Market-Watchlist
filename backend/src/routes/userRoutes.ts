import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.js';
import { getUserWatchlistSymbols } from '../utils/userOnboarding.js';

const router = Router();

/**
 * GET /api/user/state
 * Returns real-time user cursor state including last login, last activity,
 * and unread counts for events and digests isolated to the authenticated user's watchlist.
 */
router.get('/state', authenticateJwt, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // 1. Fetch or create UserState
    let userState = await prisma.userState.findUnique({
      where: { userId },
    });

    if (!userState) {
      userState = await prisma.userState.create({
        data: {
          userId,
          lastLoginAt: new Date(),
          lastActivityAt: new Date(),
        },
      });
    }

    // 2. Resolve user's watchlist symbols
    const watchlistSymbols = await getUserWatchlistSymbols(userId);
    const isOnboarded = watchlistSymbols.length > 0;

    let unreadEvents = 0;
    let unreadDigests = 0;
    let archivedEventsCount = 0;
    let savedEventsCount = 0;

    if (isOnboarded) {
      unreadEvents = await prisma.event.count({
        where: {
          stockSymbol: { in: watchlistSymbols },
          userReads: {
            none: { userId },
          },
          userSaves: {
            none: { userId },
          },
        },
      });

      unreadDigests = await prisma.digest.count({
        where: {
          digestEvents: {
            some: {
              event: {
                stockSymbol: { in: watchlistSymbols },
              },
            },
          },
          userReads: {
            none: { userId },
          },
        },
      });
    }

    archivedEventsCount = await prisma.userEventRead.count({ where: { userId } });
    savedEventsCount = await prisma.userSavedEvent.count({ where: { userId } });
    const totalMemoryCount = archivedEventsCount + savedEventsCount;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, lastLoginAt: true, previousLoginAt: true },
    });

    const userLastLogin = dbUser?.lastLoginAt?.toISOString() || userState.lastLoginAt.toISOString();
    const userPreviousLogin =
      dbUser?.previousLoginAt?.toISOString() ||
      userState.previousSessionAt?.toISOString() ||
      null;

    const currentDevice = {
      deviceType: userState.currentDeviceType || 'Desktop',
      deviceName: userState.currentDeviceName || 'Desktop',
    };

    const previousDevice = userState.previousDeviceType
      ? {
          deviceType: userState.previousDeviceType,
          deviceName: userState.previousDeviceName || userState.previousDeviceType,
        }
      : null;

    // 3. Return exact required payload
    res.status(200).json({
      success: true,
      userName: dbUser?.name || 'Investor',
      isOnboarded,
      lastLoginAt: userLastLogin,
      previousLoginAt: userPreviousLogin,
      previousSessionAt: userState.previousSessionAt?.toISOString() || userPreviousLogin,
      lastLogoutAt: userState.lastLogoutAt?.toISOString() || null,
      lastActivityAt: userState.lastActivityAt.toISOString(),
      currentDevice,
      previousDevice,
      unreadEvents,
      unreadDigests,
      archivedEventsCount,
      savedEventsCount,
      totalMemoryCount,
      data: {
        userId,
        userName: dbUser?.name || 'Investor',
        email: dbUser?.email,
        isOnboarded,
        lastLoginAt: userLastLogin,
        previousLoginAt: userPreviousLogin,
        previousSessionAt: userState.previousSessionAt?.toISOString() || userPreviousLogin,
        lastLogoutAt: userState.lastLogoutAt?.toISOString() || null,
        lastActivityAt: userState.lastActivityAt.toISOString(),
        currentDevice,
        previousDevice,
        unreadEvents,
        unreadDigests,
        archivedEventsCount,
        savedEventsCount,
        totalMemoryCount,
        lastDigestViewedId: userState.lastDigestViewedId,
        lastDigestAcknowledgedId: userState.lastDigestAcknowledgedId,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
