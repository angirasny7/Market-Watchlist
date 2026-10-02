import React from 'react';
import {
  Star,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { StockQuote } from '../../types/stock';
import { formatPrice } from '../../lib/utils';
import { useMarketStore } from '../../store/useMarketStore';

interface StockCardProps {
  stock: StockQuote;
  onViewInsights: (stock: StockQuote) => void;
  onRemoveStock: (stock: StockQuote) => void;
}

export const StockCard: React.FC<StockCardProps> = ({
  stock,
  onViewInsights,
  onRemoveStock,
}) => {
  const { togglePinStock, getEventsByStock } = useMarketStore();
  const currency = stock.currency || '₹';
  const isGain = stock.changePercent >= 0;
  const stockEvents = getEventsByStock(stock.symbol);

  // 52-Week Position calculation
  const range52W = stock.high52w - stock.low52w || 1;
  const position52WPercent = Math.min(
    100,
    Math.max(0, ((stock.currentPrice - stock.low52w) / range52W) * 100)
  );

  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface border border-border hover:border-slate-700 transition-all p-4 sm:p-5 shadow-sm space-y-4">
      {/* 1. Header: Name, Symbol, Pin */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 text-sm sm:text-base truncate">
            {stock.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="font-mono text-slate-300 font-medium">{stock.symbol}</span>
            <span>•</span>
            <span>{stock.sector}</span>
          </div>
        </div>

        <button
          onClick={() => togglePinStock(stock.symbol)}
          aria-label={stock.isPinned ? `Unpin ${stock.symbol}` : `Pin ${stock.symbol}`}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
            stock.isPinned
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              : 'bg-surface-subtle text-slate-500 hover:text-slate-300 border-border/60'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${stock.isPinned ? 'fill-amber-400' : ''}`} />
        </button>
      </div>

      {/* 2. Price and Change */}
      <div className="flex items-baseline justify-between gap-2 pt-1">
        <div className="font-mono font-bold text-lg sm:text-xl text-slate-100 tabular-numbers">
          {formatPrice(stock.currentPrice, currency)}
        </div>
        <div
          className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded ${
            isGain
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-rose-500/10 text-rose-400'
          }`}
        >
          {isGain ? (
            <>
              <span>▲</span>
              <span>+{stock.changePercent.toFixed(2)}%</span>
            </>
          ) : (
            <>
              <span>▼</span>
              <span>{stock.changePercent.toFixed(2)}%</span>
            </>
          )}
        </div>
      </div>

      {/* 3. 52-Week Range */}
      <div className="space-y-1 pt-1 border-t border-border/50">
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>52W L: {formatPrice(stock.low52w, currency)}</span>
          <span>52W H: {formatPrice(stock.high52w, currency)}</span>
        </div>
        <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden border border-border/60">
          <div
            style={{ width: `${position52WPercent}%` }}
            className={`h-full rounded-full ${
              position52WPercent > 80
                ? 'bg-emerald-500'
                : position52WPercent < 20
                ? 'bg-rose-500'
                : 'bg-indigo-500'
            }`}
          />
        </div>
      </div>

      {/* 4. Footer Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
        <button
          onClick={() => onViewInsights(stock)}
          className="flex-1 py-1.5 px-3 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border text-xs font-medium text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-colors"
        >
          <span>Details</span>
          {stockEvents.length > 0 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded-full font-mono">
              {stockEvents.length}
            </span>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          onClick={() => onRemoveStock(stock)}
          aria-label={`Remove ${stock.symbol}`}
          title="Remove from watchlist"
          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StockCard;
