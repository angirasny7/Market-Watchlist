export type WatchlistQuickFilter =
  | 'ALL'
  | 'NEED_ATTENTION'
  | 'UPCOMING_EVENTS'
  | 'ACTIVE_ALERTS'
  | 'UNSEEN_UPDATES';

export type WatchlistDropdownFilter =
  | 'ALL'
  | 'PINNED'
  | 'GAINERS'
  | 'LOSERS'
  | 'CRITICAL'
  | 'HIGH';

export type WatchlistSortField =
  | 'ATTENTION_SCORE'
  | 'ALPHABETICAL'
  | 'DAY_CHANGE_DESC'
  | 'DAY_CHANGE_ASC'
  | 'PRICE_DESC'
  | 'PRICE_ASC'
  | 'UNSEEN_UPDATES'
  | 'RECENTLY_ADDED';

export interface WatchlistStockItem {
  symbol: string;
  companyName: string;
  sector: string;
  exchange: string;
  currency: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  isPinned: boolean;
  addedAt: string;
  attentionLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  attentionScore: number;
  unseenUpdatesCount: number;
  nextEvent: { type: string; date: string; label: string; isDemo?: boolean } | null;
  activeAlertCount: number;
  sparkline: number[];
  watchlistIds: string[];
}

export interface FilterSortOptions {
  search?: string;
  quickFilter?: WatchlistQuickFilter;
  dropdownFilter?: WatchlistDropdownFilter;
  sortField?: WatchlistSortField;
  pinToTop?: boolean;
}

/**
 * Pure filter function for watchlist stock items.
 */
export function filterWatchlistStocks(
  stocks: WatchlistStockItem[],
  options: {
    search?: string;
    quickFilter?: WatchlistQuickFilter;
    dropdownFilter?: WatchlistDropdownFilter;
  }
): WatchlistStockItem[] {
  const { search, quickFilter = 'ALL', dropdownFilter = 'ALL' } = options;
  const query = (search || '').trim().toLowerCase();

  return stocks.filter((stock) => {
    // 1. Text Search Filter (Symbol, Company Name, Sector)
    if (query) {
      const matchSymbol = stock.symbol.toLowerCase().includes(query);
      const matchName = stock.companyName.toLowerCase().includes(query);
      const matchSector = stock.sector.toLowerCase().includes(query);
      if (!matchSymbol && !matchName && !matchSector) {
        return false;
      }
    }

    // 2. Summary Card Quick Filter
    if (quickFilter === 'NEED_ATTENTION') {
      if (stock.attentionLevel !== 'CRITICAL' && stock.attentionLevel !== 'HIGH') {
        return false;
      }
    } else if (quickFilter === 'UPCOMING_EVENTS') {
      if (!stock.nextEvent) {
        return false;
      }
    } else if (quickFilter === 'ACTIVE_ALERTS') {
      if (stock.activeAlertCount <= 0) {
        return false;
      }
    } else if (quickFilter === 'UNSEEN_UPDATES') {
      if (stock.unseenUpdatesCount <= 0) {
        return false;
      }
    }

    // 3. Toolbar Dropdown Filter
    if (dropdownFilter === 'PINNED') {
      if (!stock.isPinned) return false;
    } else if (dropdownFilter === 'GAINERS') {
      if (stock.changePercent <= 0) return false;
    } else if (dropdownFilter === 'LOSERS') {
      if (stock.changePercent >= 0) return false;
    } else if (dropdownFilter === 'CRITICAL') {
      if (stock.attentionLevel !== 'CRITICAL') return false;
    } else if (dropdownFilter === 'HIGH') {
      if (stock.attentionLevel !== 'HIGH') return false;
    }

    return true;
  });
}

/**
 * Pure sort function for watchlist stock items.
 * Pinned stocks always stay on top by default, preserving the secondary sort within each group.
 */
export function sortWatchlistStocks(
  stocks: WatchlistStockItem[],
  sortField: WatchlistSortField = 'ATTENTION_SCORE',
  pinToTop: boolean = true
): WatchlistStockItem[] {
  return [...stocks].sort((a, b) => {
    // 1. Pin precedence
    if (pinToTop) {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
    }

    // 2. Secondary sort criteria
    switch (sortField) {
      case 'ATTENTION_SCORE':
        if (b.attentionScore !== a.attentionScore) {
          return b.attentionScore - a.attentionScore;
        }
        return b.unseenUpdatesCount - a.unseenUpdatesCount;

      case 'ALPHABETICAL':
        return a.companyName.localeCompare(b.companyName);

      case 'DAY_CHANGE_DESC':
        return b.changePercent - a.changePercent;

      case 'DAY_CHANGE_ASC':
        return a.changePercent - b.changePercent;

      case 'PRICE_DESC':
        return b.currentPrice - a.currentPrice;

      case 'PRICE_ASC':
        return a.currentPrice - b.currentPrice;

      case 'UNSEEN_UPDATES':
        if (b.unseenUpdatesCount !== a.unseenUpdatesCount) {
          return b.unseenUpdatesCount - a.unseenUpdatesCount;
        }
        return b.attentionScore - a.attentionScore;

      case 'RECENTLY_ADDED': {
        const timeA = new Date(a.addedAt).getTime();
        const timeB = new Date(b.addedAt).getTime();
        return timeB - timeA;
      }

      default:
        return 0;
    }
  });
}

/**
 * Combined filter and sort utility.
 */
export function filterAndSortWatchlist(
  stocks: WatchlistStockItem[],
  options: FilterSortOptions
): WatchlistStockItem[] {
  const filtered = filterWatchlistStocks(stocks, options);
  return sortWatchlistStocks(filtered, options.sortField, options.pinToTop ?? true);
}
