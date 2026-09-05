import { prisma } from '../config/prisma.js';

/**
 * Checks whether an authenticated user has completed watchlist onboarding.
 * A user is considered onboarded if and only if they own at least one watchlist
 * containing at least one tracked stock.
 */
export async function isUserOnboarded(userId: string): Promise<boolean> {
  const count = await prisma.watchlistStock.count({
    where: {
      watchlist: { userId },
    },
  });
  return count > 0;
}

/**
 * Resolves distinct uppercase stock symbols tracked across all watchlists
 * owned by the authenticated user.
 */
export async function getUserWatchlistSymbols(userId: string): Promise<string[]> {
  const items = await prisma.watchlistStock.findMany({
    where: {
      watchlist: { userId },
    },
    select: {
      stockSymbol: true,
    },
  });

  const distinct = new Set<string>();
  for (const item of items) {
    if (item.stockSymbol) {
      distinct.add(item.stockSymbol.toUpperCase().trim());
    }
  }

  return Array.from(distinct);
}
