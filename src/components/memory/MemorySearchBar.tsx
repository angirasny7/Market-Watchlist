import React from 'react';
import { Search, X, RotateCcw, Filter, Activity } from 'lucide-react';
import { MarketMoodType } from './MarketMoodBadge';
import { EventType } from '../../types/event';

export type MoodFilterType = 'ALL' | MarketMoodType;
export type MemoryCategoryFilterType = 'ALL' | EventType;

interface MemorySearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMood: MoodFilterType;
  onMoodChange: (mood: MoodFilterType) => void;
  selectedCategory: MemoryCategoryFilterType;
  onCategoryChange: (cat: MemoryCategoryFilterType) => void;
  onResetFilters: () => void;
  isFiltered: boolean;
}

export const MemorySearchBar: React.FC<MemorySearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedMood,
  onMoodChange,
  selectedCategory,
  onCategoryChange,
  onResetFilters,
  isFiltered,
}) => {
  const moods: { label: string; value: MoodFilterType }[] = [
    { label: 'All Market Moods', value: 'ALL' },
    { label: 'Bullish', value: 'BULLISH' },
    { label: 'Neutral', value: 'NEUTRAL' },
    { label: 'Extreme Greed', value: 'EXTREME_GREED' },
    { label: 'Choppy', value: 'CHOPPY' },
    { label: 'Bearish', value: 'BEARISH' },
  ];

  const categories: { label: string; value: MemoryCategoryFilterType }[] = [
    { label: 'All Catalyst Types', value: 'ALL' },
    { label: '52W High', value: '52_WEEK_HIGH' },
    { label: 'Earnings Beat', value: 'EARNINGS_RELEASE' },
    { label: 'Dividend Declared', value: 'DIVIDEND_ANNOUNCED' },
    { label: 'Price Surge', value: 'PRICE_SPIKE' },
    { label: 'Volume Spike', value: 'VOLUME_SPIKE' },
  ];

  return (
    <div className="p-4 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
      {/* Search Input Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search market memory by title, catalyst, ticker (e.g. TATAMOTORS), or explanation..."
            className="w-full pl-10 pr-9 py-2.5 bg-surface-subtle rounded-xl border border-border text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Reset Action */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-subtle hover:bg-surface-hover text-xs font-semibold text-rose-400 hover:text-rose-300 border border-border transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Search & Filters</span>
          </button>
        )}
      </div>

      {/* Mood & Category Filter Selectors */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filters:</span>
        </div>

        {/* Mood Selector Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={selectedMood}
            onChange={(e) => onMoodChange(e.target.value as MoodFilterType)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            {moods.map((m) => (
              <option key={m.value} value={m.value} className="bg-surface text-slate-100">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selector Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value as MemoryCategoryFilterType)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value} className="bg-surface text-slate-100">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto text-[11px] font-mono text-slate-400 hidden md:inline">
          Permanent retention enabled • No notification expiration
        </div>
      </div>
    </div>
  );
};
