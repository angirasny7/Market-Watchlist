import React from 'react';
import {
  Star,
  Compass,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { StockQuote } from '../../types/stock';
import { Sparkline, DeltaBadge, ConfidenceBadge, PriorityBadge } from '../common';
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
  const { togglePinStock, getEventsByStock, getInsightsByEvent } = useMarketStore();

  const currency = stock.currency;

  // Relational Joins: Stock -> Events -> Insights
  const stockEvents = getEventsByStock(stock.symbol);
  const hasEvents = stockEvents.length > 0;
  const criticalEvent = stockEvents.find((e) => e.priority === 'CRITICAL');
  const highEvent = stockEvents.find((e) => e.priority === 'HIGH');
  const topPriority = criticalEvent ? 'CRITICAL' : highEvent ? 'HIGH' : stockEvents[0]?.priority;
  const peakScore = Math.max(...stockEvents.map((e) => e.scoring.finalScore), 0);

  const latestEvent = stockEvents[0];
  const latestInsight = latestEvent ? getInsightsByEvent(latestEvent.id)[0] : undefined;

  // 52-Week Position calculation (0% to 100%)
  const range52W = stock.high52w - stock.low52w || 1;
  const position52WPercent = Math.min(
    100,
    Math.max(0, ((stock.currentPrice - stock.low52w) / range52W) * 100)
  );

  const isPositive = stock.changePercent >= 0;

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-surface border border-border hover:border-slate-700 transition-all duration-200 p-5 shadow-sm hover:shadow-md group overflow-hidden">
      <div className="space-y-4 min-w-0">
        {/* 1. CARD HEADER */}
        <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3 min-w-0">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-100 font-sans tracking-tight">
                {stock.name}
              </h3>
              <span className="text-xs font-mono font-medium text-slate-400 bg-surface-subtle px-1.5 py-0.5 rounded border border-border shrink-0">
                {stock.symbol}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {stock.sector}
            </div>
          </div>

          {/* Pin Button */}
          <button
            onClick={() => togglePinStock(stock.symbol)}
            title={stock.isPinned ? 'Unpin Stock' : 'Pin Stock to Top'}
            className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
              stock.isPinned
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-surface-subtle text-slate-400 hover:text-slate-200 border-border'
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                stock.isPinned ? 'fill-amber-300' : ''
              }`}
            />
          </button>
        </div>

        {/* 2. PRICE BLOCK & SPARKLINE ROW */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold font-sans text-slate-100 tabular-numbers tracking-tight truncate">
              {formatPrice(stock.currentPrice, currency)}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 font-mono text-xs">
              <DeltaBadge value={stock.changePercent} size="sm" className="shrink-0" />
              <span className="text-slate-400 text-[11px] whitespace-nowrap">
                {stock.changeAmount >= 0 ? '+' : ''}
                {formatPrice(stock.changeAmount, currency)} today
              </span>
            </div>
          </div>

          {/* Sparkline Trend Graph */}
          <div className="shrink-0 max-w-[45%] flex flex-col items-end">
            <Sparkline
              data={stock.sparkline}
              width={105}
              height={36}
              isPositive={isPositive}
              className="max-w-full"
            />
            <span className="text-[10px] text-slate-400 font-mono mt-1 whitespace-nowrap text-right">
              7-Day Trajectory
            </span>
          </div>
        </div>

        {/* 3. 52-WEEK POSITION PROGRESS BAR */}
        <div className="p-3 rounded-xl bg-surface-subtle/80 border border-border/80 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>52W Position</span>
            <span className="text-slate-300 font-semibold">
              {position52WPercent.toFixed(0)}% of Range
            </span>
          </div>

          {/* Custom Position Bar with Marker */}
          <div className="relative h-2 w-full rounded-full bg-surface overflow-hidden border border-border/60">
            <div
              style={{ width: `${position52WPercent}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                position52WPercent > 80
                  ? 'bg-emerald-500'
                  : position52WPercent < 20
                  ? 'bg-rose-500'
                  : 'bg-indigo-500'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>Low: {formatPrice(stock.low52w, currency)}</span>
            <span>High: {formatPrice(stock.high52w, currency)}</span>
          </div>
        </div>

        {/* 4. ATTENTION LAYER */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border text-xs">
          <div className="flex items-center gap-2">
            {topPriority ? (
              <PriorityBadge priority={topPriority} size="sm" />
            ) : (
              <span className="text-[11px] text-slate-400 font-mono">
                No Active Anomalies
              </span>
            )}

            {hasEvents && (
              <span className="text-[11px] font-mono text-slate-300">
                {stockEvents.length} {stockEvents.length === 1 ? 'Signal' : 'Signals'}
              </span>
            )}
          </div>

          {hasEvents && peakScore > 0 && (
            <div className="text-[11px] font-mono flex items-center gap-1">
              <span className="text-slate-400">Score:</span>
              <span className="font-bold text-rose-300">{peakScore.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* 5. LATEST INSIGHT CALLOUT (JOINED FROM INSIGHT) */}
        {latestInsight ? (
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-indigo-300 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <Compass className="w-3 h-3 text-indigo-400" />
                Latest Verified Insight
              </span>
              <ConfidenceBadge
                level={latestInsight.confidenceLevel}
                score={latestInsight.confidenceScore}
              />
            </div>

            <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
              "{latestInsight.explanation}"
            </p>

            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-indigo-500/15 font-mono">
              <span>Source: {latestInsight.sourceName}</span>
              <span className="text-indigo-300">Confidence: {Math.round(latestInsight.confidenceScore * 100)}%</span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-surface-subtle border border-border/60 text-[11px] text-slate-400 font-mono">
            Steady baseline • Monitoring filings for catalysts
          </div>
        )}
      </div>

      {/* 6. CARD FOOTER ACTIONS */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <button
          onClick={() => onViewInsights(stock)}
          className="flex-1 py-1.5 px-3 rounded-lg bg-surface-hover hover:bg-surface-active border border-border text-xs font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-1 transition-colors group/btn"
        >
          <span>View Insights</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>

        {/* Remove Stock Button */}
        <button
          onClick={() => onRemoveStock(stock)}
          title={`Remove ${stock.symbol} from Watchlist`}
          className="p-1.5 rounded-lg bg-surface hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-border transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
