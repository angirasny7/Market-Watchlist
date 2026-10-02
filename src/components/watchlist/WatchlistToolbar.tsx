import React, { useRef, useEffect } from 'react';
import {
  Search,
  X,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
} from 'lucide-react';
import {
  WatchlistDropdownFilter,
  WatchlistSortField,
} from '../../lib/watchlistFilters';

interface WatchlistToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dropdownFilter: WatchlistDropdownFilter;
  onDropdownFilterChange: (filter: WatchlistDropdownFilter) => void;
  sortField: WatchlistSortField;
  onSortFieldChange: (sort: WatchlistSortField) => void;
  range: '1D' | '1W' | '1M';
  onRangeChange: (range: '1D' | '1W' | '1M') => void;
  viewMode: 'table' | 'grid';
  onViewModeChange: (mode: 'table' | 'grid') => void;
  onOpenAddStock: () => void;
}

export const WatchlistToolbar: React.FC<WatchlistToolbarProps> = ({
  searchQuery,
  onSearchChange,
  dropdownFilter,
  onDropdownFilterChange,
  sortField,
  onSortFieldChange,
  range,
  onRangeChange,
  viewMode,
  onViewModeChange,
  onOpenAddStock,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global '/' keyboard hotkey to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea or contenteditable element
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape' && target === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
      {/* 1. Left Controls: Search Bar & Filter Dropdown */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by company, ticker, sector... (Press '/' to focus)"
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface border border-border focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/50 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-surface-hover"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-surface-subtle border border-border/80 rounded">
              /
            </kbd>
          )}
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <select
            value={dropdownFilter}
            onChange={(e) => onDropdownFilterChange(e.target.value as WatchlistDropdownFilter)}
            className="appearance-none pl-8 pr-7 py-2 rounded-xl bg-surface border border-border hover:border-slate-600 focus:border-emerald-500/80 text-xs font-medium text-slate-200 outline-none transition-all cursor-pointer"
            aria-label="Filter stocks"
          >
            <option value="ALL">All Items</option>
            <option value="PINNED">Pinned Only</option>
            <option value="GAINERS">Gainers (+)</option>
            <option value="LOSERS">Losers (-)</option>
            <option value="CRITICAL">Critical Attention</option>
            <option value="HIGH">High Attention</option>
          </select>
          <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="w-1.5 h-1.5 border-r border-b border-slate-400 rotate-45 absolute right-3 top-1/2 -translate-y-[60%] pointer-events-none" />
        </div>
      </div>

      {/* 2. Right Controls: Sort, Range, View Mode & Add Button */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 flex-wrap">
        {/* Sort Dropdown */}
        <div className="relative shrink-0">
          <select
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value as WatchlistSortField)}
            className="appearance-none pl-8 pr-7 py-2 rounded-xl bg-surface border border-border hover:border-slate-600 focus:border-emerald-500/80 text-xs font-medium text-slate-200 outline-none transition-all cursor-pointer"
            aria-label="Sort stocks"
          >
            <option value="ATTENTION_SCORE">Attention Score</option>
            <option value="ALPHABETICAL">Company (A-Z)</option>
            <option value="DAY_CHANGE_DESC">Top Gainers (▲)</option>
            <option value="DAY_CHANGE_ASC">Top Losers (▼)</option>
            <option value="PRICE_DESC">Price (High to Low)</option>
            <option value="PRICE_ASC">Price (Low to High)</option>
            <option value="UNSEEN_UPDATES">Unseen Updates</option>
            <option value="RECENTLY_ADDED">Recently Added</option>
          </select>
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="w-1.5 h-1.5 border-r border-b border-slate-400 rotate-45 absolute right-3 top-1/2 -translate-y-[60%] pointer-events-none" />
        </div>

        {/* Range Segmented Pill: 1D | 1W | 1M */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface border border-border">
          {(['1D', '1W', '1M'] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                range === r
                  ? 'bg-slate-700/80 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* View Mode Toggle: Table / Grid */}
        <div className="flex items-center p-0.5 rounded-xl bg-surface border border-border">
          <button
            onClick={() => onViewModeChange('table')}
            aria-label="Table View"
            title="Table View"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'table'
                ? 'bg-slate-700/80 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            aria-label="Grid View"
            title="Grid View"
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-slate-700/80 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add Stock Button */}
        <button
          onClick={onOpenAddStock}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all shadow-sm shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Stock</span>
        </button>
      </div>
    </div>
  );
};
