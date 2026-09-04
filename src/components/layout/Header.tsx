import React, { useState } from 'react';
import {
  Clock,
  Laptop,
  Smartphone,
  Tablet,
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

interface HeaderProps {
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const {
    userState,
    marketStatus,
    toggleMarketStatus,
    simulateDeviceSwitch,
    simulateNewSession,
    isLiveMode,
    isLoading,
    refreshMarketData,
  } = useMarketStore();
  const { user, logout } = useAuthStore();

  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);

  // Dynamic user greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'MOBILE':
        return Smartphone;
      case 'TABLET':
        return Tablet;
      default:
        return Laptop;
    }
  };

  const CurrentDeviceIcon = getDeviceIcon(userState.currentDevice.deviceType);

  return (
    <header className="h-16 px-4 sm:px-6 bg-surface/90 backdrop-blur-md border-b border-border flex items-center justify-between sticky top-0 z-30">
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
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="hidden md:inline text-slate-400">Since last visit:</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {userState.lastSeenDisplay}
            </span>
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

        {/* Cross-Device Sync Indicator Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-slate-300 hover:border-slate-600 transition-colors"
          >
            <CurrentDeviceIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden lg:inline text-slate-300">
              {userState.currentDevice.deviceName.split(' ')[0]}
            </span>
            {userState.syncStatus === 'SYNCING' ? (
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Device Switcher Menu */}
          {isDeviceMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDeviceMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface border border-border shadow-2xl p-2 z-50 animate-fade-in">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-border/60 mb-1">
                  Active Devices & Sync Cursors
                </div>

                {userState.allDevices.map((dev) => {
                  const DevIcon = getDeviceIcon(dev.deviceType);
                  return (
                    <button
                      key={dev.deviceId}
                      onClick={() => {
                        simulateDeviceSwitch(dev.deviceId);
                        setIsDeviceMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition-colors',
                        dev.isCurrentDevice
                          ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-300 hover:bg-surface-hover'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <DevIcon className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-medium">{dev.deviceName}</div>
                          <div className="text-[10px] text-slate-400">
                            {dev.lastActive}
                          </div>
                        </div>
                      </div>
                      {dev.isCurrentDevice && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </button>
                  );
                })}

                <div className="mt-2 pt-2 border-t border-border/60">
                  <button
                    onClick={() => {
                      simulateNewSession();
                      setIsDeviceMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-surface-hover hover:bg-surface-active text-xs text-slate-300 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Simulate New Visit</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Logout Button */}
        <button
          onClick={() => logout()}
          title="Sign out of account"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-xs text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
