import React from 'react';
import { CheckCheck, RotateCcw } from 'lucide-react';
import { SearchInput } from '../common/SearchInput';
import { EventPriority, EventType } from '../../types/event';

export type PriorityFilter = 'ALL' | EventPriority;
export type CategoryFilter = 'ALL' | EventType;
export type StatusFilter = 'ALL' | 'UNREAD';
export type ScopeFilter = 'watchlist' | 'all';

interface FeedFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedPriority: PriorityFilter;
  onPriorityChange: (priority: PriorityFilter) => void;
  selectedCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  selectedScope: ScopeFilter;
  onScopeChange: (scope: ScopeFilter) => void;
  onMarkAllRead?: () => void;
  unreadCount?: number;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const FeedFilterBar: React.FC<FeedFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  selectedScope,
  onScopeChange,
  onMarkAllRead,
  unreadCount = 0,
  onResetFilters,
  isFiltered,
}) => {
  return (
    <div className="p-3 sm:p-3.5 rounded-xl bg-surface border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
      {/* Left: Search input + Scope & Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
        {/* Compact Search */}
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Search symbol or name..."
          mobilePlaceholder="Search…"
          ariaLabel="Search feed"
          containerClassName="min-w-[160px] sm:w-56 flex-initial"
        />

        {/* Scope Chips */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle border border-border/80">
          <button
            onClick={() => onScopeChange('watchlist')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedScope === 'watchlist'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Watchlist
          </button>
          <button
            onClick={() => onScopeChange('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedScope === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
        </div>

        {/* Priority Filter Select */}
        <select
          value={selectedPriority}
          onChange={(e) => onPriorityChange(e.target.value as PriorityFilter)}
          className="bg-surface-subtle text-slate-300 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">Urgent (Critical)</option>
          <option value="HIGH">Important (High)</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Category Filter Select */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value as CategoryFilter)}
          className="bg-surface-subtle text-slate-300 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Categories</option>
          <option value="PRICE_SURGE">Price Surges</option>
          <option value="PRICE_DROP">Price Drops</option>
          <option value="VOLUME_SPIKE">Volume Spikes</option>
          <option value="FIFTY_TWO_WEEK_HIGH">52-Week High</option>
          <option value="FIFTY_TWO_WEEK_LOW">52-Week Low</option>
          <option value="EARNINGS_BEAT">Earnings</option>
          <option value="DIVIDEND_ANNOUNCED">Dividends</option>
        </select>

        {/* Unread Toggle Chip */}
        <button
          onClick={() => onStatusChange(selectedStatus === 'UNREAD' ? 'ALL' : 'UNREAD')}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            selectedStatus === 'UNREAD'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              : 'bg-surface-subtle text-slate-400 border-border/80 hover:text-slate-200'
          }`}
        >
          Unread only
        </button>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset all filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Right: Mark All Read Action */}
      {onMarkAllRead && unreadCount > 0 && (
        <button
          onClick={onMarkAllRead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover text-slate-300 hover:text-slate-100 border border-border/80 transition-colors shrink-0 font-medium"
        >
          <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Mark all as read</span>
        </button>
      )}
    </div>
  );
};

export default FeedFilterBar;
