import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { PriorityBadge, EventTypeBadge, DeltaBadge } from '../common';
import { formatPrice } from '../../lib/utils';

export const AttentionFeedPreview: React.FC = () => {
  const navigate = useNavigate();
  const { events, watchlist, markEventRead } = useMarketStore();

  // Strictly use watchlist events
  const topEvents = watchlist.length === 0 ? [] : events
    .filter((e) => e.inWatchlist)
    .sort((a, b) => {
      const priorityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const diff = priorityWeights[b.priority] - priorityWeights[a.priority];
      if (diff !== 0) return diff;
      return b.scoring.finalScore - a.scoring.finalScore;
    })
    .slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-rose-500/10 text-rose-400">
              <BellRing className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              Attention Feed Preview
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Top market signals requiring your evaluation, ordered by Attention Score
          </p>
        </div>

        <button
          onClick={() => navigate('/feed')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>View Full Feed</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Events List Container or Empty State */}
      {topEvents.length === 0 ? (
        <div className="p-8 rounded-2xl bg-surface border border-border text-center space-y-2">
          <p className="text-sm font-semibold text-slate-300">No tracked stocks yet.</p>
          <p className="text-xs text-slate-400">Add stocks to your watchlist to monitor real-time attention signals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topEvents.map((event) => (
            <div
              key={event.id}
              className={`p-4 rounded-xl bg-surface border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 hover:bg-surface-hover ${
                !event.read ? 'border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.07)]' : 'border-border'
              }`}
            >
              {/* Left: Metadata, Symbol, Badges & Headline */}
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge priority={event.priority} size="sm" />
                  <EventTypeBadge eventType={event.eventType} />
                  <span className="font-extrabold text-sm text-slate-100 font-sans tracking-wide">
                    {event.companyName}
                  </span>
                  <span className="text-xs font-mono font-medium text-slate-400 bg-surface-subtle px-1.5 py-0.5 rounded border border-border">
                    {event.stockSymbol}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-snug">
                  {event.headline}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{event.timestamp}</span>
                  </span>
                  <span>•</span>
                  <span>Score: {event.scoring?.finalScore ? event.scoring.finalScore.toFixed(0) : 'N/A'}</span>
                </div>
              </div>

              {/* Right: Metrics, Price Delta & Action */}
              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-100 font-mono">
                    {formatPrice(event.price)}
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <DeltaBadge
                      value={event.changePercent}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!event.read && (
                    <button
                      onClick={() => markEventRead(event.id)}
                      title="Mark as Read"
                      className="p-1.5 rounded-lg bg-surface-subtle hover:bg-surface-active text-slate-400 hover:text-emerald-400 transition-colors border border-border"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => navigate('/feed')}
                    className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
