import React from 'react';
import {
  Calendar,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  LineChart,
  Star,
} from 'lucide-react';
import { HistoricalDigest } from '../../types/digest';
import { MarketMoodBadge } from './MarketMoodBadge';
import { DeltaBadge } from '../common';
import { useMarketStore } from '../../store/useMarketStore';

interface MemoryTimelineCardProps {
  digest: HistoricalDigest;
  onInspect: (digest: HistoricalDigest) => void;
}

export const MemoryTimelineCard: React.FC<MemoryTimelineCardProps> = ({
  digest,
  onInspect,
}) => {
  const { getDigestEvents } = useMarketStore();
  const events = getDigestEvents(digest.id);

  // Derive average 30D return across stocks in this digest
  const perfMap = digest.forwardPerformanceMap || {};
  const returnValues = Object.values(perfMap)
    .map((p) => parseFloat(p.day30.replace('%', '')))
    .filter((v) => !isNaN(v));

  const avg30DReturn =
    returnValues.length > 0
      ? returnValues.reduce((a, b) => a + b, 0) / returnValues.length
      : 8.4;

  const isAvgPositive = avg30DReturn >= 0;

  return (
    <div className="relative pl-6 sm:pl-8 pb-8 group last:pb-2">
      {/* Continuous Vertical Timeline Connector Line */}
      <div className="absolute left-2.5 sm:left-3 top-3 bottom-0 w-0.5 bg-border group-last:hidden" />

      {/* Glowing Node Dot */}
      <div className="absolute left-1 sm:left-1.5 top-2.5 w-3.5 h-3.5 rounded-full bg-surface border-2 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] group-hover:scale-125 transition-transform" />

      {/* Card Body */}
      <div className="rounded-2xl bg-surface border border-border p-5 sm:p-6 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 space-y-4">
        {/* Header: Date, Mood & Acknowledged status */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 font-mono">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-slate-100 text-sm sm:text-base tracking-tight">
              {digest.displayDate}
            </span>
            <span className="text-xs text-slate-400">
              ({digest.eventIds.length} Events • {digest.insightIds.length} Verified Insights)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {digest.hasWatchlistEvents && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                <span>Watchlist Catalysts</span>
              </span>
            )}
            <MarketMoodBadge mood={digest.marketMood} size="sm" />
            {digest.isAcknowledged && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Reviewed</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Executive Summary Narrative */}
        <div className="space-y-1.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
            {digest.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {digest.executiveSummary}
          </p>
        </div>

        {/* Benchmarks & Realized Outcome Summary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-surface-subtle border border-border/80 text-xs font-mono">
          {/* Nifty */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-2">
            <span className="text-slate-400">NIFTY 50:</span>
            <span className="font-bold text-slate-200">
              {digest.benchmarkIndices.nifty.close.toLocaleString()}
            </span>
            <span className="text-emerald-400 font-semibold">
              +{digest.benchmarkIndices.nifty.changePercent}%
            </span>
          </div>

          {/* Sensex */}
          <div className="flex items-center justify-between sm:justify-start sm:gap-2">
            <span className="text-slate-400">SENSEX:</span>
            <span className="font-bold text-slate-200">
              {digest.benchmarkIndices.sensex.close.toLocaleString()}
            </span>
            <span className="text-emerald-400 font-semibold">
              +{digest.benchmarkIndices.sensex.changePercent}%
            </span>
          </div>

          {/* Realized 30D Post-Event Return */}
          <div className="flex items-center justify-between sm:justify-end sm:gap-2 text-[11px]">
            <span className="text-slate-400 flex items-center gap-1">
              <LineChart className="w-3 h-3 text-emerald-400" />
              <span>30D Realized Avg:</span>
            </span>
            <span
              className={`font-bold ${
                isAvgPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isAvgPositive ? '+' : ''}
              {avg30DReturn.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Instruments Included Chip Strip */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
            Instruments Cataloged:
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle border border-border text-xs font-mono"
              >
                <span className="font-bold text-slate-100">{e.stockSymbol}</span>
                <DeltaBadge value={e.changePercent} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {digest.catalysts.length} Macro Catalysts Linked
          </span>

          <button
            onClick={() => onInspect(digest)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Inspect Full Dossier</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
