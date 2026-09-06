import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  Menu,
  ChevronDown,
  Activity,
  LogOut,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';
import { formatLastActiveTimestamp, formatRelativeTime } from '../../lib/dateUtils';
import { detectCurrentDevice, getDeviceEmoji } from '../../lib/deviceUtils';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  const {
    userState,
    marketStatus,
    toggleMarketStatus,
    simulateNewSession,
    isLiveMode,
    isLoading,
    refreshMarketData,
    dashboardData,
    watchlist,
    events,
  } = useMarketStore();
  const { user, logout } = useAuthStore();
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);

  const previousLogin =
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
  const formattedPreviousLogin = formatLastActiveTimestamp(previousLogin);

  // Dynamic user greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Automatic browser User-Agent device detection
  const detectedDevice = useMemo(() => {
    return detectCurrentDevice();
  }, []);

  // Compute previous session details
  const previousSession = useMemo(() => {
    if (!previousLogin) return null;

    const prevDev = userState.previousDevice;
    const devType = prevDev?.deviceType || 'Mobile';
    const devName = prevDev?.deviceName || 'Mobile Phone';
    const emoji = getDeviceEmoji(devType);

    return {
      deviceName: devName,
      deviceType: devType,
      emoji,
      time: formatRelativeTime(previousLogin, false),
      formattedTime: formattedPreviousLogin,
    };
  }, [previousLogin, userState.previousDevice, formattedPreviousLogin]);

  return (
    <header className="min-h-16 h-auto md:h-16 px-4 sm:px-6 bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-30 py-2.5 md:py-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-0">
      {/* ========================================================================= */}
      {/* MOBILE HEADER (< md breakpoint) - DEDICATED CLEAN TWO-ROW LAYOUT          */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-2.5 w-full md:hidden">
        {/* Top Control Bar: Mobile Menu Toggle & Action Buttons */}
        <div className="flex items-center justify-between w-full">
          <button
            onClick={onToggleMobileSidebar}
            className="p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-hover"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {/* Refresh Live Data Button */}
            <button
              onClick={() => refreshMarketData()}
              disabled={isLoading}
              title="Refresh live intelligence from PostgreSQL"
              className="p-1.5 rounded-lg bg-surface border border-border text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-indigo-400')} />
            </button>

            {/* Market Status Pill */}
            <button
              onClick={toggleMarketStatus}
              title="Click to toggle simulated market session status (Open/Closed)"
              className={cn(
                'flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full border transition-all',
                marketStatus === 'REGULAR_OPEN'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  marketStatus === 'REGULAR_OPEN'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                )}
              />
              <span>{marketStatus === 'REGULAR_OPEN' ? 'OPEN' : 'CLOSED'}</span>
            </button>

            {/* Session Continuity Indicator Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-slate-300 hover:border-slate-600 transition-colors"
                title="Session Continuity & Device Status"
              >
                <span className="text-xs">{detectedDevice.emoji}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {/* Session Continuity Card (Mobile Popup) */}
              {isDeviceMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDeviceMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface/95 border border-border shadow-2xl backdrop-blur-xl p-3 z-50 animate-fade-in space-y-2.5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                          Session Continuity
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                        Live
                      </span>
                    </div>

                    {/* Current Device Section */}
                    <div className="p-2 rounded-xl bg-surface-subtle border border-border/70 space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Current Device
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{detectedDevice.emoji}</span>
                          <div>
                            <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                              <span>{detectedDevice.name}</span>
                              <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                Current
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              This Browser Session
                            </div>
                          </div>
                        </div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                    </div>

                    {/* Last Session / Fallback Section */}
                    <div className="p-2 rounded-xl bg-surface-subtle border border-border/70 space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {previousSession ? 'Last Session' : 'Session Status'}
                      </div>
                      {previousSession ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{previousSession.emoji}</span>
                            <div>
                              <div className="text-xs font-semibold text-slate-200">
                                {previousSession.deviceName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {previousSession.time}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            Synced
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">✨</span>
                            <div>
                              <div className="text-xs font-semibold text-slate-200">
                                First Login Session
                              </div>
                              <div className="text-[10px] text-emerald-400 font-mono">
                                Active Now
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status: Everything synced successfully */}
                    <div className="px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <div className="text-[11px] leading-tight">
                        <span className="font-semibold block text-emerald-300">
                          Everything synced successfully
                        </span>
                        <span className="text-[10px] text-emerald-400/80">
                          Portfolio & market state preserved
                        </span>
                      </div>
                    </div>

                    {/* Intelligence Snapshot */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/60">
                      <div className="p-1.5 rounded-lg bg-surface border border-border/60 text-center">
                        <div className="text-[10px] text-slate-400">Watchlist</div>
                        <div className="text-xs font-bold text-slate-100 font-mono">
                          {watchlist.length} Stocks
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-surface border border-border/60 text-center">
                        <div className="text-[10px] text-slate-400">Attention Feed</div>
                        <div className="text-xs font-bold text-slate-100 font-mono">
                          {events.length} Events
                        </div>
                      </div>
                    </div>

                    {/* Session Refresh / Visit Action */}
                    <div className="pt-0.5">
                      <button
                        onClick={() => {
                          simulateNewSession();
                          setIsDeviceMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-hover hover:bg-surface-active text-xs text-slate-300 hover:text-white transition-colors border border-border/60 font-medium"
                      >
                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Simulate Session Visit</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Logout Button */}
            <button
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
              title="Sign out of account"
              className="p-1.5 rounded-lg bg-surface border border-border text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* User Information Bar (< md) */}
        <div className="flex flex-col gap-1 w-full">
          {/* Row 1: User Greeting */}
          <h1 className="text-sm font-semibold text-slate-100 truncate">
            {getGreeting()}, {user?.name || userState.userName}
          </h1>

          {/* Row 2: Status Badges & Activity Indicators */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              Pro Trader
            </span>

            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <Clock className="w-3 h-3 text-slate-400" />
              <span
                className="text-slate-200 font-mono text-[11px] font-medium"
                title={formattedPreviousLogin}
              >
                {previousLogin ? `Last active: ${formatRelativeTime(previousLogin, true)}` : 'First Login Session'}
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP / TABLET HEADER (>= md breakpoint) - 100% UNCHANGED               */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between w-full h-16">
        {/* Left: Mobile Toggle & Greeting */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-hover lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-slate-100">
                {getGreeting()}, {user?.name || userState.userName}
              </h1>
              <span className="hidden sm:inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Pro Trader
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline text-slate-400">
                  {previousLogin ? 'Last active:' : 'Session:'}
                </span>
                <span
                  className="text-slate-200 font-mono text-[11px] font-medium"
                  title={formattedPreviousLogin}
                >
                  {previousLogin ? formatRelativeTime(previousLogin, false) : 'First Login Session'}
                </span>
              </div>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Status: Active Now</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Data Sync, Market Status, Device Sync & Refresh */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live PostgreSQL vs Offline Indicator */}
          <div
            className={cn(
              'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border',
              isLiveMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            )}
            title={isLiveMode ? 'Connected to live PostgreSQL intelligence engine' : 'Running in offline cached mode'}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isLiveMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              )}
            />
            <span>{isLiveMode ? 'Live PostgreSQL' : 'Offline Cache'}</span>
          </div>

          {/* Refresh Live Data Button */}
          <button
            onClick={() => refreshMarketData()}
            disabled={isLoading}
            title="Refresh live intelligence from PostgreSQL"
            className="p-1.5 rounded-lg bg-surface border border-border text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-indigo-400')} />
          </button>

          {/* Market Status Pill */}
          <button
            onClick={toggleMarketStatus}
            title="Click to toggle simulated market session status (Open/Closed)"
            className={cn(
              'flex items-center gap-1.5 text-xs font-mono font-medium px-2.5 py-1 rounded-full border transition-all',
              marketStatus === 'REGULAR_OPEN'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                marketStatus === 'REGULAR_OPEN'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              )}
            />
            <span className="hidden sm:inline">Market</span>
            <span>{marketStatus === 'REGULAR_OPEN' ? 'OPEN' : 'CLOSED'}</span>
          </button>

          {/* Session Continuity Indicator Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-slate-300 hover:border-slate-600 transition-colors"
              title="Session Continuity & Device Status"
            >
              <span className="text-xs">{detectedDevice.emoji}</span>
              <span className="hidden lg:inline text-slate-300 font-medium">
                {detectedDevice.name}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Session Continuity Card */}
            {isDeviceMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDeviceMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface/95 border border-border shadow-2xl backdrop-blur-xl p-3 z-50 animate-fade-in space-y-2.5">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                        Session Continuity
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-medium">
                      Live
                    </span>
                  </div>

                  {/* Current Device Section */}
                  <div className="p-2 rounded-xl bg-surface-subtle border border-border/70 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Current Device
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{detectedDevice.emoji}</span>
                        <div>
                          <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{detectedDevice.name}</span>
                            <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              Current
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            This Browser Session
                          </div>
                        </div>
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                  </div>

                  {/* Last Session / Fallback Section */}
                  <div className="p-2 rounded-xl bg-surface-subtle border border-border/70 space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {previousSession ? 'Last Session' : 'Session Status'}
                    </div>
                    {previousSession ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{previousSession.emoji}</span>
                          <div>
                            <div className="text-xs font-semibold text-slate-200">
                              {previousSession.deviceName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {previousSession.time}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Synced
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <div>
                            <div className="text-xs font-semibold text-slate-200">
                              First Login Session
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              Active Now
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Active
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status: Everything synced successfully */}
                  <div className="px-2.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <div className="text-[11px] leading-tight">
                      <span className="font-semibold block text-emerald-300">
                        Everything synced successfully
                      </span>
                      <span className="text-[10px] text-emerald-400/80">
                        Portfolio & market state preserved
                      </span>
                    </div>
                  </div>

                  {/* Intelligence Snapshot */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/60">
                    <div className="p-1.5 rounded-lg bg-surface border border-border/60 text-center">
                      <div className="text-[10px] text-slate-400">Watchlist</div>
                      <div className="text-xs font-bold text-slate-100 font-mono">
                        {watchlist.length} Stocks
                      </div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface border border-border/60 text-center">
                      <div className="text-[10px] text-slate-400">Attention Feed</div>
                      <div className="text-xs font-bold text-slate-100 font-mono">
                        {events.length} Events
                      </div>
                    </div>
                  </div>

                  {/* Session Refresh / Visit Action */}
                  <div className="pt-0.5">
                    <button
                      onClick={() => {
                        simulateNewSession();
                        setIsDeviceMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-hover hover:bg-surface-active text-xs text-slate-300 hover:text-white transition-colors border border-border/60 font-medium"
                    >
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Simulate Session Visit</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Logout Button */}
          <button
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            title="Sign out of account"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
