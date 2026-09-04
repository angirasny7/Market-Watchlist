import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Calendar,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { useAuthStore } from '../../store/useAuthStore';

export const WelcomeBanner: React.FC = () => {
  const navigate = useNavigate();
  const { userState, events, insights, marketStatus, dashboardData, simulateNewSession } = useMarketStore();
  const { user } = useAuthStore();

  const authenticatedName = user?.name || (dashboardData as any)?.userName || userState.userName;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const unreadEventsCount = events.filter((e) => !e.read).length;
  const criticalCount = events.filter((e) => e.priority === 'CRITICAL').length;
  const totalInsightsCount = Object.keys(insights).length;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface-subtle to-surface border border-border p-6 sm:p-8 shadow-xl">
      {/* Subtle background ambient glows */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Greeting and Context */}
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-hover/80 border border-border text-xs font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Smart Market Assistant Active</span>
            <span className="text-slate-400">•</span>
            <span className="text-indigo-300 font-mono text-[11px]">
              {marketStatus === 'REGULAR_OPEN' ? 'Live Session' : 'Market Closed'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
            {getGreeting()},{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              {authenticatedName}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            You were away since{' '}
            <span className="text-slate-100 font-medium font-mono text-xs sm:text-sm bg-surface-hover px-2 py-0.5 rounded border border-border/80">
              {userState.lastSeenDisplay}
            </span>
            .{' '}
            {events.filter((e) => e.inWatchlist).length > 0 ? (
              <>
                Over this window,{' '}
                <span className="text-amber-300 font-semibold font-mono">
                  {events.filter((e) => e.inWatchlist).length} watchlist events
                </span>{' '}
                ({events.length} total) and{' '}
                <span className="text-indigo-300 font-semibold font-mono">
                  {totalInsightsCount} causal insights
                </span>{' '}
                were detected.
              </>
            ) : (
              <>
                Over this window,{' '}
                <span className="text-emerald-400 font-semibold font-mono">
                  {events.length} meaningful events
                </span>{' '}
                and{' '}
                <span className="text-indigo-300 font-semibold font-mono">
                  {totalInsightsCount} causal insights
                </span>{' '}
                were detected.
              </>
            )}
          </p>

          {/* Device & Sync metadata pill */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Last synced:</span>
              <span className="text-slate-300 font-medium">
                {userState.currentDevice.deviceName} • 2 minutes ago
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Snapshot delta:</span>
              <span className="text-slate-300">5-day historical baseline</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls & KPI Summary Badge */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <button
            onClick={() => navigate('/feed')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>Review Attention Feed</span>
            {unreadEventsCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-900/80 text-[11px] font-mono border border-indigo-400/30">
                {unreadEventsCount} New
              </span>
            )}
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <button
            onClick={simulateNewSession}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-hover hover:bg-surface-active text-slate-300 hover:text-slate-100 text-xs font-medium border border-border transition-colors"
            title="Simulate refreshing session timestamp to now"
          >
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span>Simulate Visit Refresh</span>
          </button>

          {criticalCount > 0 && (
            <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-center justify-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              <span>{criticalCount} Critical updates require immediate action</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
