import { prisma } from '../config/prisma.js';

/**
 * Checks whether an authenticated user has completed watchlist onboarding.
 * A user is considered onboarded if they have:
 * - at least one watchlist stock, OR
 * - more than one watchlist (even if all are empty), OR
 * - a non-default watchlist (user explicitly created one)
 *
 * This prevents the /onboarding redirect when a user creates a new empty watchlist.
 */
export async function isUserOnboarded(userId: string): Promise<boolean> {
  // Fast path: user has stocks in any watchlist
  const stockCount = await prisma.watchlistStock.count({
    where: {
      watchlist: { userId },
    },
  });
  if (stockCount > 0) return true;

  // Check if user has created additional watchlists beyond the default
  const watchlists = await prisma.watchlist.findMany({
    where: { userId },
    select: { isDefault: true },
  });

  // More than one watchlist means user actively engaged
  if (watchlists.length > 1) return true;

  // Single non-default watchlist means user renamed/customised it
  if (watchlists.length === 1 && !watchlists[0].isDefault) return true;

  return false;
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
