import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticateJwt, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/user/state
 * Returns real-time user cursor state including last login, last activity,
 * and unread counts for events and digests isolated to the authenticated user.
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

    // 2. Compute unread counts isolated to this specific user
    const unreadEvents = await prisma.event.count({
      where: {
        userReads: {
          none: { userId },
        },
      },
    });

    const unreadDigests = await prisma.digest.count({
      where: {
        userReads: {
          none: { userId },
        },
      },
    });

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    // 3. Return exact required payload
    res.status(200).json({
      success: true,
      userName: dbUser?.name || 'Investor',
      lastLoginAt: userState.lastLoginAt.toISOString(),
      lastActivityAt: userState.lastActivityAt.toISOString(),
      unreadEvents,
      unreadDigests,
      data: {
        userId,
        userName: dbUser?.name || 'Investor',
        email: dbUser?.email,
        lastLoginAt: userState.lastLoginAt.toISOString(),
        lastActivityAt: userState.lastActivityAt.toISOString(),
        unreadEvents,
        unreadDigests,
        lastDigestViewedId: userState.lastDigestViewedId,
        lastDigestAcknowledgedId: userState.lastDigestAcknowledgedId,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
