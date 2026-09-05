import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Landmark, Layers, Zap } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { SectionHeader } from '../common';

export const MarketHighlightsPreview: React.FC = () => {
  const navigate = useNavigate();
  const { macroAlerts, sectorPerformance, marketMovers } = useMarketStore();

  const rbiAlert = macroAlerts.find((m) => m.category === 'MONETARY_POLICY') || macroAlerts[0];
  const topSector = [...sectorPerformance].sort(
    (a, b) => b.changePercent - a.changePercent
  )[0];
  const topMover = marketMovers[0]; // Reliance Industries (+15.2% multi-day rally)

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Market Highlights"
        icon={<TrendingUp className="w-4 h-4 text-cyan-400" />}
        iconColor="cyan"
        description="Macro-level shifts, policy decisions, and sector momentum independent of your watchlist"
        actions={
          <button
            onClick={() => navigate('/highlights')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>View All Highlights</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. RBI Policy Update */}
        {rbiAlert && (
          <div className="p-5 rounded-[18px] bg-surface/85 backdrop-blur-md border border-border/80 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  <Landmark className="w-3 h-3 text-blue-400" />
                  Monetary Policy
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {rbiAlert.publishedAt}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 line-clamp-2">
                {rbiAlert.title}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {rbiAlert.explanation}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Source: {rbiAlert.source.split(' ')[0]}</span>
              <span className="text-emerald-400 font-semibold">Impact: {rbiAlert.impact}</span>
            </div>
          </div>
        )}

        {/* 2. Strongest Sector */}
        {topSector && (
          <div className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <Layers className="w-3 h-3 text-emerald-400" />
                  Leading Sector
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  +{topSector.changePercent}%
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100">
                {topSector.sector} Sector Outperforming
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed">
                Strong institutional accumulation led by{' '}
                <span className="text-slate-100 font-semibold">{topSector.leadStock}</span>. Sector momentum categorized as{' '}
                <span className="text-emerald-400 font-mono font-semibold">{topSector.momentum}</span>.
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Top Driver: {topSector.leadStock.split(' ')[0]}</span>
              <span className="text-slate-300">Net Sector Inflow</span>
            </div>
          </div>
        )}

        {/* 3. Largest Market Mover */}
        {topMover && (
          <div className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Major Mover
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  +{topMover.changePercent.toFixed(1)}% Multi-Day
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100">
                {topMover.name} ({topMover.symbol})
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {topMover.catalystSummary}
              </p>
            </div>

            <div className="pt-2 border-t border-border/60 text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Volume: {topMover.volumeRatio}</span>
              <span className="text-indigo-400">Watchlist Stock</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
