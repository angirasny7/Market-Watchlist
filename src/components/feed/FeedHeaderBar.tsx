import React, { useState, useRef, useEffect } from 'react';
import { FeedSummary, FeedTimeWindow } from '../../types/feed';
import {
  CheckCheck,
  RefreshCw,
  X,
  Clock,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  formatVisitTime,
  formatWindowBaseline,
  formatRelativeTime,
  formatLastActiveTimestamp,
  getUserTimeZone,
  getTimeZoneAbbreviation,
} from '../../lib/dateUtils';

interface FeedHeaderBarProps {
  summary: FeedSummary | null;
  selectedWindow: FeedTimeWindow;
  onSelectWindow: (window: FeedTimeWindow) => void;
  onMarkCaughtUp: () => void;
  isMarkingCaughtUp: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  stockCount?: number;
  serverNowOffsetMs?: number;
}

export const FeedHeaderBar: React.FC<FeedHeaderBarProps> = ({
  summary,
  selectedWindow,
  onSelectWindow,
  onMarkCaughtUp,
  isMarkingCaughtUp,
  onRefresh,
  isRefreshing,
  stockCount = 0,
  serverNowOffsetMs = 0,
}) => {
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [isSessionPopoverOpen, setIsSessionPopoverOpen] = useState(false);
  const [, setTick] = useState(0); // 60s re-render ticker for relative labels

  const statusPopoverRef = useRef<HTMLDivElement>(null);
  const sessionPopoverRef = useRef<HTMLDivElement>(null);

  // Auto-refresh relative labels every 60s without refetching data
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  // Close popovers on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(e.target as Node)) {
        setIsStatusPopoverOpen(false);
      }
      if (sessionPopoverRef.current && !sessionPopoverRef.current.contains(e.target as Node)) {
        setIsSessionPopoverOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsStatusPopoverOpen(false);
        setIsSessionPopoverOpen(false);
      }
    };

    if (isStatusPopoverOpen || isSessionPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStatusPopoverOpen, isSessionPopoverOpen]);

  // Window Tabs with live counts
  const windowTabs: { id: FeedTimeWindow; label: string; count?: number }[] = [
    {
      id: 'toReview',
      label: 'To review',
      count: summary?.windowCounts?.toReview ?? summary?.unreadClusters,
    },
    {
      id: 'sinceLastVisit',
      label: 'Since last visit',
      count: summary?.windowCounts?.sinceLastVisit,
    },
    {
      id: '24h',
      label: 'Last 24h',
      count: summary?.windowCounts?.['24h'],
    },
    {
      id: '7d',
      label: 'Last 7d',
      count: summary?.windowCounts?.['7d'],
    },
    {
      id: '30d',
      label: 'Last 30d',
      count: summary?.windowCounts?.['30d'],
    },
  ];

  // Derive Summary Headline Sentence based on window and data
  const renderSummarySentence = () => {
    const total = summary?.totalInWindow ?? 0;
    const attention = summary?.needAttentionCount ?? 0;
    const stocksStr = `${stockCount} ${stockCount === 1 ? 'stock' : 'stocks'}`;
    const updatesStr = `${total} ${total === 1 ? 'update' : 'updates'}`;

    if (selectedWindow === 'toReview') {
      return `To review: ${updatesStr} across ${stocksStr}${attention > 0 ? ` · ${attention} need${attention === 1 ? 's' : ''} attention` : ''}`;
    }

    if (selectedWindow === 'sinceLastVisit') {
      if (summary?.marketsClosed && total === 0) {
        return 'Markets were closed during this period · News & filing updates shown below';
      }
      const baseline = summary?.lastVisitAt ? formatWindowBaseline(summary.lastVisitAt) : '';
      const prefix = baseline ? `Since your last visit (${baseline} → now)` : 'Since your last visit';
      return `${prefix}: ${updatesStr} across ${stocksStr}${attention > 0 ? ` · ${attention} need${attention === 1 ? 's' : ''} attention` : ''}`;
    }

    if (selectedWindow === '24h') {
      return `Last 24 hours: ${updatesStr} across ${stocksStr}${attention > 0 ? ` · ${attention} need${attention === 1 ? 's' : ''} attention` : ''}`;
    }

    if (selectedWindow === '7d') {
      return `Last 7 days: ${updatesStr} across ${stocksStr}${attention > 0 ? ` · ${attention} need${attention === 1 ? 's' : ''} attention` : ''}`;
    }

    return `Last 30 days: ${updatesStr} across ${stocksStr}${attention > 0 ? ` · ${attention} need${attention === 1 ? 's' : ''} attention` : ''}`;
  };

  const visitTimeInfo = formatVisitTime({
    timestamp: summary?.hasBoundary && !summary?.isFirstSession ? summary?.lastVisitAt : null,
    endReason: summary?.previousSessionEndReason,
    serverNowOffsetMs,
  });

  const userTz = getUserTimeZone();
  const tzAbbr = getTimeZoneAbbreviation(new Date(), userTz);

  return (
    <div className="space-y-3 pb-1">
      {/* 1. Compact Session & Status Strip */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-surface/80 border border-border/80 text-xs text-slate-300">
        {/* Left: Interactive Visit Label + Current Status: Active */}
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap sm:flex-nowrap">
          <div className="relative min-w-0" ref={sessionPopoverRef}>
            <button
              type="button"
              onClick={() => setIsSessionPopoverOpen((prev) => !prev)}
              aria-expanded={isSessionPopoverOpen}
              aria-label="View session visit details"
              className="flex items-center gap-1.5 truncate font-medium hover:text-white transition-colors cursor-pointer text-left focus:outline-none focus-visible:underline"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{visitTimeInfo.label}</span>
            </button>

            {/* Session Visit Popover */}
            {isSessionPopoverOpen && (
              <div className="absolute left-0 top-full mt-2 w-80 p-4 rounded-2xl bg-[#111622] border border-slate-700/90 shadow-2xl shadow-black/95 z-50 space-y-3 animate-fade-in text-left">
                <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Previous Session Details
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSessionPopoverOpen(false)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Previous Login:</span>
                    <span className="font-mono text-slate-200">
                      {summary?.previousSessionStartedAt
                        ? formatLastActiveTimestamp(summary.previousSessionStartedAt, userTz)
                        : 'Earlier Session'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Previous Visit End:</span>
                    <span className="font-mono text-slate-200">
                      {summary?.lastVisitAt
                        ? formatLastActiveTimestamp(summary.lastVisitAt, userTz)
                        : 'Not recorded'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Session End Type:</span>
                    <span className="font-semibold text-slate-200">
                      {summary?.previousSessionEndReason === 'logout'
                        ? 'Manual Logout'
                        : summary?.previousSessionEndReason === 'tab_closed'
                        ? 'Tab Closed'
                        : 'Inactivity Demarcation'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time Zone:</span>
                    <span className="font-mono text-indigo-300">
                      {userTz} ({tzAbbr})
                    </span>
                  </div>
                  <div className="pt-2 text-[11px] text-indigo-300 font-medium border-t border-border/60">
                    Everything after this time appears under 'Since last visit'.
                  </div>
                </div>
              </div>
            )}
          </div>

          <span className="hidden sm:inline text-slate-600">·</span>

          <div className="flex items-center gap-1.5 shrink-0 text-xs">
            <span className="text-slate-400">Current Status:</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>
        </div>

        {/* Right: Delayed Status Pill with Signal Status Popover */}
        <div className="relative flex-shrink-0" ref={statusPopoverRef}>
          <button
            type="button"
            onClick={() => setIsStatusPopoverOpen((prev) => !prev)}
            aria-expanded={isStatusPopoverOpen}
            aria-label="Market and feed sync status"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-surface-subtle border border-border hover:border-slate-600 transition-colors text-slate-300 cursor-pointer"
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                summary?.isDelayed
                  ? 'bg-amber-400'
                  : 'bg-emerald-400 animate-pulse'
              )}
            />
            <span>{summary?.isDelayed ? 'Delayed ~15m' : 'Active'}</span>
          </button>

          {/* Status Popover */}
          {isStatusPopoverOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 p-4 rounded-2xl bg-[#111622] border border-slate-700/90 shadow-2xl shadow-black/95 z-50 space-y-3 animate-fade-in text-left">
              <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Signal & Market Status
                </span>
                <button
                  type="button"
                  onClick={() => setIsStatusPopoverOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="font-semibold text-emerald-400">
                    {summary?.isDelayed ? 'Quotes Delayed ~15 min' : 'Active now'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Synced:</span>
                  <span className="font-mono text-slate-200">
                    {summary?.lastSyncedAt
                      ? formatRelativeTime(summary.lastSyncedAt, false, serverNowOffsetMs)
                      : 'Recently'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Markets:</span>
                  <span
                    className={cn(
                      'font-semibold',
                      summary?.marketsClosed ? 'text-amber-400' : 'text-emerald-400'
                    )}
                  >
                    {summary?.marketsClosed ? 'Markets Closed' : 'Markets Open'}
                  </span>
                </div>
                {summary?.delayNotice && (
                  <div className="pt-1.5 text-[10px] text-slate-400 border-t border-border/60 leading-relaxed">
                    {summary.delayNotice}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Dynamic Summary Line & Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed">
            {renderSummarySentence()}
          </p>
          {summary && summary.unreadClusters > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              {summary.unreadClusters} unread
            </span>
          )}
        </div>

        {/* Action Buttons: Refresh & Mark Caught Up */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh feed"
            title="Refresh feed"
            className="p-2 rounded-xl bg-surface border border-border hover:border-slate-600 text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin text-indigo-400')} />
          </button>

          <button
            type="button"
            onClick={onMarkCaughtUp}
            disabled={isMarkingCaughtUp || summary?.unreadClusters === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className={cn('w-3.5 h-3.5', isMarkingCaughtUp && 'animate-bounce')} />
            <span>{isMarkingCaughtUp ? 'Marking read...' : "I'm caught up"}</span>
          </button>
        </div>
      </div>

      {/* 3. Time Window Tabs with Count Badges */}
      <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-border w-fit overflow-x-auto no-scrollbar">
        {windowTabs.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onSelectWindow(w.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
              selectedWindow === w.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
            )}
          >
            <span>{w.label}</span>
            {w.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                  selectedWindow === w.id
                    ? 'bg-indigo-700/80 text-indigo-100'
                    : 'bg-surface-subtle text-slate-400 border border-border/60'
                )}
              >
                {w.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
