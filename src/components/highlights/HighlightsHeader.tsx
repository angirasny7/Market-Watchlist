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
import { PageHeader, KpiGrid, KpiCard } from '../common';

export const HighlightsHeader: React.FC = () => {
  const { indices, sectorPerformance, macroAlerts, marketStatus, toggleMarketStatus } =
    useMarketStore();

  const positiveIndices = indices.filter((idx) => idx.isPositive).length;
  const positiveSectors = sectorPerformance.filter((sec) => sec.changePercent > 0).length;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <PageHeader
        title="Market Highlights & Intelligence Hub"
        subtitle="Macro signals, sector rotation, catalyst intelligence, forward-return analytics, and historical market dossiers."
        icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
        iconColor="cyan"
        tag="Autonomous Intelligence"
        tagColor="cyan"
        statusBadges={
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
        }
      />

      {/* Macro Breadth Stats Grid */}
      <KpiGrid cols={4}>
        <KpiCard
          label="Global Benchmarks"
          value={
            <div className="flex items-baseline gap-2">
              <span>{positiveIndices} / {indices.length}</span>
              <span className="text-xs font-sans font-semibold text-emerald-400">Green</span>
            </div>
          }
          subtext="Nifty, Sensex, Nasdaq & S&P in sync"
          icon={<Globe2 className="w-4 h-4 text-cyan-400" />}
          accent="cyan"
        />

        <KpiCard
          label="Market Breadth"
          value={
            <div className="flex items-baseline gap-2 text-emerald-400">
              <span>2.08x</span>
              <span className="text-xs font-sans text-slate-300 font-medium">Adv/Dec</span>
            </div>
          }
          subtext="1,420 Advancing vs 680 Declining"
          icon={<Activity className="w-4 h-4 text-emerald-400" />}
          accent="emerald"
        />

        <KpiCard
          label="Sector Momentum"
          value={
            <div className="flex items-baseline gap-2">
              <span>{positiveSectors} / {sectorPerformance.length}</span>
              <span className="text-xs font-sans text-indigo-300 font-medium">Expanding</span>
            </div>
          }
          subtext="Auto (+3.84%) & IT (+3.42%) leading"
          icon={<PieChart className="w-4 h-4 text-indigo-400" />}
          accent="indigo"
        />

        <KpiCard
          label="Central Bank Stance"
          value="Accommodative"
          valueClassName="text-xl sm:text-2xl font-bold font-sans text-cyan-300 tracking-tight"
          subtext={`${macroAlerts.length} Active policy alerts (RBI & Fed)`}
          icon={<ShieldCheck className="w-4 h-4 text-cyan-400" />}
          accent="cyan"
        />
      </KpiGrid>
    </div>
  );
};
