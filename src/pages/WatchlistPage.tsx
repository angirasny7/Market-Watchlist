import React, { useState, useEffect, useMemo } from 'react';
import {
  WatchlistTabs,
  WatchlistSummaryCards,
  WatchlistToolbar,
  WatchlistTable,
  WatchlistGrid,
  AddStockModal,
  RemoveStockModal,
  StockInsightDrawer,
  StockDetailModal,
  AlertFormModal,
  RemovableStock,
} from '../components/watchlist';
import { MoveCopyStockModal } from '../components/watchlist/MoveCopyStockModal';
import { useMarketStore } from '../store/useMarketStore';
import { StockQuote } from '../types/stock';
import {
  filterAndSortWatchlist,
  WatchlistStockItem,
} from '../lib/watchlistFilters';
import { PageContainer, WatchlistSkeleton, ErrorState } from '../components/common';
import { Plus, RotateCcw, SearchX, LineChart } from 'lucide-react';

export const WatchlistPage: React.FC = () => {
  const {
    // Store State
    watchlist,
    activeWatchlistId,
    watchlistOverview,
    watchlistRange,
    watchlistQuickFilter,
    watchlistDropdownFilter,
    watchlistSortField,
    watchlistViewMode,
    isOverviewLoading,
    isLoading,
    isError,
    errorMessage,

    // Store Actions
    fetchUserWatchlists,
    fetchWatchlistOverview,
    setActiveWatchlistId,
    setWatchlistRange,
    setWatchlistQuickFilter,
    setWatchlistDropdownFilter,
    setWatchlistSortField,
    setWatchlistViewMode,
    togglePinInActiveWatchlist,
    refreshMarketData,
    pollWatchlistQuotes,
  } = useMarketStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertTargetSymbol, setAlertTargetSymbol] = useState<string | null>(null);
  const [stockToRemove, setStockToRemove] = useState<RemovableStock | null>(null);
  const [activeInsightStock, setActiveInsightStock] = useState<StockQuote | null>(null);
  const [detailStockSymbol, setDetailStockSymbol] = useState<string | null>(null);
  const [moveCopySymbol, setMoveCopySymbol] = useState<string | null>(null);

  // Initial data loading
  useEffect(() => {
    fetchUserWatchlists();
    fetchWatchlistOverview();
  }, [fetchUserWatchlists, fetchWatchlistOverview]);

  // 30-60s price polling — runs when at least one exchange is open and page is visible.
  // Uses the lightweight /quotes endpoint so attention/events/sparklines are unchanged.
  useEffect(() => {
    const POLL_INTERVAL_MS = 45_000;
    let timerId: any = null;
    let consecutiveErrors = 0;

    const isAnyOpen = () => {
      const nowIST = new Date();
      const istParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'short',
      }).formatToParts(nowIST);

      const istWeekday = istParts.find((p) => p.type === 'weekday')?.value;
      const istHour = parseInt(istParts.find((p) => p.type === 'hour')?.value || '0', 10);
      const istMin = parseInt(istParts.find((p) => p.type === 'minute')?.value || '0', 10);
      const istTotal = istHour * 60 + istMin;
      const nseOpen = istWeekday !== 'Sat' && istWeekday !== 'Sun' && istTotal >= 555 && istTotal <= 930;

      const usParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'short',
      }).formatToParts(nowIST);

      const usWeekday = usParts.find((p) => p.type === 'weekday')?.value;
      const usHour = parseInt(usParts.find((p) => p.type === 'hour')?.value || '0', 10);
      const usMin = parseInt(usParts.find((p) => p.type === 'minute')?.value || '0', 10);
      const usTotal = usHour * 60 + usMin;
      const usOpen = usWeekday !== 'Sat' && usWeekday !== 'Sun' && usTotal >= 570 && usTotal <= 960;

      return nseOpen || usOpen;
    };

    const poll = async () => {
      if (document.visibilityState !== 'visible' || !isAnyOpen()) return;
      try {
        await pollWatchlistQuotes(activeWatchlistId);
        consecutiveErrors = 0;
      } catch {
        consecutiveErrors++;
      }
    };

    const scheduleNext = () => {
      const delay = consecutiveErrors > 0 ? Math.min(POLL_INTERVAL_MS * Math.pow(1.5, consecutiveErrors), 300_000) : POLL_INTERVAL_MS;
      timerId = setTimeout(async () => {
        await poll();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    // Refetch immediately when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAnyOpen()) {
        poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeWatchlistId, pollWatchlistQuotes]);

  // Combine live overview stocks or fallback to adapted store watchlist
  const rawStocks: WatchlistStockItem[] = useMemo(() => {
    if (watchlistOverview?.stocks) {
      return watchlistOverview.stocks;
    }

    // Fallback adapter for legacy store items
    return watchlist.map((s) => ({
      symbol: s.symbol,
      companyName: s.name || s.symbol,
      sector: s.sector || 'General',
      exchange: s.exchange || 'NSE',
      currency: s.currency || '₹',
      currentPrice: s.currentPrice,
      changeAmount: s.changeAmount,
      changePercent: s.changePercent,
      isPinned: s.isPinned || false,
      addedAt: new Date().toISOString(),
      attentionLevel: 'LOW',
      attentionScore: 20,
      unseenUpdatesCount: 0,
      nextEvent: null,
      activeAlertCount: 0,
      sparkline: (s.sparkline as any[]) || [s.currentPrice],
      watchlistIds: [],
    }));
  }, [watchlistOverview, watchlist]);

  // Derive summary metrics
  const summaryMetrics = useMemo(() => {
    if (watchlistOverview?.summary) {
      return watchlistOverview.summary;
    }
    return {
      totalStocks: rawStocks.length,
      needAttention: rawStocks.filter(
        (s) => s.attentionLevel === 'CRITICAL' || s.attentionLevel === 'HIGH'
      ).length,
      upcomingEvents: rawStocks.filter((s) => s.nextEvent !== null).length,
      activeAlerts: rawStocks.reduce((acc, s) => acc + s.activeAlertCount, 0),
      unseenUpdates: rawStocks.reduce((acc, s) => acc + s.unseenUpdatesCount, 0),
    };
  }, [watchlistOverview, rawStocks]);

  // Pure filtering and sorting
  const displayedStocks = useMemo(() => {
    return filterAndSortWatchlist(rawStocks, {
      search: searchQuery,
      quickFilter: watchlistQuickFilter,
      dropdownFilter: watchlistDropdownFilter,
      sortField: watchlistSortField,
      pinToTop: true,
    });
  }, [rawStocks, searchQuery, watchlistQuickFilter, watchlistDropdownFilter, watchlistSortField]);

  // Open stock details and interactive TradingView chart modal
  const handleSelectStock = (stock: WatchlistStockItem) => {
    setDetailStockSymbol(stock.symbol);
  };

  const handleWatchlistCreated = (newId: string) => {
    setActiveWatchlistId(newId);
    setIsAddModalOpen(true);
  };

  const isInitialLoading = isOverviewLoading && rawStocks.length === 0;

  return (
    <PageContainer>
      {/* 1. Multi-Watchlist Tabs Row */}
      <WatchlistTabs
        totalStocksCount={summaryMetrics.totalStocks}
        onWatchlistCreated={handleWatchlistCreated}
      />

      {/* 2. Interactive Quick Filter Summary Cards */}
      <WatchlistSummaryCards
        summary={summaryMetrics}
        activeFilter={watchlistQuickFilter}
        onSelectFilter={setWatchlistQuickFilter}
      />

      {/* 3. Streamlined Toolbar */}
      <WatchlistToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dropdownFilter={watchlistDropdownFilter}
        onDropdownFilterChange={setWatchlistDropdownFilter}
        sortField={watchlistSortField}
        onSortFieldChange={setWatchlistSortField}
        range={watchlistRange}
        onRangeChange={setWatchlistRange}
        viewMode={watchlistViewMode}
        onViewModeChange={setWatchlistViewMode}
        onOpenAddStock={() => setIsAddModalOpen(true)}
      />

      {/* 4. Table / Grid Content, Skeleton, or Error State */}
      {isError && rawStocks.length === 0 ? (
        <ErrorState
          title="Unable to load watchlist"
          message={errorMessage || 'Could not retrieve your tracked stocks.'}
          onRetry={() => {
            fetchUserWatchlists();
            fetchWatchlistOverview();
            refreshMarketData();
          }}
          isRetrying={isLoading || isOverviewLoading}
        />
      ) : isInitialLoading ? (
        <WatchlistSkeleton />
      ) : displayedStocks.length > 0 ? (
        watchlistViewMode === 'grid' ? (
          <WatchlistGrid
            stocks={displayedStocks}
            onTogglePin={togglePinInActiveWatchlist}
            onRemoveStock={setStockToRemove}
            onSelectStock={handleSelectStock}
            onOpenAlerts={(symbol) => {
              setAlertTargetSymbol(symbol);
              setIsAlertModalOpen(true);
            }}
            onMoveCopyStock={(symbol) => setMoveCopySymbol(symbol)}
          />
        ) : (
          <WatchlistTable
            stocks={displayedStocks}
            onTogglePin={togglePinInActiveWatchlist}
            onRemoveStock={setStockToRemove}
            onSelectStock={handleSelectStock}
            onOpenAlerts={(symbol) => {
              setAlertTargetSymbol(symbol);
              setIsAlertModalOpen(true);
            }}
            onMoveCopyStock={(symbol) => setMoveCopySymbol(symbol)}
          />
        )
      ) : (
        /* 5. Clean Empty State */
        <div className="p-10 sm:p-14 rounded-2xl bg-surface border border-border text-center space-y-4 my-2">
          {searchQuery || watchlistQuickFilter !== 'ALL' || watchlistDropdownFilter !== 'ALL' ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-slate-400 border border-border flex items-center justify-center mx-auto">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                No matching equities
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                No stocks match your current filter or search criteria.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setWatchlistQuickFilter('ALL');
                    setWatchlistDropdownFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-xs font-semibold text-slate-300 border border-border transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stock</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                {activeWatchlistId === 'all'
                  ? 'Your Watchlists are Empty'
                  : 'This Watchlist is Empty'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Track equities to monitor real-time price action, sparklines, signals, and actionable insights.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-semibold text-white transition-colors shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Stock</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        targetWatchlistId={activeWatchlistId === 'all' ? undefined : activeWatchlistId}
      />

      {/* 7. Remove Stock Confirmation Modal */}
      <RemoveStockModal
        stock={stockToRemove}
        onClose={() => setStockToRemove(null)}
      />

      {/* 8. Stock Details & Interactive Chart Modal (Phase 3) */}
      <StockDetailModal
        symbol={detailStockSymbol}
        isOpen={Boolean(detailStockSymbol)}
        onClose={() => setDetailStockSymbol(null)}
        onOpenAlertModal={(symbol) => {
          setAlertTargetSymbol(symbol);
          setIsAlertModalOpen(true);
        }}
        onMoveCopyStock={(symbol) => setMoveCopySymbol(symbol)}
      />

      {/* Move or Copy Stock Modal */}
      <MoveCopyStockModal
        isOpen={Boolean(moveCopySymbol)}
        onClose={() => setMoveCopySymbol(null)}
        stockSymbol={moveCopySymbol}
        currentWatchlistId={activeWatchlistId === 'all' ? undefined : activeWatchlistId}
      />

      {/* 9. Set Price & Attention Alert Modal (Phase 4) */}
      <AlertFormModal
        isOpen={isAlertModalOpen}
        onClose={() => {
          setIsAlertModalOpen(false);
          setAlertTargetSymbol(null);
        }}
        targetSymbol={alertTargetSymbol || undefined}
        stocks={rawStocks}
        onAlertCreated={() => {
          fetchWatchlistOverview();
        }}
      />

      {/* 10. Stock Causal Insight Drawer */}
      <StockInsightDrawer
        stock={activeInsightStock}
        onClose={() => setActiveInsightStock(null)}
      />
    </PageContainer>
  );
};

export default WatchlistPage;
