import React, { useState } from 'react';
import { Compass, HelpCircle, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import { MarketBreadth } from '../../types/market';

interface MarketBreadthCardProps {
  breadth: MarketBreadth;
}

export const MarketBreadthCard: React.FC<MarketBreadthCardProps> = ({ breadth }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const advancerWidth = breadth.total > 0 ? (breadth.advancers / breadth.total) * 100 : 50;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-4">
      {/* Header with info tooltip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Compass className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Market Breadth
          </h2>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 font-mono transition-colors"
            aria-label="How to read market breadth"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-[11px]">How to read</span>
          </button>

          {showTooltip && (
            <div className="absolute right-0 top-6 z-20 w-64 sm:w-72 p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 shadow-xl space-y-1.5 animate-fade-in">
              <div className="font-semibold text-slate-100">About Market Breadth:</div>
              <p className="leading-relaxed">
                Measures internal market strength across the monitored universe. When advancers significantly outnumber decliners (&gt;60%), market rallies have broad institutional participation rather than narrow single-stock leadership.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Stats: Advancers vs Decliners */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            {breadth.advancers} Advancers ({breadth.advancerPercent}%)
          </span>
          <span className="flex items-center gap-1 text-rose-400 font-bold">
            <ArrowDownRight className="w-3.5 h-3.5" />
            {breadth.decliners} Decliners
          </span>
        </div>

        {/* Visual Ratio Bar */}
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${advancerWidth}%` }}
          />
          <div
            className="bg-rose-500 transition-all duration-500"
            style={{ width: `${100 - advancerWidth}%` }}
          />
        </div>
      </div>

      {/* 52-Week High / Low Counters */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50 font-mono text-xs">
        <div className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>52W Highs:</span>
          </div>
          <span className="font-bold text-amber-300">{breadth.high52wCount}</span>
        </div>

        <div className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Award className="w-3.5 h-3.5 text-blue-400" />
            <span>52W Lows:</span>
          </div>
          <span className="font-bold text-blue-300">{breadth.low52wCount}</span>
        </div>
      </div>
    </div>
  );
};
