import React from 'react';
import {
  Star,
  Trash2,
  Info,
} from 'lucide-react';
import { StockQuote } from '../../types/stock';
import { formatPrice } from '../../lib/utils';
import { useMarketStore } from '../../store/useMarketStore';

interface StockTableProps {
  stocks: StockQuote[];
  onViewInsights: (stock: StockQuote) => void;
  onRemoveStock: (stock: StockQuote) => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  stocks,
  onViewInsights,
  onRemoveStock,
}) => {
  const { togglePinStock, getEventsByStock } = useMarketStore();

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-subtle/70 text-xs text-slate-400 font-medium">
              <th className="py-3 px-3 w-10 text-center">Pin</th>
              <th className="py-3 px-4">Company</th>
              <th className="py-3 px-4 text-right">Market Price</th>
              <th className="py-3 px-4 text-right">Day Change</th>
              <th className="py-3 px-4 hidden md:table-cell">52W Range</th>
              <th className="py-3 px-4 text-center hidden sm:table-cell">Events</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {stocks.map((stock) => {
              const currency = stock.currency || '₹';
              const isGain = stock.changePercent >= 0;
              const stockEvents = getEventsByStock(stock.symbol);
              const unreadEvents = stockEvents.filter((e) => !e.read);

              const range52W = stock.high52w - stock.low52w || 1;
              const posPercent = Math.min(
                100,
                Math.max(0, ((stock.currentPrice - stock.low52w) / range52W) * 100)
              );

              return (
                <tr
                  key={stock.symbol}
                  className="hover:bg-surface-hover/60 transition-colors group"
                >
                  {/* Pin Toggle */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => togglePinStock(stock.symbol)}
                      aria-label={stock.isPinned ? `Unpin ${stock.symbol}` : `Pin ${stock.symbol}`}
                      className={`p-1 rounded-md transition-colors ${
                        stock.isPinned
                          ? 'text-amber-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 ${stock.isPinned ? 'fill-amber-400' : ''}`}
                      />
                    </button>
                  </td>

                  {/* Company Name & Symbol */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-100 text-sm">
                          {stock.name}
                        </span>
                        {unreadEvents.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" title="New alert" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-300 font-medium">{stock.symbol}</span>
                        <span>•</span>
                        <span>{stock.sector}</span>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-mono font-bold text-slate-100 text-sm tabular-numbers">
                      {formatPrice(stock.currentPrice, currency)}
                    </span>
                  </td>

                  {/* Day Change with ▲/▼ and percentage */}
                  <td className="py-3.5 px-4 text-right">
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
                  </td>

                  {/* 52-Week Range */}
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <div className="space-y-1 w-36">
                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>{formatPrice(stock.low52w, currency)}</span>
                        <span>{formatPrice(stock.high52w, currency)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden border border-border/60">
                        <div
                          style={{ width: `${posPercent}%` }}
                          className={`h-full rounded-full ${
                            posPercent > 80
                              ? 'bg-emerald-500'
                              : posPercent < 20
                              ? 'bg-rose-500'
                              : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Event Count */}
                  <td className="py-3.5 px-4 text-center hidden sm:table-cell">
                    {stockEvents.length > 0 ? (
                      <span className="text-xs text-slate-300 bg-surface-subtle px-2 py-0.5 rounded-full border border-border">
                        {stockEvents.length} {stockEvents.length === 1 ? 'event' : 'events'}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onViewInsights(stock)}
                        aria-label={`View insights for ${stock.symbol}`}
                        className="p-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover text-slate-300 hover:text-white border border-border text-xs font-medium flex items-center gap-1 transition-colors"
                        title="View details & insights"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Details</span>
                      </button>

                      <button
                        onClick={() => onRemoveStock(stock)}
                        aria-label={`Remove ${stock.symbol} from watchlist`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockTable;
