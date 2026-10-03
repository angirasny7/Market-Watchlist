import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, RefreshCw, CheckCircle2, ChevronRight, Bell, BookOpen } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatRelativeTime } from '../../lib/dateUtils';
import { formatPrice } from '../../lib/utils';
import { DashboardSkeleton, ErrorState } from '../common';

export const SimpleDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    dashboardData,
    events,
    watchlist,
    isLoading,
    isError,
    errorMessage,
    refreshMarketData,
    markEventRead,
  } = useMarketStore();

  const authenticatedName = user?.name || (dashboardData as any)?.userName || 'Investor';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const dataFreshness = dashboardData?.dataFreshness;
  const isStale = Boolean(dataFreshness?.isStale);
  const lastSyncedRelative = dataFreshness?.lastSyncedAt
    ? formatRelativeTime(dataFreshness.lastSyncedAt, true)
    : 'recently';

  // Watchlist events filtered to unread, prioritized by attention score
  const attentionEvents = events
    .filter((e) => e.inWatchlist && !e.read)
    .sort((a, b) => b.scoring.finalScore - a.scoring.finalScore)
    .slice(0, 3);

  const getPriorityLabel = (priority: string, score: number) => {
    if (score >= 80 || priority === 'CRITICAL') return { label: 'Urgent', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    if (score >= 65 || priority === 'HIGH') return { label: 'Important', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    if (score >= 50) return { label: 'Worth a look', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };
    return { label: 'FYI', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
  };

  if (isError && watchlist.length === 0) {
    return (
      <div className="py-8">
        <ErrorState
          title="Unable to load dashboard"
          message={errorMessage || 'Could not connect to market intelligence services.'}
          onRetry={() => refreshMarketData()}
          isRetrying={isLoading}
        />
      </div>
    );
  }

  if (isLoading && !dashboardData && watchlist.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* 1. Neutral Staleness Banner (when data is stale) */}
      {isStale && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span>Data last updated {lastSyncedRelative}, refreshing...</span>
          </div>
          <button
            onClick={() => refreshMarketData()}
            disabled={isLoading}
            className="text-xs font-medium underline hover:text-amber-200 transition-colors shrink-0 ml-2"
          >
            Refresh now
          </button>
        </div>
      )}

      {/* 2. Calm Greeting & One-line Summary */}
      <section className="space-y-1 pt-1">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 tracking-tight">
          {getGreeting()}, {authenticatedName}
        </h1>
        <p className="text-sm text-slate-400">
          {attentionEvents.length > 0 ? (
            `${attentionEvents.length} item${attentionEvents.length === 1 ? '' : 's'} need your attention in your tracked stocks.`
          ) : !isStale ? (
            'No significant changes since your last visit. Markets are steady across your watchlist.'
          ) : (
            'Fetching latest updates for your tracked watchlist stocks...'
          )}
        </p>
      </section>

      {/* 3. "Needs your attention" Top 3 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-slate-200 flex items-center gap-2">
            <span>Needs your attention</span>
            {attentionEvents.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono">
                {attentionEvents.length}
              </span>
            )}
          </h2>
          <Link
            to="/feed"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>View feed</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {attentionEvents.length > 0 ? (
          <div className="space-y-2.5">
            {attentionEvents.map((event) => {
              const priorityInfo = getPriorityLabel(event.priority, event.scoring.finalScore);
              const isGain = event.changePercent >= 0;
              const stock = watchlist.find((s) => s.symbol === event.stockSymbol);
              const currency = stock?.currency || '₹';

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl bg-surface border border-border/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${priorityInfo.color}`}>
                        {priorityInfo.label}
                      </span>
                      <span className="font-semibold text-slate-100 text-sm">{event.companyName}</span>
                      <span className="text-xs font-mono text-slate-400 bg-surface-subtle px-1.5 py-0.2 rounded border border-border/60">
                        {event.stockSymbol}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 truncate">{event.headline}</p>

                    <p className="text-xs text-slate-400 line-clamp-1">
                      {event.enrichment?.summary || event.whatHappened}
                    </p>
                  </div>

                  <div className="flex items-center sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-100 font-mono">
                        {formatPrice(event.price, currency)}
                      </div>
                      <div
                        className={`text-xs font-medium font-mono flex items-center justify-end gap-0.5 ${
                          isGain ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        <span>{isGain ? '▲ +' : '▼ '}</span>
                        <span>{Math.abs(event.changePercent).toFixed(2)}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => markEventRead(event.id)}
                      className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-surface-subtle hover:bg-surface-hover border border-border/60 transition-colors"
                      title="Mark as read"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-surface/50 border border-border/60 text-center space-y-1.5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-200">
              {!isStale ? 'No significant changes since your last visit' : 'Awaiting data synchronization'}
            </p>
            <p className="text-xs text-slate-400">
              {!isStale
                ? 'Your tracked stocks stayed within normal volatility boundaries.'
                : 'Connecting to market feeds to check for new developments.'}
            </p>
          </div>
        )}
      </section>

      {/* 4. Watchlist Snapshot (Clean list) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-slate-200">Watchlist snapshot</h2>
          <Link
            to="/watchlist"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
          >
            <span>Manage ({watchlist.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {watchlist.length > 0 ? (
          <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border/60 shadow-sm">
            {watchlist.slice(0, 5).map((stock) => {
              const isGain = stock.changePercent >= 0;
              const currency = stock.currency || '₹';

              return (
                <div
                  key={stock.symbol}
                  className="p-3 sm:px-4 flex items-center justify-between hover:bg-surface-hover transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-slate-100 text-sm truncate">{stock.name}</span>
                      <span className="text-xs font-mono text-slate-400">{stock.symbol}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{stock.sector}</span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-semibold text-slate-100">
                      {formatPrice(stock.currentPrice, currency)}
                    </div>
                    <div
                      className={`text-xs font-medium font-mono flex items-center justify-end gap-0.5 ${
                        isGain ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <span>{isGain ? '▲ +' : '▼ '}</span>
                      <span>{Math.abs(stock.changePercent).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-surface border border-border text-center space-y-2">
            <p className="text-sm text-slate-300">Your watchlist is empty.</p>
            <Link
              to="/watchlist"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
            >
              Add stocks
            </Link>
          </div>
        )}
      </section>

      {/* 5. Two Clean Link Tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        <Link
          to="/feed"
          className="p-4 rounded-xl bg-surface border border-border hover:border-slate-600 transition-all group flex items-start gap-3.5 shadow-sm"
        >
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-sm text-slate-200 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
              <span>Attention Feed</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review full explanations, catalysts, and evidence sources.
            </p>
          </div>
        </Link>

        <Link
          to="/memory"
          className="p-4 rounded-xl bg-surface border border-border hover:border-slate-600 transition-all group flex items-start gap-3.5 shadow-sm"
        >
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-sm text-slate-200 group-hover:text-emerald-300 transition-colors flex items-center gap-1">
              <span>Market Memory</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Browse historical session dossiers and past market changes.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
};

export default SimpleDashboard;
