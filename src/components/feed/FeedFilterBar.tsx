import React from 'react';
import { Search, X, Filter, RotateCcw, CheckCheck, Star, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
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
  const priorities: { label: string; value: PriorityFilter }[] = [
    { label: 'All Priorities', value: 'ALL' },
    { label: 'Critical', value: 'CRITICAL' },
    { label: 'High', value: 'HIGH' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Low', value: 'LOW' },
  ];

  const categories: { label: string; value: CategoryFilter }[] = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'Earnings Beat', value: 'EARNINGS_BEAT' },
    { label: 'Earnings Miss', value: 'EARNINGS_MISS' },
    { label: 'Dividends', value: 'DIVIDEND_ANNOUNCED' },
    { label: 'Price Surges', value: 'PRICE_SURGE' },
    { label: 'Price Drops', value: 'PRICE_DROP' },
    { label: 'Volume Spikes', value: 'VOLUME_SPIKE' },
    { label: '52W High', value: 'FIFTY_TWO_WEEK_HIGH' },
    { label: '52W Low', value: 'FIFTY_TWO_WEEK_LOW' },
  ];

  const statuses: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Unread', value: 'UNREAD' },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-3.5">
      {/* Top row: Scope Selector, Search input & Status toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Scope Pill Toggle (Watchlist-Centric Prioritization) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
            <button
              onClick={() => onScopeChange('watchlist')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                selectedScope === 'watchlist'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Filter to intelligence strictly affecting stocks in your active watchlist"
            >
              <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Watchlist Signals</span>
            </button>
            <button
              onClick={() => onScopeChange('all')}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                selectedScope === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Show all market anomalies with watchlist items prioritized first"
            >
              <Globe className="w-3.5 h-3.5 text-slate-300" />
              <span>All Market Signals</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ticker (e.g. TATAMOTORS) or company name..."
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

        {/* Status Pills & Mark All Read */}
        <div className="flex items-center gap-2">
          {/* Status Radio Pills */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
            {statuses.map((s) => (
              <button
                key={s.value}
                onClick={() => onStatusChange(s.value)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  selectedStatus === s.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Mark All Read CTA */}
          {unreadCount > 0 && onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              title="Mark all active events as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark All Read</span>
            </button>
          )}

          {/* Reset Filters CTA */}
          {isFiltered && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs text-rose-400 hover:text-rose-300 transition-colors"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: Priority Pills & Category Filter Selector */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1 font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden md:inline">Priority:</span>
        </div>

        {/* Priority Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {priorities.map((p) => {
            const isSelected = selectedPriority === p.value;
            const badgeClasses = {
              ALL: isSelected
                ? 'bg-slate-200 text-slate-900 border-slate-200'
                : 'bg-surface text-slate-400 hover:text-slate-200 border-border',
              CRITICAL: isSelected
                ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                : 'bg-surface text-rose-400 hover:bg-rose-500/10 border-border',
              HIGH: isSelected
                ? 'bg-amber-500 text-slate-900 border-amber-500 font-semibold'
                : 'bg-surface text-amber-300 hover:bg-amber-500/10 border-border',
              MEDIUM: isSelected
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-surface text-indigo-300 hover:bg-indigo-500/10 border-border',
              LOW: isSelected
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-surface text-slate-400 hover:bg-slate-800 border-border',
            }[p.value];

            return (
              <button
                key={p.value}
                onClick={() => onPriorityChange(p.value)}
                className={cn(
                  'px-2.5 py-1 text-xs font-mono font-medium rounded-md border transition-all',
                  badgeClasses
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Category Dropdown Selector */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden lg:inline">
            Category:
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as CategoryFilter)}
            className="bg-surface border border-border text-xs text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value} className="bg-surface text-slate-100">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
