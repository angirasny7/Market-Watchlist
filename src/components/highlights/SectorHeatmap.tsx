import React, { useState } from 'react';
import {
  PieChart,
  FastForward,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SectorSummary } from '../../types/market';
import { DeltaBadge } from '../common';

interface SectorHeatmapProps {
  sectors: SectorSummary[];
}

export const SectorHeatmap: React.FC<SectorHeatmapProps> = ({ sectors }) => {
  const [sortBy, setSortBy] = useState<'performance' | 'name'>('performance');
  const [showTooltip, setShowTooltip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedSectors = [...sectors].sort((a, b) => {
    if (sortBy === 'performance') {
      return b.changePercent - a.changePercent;
    }
    return a.sector.localeCompare(b.sector);
  });

  const displayedSectors = isExpanded ? sortedSectors : sortedSectors.slice(0, 6);

  const getMomentumBadge = (momentum: SectorSummary['momentum']) => {
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

  const maxAbsChange = Math.max(
    ...sectors.map((s) => Math.abs(s.changePercent)),
    1
  );

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Sector Performance Heatmap
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sector average performance computed from universe constituent weights
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tooltip button */}
          <div className="relative">
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 font-mono transition-colors"
              aria-label="How to read sector heatmap"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline text-[11px]">How to read</span>
            </button>

            {showTooltip && (
              <div className="absolute right-0 top-6 z-20 w-64 sm:w-72 p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 shadow-xl space-y-1.5 animate-fade-in">
                <div className="font-semibold text-slate-100">About Sector Heatmap:</div>
                <p className="leading-relaxed">
                  Highlights industry sector rotation. Shows the equal-weighted day return across sector constituents, leading stock contributors, and quantitative momentum shifts.
                </p>
              </div>
            )}
          </div>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {displayedSectors.map((sector) => {
          const isPos = sector.changePercent >= 0;
          const barWidthPercent = Math.min(
            100,
            Math.max(12, (Math.abs(sector.changePercent) / maxAbsChange) * 100)
          );

          return (
            <div
              key={sector.sector}
              className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all space-y-3 overflow-hidden"
            >
              {/* Top Row: Sector Name & Delta */}
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {sector.sector}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                    Lead: <span className="text-slate-200 font-medium">{sector.leadStock}</span> ({sector.leadStockChange >= 0 ? '+' : ''}{sector.leadStockChange}%)
                  </div>
                </div>

                <DeltaBadge value={sector.changePercent} size="sm" className="shrink-0" />
              </div>

              {/* Visual Performance Gauge Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Relative Strength ({sector.stockCount} stocks)</span>
                  <span>{sector.changePercent > 0 ? '+' : ''}{sector.changePercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
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

      {/* View All Toggle Option */}
      {sortedSectors.length > 6 && (
        <div className="pt-1 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border hover:border-slate-600 text-xs font-medium text-slate-300 hover:text-white transition-all font-mono shadow-sm hover:shadow"
          >
            <span>
              {isExpanded
                ? 'Show less (2 rows)'
                : `View all (${sortedSectors.length} sectors)`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};
