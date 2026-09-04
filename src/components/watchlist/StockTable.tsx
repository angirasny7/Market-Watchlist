import React from 'react';
import {
  Star,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { StockQuote } from '../../types/stock';
import { DeltaBadge, PriorityBadge } from '../common';
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
  const { togglePinStock, getEventsByStock, getInsightsByEvent } = useMarketStore();

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-subtle/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">Pin</th>
              <th className="py-3 px-4">Instrument</th>
              <th className="py-3 px-4 text-right">Price</th>
              <th className="py-3 px-4 text-right">Change</th>
              <th className="py-3 px-4">52W Range</th>
              <th className="py-3 px-4 text-center">Active Signal</th>
              <th className="py-3 px-4 text-center">Score</th>
              <th className="py-3 px-4">Latest Verified Insight</th>
              <th className="py-3 px-4">Updated</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {stocks.map((stock) => {
              const currency = stock.currency;
              const stockEvents = getEventsByStock(stock.symbol);
              const criticalEvent = stockEvents.find((e) => e.priority === 'CRITICAL');
              const highEvent = stockEvents.find((e) => e.priority === 'HIGH');
              const topPriority = criticalEvent ? 'CRITICAL' : highEvent ? 'HIGH' : stockEvents[0]?.priority;
              const peakScore = Math.max(...stockEvents.map((e) => e.scoring.finalScore), 0);

              const latestEvent = stockEvents[0];
              const latestInsight = latestEvent ? getInsightsByEvent(latestEvent.id)[0] : undefined;

              const range52W = stock.high52w - stock.low52w || 1;
              const posPercent = Math.min(
                100,
                Math.max(0, ((stock.currentPrice - stock.low52w) / range52W) * 100)
              );

              return (
                <tr
                  key={stock.symbol}
                  className="hover:bg-surface-hover/70 transition-colors group"
                >
                  {/* Pin */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => togglePinStock(stock.symbol)}
                      className={`p-1 rounded transition-colors ${
                        stock.isPinned
                          ? 'text-amber-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          stock.isPinned ? 'fill-amber-400' : ''
                        }`}
                      />
                    </button>
                  </td>

                  {/* Instrument */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-100 font-sans tracking-tight">
                        {stock.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {stock.symbol}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {stock.sector}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 tabular-numbers">
                    {formatPrice(stock.currentPrice, currency)}
                  </td>

                  {/* Change */}
                  <td className="py-3.5 px-4 text-right">
                    <DeltaBadge value={stock.changePercent} size="sm" />
                  </td>

                  {/* 52W Range Meter */}
                  <td className="py-3.5 px-4 w-44">
                    <div className="space-y-1 font-mono text-[10px]">
                      <div className="flex justify-between text-slate-400">
                        <span>{formatPrice(stock.low52w, currency)}</span>
                        <span className="text-slate-300 font-semibold">{posPercent.toFixed(0)}%</span>
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

                  {/* Active Signal */}
                  <td className="py-3.5 px-4 text-center">
                    {topPriority ? (
                      <PriorityBadge priority={topPriority} size="sm" />
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">
                        Normal
                      </span>
                    )}
                  </td>

                  {/* Score */}
                  <td className="py-3.5 px-4 text-center font-mono">
                    {peakScore > 0 ? (
                      <span
                        className={`font-bold ${
                          peakScore >= 85
                            ? 'text-rose-400'
                            : peakScore >= 70
                            ? 'text-amber-400'
                            : 'text-indigo-300'
                        }`}
                      >
                        {peakScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Latest Insight */}
                  <td className="py-3.5 px-4 max-w-xs">
                    {latestInsight ? (
                      <div className="space-y-1">
                        <p className="text-slate-200 line-clamp-1 text-xs">
                          {latestInsight.explanation}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span>{latestInsight.sourceName}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">
                            {Math.round(latestInsight.confidenceScore * 100)}% Conf.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">
                        No catalysts reported
                      </span>
                    )}
                  </td>

                  {/* Last Updated */}
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {stock.lastUpdated}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onViewInsights(stock)}
                        className="px-2.5 py-1 rounded-md bg-surface-subtle hover:bg-surface-hover text-slate-300 hover:text-white border border-border text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>Insights</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>

                      <button
                        onClick={() => onRemoveStock(stock)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove Stock"
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
