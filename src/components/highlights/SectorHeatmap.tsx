import React, { useState } from 'react';
import {
  PieChart,
  TrendingUp,
  FastForward,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { SectorPerformance } from '../../types/market';
import { DeltaBadge } from '../common';

export const SectorHeatmap: React.FC = () => {
  const { sectorPerformance } = useMarketStore();
  const [sortBy, setSortBy] = useState<'performance' | 'name'>('performance');

  const sortedSectors = [...sectorPerformance].sort((a, b) => {
    if (sortBy === 'performance') {
      return b.changePercent - a.changePercent;
    }
    return a.sector.localeCompare(b.sector);
  });

  const getMomentumBadge = (momentum: SectorPerformance['momentum']) => {
    switch (momentum) {
      case 'ACCELERATING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FastForward className="w-3 h-3" />
            ACCELERATING
          </span>
        );
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <CheckCircle2 className="w-3 h-3" />
            STABLE
          </span>
        );
      case 'WEAKENING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            WEAKENING
          </span>
        );
      default:
        return null;
    }
  };

  // Find max absolute percentage to normalize bar widths
  const maxAbsChange = Math.max(
    ...sectorPerformance.map((s) => Math.abs(s.changePercent)),
    1
  );

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Sector Rotation & Momentum
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Capital flows across industry sectors with leading driver equities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSortBy(sortBy === 'performance' ? 'name' : 'performance')
            }
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border hover:border-slate-600 text-xs font-medium text-slate-300 transition-colors"
          >
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>Sort: {sortBy === 'performance' ? 'Performance' : 'Name'}</span>
          </button>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sortedSectors.map((sector) => {
          const isPos = sector.changePercent >= 0;
          const barWidthPercent = Math.min(
            100,
            Math.max(12, (Math.abs(sector.changePercent) / maxAbsChange) * 100)
          );

          return (
            <div
              key={sector.sector}
              className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all space-y-3"
            >
              {/* Top Row: Sector Name & Delta */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {sector.sector}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Lead: <span className="text-slate-200 font-medium">{sector.leadStock}</span>
                  </div>
                </div>

                <DeltaBadge value={sector.changePercent} size="sm" />
              </div>

              {/* Visual Performance Gauge Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Relative Strength</span>
                  <span>{sector.changePercent > 0 ? '+' : ''}{sector.changePercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isPos ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${barWidthPercent}%` }}
                  />
                </div>
              </div>

              {/* Bottom Row: Momentum Badge */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-[10px] font-mono text-slate-400">
                  Momentum
                </span>
                {getMomentumBadge(sector.momentum)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Macro Commentary Footnote */}
      <div className="p-3.5 rounded-xl bg-surface/60 border border-border/80 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
          <TrendingUp className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-slate-100">Rotation Insight:</strong> Institutional capital is actively rotating into high-beta cyclical sectors (Automobile, IT) driven by strong export guidance and lower crude input costs, while defensive consumer FMCG is temporarily underperforming.
        </p>
      </div>
    </div>
  );
};
