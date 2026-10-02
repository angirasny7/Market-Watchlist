import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  RefreshCw,
  LogOut,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatRelativeTime } from '../../lib/dateUtils';
import { detectCurrentDevice } from '../../lib/deviceUtils';
import { getNseMarketStatus } from '../../lib/marketHours';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const {
    dashboardData,
    isLoading,
    refreshMarketData,
    watchlist,
    userState,
  } = useMarketStore();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileMenuOpen(false);
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  // Page title mapping
  const pageTitle = useMemo(() => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/feed':
        return 'Attention Feed';
      case '/watchlist':
        return 'Watchlist';
      case '/memory':
        return 'Market Memory';
      case '/highlights':
        return 'Highlights';
      default:
        return 'Smart Market Watchlist';
    }
  }, [location.pathname]);

  // Non-interactive market status derived from NSE IST hours
  const marketStatus = useMemo(() => getNseMarketStatus(), []);

  // Data Freshness & Sync status
  const dataFreshness = dashboardData?.dataFreshness;
  const isStale = Boolean(dataFreshness?.isStale);
  const lastSyncedTime = dataFreshness?.lastSyncedAt
    ? formatRelativeTime(dataFreshness.lastSyncedAt, true)
    : 'recently';

  // Device & session continuity
  const detectedDevice = useMemo(() => detectCurrentDevice(), []);

  const previousLogin =
    user?.previousLoginAt !== undefined
      ? user?.previousLoginAt
      : (dashboardData as any)?.previousLoginAt !== undefined
      ? (dashboardData as any)?.previousLoginAt
      : (dashboardData as any)?.previousSessionAt !== undefined
      ? (dashboardData as any)?.previousSessionAt
      : userState?.previousSessionAt || null;

  const previousSessionTime = previousLogin
    ? formatRelativeTime(previousLogin, false)
    : null;

  const previousDevice = userState?.previousDevice || (dashboardData as any)?.previousDevice;

  const userName = user?.name || (dashboardData as any)?.userName || 'Investor';
  const userEmail = user?.email || (dashboardData as any)?.user?.email || '';

  return (
    <header className="h-14 sm:h-16 px-4 sm:px-6 bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-30 flex items-center justify-between gap-4">
      {/* 1. Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold text-slate-100 truncate tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* 2. Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Market Status (Non-interactive derived from NSE schedule) */}
        <div
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border select-none ${
            marketStatus.isOpen
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
          }`}
          title={marketStatus.subtext}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              marketStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
            }`}
          />
          <span className="hidden xs:inline">{marketStatus.label}</span>
          <span className="xs:hidden">{marketStatus.isOpen ? 'Open' : 'Closed'}</span>
        </div>

        {/* Updated indicator with refresh icon button */}
        <div className="flex items-center gap-1">
          <span
            className={`text-xs px-2 py-0.5 rounded border ${
              isStale
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'text-slate-400 border-transparent hidden sm:inline'
            }`}
            title={dataFreshness?.lastSyncedAt ? `Last synchronized at ${dataFreshness.lastSyncedAt}` : undefined}
          >
            {isStale ? `Stale • ${lastSyncedTime}` : `Updated ${lastSyncedTime}`}
          </span>

          <button
            onClick={() => refreshMarketData()}
            disabled={isLoading}
            aria-label="Refresh market data"
            title="Refresh market data"
            className="p-1.5 rounded-lg border border-border bg-surface text-slate-300 hover:text-white hover:border-slate-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* 3. Notifications Bell Dropdown */}
        <NotificationDropdown />

        {/* 4. Single Unified Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="dialog"
            aria-label="User profile and session menu"
            className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover hover:border-slate-600 transition-colors text-xs text-slate-200"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-semibold text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline font-medium max-w-[100px] truncate">{userName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile & Session Continuity Dropdown */}
          {isProfileMenuOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Profile and session details"
              className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-surface/98 border border-border shadow-2xl backdrop-blur-xl p-4 z-50 animate-fade-in space-y-3.5"
            >
              {/* User Identity Header */}
              <div className="pb-3 border-b border-border/80">
                <div className="font-semibold text-sm text-slate-100">{userName}</div>
                {userEmail && <div className="text-xs text-slate-400 truncate mt-0.5">{userEmail}</div>}
              </div>

              {/* Session Continuity & Device Info */}
              <div className="space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Device & Session Continuity
                </div>

                <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/70 space-y-2 text-xs">
                  {/* Current Device */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{detectedDevice.emoji}</span>
                      <div>
                        <div className="font-medium text-slate-200 flex items-center gap-1">
                          <span>{detectedDevice.name}</span>
                          <span className="text-[10px] text-indigo-400 font-mono">(This device)</span>
                        </div>
                        <div className="text-[11px] text-slate-400">Current Session</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>

                  {/* Previous Session (if available) */}
                  {previousSessionTime && (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Last active on {previousDevice?.deviceName || 'Previous device'}</span>
                      <span className="font-mono text-slate-300">{previousSessionTime}</span>
                    </div>
                  )}

                  {/* Sync status */}
                  <div className="pt-1.5 flex items-center justify-between text-[11px] text-emerald-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Watchlist & reads synced</span>
                    </span>
                    <span className="font-mono text-slate-300">{watchlist.length} stocks</span>
                  </div>
                </div>
              </div>

              {/* Logout Action */}
              <div className="pt-2 border-t border-border/80">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
