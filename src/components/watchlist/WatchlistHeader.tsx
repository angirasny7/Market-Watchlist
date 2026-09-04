import React from 'react';
import {
  ListOrdered,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Search,
  X,
  Flame,
  BellRing,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export type WatchlistSortOption =
  | 'ATTENTION_SCORE'
  | 'MOST_ACTIVE'
  | 'BIGGEST_GAINERS'
  | 'BIGGEST_LOSERS'
  | 'RECENT_EVENT'
  | 'ALPHABETICAL';

interface WatchlistHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortOption: WatchlistSortOption;
  onSortChange: (sort: WatchlistSortOption) => void;
  onOpenAddModal: () => void;
}

export const WatchlistHeader: React.FC<WatchlistHeaderProps> = ({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  onOpenAddModal,
}) => {
  const {
    watchlist,
    watchlistViewMode,
    setWatchlistViewMode,
    getEventsByStock,
    events,
  } = useMarketStore();

  // Metrics calculations
  const totalStocks = watchlist.length;

  const stocksWithEventsCount = watchlist.filter(
    (s) => getEventsByStock(s.symbol).length > 0
  ).length;

  const criticalSignalsCount = watchlist.filter((s) =>
    getEventsByStock(s.symbol).some((e) => e.priority === 'CRITICAL')
  ).length;

  const unreadInsightsCount = events.filter(
    (e) => !e.read && watchlist.some((s) => s.symbol === e.stockSymbol)
  ).length;

  const sortOptions: { label: string; value: WatchlistSortOption }[] = [
    { label: 'Attention Score', value: 'ATTENTION_SCORE' },
    { label: 'Most Active Signals', value: 'MOST_ACTIVE' },
    { label: 'Biggest Gainers', value: 'BIGGEST_GAINERS' },
    { label: 'Biggest Losers', value: 'BIGGEST_LOSERS' },
    { label: 'Most Recent Event', value: 'RECENT_EVENT' },
    { label: 'Alphabetical (A–Z)', value: 'ALPHABETICAL' },
  ];

  return (
    <div className="space-y-4 pb-4 border-b border-border">
      {/* Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ListOrdered className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              My Watchlist
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Intelligent Layer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track equities with real-time anomaly detection, causal insights, and 52-week position meters.
          </p>
        </div>

        {/* Add Stock Button */}
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stock</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400">Total Monitored</div>
          <div className="font-mono text-base font-bold text-slate-100">
            {totalStocks} Equities
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active Signals</span>
          </div>
          <div className="font-mono text-base font-bold text-indigo-300">
            {stocksWithEventsCount} Stocks
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Critical Alerts</span>
          </div>
          <div className="font-mono text-base font-bold text-rose-300">
            {criticalSignalsCount} Urgent
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unread Insights</span>
          </div>
          <div className="font-mono text-base font-bold text-emerald-400">
            {unreadInsightsCount} New
          </div>
        </div>
      </div>

      {/* Controls Bar: Search, Sort Dropdown & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search watchlist by ticker (e.g. INFY) or name..."
            className="w-full pl-9 pr-9 py-2 bg-surface rounded-lg border border-border text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/80 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Sort & Grid/Table Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as WatchlistSortOption)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-slate-100">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grid vs Table View Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
            <button
              onClick={() => setWatchlistViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${
                watchlistViewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWatchlistViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                watchlistViewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
