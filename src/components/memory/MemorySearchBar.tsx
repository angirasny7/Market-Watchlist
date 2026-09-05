import React from 'react';
import { Search, X, RotateCcw, Filter, Activity, Calendar, Layers, Sparkles } from 'lucide-react';
import { MarketMoodType } from './MarketMoodBadge';
import { EventType } from '../../types/event';
import { DateRangePreset } from '../../types/memory';

export type MoodFilterType = 'ALL' | MarketMoodType;
export type MemoryCategoryFilterType = 'ALL' | EventType | string;

interface MemorySearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMood: MoodFilterType;
  onMoodChange: (mood: MoodFilterType) => void;
  selectedCategory: MemoryCategoryFilterType;
  onCategoryChange: (cat: MemoryCategoryFilterType) => void;
  dateRange: DateRangePreset;
  onDateRangeChange: (range: DateRangePreset) => void;
  startDate: string;
  onStartDateChange: (d: string) => void;
  endDate: string;
  onEndDateChange: (d: string) => void;
  stockScope: string;
  onStockScopeChange: (scope: string) => void;
  watchlistSymbols?: string[];
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
  dateRange,
  onDateRangeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  stockScope,
  onStockScopeChange,
  watchlistSymbols = [],
  onResetFilters,
  isFiltered,
}) => {
  const moods: { label: string; value: MoodFilterType }[] = [
    { label: 'All Market Moods', value: 'ALL' },
    { label: 'Bullish', value: 'BULLISH' },
    { label: 'Extreme Greed', value: 'EXTREME_GREED' },
    { label: 'Neutral', value: 'NEUTRAL' },
    { label: 'Choppy', value: 'CHOPPY' },
    { label: 'Bearish', value: 'BEARISH' },
  ];

  const categories: { label: string; value: MemoryCategoryFilterType }[] = [
    { label: 'All Catalysts', value: 'ALL' },
    { label: 'Price Surge', value: 'PRICE_SURGE' },
    { label: 'Price Drop', value: 'PRICE_DROP' },
    { label: 'Volume Spike', value: 'VOLUME_SPIKE' },
    { label: 'Earnings Beat', value: 'EARNINGS_BEAT' },
    { label: 'Earnings Miss', value: 'EARNINGS_MISS' },
    { label: 'Dividend Declared', value: 'DIVIDEND_ANNOUNCED' },
    { label: '52-Week High', value: 'FIFTY_TWO_WEEK_HIGH' },
    { label: '52-Week Low', value: 'FIFTY_TWO_WEEK_LOW' },
    { label: 'Analyst Upgrade', value: 'ANALYST_UPGRADE' },
    { label: 'Management Change', value: 'MANAGEMENT_CHANGE' },
  ];

  const datePresets: { label: string; value: DateRangePreset }[] = [
    { label: 'All Time', value: 'ALL' },
    { label: 'Today', value: 'TODAY' },
    { label: 'Yesterday', value: 'YESTERDAY' },
    { label: 'Last 7 Days', value: 'LAST_7_DAYS' },
    { label: 'Last 30 Days', value: 'LAST_30_DAYS' },
    { label: 'This Month', value: 'THIS_MONTH' },
    { label: 'Since Last Login', value: 'SINCE_LAST_LOGIN' },
    { label: 'Custom Range', value: 'CUSTOM' },
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-3.5">
      {/* Search Input Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search market memory by headline, symbol (e.g. TCS), company name, or explanation..."
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
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition-colors self-start sm:self-auto shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mr-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filters:</span>
        </div>

        {/* 1. Date Range Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-xl px-2.5 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as DateRangePreset)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            {datePresets.map((d) => (
              <option key={d.value} value={d.value} className="bg-surface text-slate-100">
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Stock Scope Selector */}
        <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-xl px-2.5 py-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <select
            value={stockScope}
            onChange={(e) => onStockScopeChange(e.target.value)}
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-surface text-slate-100">
              All Stocks
            </option>
            <option value="WATCHLIST" className="bg-surface text-slate-100">
              Watchlist Only
            </option>
            {watchlistSymbols.length > 0 && (
              <optgroup label="Watchlist Symbols" className="bg-surface text-slate-300">
                {watchlistSymbols.map((sym) => (
                  <option key={sym} value={sym} className="bg-surface text-slate-100">
                    {sym}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* 3. Catalyst Type Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-xl px-2.5 py-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
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

        {/* 4. Market Mood Dropdown */}
        <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-xl px-2.5 py-1.5">
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
      </div>

      {/* Custom Date Range Pickers (shown only when dateRange === 'CUSTOM') */}
      {dateRange === 'CUSTOM' && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-surface-subtle/80 border border-indigo-500/20 animate-fade-in text-xs font-mono">
          <span className="text-slate-400">Custom Date Range:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-400">Start:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400">End:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="bg-surface border border-border rounded-lg px-2.5 py-1 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
