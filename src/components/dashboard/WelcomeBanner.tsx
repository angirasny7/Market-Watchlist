import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatLastActiveTimestamp, formatRelativeTime } from '../../lib/dateUtils';

export const WelcomeBanner: React.FC = () => {
  const navigate = useNavigate();
  const { userState, events, insights, marketStatus, dashboardData } = useMarketStore();
  const { user } = useAuthStore();

  const authenticatedName = user?.name || (dashboardData as any)?.userName || userState.userName;

  const rawPreviousLogin =
    user?.previousLoginAt !== undefined
      ? user?.previousLoginAt
      : (dashboardData as any)?.previousLoginAt !== undefined
      ? (dashboardData as any)?.previousLoginAt
      : (dashboardData as any)?.previousSessionAt !== undefined
      ? (dashboardData as any)?.previousSessionAt
      : userState.previousSessionAt !== undefined
      ? userState.previousSessionAt
      : userState.previousLoginAt !== undefined
      ? userState.previousLoginAt
      : null;

  const isFirstSession = !rawPreviousLogin;
  const relativeTime = formatRelativeTime(rawPreviousLogin, true);
  const previousRelativeTime = formatRelativeTime(rawPreviousLogin, false);

  const currentDeviceType =
    userState.currentDevice?.deviceType ||
    (dashboardData as any)?.currentDevice?.deviceType ||
    'Desktop';

  const previousDevice =
    userState.previousDevice ||
    (dashboardData as any)?.previousDevice ||
    null;

  const watchlistEventsCount = events.filter((e) => e.inWatchlist).length;
  const totalEventsCount = events.length;

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
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-hover/80 border border-border text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Smart Market Assistant Active</span>
              <span className="text-slate-400">•</span>
              <span className="text-indigo-300 font-mono text-[11px]">
                {marketStatus === 'REGULAR_OPEN' ? 'Live Session' : 'Market Closed'}
              </span>
            </div>

            {/* Green pulsing Active Now badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Now</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-100 tracking-tight">
            {getGreeting()},{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              {authenticatedName}
            </span>
          </h1>

          {/* User Session Banner / Subtitle */}
          <div className="text-sm sm:text-base font-medium">
            {isFirstSession ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-hover text-slate-100 border border-border/80 font-mono text-xs sm:text-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>First Login Session</span>
              </span>
            ) : (
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-surface-hover text-slate-100 border border-border/80 text-xs sm:text-sm cursor-help"
                title={formatLastActiveTimestamp(rawPreviousLogin)}
              >
                <span className="font-semibold text-slate-100">Welcome back</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-mono">Last visit {relativeTime}</span>
              </div>
            )}
          </div>

          {/* While you were away: breakdown */}
          {!isFirstSession && (
            <div className="p-3.5 rounded-xl bg-surface-subtle/80 border border-border/70 space-y-2 max-w-xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                While you were away:
              </div>
              <ul className="space-y-1 text-xs sm:text-sm text-slate-200">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">•</span>
                  <span className="text-amber-300 font-semibold font-mono">
                    {watchlistEventsCount} watchlist {watchlistEventsCount === 1 ? 'event' : 'events'}
                  </span>
                  <span>detected</span>
                  {totalEventsCount > watchlistEventsCount && (
                    <span className="text-slate-400 text-xs font-mono">({totalEventsCount} total market events)</span>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">•</span>
                  <span className="text-indigo-300 font-semibold font-mono">
                    {totalInsightsCount} causal {totalInsightsCount === 1 ? 'insight' : 'insights'}
                  </span>
                  <span>generated</span>
                </li>
              </ul>
            </div>
          )}

          {/* Device continuity metadata */}
          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Active on:</span>
              <span className="text-slate-200 font-semibold">{currentDeviceType}</span>
            </div>

            {previousDevice && !isFirstSession && (
              <>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Last session:</span>
                  <span className="text-slate-300">
                    {previousDevice.deviceType} {previousRelativeTime ? `(${previousRelativeTime})` : ''}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls & KPI Summary Badge */}
        <div className="flex flex-col gap-3 sm:gap-3.5 w-full sm:w-auto sm:min-w-[280px] lg:w-72 shrink-0">
          <button
            onClick={() => navigate('/feed')}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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

          {criticalCount > 0 && (
            <div className="w-full px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-center justify-center gap-2 font-mono text-center shadow-sm animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{criticalCount} Critical updates require immediate action</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
