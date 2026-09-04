import React from 'react';
import { BellRing, Flame, AlertTriangle, CheckCheck, Sparkles } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export const FeedHeader: React.FC = () => {
  const { events, markAllEventsRead } = useMarketStore();

  const totalEvents = events.length;
  const criticalCount = events.filter((e) => e.priority === 'CRITICAL').length;
  const highCount = events.filter((e) => e.priority === 'HIGH').length;
  const unreadCount = events.filter((e) => !e.read).length;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border">
      {/* Title & Subtitle */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <BellRing className="w-4 h-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            Attention Feed
          </h1>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            Core Engine
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Important developments since your last visit, prioritized by market significance and causal conviction.
        </p>
      </div>

      {/* Live Metrics Row & Quick Actions */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Metric: Total Events */}
        <div className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono">
          <span className="text-slate-400">Total: </span>
          <span className="font-bold text-slate-100">{totalEvents}</span>
        </div>

        {/* Metric: Critical Events */}
        <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs font-mono flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-rose-300 font-semibold">{criticalCount} Critical</span>
        </div>

        {/* Metric: High Priority */}
        <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs font-mono flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-300 font-semibold">{highCount} High</span>
        </div>

        {/* Metric: Unread Events */}
        <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-xs font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-indigo-300 font-semibold">{unreadCount} Unread</span>
        </div>

        {/* Action: Mark All as Read */}
        {unreadCount > 0 && (
          <button
            onClick={markAllEventsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-xs font-medium text-slate-300 hover:text-white border border-border transition-colors ml-auto sm:ml-0"
            title="Mark all events as read"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>
    </div>
  );
};
