import React from 'react';
import { Target } from 'lucide-react';
import { MarketHighlightsData } from '../../types/market';

interface UserExposureCardProps {
  exposure: MarketHighlightsData['exposure'];
}

export const UserExposureCard: React.FC<UserExposureCardProps> = ({ exposure }) => {
  if (!exposure) {
    return null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-surface border border-indigo-500/30 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <Target className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100">
            Your Watchlist Exposure
          </h2>
          <p className="text-xs text-indigo-300/80 mt-0.5">
            Objective cross-reference of your monitored portfolio against today's market drivers
          </p>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium pt-1">
        {exposure.summarySentence}
      </p>

      {/* Exposure Metrics Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-indigo-500/20 text-xs font-mono">
        <div className="p-2 rounded-lg bg-surface/60 border border-border/80 flex flex-col">
          <span className="text-[10px] text-slate-400">Movers Overlap</span>
          <span className="font-bold text-cyan-300 mt-0.5">
            {exposure.watchedMoversCount} Stocks
          </span>
        </div>

        {exposure.topSector && (
          <div className="p-2 rounded-lg bg-surface/60 border border-border/80 flex flex-col">
            <span className="text-[10px] text-slate-400">Top Sector</span>
            <span className="font-bold text-slate-200 mt-0.5 truncate">
              {exposure.topSector} ({exposure.topSectorWeight}%)
            </span>
          </div>
        )}

        {exposure.topSectorDayChange !== null && (
          <div className="p-2 rounded-lg bg-surface/60 border border-border/80 flex flex-col">
            <span className="text-[10px] text-slate-400">Sector Day Move</span>
            <span
              className={`font-bold mt-0.5 ${
                exposure.topSectorDayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {exposure.topSectorDayChange >= 0 ? '+' : ''}
              {exposure.topSectorDayChange}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
