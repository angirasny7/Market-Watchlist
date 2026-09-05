import React from 'react';
import { History, Bookmark, CheckCircle2, Layers, Clock, Shield } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export interface MarketMemoryHeaderProps {
  totalCount?: number;
  savedCount?: number;
  archivedCount?: number;
  symbolsCoveredCount?: number;
  lastAddedAt?: string | null;
}

export const MarketMemoryHeader: React.FC<MarketMemoryHeaderProps> = ({
  totalCount: propTotal,
  savedCount: propSaved,
  archivedCount: propArchived,
  symbolsCoveredCount: propSymbols,
  lastAddedAt,
}) => {
  const { totalMemoryCount, savedEventsCount, archivedEventsCount } = useMarketStore();

  const total = propTotal !== undefined ? propTotal : totalMemoryCount;
  const saved = propSaved !== undefined ? propSaved : savedEventsCount;
  const archived = propArchived !== undefined ? propArchived : archivedEventsCount;
  const symbolsCount = propSymbols !== undefined ? propSymbols : 0;

  // Format last added timestamp
  const formatLastAdded = (isoString?: string | null) => {
    if (!isoString) return 'None yet';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';

    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4 pb-4 border-b border-border">
      {/* Title & Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Market Memory
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Personal Knowledge Repository
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Your personal repository of saved and archived market intelligence.
          </p>
        </div>

        {/* Isolation Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-mono text-slate-300">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>User Vault:</span>
          <span className="text-emerald-400 font-semibold">Private & Encrypted</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Total Preserved Memories */}
        <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Total Memories</span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-slate-100">
            {total}
          </div>
        </div>

        {/* Metric 2: Saved For Later */}
        <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Saved For Later</span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-amber-400">
            {saved}
          </div>
        </div>

        {/* Metric 3: Archived (Read) */}
        <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Archived (Read)</span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
            {archived}
          </div>
        </div>

        {/* Metric 4: Watchlist Symbols Covered */}
        <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Symbols Covered</span>
          </div>
          <div className="font-mono text-lg sm:text-xl font-bold text-cyan-300">
            {symbolsCount}
          </div>
        </div>

        {/* Metric 5: Last Memory Added */}
        <div className="p-3.5 rounded-xl bg-surface border border-border flex flex-col justify-between space-y-1 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Last Added</span>
          </div>
          <div className="font-mono text-sm sm:text-base font-bold text-slate-200 truncate">
            {formatLastAdded(lastAddedAt)}
          </div>
        </div>
      </div>
    </div>
  );
};
