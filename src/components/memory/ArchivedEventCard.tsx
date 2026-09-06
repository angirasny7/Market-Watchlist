import React from 'react';
import {
  Clock,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { ArchivedMarketEvent } from '../../types/memory';
import { EventTypeBadge, PriorityBadge, DeltaBadge } from '../common';
import { MarketMoodBadge, MarketMoodType } from './MarketMoodBadge';

interface ArchivedEventCardProps {
  event: ArchivedMarketEvent;
  onMarkRead?: (eventId: string) => void;
}

export const ArchivedEventCard: React.FC<ArchivedEventCardProps> = ({ event, onMarkRead }) => {
  const isSaved = event.memoryType === 'SAVED';

  // Format archived or saved time
  const formattedActionAt = (() => {
    const timeStr = isSaved ? (event.savedAt || event.timestamp) : (event.readAt || event.timestamp);
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  })();

  const explanation =
    event.primaryInsight?.possibleExplanation ||
    (event.primaryInsight as any)?.explanation ||
    (event.insights?.[0] as any)?.possibleExplanation ||
    (event.insights?.[0] as any)?.explanation ||
    'Archived catalyst event from market attention feed.';

  const confidence =
    event.primaryInsight?.confidenceScore !== undefined
      ? Math.round(Number(event.primaryInsight.confidenceScore) * 100)
      : event.insights?.[0]?.confidenceScore !== undefined
      ? Math.round(Number(event.insights[0].confidenceScore) * 100)
      : 85;

  const isAMZN = event.stockSymbol === 'AMZN';
  const currency = isAMZN ? '$' : '₹';

  return (
    <article className="rounded-2xl bg-surface border border-border/80 hover:border-indigo-500/40 p-5 sm:p-6 transition-all duration-200 space-y-4 shadow-sm hover:shadow-md overflow-hidden">
      {/* Header: Company, Symbol, Catalyst, and Read Timestamp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <EventTypeBadge eventType={event.eventType} />
          {event.priority && <PriorityBadge priority={event.priority} size="sm" />}

          <div className="flex items-center gap-1.5 ml-1">
            <span className="font-extrabold text-sm sm:text-base text-slate-100 tracking-tight">
              {event.companyName}
            </span>
            <span className="text-xs font-mono font-medium text-slate-400 bg-surface-subtle px-2 py-0.5 rounded border border-border">
              {event.stockSymbol}
            </span>
          </div>

          {event.inWatchlist && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
              Watchlist
            </span>
          )}
        </div>

        {/* Archived / Saved Timestamp & Badge */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          {isSaved ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Archived</span>
            </span>
          )}
          <div className="flex items-center gap-1 text-slate-400" title={isSaved ? "Time event was saved for later" : "Time event was marked as read"}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{formattedActionAt}</span>
          </div>
        </div>
      </div>

      {/* Main Content: Headline, Price & Mood */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
            {event.headline}
          </h4>
          {event.whatHappened && (
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {event.whatHappened}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right font-mono">
            <div className="text-sm sm:text-base font-bold text-slate-100">
              {currency}{event.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <DeltaBadge value={event.changePercent} size="sm" />
          </div>
          {event.marketMood && (
            <MarketMoodBadge mood={event.marketMood as MarketMoodType} size="sm" />
          )}
        </div>
      </div>

      {/* Explanation & Confidence Row */}
      <div className="p-3.5 rounded-xl bg-surface-subtle/80 border border-border/70 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Market Context & Explanation</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-border">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">Confidence:</span>
            <span className="text-emerald-400 font-bold">{confidence}%</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {explanation}
        </p>

        {event.primaryInsight?.whyItMatters && (
          <div className="text-xs text-slate-400 pt-1 border-t border-border/50">
            <span className="font-semibold text-slate-300 font-mono">Why It Matters: </span>
            <span>{event.primaryInsight.whyItMatters}</span>
          </div>
        )}
      </div>

      {/* CTA for Saved Items: Convert Saved -> Archived */}
      {isSaved && onMarkRead && (
        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3">
          <span className="text-[11px] font-mono text-slate-400">
            Saved for later inspection. Ready to archive?
          </span>
          <button
            onClick={() => onMarkRead(event.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-all shadow-sm"
            title="Mark this saved event as read and move to Archived"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark as Read</span>
          </button>
        </div>
      )}
    </article>
  );
};
