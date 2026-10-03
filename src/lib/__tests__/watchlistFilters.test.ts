import { describe, it, expect } from 'vitest';
import {
  filterWatchlistStocks,
  sortWatchlistStocks,
  filterAndSortWatchlist,
  WatchlistStockItem,
} from '../watchlistFilters';

const sampleStocks: WatchlistStockItem[] = [
  {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services',
    sector: 'Technology',
    exchange: 'NSE',
    currency: '₹',
    currentPrice: 3800,
    changeAmount: 114,
    changePercent: 3.1,
    isPinned: true,
    addedAt: '2026-01-01T10:00:00Z',
    attentionLevel: 'CRITICAL',
    attentionScore: 88,
    unseenUpdatesCount: 4,
    nextEvent: null,
    activeAlertCount: 1,
    sparkline: [3700, 3750, 3800],
    watchlistIds: ['wl-1'],
  },
  {
    symbol: 'INFY',
    companyName: 'Infosys Limited',
    sector: 'Technology',
    exchange: 'NSE',
    currency: '₹',
    currentPrice: 1650,
    changeAmount: -41.25,
    changePercent: -2.5,
    isPinned: false,
    addedAt: '2026-01-05T10:00:00Z',
    attentionLevel: 'HIGH',
    attentionScore: 62,
    unseenUpdatesCount: 2,
    nextEvent: { type: 'EARNINGS', date: '2026-10-15', label: 'Q2 Results' },
    activeAlertCount: 0,
    sparkline: [1700, 1680, 1650],
    watchlistIds: ['wl-1', 'wl-2'],
  },
  {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries',
    sector: 'Energy',
    exchange: 'NSE',
    currency: '₹',
    currentPrice: 2950,
    changeAmount: 14.75,
    changePercent: 0.5,
    isPinned: false,
    addedAt: '2026-02-01T10:00:00Z',
    attentionLevel: 'LOW',
    attentionScore: 15,
    unseenUpdatesCount: 0,
    nextEvent: null,
    activeAlertCount: 2,
    sparkline: [2930, 2940, 2950],
    watchlistIds: ['wl-2'],
  },
];

describe('watchlistFilters', () => {
  it('filters by search query matching symbol, company name, or sector', () => {
    expect(filterWatchlistStocks(sampleStocks, { search: 'tcs' })).toHaveLength(1);
    expect(filterWatchlistStocks(sampleStocks, { search: 'infosys' })).toHaveLength(1);
    expect(filterWatchlistStocks(sampleStocks, { search: 'tech' })).toHaveLength(2);
    expect(filterWatchlistStocks(sampleStocks, { search: 'nonexistent' })).toHaveLength(0);
  });

  it('filters by summary card quick filter', () => {
    const needAttention = filterWatchlistStocks(sampleStocks, { quickFilter: 'NEED_ATTENTION' });
    expect(needAttention.map((s) => s.symbol)).toEqual(['TCS', 'INFY']);

    const upcomingEvents = filterWatchlistStocks(sampleStocks, { quickFilter: 'UPCOMING_EVENTS' });
    expect(upcomingEvents.map((s) => s.symbol)).toEqual(['INFY']);

    const activeAlerts = filterWatchlistStocks(sampleStocks, { quickFilter: 'ACTIVE_ALERTS' });
    expect(activeAlerts.map((s) => s.symbol)).toEqual(['TCS', 'RELIANCE']);

    const unseen = filterWatchlistStocks(sampleStocks, { quickFilter: 'UNSEEN_UPDATES' });
    expect(unseen.map((s) => s.symbol)).toEqual(['TCS', 'INFY']);
  });

  it('filters by dropdown filter', () => {
    const pinned = filterWatchlistStocks(sampleStocks, { dropdownFilter: 'PINNED' });
    expect(pinned.map((s) => s.symbol)).toEqual(['TCS']);

    const gainers = filterWatchlistStocks(sampleStocks, { dropdownFilter: 'GAINERS' });
    expect(gainers.map((s) => s.symbol)).toEqual(['TCS', 'RELIANCE']);

    const losers = filterWatchlistStocks(sampleStocks, { dropdownFilter: 'LOSERS' });
    expect(losers.map((s) => s.symbol)).toEqual(['INFY']);

    const critical = filterWatchlistStocks(sampleStocks, { dropdownFilter: 'CRITICAL' });
    expect(critical.map((s) => s.symbol)).toEqual(['TCS']);
  });

  it('sorts keeping pinned stocks on top by default', () => {
    const sorted = sortWatchlistStocks(sampleStocks, 'PRICE_ASC', true);
    // TCS is pinned, so it stays on top despite having higher price than INFY
    expect(sorted[0].symbol).toBe('TCS');
    expect(sorted[1].symbol).toBe('INFY');
    expect(sorted[2].symbol).toBe('RELIANCE');
  });

  it('sorts by attention score descending', () => {
    const sorted = sortWatchlistStocks(sampleStocks, 'ATTENTION_SCORE', false);
    expect(sorted.map((s) => s.symbol)).toEqual(['TCS', 'INFY', 'RELIANCE']);
  });

  it('sorts by day change percentage', () => {
    const sortedDesc = sortWatchlistStocks(sampleStocks, 'DAY_CHANGE_DESC', false);
    expect(sortedDesc.map((s) => s.symbol)).toEqual(['TCS', 'RELIANCE', 'INFY']);

    const sortedAsc = sortWatchlistStocks(sampleStocks, 'DAY_CHANGE_ASC', false);
    expect(sortedAsc.map((s) => s.symbol)).toEqual(['INFY', 'RELIANCE', 'TCS']);
  });

  it('combines filtering and sorting via filterAndSortWatchlist', () => {
    const result = filterAndSortWatchlist(sampleStocks, {
      dropdownFilter: 'GAINERS',
      sortField: 'PRICE_ASC',
      pinToTop: false,
    });
    expect(result.map((s) => s.symbol)).toEqual(['RELIANCE', 'TCS']);
  });

  it('preserves stocks with null prices when filtering by search and all categories', () => {
    const stockWithNoPrice: WatchlistStockItem = {
      symbol: 'UNLISTED',
      companyName: 'Unlisted Entity',
      sector: 'General',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: null,
      changeAmount: null,
      changePercent: null,
      isPinned: false,
      addedAt: '2026-03-01T00:00:00Z',
      attentionLevel: 'LOW',
      attentionScore: 0,
      unseenUpdatesCount: 0,
      nextEvent: null,
      activeAlertCount: 0,
      sparkline: [],
      watchlistIds: ['wl-1'],
    };

    const combined = [...sampleStocks, stockWithNoPrice];
    const filtered = filterAndSortWatchlist(combined, { search: 'unlisted' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].symbol).toBe('UNLISTED');
    expect(filtered[0].currentPrice).toBeNull();
    expect(filtered[0].changePercent).toBeNull();

    // Still appears in Total Stocks list
    const allFiltered = filterAndSortWatchlist(combined, { quickFilter: 'ALL' });
    expect(allFiltered).toHaveLength(4);
    expect(allFiltered.map((s) => s.symbol)).toContain('UNLISTED');
  });

  it('excludes stocks with null changePercent from GAINERS and LOSERS filters', () => {
    const stockWithNoPrice: WatchlistStockItem = {
      symbol: 'UNLISTED',
      companyName: 'Unlisted Entity',
      sector: 'General',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: null,
      changeAmount: null,
      changePercent: null,
      isPinned: false,
      addedAt: '2026-03-01T00:00:00Z',
      attentionLevel: 'LOW',
      attentionScore: 0,
      unseenUpdatesCount: 0,
      nextEvent: null,
      activeAlertCount: 0,
      sparkline: [],
      watchlistIds: ['wl-1'],
    };

    const combined = [...sampleStocks, stockWithNoPrice];
    const gainers = filterWatchlistStocks(combined, { dropdownFilter: 'GAINERS' });
    expect(gainers.map((s) => s.symbol)).not.toContain('UNLISTED');
    expect(gainers.map((s) => s.symbol)).toEqual(['TCS', 'RELIANCE']);

    const losers = filterWatchlistStocks(combined, { dropdownFilter: 'LOSERS' });
    expect(losers.map((s) => s.symbol)).not.toContain('UNLISTED');
    expect(losers.map((s) => s.symbol)).toEqual(['INFY']);
  });

  it('sorts numeric fields with null values placed last', () => {
    const stockWithNoPrice: WatchlistStockItem = {
      symbol: 'UNLISTED',
      companyName: 'Unlisted Entity',
      sector: 'General',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: null,
      changeAmount: null,
      changePercent: null,
      isPinned: false,
      addedAt: '2026-03-01T00:00:00Z',
      attentionLevel: 'LOW',
      attentionScore: 0,
      unseenUpdatesCount: 0,
      nextEvent: null,
      activeAlertCount: 0,
      sparkline: [],
      watchlistIds: ['wl-1'],
    };

    const combined = [...sampleStocks, stockWithNoPrice];
    const sortedPriceAsc = sortWatchlistStocks(combined, 'PRICE_ASC', false);
    expect(sortedPriceAsc[sortedPriceAsc.length - 1].symbol).toBe('UNLISTED');

    const sortedPriceDesc = sortWatchlistStocks(combined, 'PRICE_DESC', false);
    expect(sortedPriceDesc[sortedPriceDesc.length - 1].symbol).toBe('UNLISTED');

    const sortedChangeDesc = sortWatchlistStocks(combined, 'DAY_CHANGE_DESC', false);
    expect(sortedChangeDesc[sortedChangeDesc.length - 1].symbol).toBe('UNLISTED');
  });

  it('supports tracking multi-watchlist membership across watchlistIds', () => {
    const multiWatchlistStock = sampleStocks.find((s) => s.symbol === 'INFY');
    expect(multiWatchlistStock?.watchlistIds).toContain('wl-1');
    expect(multiWatchlistStock?.watchlistIds).toContain('wl-2');
  });
});
