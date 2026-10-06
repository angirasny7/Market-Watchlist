import React, { useState } from 'react';
import { Zap, Plus, Check, Eye, Layers } from 'lucide-react';
import { MarketHighlightsData, MarketMoverItem } from '../../types/market';
import { DeltaBadge } from '../common';
import { useMarketStore } from '../../store/useMarketStore';

interface MarketMoversGridProps {
  movers: MarketHighlightsData['movers'];
}

type RegionTab = 'india' | 'us';
type CategoryTab = 'gainers' | 'losers' | 'mostActive';

export const MarketMoversGrid: React.FC<MarketMoversGridProps> = ({ movers }) => {
  const [region, setRegion] = useState<RegionTab>('india');
  const [category, setCategory] = useState<CategoryTab>('gainers');
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);

  const { addStockToActiveWatchlist, watchlistOverview } = useMarketStore();

  const isStockInWatchlist = (symbol: string, defaultInWatchlist: boolean) => {
    if (watchlistOverview?.stocks) {
      return watchlistOverview.stocks.some((s) => s.symbol === symbol);
    }
    return defaultInWatchlist;
  };

  const handleTrackStock = async (symbol: string) => {
    try {
      setAddingSymbol(symbol);
      await addStockToActiveWatchlist(symbol);
    } finally {
      setAddingSymbol(null);
    }
  };

  const currentList: MarketMoverItem[] = movers[region][category] || [];

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Significant Market Movers
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Top gainers, losers, and abnormal volume leaders across the market universe
            </p>
          </div>
        </div>

        {/* Region & Category Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Region selector */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
            <button
              onClick={() => setRegion('india')}
              className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                region === 'india'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🇮🇳 India (NSE)
            </button>
            <button
              onClick={() => setRegion('us')}
              className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                region === 'us'
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🇺🇸 US Markets
            </button>
          </div>

          {/* Category selector */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-0.5">
            <button
              onClick={() => setCategory('gainers')}
              className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                category === 'gainers'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gainers
            </button>
            <button
              onClick={() => setCategory('losers')}
              className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                category === 'losers'
                  ? 'bg-rose-500/20 text-rose-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Losers
            </button>
            <button
              onClick={() => setCategory('mostActive')}
              className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                category === 'mostActive'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Most Active
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Movers (Max 5 rows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {currentList.map((mover) => {
          const inWatchlist = isStockInWatchlist(mover.symbol, mover.isInWatchlist);
          const isAdding = addingSymbol === mover.symbol;
          const currency = mover.exchange === 'NSE' || mover.exchange === 'BSE' ? '₹' : '$';

          return (
            <div
              key={mover.symbol}
              className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all flex flex-col justify-between space-y-3.5 overflow-hidden"
            >
              <div className="space-y-2.5 min-w-0">
                {/* Header: Symbol, Name & Watchlist status */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold font-mono text-slate-100 shrink-0">
                        {mover.symbol}
                      </span>
                      {inWatchlist ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                          In Watchlist
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          Universe
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {mover.companyName}
                    </p>
                  </div>

                  <DeltaBadge value={mover.changePercent} size="sm" className="shrink-0" />
                </div>

                {/* Price & Volume Ratio */}
                <div className="flex items-baseline justify-between pt-1 gap-2 min-w-0 border-t border-border/50">
                  <span className="text-base sm:text-lg font-bold font-mono text-slate-100 truncate">
                    {currency}{mover.currentPrice > 0 ? mover.currentPrice.toLocaleString() : '—'}
                  </span>

                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700/60 flex items-center gap-1 shrink-0">
                    <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
                    Vol: {mover.volumeRatio}
                  </span>
                </div>

                {/* Sector tag */}
                <div className="text-[11px] font-mono text-slate-400">
                  Sector: <span className="text-slate-300">{mover.sector}</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                {inWatchlist ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Tracked in Watchlist</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleTrackStock(mover.symbol)}
                    disabled={isAdding}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors disabled:opacity-60"
                  >
                    {isAdding ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span>Adding...</span>
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
