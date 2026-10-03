import React from 'react';
import { FeedSummary, FeedTimeWindow } from '../../types/feed';
import {
  CheckCheck,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface FeedHeaderBarProps {
  summary: FeedSummary | null;
  selectedWindow: FeedTimeWindow;
  onSelectWindow: (window: FeedTimeWindow) => void;
  onMarkCaughtUp: () => void;
  isMarkingCaughtUp: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const FeedHeaderBar: React.FC<FeedHeaderBarProps> = ({
  summary,
  selectedWindow,
  onSelectWindow,
  onMarkCaughtUp,
  isMarkingCaughtUp,
  onRefresh,
  isRefreshing,
}) => {
  const windowTabs: { id: FeedTimeWindow; label: string }[] = [
    { id: 'sinceLastVisit', label: 'Since Last Visit' },
    { id: '24h', label: 'Last 24h' },
    { id: '7d', label: 'Last 7d' },
    { id: '30d', label: 'Last 30d' },
  ];

  return (
    <div className="space-y-4 pb-2">
      {/* Top Banner: Title & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
              Attention Feed
            </h1>
            {summary && summary.unreadClusters > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                {summary.unreadClusters} unread
              </span>
            )}
          </div>

          {/* Dynamic Summary Headline */}
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5 font-medium leading-relaxed">
            {summary?.headline || 'Review critical market anomalies and company catalysts across your monitored watchlists.'}
          </p>

          {/* Freshness & Delay metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {summary?.dataFreshness || 'Prices updated just now'}
            </span>
            <span>·</span>
            <span className="px-1.5 py-0.5 rounded bg-surface-subtle text-slate-400 border border-border text-[10px] font-mono">
              {summary?.delayNotice || 'Delayed ~15 min (NSE)'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh feed"
            title="Refresh feed"
            className="p-2.5 rounded-xl bg-surface border border-border hover:border-slate-600 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-indigo-400')} />
          </button>

          <button
            type="button"
            onClick={onMarkCaughtUp}
            disabled={isMarkingCaughtUp || (summary?.unreadClusters === 0)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className={cn('w-4 h-4', isMarkingCaughtUp && 'animate-bounce')} />
            <span>{isMarkingCaughtUp ? 'Marking read...' : "I'm caught up"}</span>
          </button>
        </div>
      </div>

      {/* Time Window Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-border w-fit overflow-x-auto no-scrollbar">
        {windowTabs.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelectWindow(w.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
              selectedWindow === w.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            )}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
};
