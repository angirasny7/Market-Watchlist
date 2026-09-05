import { MarketMood } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getUserWatchlistSymbols } from '../utils/userOnboarding.js';

export class DigestService {
  async getDigests(options?: { mood?: MarketMood; search?: string; userId?: string }) {
    const where: any = {};

    let userWatchlistSymbols: string[] = [];
    if (options?.userId) {
      userWatchlistSymbols = await getUserWatchlistSymbols(options.userId);
      if (userWatchlistSymbols.length === 0) {
        return []; // User has an empty watchlist, so no personalized digests exist
      }
      where.digestEvents = {
        some: {
          event: {
            stockSymbol: { in: userWatchlistSymbols },
          },
        },
      };
    }

    if (options?.mood) {
      where.marketMood = options.mood;
    }
    if (options?.search) {
      where.OR = [
        { headline: { contains: options.search, mode: 'insensitive' } },
        { executiveSummary: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    let readDigestIds = new Set<string>();
    if (options?.userId) {
      const reads = await prisma.userDigestRead.findMany({
        where: { userId: options.userId },
        select: { digestId: true },
      });
      readDigestIds = new Set(reads.map((r) => r.digestId));
    }

    const digests = await prisma.digest.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        digestEvents: {
          include: {
            event: {
              include: { stock: true, insights: true },
            },
          },
        },
        digestInsights: {
          include: {
            insight: {
              include: { event: true },
            },
          },
        },
      },
    });

    return digests.map((d) => ({
      ...d,
      read: options?.userId ? readDigestIds.has(d.id) : Boolean(d.read),
      events: d.digestEvents.map((de) => ({
        ...de.event,
        stock: {
          ...de.event.stock,
          currentPrice: Number(de.event.stock.currentPrice),
          changeAmount: Number(de.event.stock.changeAmount),
          changePercent: Number(de.event.stock.changePercent),
          volume: Number(de.event.stock.volume),
          avgVolume20D: Number(de.event.stock.avgVolume20D),
          peRatio: de.event.stock.peRatio ? Number(de.event.stock.peRatio) : null,
          high52w: Number(de.event.stock.high52w),
          low52w: Number(de.event.stock.low52w),
        },
      })),
      insights: d.digestInsights.map((di) => ({
        ...di.insight,
        confidenceScore: Number(di.insight.confidenceScore),
      })),
    }));
  }

  async getDigestById(id: string, userId?: string) {
    const d = await prisma.digest.findUnique({
      where: { id },
      include: {
        digestEvents: {
          include: {
            event: {
              include: { stock: true, insights: true },
            },
          },
        },
        digestInsights: {
          include: {
            insight: {
              include: { event: true },
            },
          },
        },
      },
    });

    if (!d) return null;

    let isRead = Boolean(d.read);
    if (userId) {
      const userRead = await prisma.userDigestRead.findUnique({
        where: { userId_digestId: { userId, digestId: id } },
      });
      isRead = Boolean(userRead);
    }

    return {
      ...d,
      read: isRead,
      events: d.digestEvents.map((de) => ({
        ...de.event,
        stock: {
          ...de.event.stock,
          currentPrice: Number(de.event.stock.currentPrice),
          changeAmount: Number(de.event.stock.changeAmount),
          changePercent: Number(de.event.stock.changePercent),
          volume: Number(de.event.stock.volume),
          avgVolume20D: Number(de.event.stock.avgVolume20D),
          peRatio: de.event.stock.peRatio ? Number(de.event.stock.peRatio) : null,
          high52w: Number(de.event.stock.high52w),
          low52w: Number(de.event.stock.low52w),
        },
      })),
      insights: d.digestInsights.map((di) => ({
        ...di.insight,
        confidenceScore: Number(di.insight.confidenceScore),
      })),
    };
  }

  async markDigestRead(id: string, userId?: string) {
    if (userId) {
      await prisma.userDigestRead.upsert({
        where: {
          userId_digestId: { userId, digestId: id },
        },
        create: {
          userId,
          digestId: id,
        },
        update: {
          readAt: new Date(),
        },
      });

      await prisma.userState.updateMany({
        where: { userId },
        data: {
          lastDigestViewedId: id,
          lastActivityAt: new Date(),
        },
      });
    }

    return prisma.digest.update({
      where: { id },
      data: { read: true },
    });
  }

  async viewDigest(id: string, userId: string) {
    await prisma.userDigestRead.upsert({
      where: {
        userId_digestId: { userId, digestId: id },
      },
      create: {
        userId,
        digestId: id,
      },
      update: {
        readAt: new Date(),
      },
    });

    return prisma.userState.updateMany({
      where: { userId },
      data: {
        lastDigestViewedId: id,
        lastActivityAt: new Date(),
      },
    });
  }
}

export const digestService = new DigestService();
