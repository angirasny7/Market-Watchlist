import React from 'react';
import { Activity, Clock, AlertCircle } from 'lucide-react';
import { MarketHighlightsData } from '../../types/market';

interface MarketPulseCardProps {
  pulse: MarketHighlightsData['pulse'];
  freshness: MarketHighlightsData['freshness'];
}

export const MarketPulseCard: React.FC<MarketPulseCardProps> = ({ pulse, freshness }) => {
  const formatTimeAgo = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins <= 0) return 'Just now';
      if (mins === 1) return '1 min ago';
      return `${mins} min ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-3.5">
      {/* Top row: Pulse indicator & Exchange status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Market Pulse & Status
          </span>
        </div>

        {/* Exchange status chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {pulse.exchanges.map((ex) => {
            const isOpen = ex.status === 'OPEN';
            return (
              <div
                key={ex.exchange}
                className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-1 rounded-full border ${
                  isOpen
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                }`}
                title={`Trading Hours: ${ex.tradingHours}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span>{ex.exchange}:</span>
                <span className="font-bold">{isOpen ? 'OPEN' : 'CLOSED'}</span>
              </div>
            );
          })}

          {/* Freshness Chip */}
          <div className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-surface-subtle text-slate-400 border border-border">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>
              Updated {formatTimeAgo(freshness.lastSyncedAt)} · ~{freshness.delayMinutes}m delayed
            </span>
          </div>
        </div>
      </div>

      {/* Rule-based Summary Sentence */}
      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
        {pulse.summarySentence}
      </p>

      {/* Stale Warning Banner if applicable */}
      {freshness.isStale && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Market quote synchronization is delayed. Displaying last verified closing numbers.</span>
        </div>
      )}
    </div>
  );
};
