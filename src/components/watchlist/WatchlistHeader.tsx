import React from 'react';
import {
  Plus,
  LayoutGrid,
  Table as TableIcon,
  ArrowUpDown,
  Search,
  X,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export type WatchlistSortOption =
  | 'ATTENTION_SCORE'
  | 'MOST_ACTIVE'
  | 'BIGGEST_GAINERS'
  | 'BIGGEST_LOSERS'
  | 'RECENT_EVENT'
  | 'ALPHABETICAL';

export interface WatchlistHeaderProps {
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
  } = useMarketStore();

  const sortOptions: { label: string; value: WatchlistSortOption }[] = [
    { label: 'Attention Score', value: 'ATTENTION_SCORE' },
    { label: 'Top Gainers', value: 'BIGGEST_GAINERS' },
    { label: 'Top Losers', value: 'BIGGEST_LOSERS' },
    { label: 'Most Active', value: 'MOST_ACTIVE' },
    { label: 'Most Recent Event', value: 'RECENT_EVENT' },
    { label: 'Alphabetical (A–Z)', value: 'ALPHABETICAL' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header Title & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Watchlist
            </h2>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-surface-subtle text-slate-300 border border-border">
              {watchlist.length} {watchlist.length === 1 ? 'stock' : 'stocks'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time tracking of your monitored stocks and key changes.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Stock</span>
        </button>
      </div>

      {/* 2. Search & Sort Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-surface border border-border">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by symbol (e.g. INFY) or company name..."
            className="w-full pl-9 pr-8 py-1.5 bg-surface-subtle border border-border/60 rounded-lg text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & View Mode Controls */}
        <div className="flex items-center gap-2 justify-end">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 bg-surface-subtle border border-border/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as WatchlistSortOption)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
              aria-label="Sort watchlist"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-slate-100">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border/60">
            <button
              onClick={() => setWatchlistViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                watchlistViewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table view"
              aria-label="Table view"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setWatchlistViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                watchlistViewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchlistHeader;
