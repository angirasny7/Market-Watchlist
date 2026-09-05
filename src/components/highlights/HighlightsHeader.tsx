import React from 'react';
import {
  TrendingUp,
  Activity,
  Globe2,
  PieChart,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export const HighlightsHeader: React.FC = () => {
  const { indices, sectorPerformance, macroAlerts, marketStatus, toggleMarketStatus } =
    useMarketStore();

  const positiveIndices = indices.filter((idx) => idx.isPositive).length;
  const positiveSectors = sectorPerformance.filter((sec) => sec.changePercent > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Autonomous Intelligence Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
            Market Highlights & Intelligence Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Macro signals, sector rotation, catalyst intelligence, forward-return analytics, and historical market dossiers.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={toggleMarketStatus}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-slate-600 text-xs font-medium text-slate-300 transition-colors"
            title="Click to toggle simulated market session"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                marketStatus === 'REGULAR_OPEN'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span>Market {marketStatus === 'REGULAR_OPEN' ? 'OPEN' : marketStatus}</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-mono">
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Sync: Live Feed</span>
          </span>
        </div>
      </div>

      {/* Macro Breadth Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Benchmark Indices Breadth */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Global Benchmarks</span>
            <Globe2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100">
            {positiveIndices} / {indices.length}{' '}
            <span className="text-xs font-sans font-medium text-emerald-400">Green</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Nifty, Sensex, Nasdaq & S&P in sync
          </p>
        </div>

        {/* Metric 2: Advance / Decline Ratio */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Market Breadth</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
            2.08x <span className="text-xs font-sans text-slate-300 font-medium">Adv/Dec</span>
          </div>
          <p className="text-[11px] text-slate-400">
            1,420 Advancing vs 680 Declining
          </p>
        </div>

        {/* Metric 3: Sector Leadership */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sector Momentum</span>
            <PieChart className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-slate-100">
            {positiveSectors} / {sectorPerformance.length}{' '}
            <span className="text-xs font-sans text-indigo-300 font-medium">Expanding</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Auto (+3.84%) & IT (+3.42%) leading
          </p>
        </div>

        {/* Metric 4: Macro Policy Posture */}
        <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Central Bank Stance</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-300">
            Accommodative
          </div>
          <p className="text-[11px] text-slate-400">
            {macroAlerts.length} Active policy alerts (RBI & Fed)
          </p>
        </div>
      </div>
    </div>
  );
};
