import { prisma } from '../config/prisma.js';
import { getExchangeMarketSession, isExchangeTradingDay, getExchangeTimeZone } from '../utils/exchangeCalendar.js';

export interface UserVisitInfo {
  hasBoundary: boolean;
  feedBoundaryAt: Date | null;
  lastVisitEndedAt: Date | null;
  previousSessionStartedAt: Date | null;
  endReason: 'logout' | 'inactivity' | 'tab_closed' | string;
  endReasonExplanation: string;
  timeAwayFormatted: string;
  marketsClosedInWindow: boolean;
  exchangeStatus: string;
  isFirstSession: boolean;
}

export class UserVisitService {
  private get idleTimeoutMs(): number {
    const minutes = parseInt(process.env.SESSION_IDLE_MINUTES || '30', 10);
    return Math.max(5, minutes) * 60 * 1000;
  }

  /**
   * Called on incoming authenticated requests or heartbeat to maintain visit lifecycle.
   * A new visit starts at login or after SESSION_IDLE_MINUTES (default 30) of inactivity.
   */
  public async trackActivity(
    userId: string,
    options?: {
      isLogin?: boolean;
      isHeartbeat?: boolean;
      userInteractedRecently?: boolean;
    }
  ): Promise<{ isNewVisit: boolean }> {
    const now = new Date();
    const userState = await prisma.userState.findUnique({ where: { userId } });

    if (!userState) {
      // First session initialization
      await prisma.userState.create({
        data: {
          userId,
          lastLoginAt: now,
          lastActivityAt: now,
          previousSessionStartedAt: now,
          previousSessionEndedAt: null,
          previousSessionEndReason: null,
          feedBoundaryAt: null,
          lastFeedViewedAt: null,
        },
      });
      return { isNewVisit: true };
    }

    const lastActivity = userState.lastActivityAt ? new Date(userState.lastActivityAt) : new Date(0);
    const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
    const isIdleGap = timeSinceLastActivity >= this.idleTimeoutMs;
    const isNewVisit = Boolean(options?.isLogin || isIdleGap);

    if (isNewVisit) {
      // A visit ended previously. Determine end time and reason
      const prevVisitEnd = userState.lastLogoutAt && userState.lastLogoutAt > lastActivity
        ? userState.lastLogoutAt
        : lastActivity;

      const prevVisitEndReason = userState.previousSessionEndReason || (userState.lastLogoutAt ? 'logout' : 'inactivity');

      // Check if the previous visit included a feed view
      const prevStartedAt = userState.previousSessionStartedAt ? new Date(userState.previousSessionStartedAt) : new Date(0);
      const hadFeedViewInPrevVisit = Boolean(
        userState.lastFeedViewedAt && new Date(userState.lastFeedViewedAt).getTime() >= prevStartedAt.getTime()
      );

      // If previous visit included a feed view, advance feedBoundaryAt to that visit's end.
      // Otherwise, leave feedBoundaryAt UNCHANGED so unseen items are never lost!
      const newBoundary = hadFeedViewInPrevVisit
        ? prevVisitEnd
        : userState.feedBoundaryAt || (userState.previousSessionEndedAt ? new Date(userState.previousSessionEndedAt) : null);

      await prisma.userState.update({
        where: { userId },
        data: {
          lastLoginAt: options?.isLogin ? now : userState.lastLoginAt,
          lastActivityAt: now,
          previousSessionStartedAt: now,
          previousSessionEndedAt: prevVisitEnd,
          previousSessionAt: prevVisitEnd,
          previousSessionEndReason: prevVisitEndReason,
          feedBoundaryAt: newBoundary,
        },
      });

      return { isNewVisit: true };
    }

    // Within active session: update lastActivityAt
    if (options?.isHeartbeat) {
      if (options.userInteractedRecently !== false) {
        await prisma.userState.update({
          where: { userId },
          data: { lastActivityAt: now },
        });
      }
    } else {
      await prisma.userState.update({
        where: { userId },
        data: { lastActivityAt: now },
      });
    }

    return { isNewVisit: false };
  }

  /**
   * POST /api/feed/viewed: User viewed the Attention Feed page for at least 3 seconds.
   */
  public async recordFeedViewed(userId: string): Promise<{ viewedAt: string }> {
    const now = new Date();
    await prisma.userState.upsert({
      where: { userId },
      create: {
        userId,
        lastFeedViewedAt: now,
        lastActivityAt: now,
        previousSessionStartedAt: now,
      },
      update: {
        lastFeedViewedAt: now,
        lastActivityAt: now,
      },
    });
    return { viewedAt: now.toISOString() };
  }

  /**
   * POST /api/auth/logout: Seals current session boundary with 'logout' reason
   */
  public async recordLogout(userId: string): Promise<void> {
    const now = new Date();
    await prisma.userState.updateMany({
      where: { userId },
      data: {
        lastLogoutAt: now,
        previousSessionEndedAt: now,
        previousSessionAt: now,
        previousSessionEndReason: 'logout',
        lastActivityAt: now,
      },
    });
  }

  /**
   * Resolves the user's visit boundary metadata and market closure rules (B1 - B4).
   */
  public async resolveVisitBoundary(userId: string, monitoredExchanges: string[] = ['NSE']): Promise<UserVisitInfo> {
    const userState = await prisma.userState.findUnique({ where: { userId } });
    const now = new Date();

    const isFirstSession = !userState || (!userState.feedBoundaryAt && !userState.previousSessionEndedAt && !userState.lastLogoutAt);

    if (isFirstSession || !userState) {
      return {
        hasBoundary: false,
        feedBoundaryAt: null,
        lastVisitEndedAt: null,
        previousSessionStartedAt: userState?.previousSessionStartedAt ? new Date(userState.previousSessionStartedAt) : now,
        endReason: 'first_session',
        endReasonExplanation: 'First session. Showing latest market updates.',
        timeAwayFormatted: 'Welcome',
        marketsClosedInWindow: false,
        exchangeStatus: 'NSE is open now',
        isFirstSession: true,
      };
    }

    const boundaryDate = userState.feedBoundaryAt
      ? new Date(userState.feedBoundaryAt)
      : userState.previousSessionEndedAt
      ? new Date(userState.previousSessionEndedAt)
      : userState.lastLogoutAt
      ? new Date(userState.lastLogoutAt)
      : null;

    const endReason = (userState.previousSessionEndReason as any) || 'inactivity';
    let endReasonExplanation = 'A new visit starts after 30 minutes away. Visits where you did not open the feed don’t count.';
    if (endReason === 'logout') {
      endReasonExplanation = 'Previous visit ended when you logged out.';
    } else if (endReason === 'tab_closed' || endReason === 'computer asleep') {
      endReasonExplanation = 'Previous visit ended when the tab was closed or your device went to sleep.';
    }

    // Format time away
    let timeAwayFormatted = 'just now';
    if (boundaryDate) {
      const msAway = now.getTime() - boundaryDate.getTime();
      const minsAway = Math.floor(msAway / 60000);
      const hoursAway = Math.floor(minsAway / 60);
      const daysAway = Math.floor(hoursAway / 24);

      if (daysAway >= 1) {
        timeAwayFormatted = `${daysAway}d ago`;
      } else if (hoursAway >= 1) {
        timeAwayFormatted = `${hoursAway}h ago`;
      } else if (minsAway >= 1) {
        timeAwayFormatted = `${minsAway}m ago`;
      }
    }

    // Check exchange market open/close in window (B4)
    let anyExchangeOpenNow = false;
    let anySessionOccurredInWindow = false;

    for (const ex of monitoredExchanges) {
      const session = getExchangeMarketSession(ex, now);
      if (session.isOpen) {
        anyExchangeOpenNow = true;
      }
      if (boundaryDate) {
        // If boundary is after session close of that exchange, check if any trading day occurred in between
        if (session.occurredAt.getTime() >= boundaryDate.getTime()) {
          anySessionOccurredInWindow = true;
        }
      }
    }

    const marketsClosedInWindow = Boolean(boundaryDate && !anySessionOccurredInWindow && !anyExchangeOpenNow);
    const exchangeStatus = anyExchangeOpenNow ? 'NSE is open now' : 'Markets closed';

    return {
      hasBoundary: Boolean(boundaryDate),
      feedBoundaryAt: boundaryDate,
      lastVisitEndedAt: userState.previousSessionEndedAt ? new Date(userState.previousSessionEndedAt) : boundaryDate,
      previousSessionStartedAt: userState.previousSessionStartedAt ? new Date(userState.previousSessionStartedAt) : now,
      endReason,
      endReasonExplanation,
      timeAwayFormatted,
      marketsClosedInWindow,
      exchangeStatus,
      isFirstSession: false,
    };
  }
}

export const userVisitService = new UserVisitService();
