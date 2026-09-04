import React from 'react';
import {
  Compass,
  Lightbulb,
  ExternalLink,
  History,
  Calendar,
  Sparkles,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { Drawer, DeltaBadge, PriorityBadge, ConfidenceBadge, EventTypeBadge } from '../common';
import { StockQuote } from '../../types/stock';
import { formatPrice } from '../../lib/utils';
import { useMarketStore } from '../../store/useMarketStore';

interface StockInsightDrawerProps {
  stock: StockQuote | null;
  onClose: () => void;
}

export const StockInsightDrawer: React.FC<StockInsightDrawerProps> = ({
  stock,
  onClose,
}) => {
  const { getEventsByStock, getInsightsByEvent, digests, openDigestDrawer } =
    useMarketStore();

  if (!stock) return null;

  const currency = stock.currency;
  const stockEvents = getEventsByStock(stock.symbol);

  // Section 8: Historical Context - Find digests that reference events for this stock
  const digestMentions = digests.filter((d) =>
    d.eventIds.some((eId) => stockEvents.map((se) => se.id).includes(eId))
  );

  return (
    <Drawer
      isOpen={Boolean(stock)}
      onClose={onClose}
      title={`${stock.name} (${stock.symbol})`}
      subtitle={`Intelligence Timeline • ${stock.sector}`}
      width="lg"
      footer={
        <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>{stockEvents.length} Active Events Monitored</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Instrument Quick Snapshot Card */}
        <div className="p-4 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
          <div>
            <div className="text-2xl font-extrabold font-mono text-slate-100 tabular-numbers">
              {formatPrice(stock.currentPrice, currency)}
            </div>
            <div className="flex items-center gap-2 mt-0.5 font-mono text-xs">
              <DeltaBadge value={stock.changePercent} size="sm" />
              <span className="text-slate-400">
                {stock.changeAmount >= 0 ? '+' : ''}
                {formatPrice(stock.changeAmount, currency)}
              </span>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-slate-400 space-y-0.5">
            <div>52W High: {formatPrice(stock.high52w, currency)}</div>
            <div>52W Low: {formatPrice(stock.low52w, currency)}</div>
          </div>
        </div>

        {/* SECTION 7: STOCK -> EVENTS -> INSIGHTS TIMELINE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Causal Intelligence Timeline</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {stockEvents.length} Signals
            </span>
          </div>

          {stockEvents.length > 0 ? (
            <div className="space-y-4">
              {stockEvents.map((event) => {
                const insights = getInsightsByEvent(event.id);
                const insight = insights[0];

                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3 relative"
                  >
                    {/* Event Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <PriorityBadge priority={event.priority} size="sm" />
                        <EventTypeBadge eventType={event.eventType} />
                        <span className="text-xs font-mono text-slate-400">
                          {event.timestamp}
                        </span>
                      </div>
                      <DeltaBadge value={event.changePercent} size="sm" />
                    </div>

                    {/* What Happened */}
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-mono font-bold text-slate-400 flex items-center gap-1">
                        <BarChart3 className="w-3 h-3 text-slate-400" />
                        <span>What Happened</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">
                        {event.headline}
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {event.whatHappened}
                      </p>
                    </div>

                    {/* Possible Explanation (Joined from Insight) */}
                    {insight && (
                      <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/25 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-indigo-300 flex items-center gap-1 text-[10px] uppercase">
                            <Compass className="w-3 h-3 text-indigo-400" />
                            Possible Explanation
                          </span>
                          <ConfidenceBadge
                            level={insight.confidenceLevel}
                            score={insight.confidenceScore}
                          />
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {insight.explanation}
                        </p>
                        <div className="pt-1.5 text-[10px] text-slate-400 flex items-center justify-between border-t border-indigo-500/15 font-mono">
                          <span>Source: {insight.sourceName}</span>
                          <a
                            href={insight.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                          >
                            <span>Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Why It Matters */}
                    {insight && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3 text-amber-400" />
                          <span>Why It Matters</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {insight.whyItMatters}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-surface-subtle border border-border text-center text-xs text-slate-400 space-y-1 font-mono">
              <p>No active statistical anomalies or filings detected for {stock.symbol}.</p>
              <p className="text-[11px] text-slate-400">Trading within expected volatility limits.</p>
            </div>
          )}
        </div>

        {/* SECTION 8: HISTORICAL CONTEXT - RECENT DIGEST MENTIONS */}
        <div className="space-y-3 pt-3 border-t border-border/80">
          <div className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Recent Historical Digest Mentions</span>
          </div>

          {digestMentions.length > 0 ? (
            <div className="space-y-2.5">
              {digestMentions.map((digest) => (
                <div
                  key={digest.id}
                  className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-200">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      <span>{digest.displayDate}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-slate-400">
                        {digest.title.split('&')[0]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {digest.executiveSummary}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      openDigestDrawer(digest.id);
                    }}
                    className="px-2.5 py-1 rounded-md bg-surface hover:bg-surface-hover border border-border text-[11px] font-medium text-slate-300 hover:text-white shrink-0 flex items-center gap-1 transition-colors"
                  >
                    <BookOpen className="w-3 h-3 text-indigo-400" />
                    <span>Dossier</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-surface-subtle border border-border text-xs text-slate-400 font-mono text-center">
              No recent historical digest archive mentions for {stock.symbol}.
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
};
