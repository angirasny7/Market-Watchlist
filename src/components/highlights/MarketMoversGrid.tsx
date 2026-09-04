import React, { useState } from 'react';
import { Zap, Plus, Check, Eye, Layers } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { MarketMover } from '../../types/market';
import { StockQuote } from '../../types/stock';
import { DeltaBadge } from '../common';
import { stockCatalog } from '../../data/mockStocks';

type MoverFilter = 'ALL' | 'WATCHLIST' | 'DISCOVER';

export const MarketMoversGrid: React.FC = () => {
  const { marketMovers, watchlist, addStock } = useMarketStore();
  const [filter, setFilter] = useState<MoverFilter>('ALL');
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(new Set());

  // Check if a symbol is in the live watchlist (either by mock state or added by user)
  const isStockInWatchlist = (symbol: string) => {
    return watchlist.some((s) => s.symbol === symbol);
  };

  const filteredMovers = marketMovers.filter((mover) => {
    const inLiveWatchlist = isStockInWatchlist(mover.symbol);
    if (filter === 'WATCHLIST') return inLiveWatchlist;
    if (filter === 'DISCOVER') return !inLiveWatchlist;
    return true;
  });

  const handleAddMoverToWatchlist = (mover: MarketMover) => {
    // Check if in stockCatalog
    const catalogItem = stockCatalog.find((s) => s.symbol === mover.symbol);

    const stockToAdd: StockQuote = catalogItem || {
      symbol: mover.symbol,
      name: mover.name,
      currency: '₹',
      currentPrice: mover.price,
      changeAmount: (mover.price * mover.changePercent) / 100,
      changePercent: mover.changePercent,
      lastUpdated: 'Just added',
      sector: mover.symbol === 'SUZLON' ? 'Energy & Petrochemicals' : 'Consumer Goods',
      volume: 12500000,
      avgVolume20D: 4500000,
      marketCap: '₹1.15 Lakh Cr',
      peRatio: 38.4,
      high52w: mover.price * 1.05,
      low52w: mover.price * 0.65,
      tags: ['Market Mover', 'Volume Spike'],
      sparkline: [
        { date: 'Day -6', price: mover.price * 0.93 },
        { date: 'Day -5', price: mover.price * 0.94 },
        { date: 'Day -4', price: mover.price * 0.95 },
        { date: 'Day -3', price: mover.price * 0.96 },
        { date: 'Day -2', price: mover.price * 0.97 },
        { date: 'Yesterday', price: mover.price * 0.98 },
        { date: 'Today', price: mover.price },
      ],
    };

    addStock(stockToAdd);
    setAddedSymbols((prev) => new Set(prev).add(mover.symbol));
  };

  return (
    <div className="space-y-4">
      {/* Section Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Significant Market Movers
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Heavy volume institutional activity and catalyst-driven breakouts across the broader market
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Movers' },
              { id: 'WATCHLIST', label: 'In Watchlist' },
              { id: 'DISCOVER', label: 'Discover New' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === tab.id
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMovers.map((mover) => {
          const inWatchlist = isStockInWatchlist(mover.symbol);
          const wasJustAdded = addedSymbols.has(mover.symbol);

          return (
            <div
              key={mover.symbol}
              className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all flex flex-col justify-between space-y-3.5"
            >
              <div className="space-y-2.5">
                {/* Header: Symbol, Name & Watchlist status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-slate-100">
                        {mover.symbol}
                      </span>
                      {inWatchlist ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          In Watchlist
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Market Discovery
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {mover.name}
                    </p>
                  </div>

                  <DeltaBadge value={mover.changePercent} size="sm" />
                </div>

                {/* Price & Volume Ratio */}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-bold font-mono text-slate-100">
                    ₹{mover.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>

                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700/60 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-400" />
                    {mover.volumeRatio}
                  </span>
                </div>

                {/* Catalyst Explanation */}
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border/80">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {mover.catalystSummary}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                {inWatchlist ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Monitored in Watchlist</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAddMoverToWatchlist(mover)}
                    disabled={wasJustAdded}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors"
                  >
                    {wasJustAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Added to Watchlist!</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Track in Watchlist</span>
                      </>
                    )}
                  </button>
                )}

                {inWatchlist && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Eye className="w-3 h-3 text-slate-400" />
                    Active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
