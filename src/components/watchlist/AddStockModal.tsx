import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Check, Globe, SlidersHorizontal, ArrowUpDown, AlertCircle, RefreshCw } from 'lucide-react';
import { Modal } from '../common';
import { StockQuote } from '../../types/stock';
import { useMarketStore } from '../../store/useMarketStore';
import { useToastStore } from '../../store/useToastStore';
import { stockService } from '../../services/stockService';
import { filterAndRankStocks, getStockAvatarDetails } from '../../lib/stockSearch';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { watchlist, allStocks, addStock } = useMarketStore();
  const { addToast } = useToastStore();

  const [catalog, setCatalog] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'IN' | 'US'>('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'DEFAULT' | 'A-Z' | 'Z-A'>('DEFAULT');
  const [recentlyAddedSymbol, setRecentlyAddedSymbol] = useState<string | null>(null);

  // 1. Load full stock catalog whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    stockService
      .getAllStocks()
      .then((data) => {
        if (isMounted && data && Array.isArray(data)) {
          setCatalog(
            data.map((s: any) => ({
              symbol: s.symbol,
              name: s.companyName || s.name || s.symbol,
              currency: s.currency || (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' ? '$' : '₹'),
              currentPrice: Number(s.currentPrice) || 0,
              changeAmount: Number(s.changeAmount) || 0,
              changePercent: Number(s.dailyChangePercent ?? s.changePercent) || 0,
              dailyChangePercent: Number(s.dailyChangePercent ?? s.changePercent) || 0,
              lastUpdated: s.updatedAt || 'Live',
              sector: s.sector || 'General',
              exchange: s.exchange || (s.currency === '$' ? 'NASDAQ' : 'NSE'),
              volume: Number(s.volume) || 0,
              avgVolume20D: Number(s.avgVolume20D) || 0,
              marketCap: s.marketCap || 'N/A',
              peRatio: s.peRatio ? Number(s.peRatio) : 0,
              high52w: Number(s.high52w) || 0,
              low52w: Number(s.low52w) || 0,
              sparkline: Array.isArray(s.sparkline) ? s.sparkline : [],
              tags: Array.isArray(s.tags) ? s.tags : [],
            }))
          );
        } else if (isMounted && allStocks.length > 0) {
          setCatalog(allStocks);
        }
      })
      .catch(() => {
        if (isMounted && allStocks.length > 0) {
          setCatalog(allStocks);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, allStocks]);

  // 2. Extract sector categories
  const sectors = useMemo(() => {
    const list = new Set(catalog.map((s) => s.sector));
    return ['ALL', ...Array.from(list)];
  }, [catalog]);

  // 3. Set of already-added watchlist symbols for instant duplicate lookup
  const watchlistSymbolSet = useMemo(() => {
    return new Set(watchlist.map((s) => s.symbol.toUpperCase()));
  }, [watchlist]);

  const isMaxCapacity = watchlist.length >= 50;

  // 4. Multi-tiered search, market filtering, sector filtering, and sorting
  const filteredStocks = useMemo(() => {
    const prepared = catalog.map((s) => ({
      ...s,
      companyName: s.name,
    }));

    return filterAndRankStocks(prepared, {
      query: searchQuery,
      market: selectedMarket,
      sector: selectedSector,
      sortOrder,
    });
  }, [catalog, searchQuery, selectedMarket, selectedSector, sortOrder]);

  const handleAdd = (stock: StockQuote) => {
    if (isMaxCapacity) {
      addToast('Watchlist limit reached (maximum 50 stocks).', 'error');
      return;
    }
    if (watchlistSymbolSet.has(stock.symbol.toUpperCase())) {
      return;
    }

    addStock(stock);
    setRecentlyAddedSymbol(stock.symbol);
    addToast(`Added ${stock.symbol} to watchlist`, 'success');

    setTimeout(() => {
      setRecentlyAddedSymbol(null);
    }, 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Equities to Watchlist"
      subtitle="Search and discover equities across Indian (NSE) and US markets"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Capacity Indicator Banner */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Watchlist Capacity:</span>
            <span
              className={`font-mono font-bold ${
                isMaxCapacity ? 'text-rose-400' : 'text-indigo-400'
              }`}
            >
              {watchlist.length} / 50 Stocks
            </span>
          </div>
          {isMaxCapacity && (
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              Maximum Capacity Reached
            </span>
          )}
        </div>

        {/* Search & Market Filter Row */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by symbol (e.g. TCS, NVDA, INFY) or company name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Market Filter Chips */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'IN', label: 'NSE' },
                { id: 'US', label: 'US' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMarket(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedMarket === m.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Sorting Toggle */}
          <div className="flex items-center gap-1 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 ml-1 mr-0.5" />
            {(
              [
                { id: 'DEFAULT', label: 'Rank' },
                { id: 'A-Z', label: 'A-Z' },
                { id: 'Z-A', label: 'Z-A' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setSortOrder(s.id)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  sortOrder === s.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sector Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedSector === sec
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sec === 'ALL' ? 'All Sectors' : sec}
            </button>
          ))}
        </div>

        {/* Stock Results List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs">Loading master equity universe...</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-1">
            <p className="text-sm font-semibold">No equities match your criteria</p>
            <p className="text-xs text-slate-500">Try adjusting your search query, market, or sector filters.</p>
          </div>
        ) : (
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredStocks.map((stock) => {
              const isAlreadyAdded = watchlistSymbolSet.has(stock.symbol.toUpperCase());
              const isRecent = recentlyAddedSymbol === stock.symbol;
              const { initials, style } = getStockAvatarDetails(stock.symbol, stock.sector);
              const isPositive = stock.changePercent >= 0;

              return (
                <div
                  key={stock.symbol}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    isAlreadyAdded
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-75'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Avatar & Stock Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold font-mono text-xs border shrink-0 ${style.bg} ${style.text} ${style.border}`}
                    >
                      {initials}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white tracking-wide">{stock.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {stock.exchange || 'NSE'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/60 text-slate-400 hidden sm:inline">
                          {stock.sector}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-[220px] sm:max-w-xs">{stock.name}</p>
                    </div>
                  </div>

                  {/* Right: Pricing & Add CTA */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-200">
                        {stock.currency}
                        {stock.currentPrice.toFixed(2)}
                      </div>
                      <div
                        className={`text-[11px] font-semibold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {stock.changePercent.toFixed(2)}%
                      </div>
                    </div>

                    {isAlreadyAdded ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>In Watchlist</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAdd(stock)}
                        disabled={isMaxCapacity}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isRecent
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : isMaxCapacity
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20'
                        }`}
                      >
                        {isRecent ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Real-time anomaly scoring activates immediately for added stocks.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
