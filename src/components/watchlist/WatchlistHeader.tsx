import React from 'react';
import {
  ListOrdered,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Flame,
  BellRing,
  Sparkles,
  ArrowUpDown,
  TrendingUp,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { PageHeader, KpiGrid, KpiCard, SearchFilterBar } from '../common';

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

  const statusBadges = (
    <>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface border border-border text-slate-300 font-mono">
        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
        <span>Portfolio Tracking:</span>
        <span className="text-emerald-400 font-semibold">{totalStocks} Active</span>
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
        <span>Real-Time Anomaly Engine</span>
      </div>
    </>
  );

  const headerActions = (
    <button
      onClick={onOpenAddModal}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
    >
      <Plus className="w-4 h-4" />
      <span>Add Stock</span>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* 1. Standardized Page Header */}
      <PageHeader
        icon={<ListOrdered className="w-5 h-5" />}
        iconColor="emerald"
        tag="Portfolio Intelligence"
        tagColor="emerald"
        title="My Watchlist"
        subtitle="Track your core equities with continuous anomaly surveillance, attributed causal explanations, and 52-week position meters."
        statusBadges={statusBadges}
        actions={headerActions}
      />

      {/* 2. Standardized KPI Grid */}
      <KpiGrid cols={4}>
        <KpiCard
          label="Total Monitored"
          value={`${totalStocks}`}
          subtext="Active portfolio equities"
          icon={<ListOrdered className="w-4 h-4" />}
          accent="indigo"
        />
        <KpiCard
          label="Active Signals"
          value={stocksWithEventsCount}
          subtext="Stocks experiencing anomalies"
          icon={<BellRing className="w-4 h-4" />}
          accent="cyan"
        />
        <KpiCard
          label="Critical Alerts"
          value={criticalSignalsCount}
          subtext="Immediate risk catalysts"
          icon={<Flame className="w-4 h-4" />}
          accent="rose"
        />
        <KpiCard
          label="Unread Insights"
          value={unreadInsightsCount}
          subtext="Unread causal explanations"
          icon={<Sparkles className="w-4 h-4" />}
          accent="emerald"
        />
      </KpiGrid>

      {/* 3. Standardized Search & Filter Bar */}
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search watchlist by ticker (e.g. INFY) or company name..."
        rightSlot={
          <>
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-surface-subtle border border-border rounded-xl px-3 py-2 text-xs text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-400 hidden sm:inline">Sort:</span>
              <select
                value={sortOption}
                onChange={(e) => onSortChange(e.target.value as WatchlistSortOption)}
                className="bg-transparent text-xs text-slate-100 font-medium focus:outline-none cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-surface text-slate-100">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid vs Table View Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-border">
              <button
                onClick={() => setWatchlistViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
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
                className={`p-1.5 rounded-lg transition-colors ${
                  watchlistViewMode === 'table'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </>
        }
      />
    </div>
  );
};
