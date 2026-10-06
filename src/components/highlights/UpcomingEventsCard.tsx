import React from 'react';
import { Calendar, Tag } from 'lucide-react';
import { MarketHighlightsData } from '../../types/market';

interface UpcomingEventsCardProps {
  events: MarketHighlightsData['upcomingEvents'];
}

export const UpcomingEventsCard: React.FC<UpcomingEventsCardProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return null; // Per requirement: empty sections hidden or cleanly formatted
  }

  const formatEventDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Upcoming';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Upcoming';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3.5">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Upcoming Catalysts (Next 7 Days)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified earnings, dividends, and corporate actions across the universe
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        {events.slice(0, 5).map((evt) => (
          <div
            key={evt.id}
            className="p-3 rounded-xl bg-surface-subtle hover:bg-slate-800/80 border border-border hover:border-slate-600 transition-all flex items-start justify-between gap-3 group"
          >
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  {evt.stockSymbol}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5 text-indigo-400" />
                  {evt.eventType}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-slate-100 transition-colors leading-snug line-clamp-2">
                {evt.title}
              </p>
              {evt.details && (
                <p className="text-[11px] text-slate-400 font-mono line-clamp-1">
                  {evt.details}
                </p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-slate-300 mt-0.5">
              <Calendar className="w-3 h-3 text-indigo-400" />
              <span>{formatEventDate(evt.eventDate)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
