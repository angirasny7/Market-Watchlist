import React, { useState, useMemo } from 'react';
import {
  WatchlistHeader,
  StockCard,
  StockTable,
  AddStockModal,
  RemoveStockModal,
  StockInsightDrawer,
  WatchlistSortOption,
} from '../components/watchlist';
import { useMarketStore } from '../store/useMarketStore';
import { StockQuote } from '../types/stock';
import { Plus, RotateCcw, SearchX, LineChart } from 'lucide-react';

export const WatchlistPage: React.FC = () => {
  const {
    watchlist,
    watchlistViewMode,
    stockSearchQuery,
    setStockSearchQuery,
    getEventsByStock,
  } = useMarketStore();

  const [sortOption, setSortOption] = useState<WatchlistSortOption>('ATTENTION_SCORE');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [stockToRemove, setStockToRemove] = useState<StockQuote | null>(null);
  const [activeInsightStock, setActiveInsightStock] = useState<StockQuote | null>(null);

  // Sorting & Filtering
  const processedStocks = useMemo(() => {
    let result = [...watchlist];

    // Filter by search query
    if (stockSearchQuery.trim() !== '') {
      const q = stockSearchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      // Pinned stocks always on top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aEvents = getEventsByStock(a.symbol);
      const bEvents = getEventsByStock(b.symbol);

      switch (sortOption) {
        case 'ATTENTION_SCORE': {
          const aPeak = Math.max(...aEvents.map((e) => e.scoring.finalScore), 0);
          const bPeak = Math.max(...bEvents.map((e) => e.scoring.finalScore), 0);
          return bPeak - aPeak;
        }
        case 'MOST_ACTIVE':
          return bEvents.length - aEvents.length;

        case 'BIGGEST_GAINERS':
          return b.changePercent - a.changePercent;

        case 'BIGGEST_LOSERS':
          return a.changePercent - b.changePercent;

        case 'RECENT_EVENT':
          return bEvents.length - aEvents.length;

        case 'ALPHABETICAL':
          return a.symbol.localeCompare(b.symbol);

        default:
          return 0;
      }
    });

    return result;
  }, [watchlist, stockSearchQuery, sortOption, getEventsByStock]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* 1. Watchlist Header with Metrics & Controls */}
      <WatchlistHeader
        searchQuery={stockSearchQuery}
        onSearchChange={setStockSearchQuery}
        sortOption={sortOption}
        onSortChange={setSortOption}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* 2. Grid or Table Content */}
      {processedStocks.length > 0 ? (
        watchlistViewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {processedStocks.map((stock) => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                onViewInsights={setActiveInsightStock}
                onRemoveStock={setStockToRemove}
              />
            ))}
          </div>
        ) : (
          <StockTable
            stocks={processedStocks}
            onViewInsights={setActiveInsightStock}
            onRemoveStock={setStockToRemove}
          />
        )
      ) : (
        /* 3. Empty States */
        <div className="p-10 sm:p-16 rounded-2xl bg-surface border border-border text-center space-y-4">
          {stockSearchQuery ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-slate-400 border border-border flex items-center justify-center mx-auto">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                No Equities Matching "{stockSearchQuery}"
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Check for typos or explore our broader stock catalog to add this instrument.
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => setStockSearchQuery('')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-xs font-semibold text-slate-300 border border-border transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Search</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add from Catalog</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Your Watchlist is Empty
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Start tracking equities to enable intelligent delta comparison, price anomaly detection, and causal insights.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs sm:text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Stock</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* 5. Remove Stock Confirmation Modal */}
      <RemoveStockModal
        stock={stockToRemove}
        onClose={() => setStockToRemove(null)}
      />

      {/* 6. Stock Causal Insight Drawer */}
      <StockInsightDrawer
        stock={activeInsightStock}
        onClose={() => setActiveInsightStock(null)}
      />
    </div>
  );
};

export default WatchlistPage;
