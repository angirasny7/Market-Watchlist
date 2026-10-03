import React from 'react';
import {
  Bookmark,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserWatchlist } from '../../services/watchlistService';
import { SearchInput } from '../common/SearchInput';

interface FeedControlsBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  watchlists: UserWatchlist[];
  selectedWatchlistId: string;
  onSelectWatchlist: (id: string) => void;
  selectedPriority: string;
  onSelectPriority: (p: string) => void;
  selectedType: string;
  onSelectType: (t: string) => void;
  unreadOnly: boolean;
  onToggleUnreadOnly: () => void;
  savedOnly: boolean;
  onToggleSavedOnly: () => void;
  onResetFilters: () => void;
  isFiltered: boolean;
  totalFilteredCount: number;
  totalUnfilteredCount?: number;
}

export const FeedControlsBar: React.FC<FeedControlsBarProps> = ({
  searchQuery,
  onSearchChange,
  searchInputRef,
  watchlists,
  selectedWatchlistId,
  onSelectWatchlist,
  selectedPriority,
  onSelectPriority,
  selectedType,
  onSelectType,
  unreadOnly,
  onToggleUnreadOnly,
  savedOnly,
  onToggleSavedOnly,
  onResetFilters,
  isFiltered,
  totalFilteredCount,
  totalUnfilteredCount,
}) => {
  const priorities = [
    { id: 'ALL', label: 'All Priorities' },
    { id: 'Urgent', label: 'Urgent' },
    { id: 'Important', label: 'Important' },
    { id: 'Worth a look', label: 'Worth a look' },
    { id: 'FYI', label: 'FYI' },
  ];

  const types = [
    { id: 'ALL', label: 'All Signals' },
    { id: 'PRICE_SURGE', label: 'Price Surge' },
    { id: 'PRICE_DROP', label: 'Price Drop' },
    { id: 'VOLUME_SPIKE', label: 'Volume Spike' },
    { id: 'FIFTY_TWO_WEEK_HIGH', label: '52W High' },
    { id: 'FIFTY_TWO_WEEK_LOW', label: '52W Low' },
    { id: 'EARNINGS_BEAT', label: 'Earnings Beat' },
    { id: 'DIVIDEND_ANNOUNCED', label: 'Dividend' },
    { id: 'ANALYST_UPGRADE', label: 'Upgrade' },
    { id: 'MANAGEMENT_CHANGE', label: 'Management' },
  ];

  return (
    <div className="space-y-3">
      {/* Search and Primary Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        {/* Reusable Search Input */}
        <SearchInput
          ref={searchInputRef as any}
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search stock or keyword"
          mobilePlaceholder="Search…"
          ariaLabel="Search feed"
          containerClassName="flex-1 min-w-[220px] w-full"
        />

        {/* Watchlist Filter Dropdown */}
        <select
          value={selectedWatchlistId}
          onChange={(e) => onSelectWatchlist(e.target.value)}
          aria-label="Filter by watchlist"
          className="h-10 px-3 rounded-lg bg-surface border border-border text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0 cursor-pointer"
        >
          <option value="all">All Watchlists</option>
          {watchlists.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {/* Priority Dropdown */}
        <select
          value={selectedPriority}
          onChange={(e) => onSelectPriority(e.target.value)}
          aria-label="Filter by priority"
          className="h-10 px-3 rounded-lg bg-surface border border-border text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0 cursor-pointer"
        >
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Signal Type Dropdown */}
        <select
          value={selectedType}
          onChange={(e) => onSelectType(e.target.value)}
          aria-label="Filter by signal type"
          className="h-10 px-3 rounded-lg bg-surface border border-border text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0 cursor-pointer"
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Quick Toggles: Unread Only & Saved Only */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={onToggleUnreadOnly}
            aria-label="Toggle unread only"
            className={cn(
              'h-10 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors',
              unreadOnly
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                : 'bg-surface border-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Unread</span>
          </button>

          <button
            type="button"
            onClick={onToggleSavedOnly}
            aria-label="Toggle saved only"
            className={cn(
              'h-10 inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors',
              savedOnly
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-surface border-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved</span>
          </button>
        </div>
      </div>

      {/* Active Filter Tags & Results Count */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-400">
            {totalUnfilteredCount !== undefined
              ? `Showing ${totalFilteredCount} of ${totalUnfilteredCount}:`
              : `Showing ${totalFilteredCount} updates:`}
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface border border-border text-xs text-slate-200">
              <span>"{searchQuery}"</span>
              <button
                type="button"
                aria-label="Clear search text filter"
                onClick={() => onSearchChange('')}
                className="p-0.5 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedWatchlistId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface border border-border text-xs text-slate-200">
              <span>List: {watchlists.find((w) => w.id === selectedWatchlistId)?.name || selectedWatchlistId}</span>
              <button
                type="button"
                aria-label="Clear watchlist filter"
                onClick={() => onSelectWatchlist('all')}
                className="p-0.5 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedPriority !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface border border-border text-xs text-slate-200">
              <span>Priority: {selectedPriority}</span>
              <button
                type="button"
                aria-label="Clear priority filter"
                onClick={() => onSelectPriority('ALL')}
                className="p-0.5 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface border border-border text-xs text-slate-200">
              <span>Type: {types.find((t) => t.id === selectedType)?.label || selectedType}</span>
              <button
                type="button"
                aria-label="Clear type filter"
                onClick={() => onSelectType('ALL')}
                className="p-0.5 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {unreadOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface border border-border text-xs text-indigo-300">
              <span>Unread Only</span>
              <button
                type="button"
                aria-label="Clear unread only filter"
                onClick={onToggleUnreadOnly}
                className="p-0.5 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {savedOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface border border-border text-xs text-amber-300">
              <span>Saved Only</span>
              <button
                type="button"
                aria-label="Clear saved only filter"
                onClick={onToggleSavedOnly}
                className="p-0.5 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};
