import React, { useState } from 'react';
import {
  Landmark,
  Droplets,
  Globe2,
  FileCheck,
  Lightbulb,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { MacroAlert } from '../../types/market';

type MacroFilter = 'ALL' | 'MONETARY_POLICY' | 'COMMODITY' | 'GLOBAL_MACRO';

export const MacroEventsSection: React.FC = () => {
  const { macroAlerts } = useMarketStore();
  const [activeFilter, setActiveFilter] = useState<MacroFilter>('ALL');

  const filteredAlerts = macroAlerts.filter((alert) => {
    if (activeFilter === 'ALL') return true;
    return alert.category === activeFilter;
  });

  const getCategoryMeta = (category: MacroAlert['category']) => {
    switch (category) {
      case 'MONETARY_POLICY':
        return {
          label: 'Monetary Policy',
          icon: Landmark,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'COMMODITY':
        return {
          label: 'Commodity Pulse',
          icon: Droplets,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        };
      case 'GLOBAL_MACRO':
        return {
          label: 'Global Macro',
          icon: Globe2,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      case 'REGULATORY':
        return {
          label: 'Regulatory',
          icon: FileCheck,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        };
      default:
        return {
          label: category,
          icon: Globe2,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        };
    }
  };

  const getImpactBadge = (impact: MacroAlert['impact']) => {
    switch (impact) {
      case 'BULLISH':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            BULLISH BIAS
          </span>
        );
      case 'BEARISH':
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            BEARISH RISK
          </span>
        );
      case 'NEUTRAL':
      default:
        return (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/20">
            NEUTRAL
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header with category filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Macro Intelligence & Policy Signals
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Central bank directives, currency/commodity movements, and systemic drivers
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Macro' },
              { id: 'MONETARY_POLICY', label: 'Monetary Policy' },
              { id: 'COMMODITY', label: 'Commodities' },
              { id: 'GLOBAL_MACRO', label: 'Global Macro' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.id
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Macro Alerts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAlerts.map((alert) => {
          const meta = getCategoryMeta(alert.category);
          const Icon = meta.icon;

          return (
            <div
              key={alert.id}
              className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Meta row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md border ${meta.color}`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{meta.label}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    {getImpactBadge(alert.impact)}
                    <span className="text-[11px] font-mono text-slate-400">
                      {alert.publishedAt}
                    </span>
                  </div>
                </div>

                {/* Headline */}
                <h3 className="text-sm sm:text-base font-bold text-slate-100 leading-snug">
                  {alert.title}
                </h3>

                {/* What Happened (Explanation) */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {alert.explanation}
                </p>

                {/* Why It Matters Callout Container */}
                <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
                    <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Why It Matters</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {alert.whyItMatters}
                  </p>
                </div>
              </div>

              {/* Footer: Affected Sectors & Source */}
              <div className="pt-3 border-t border-border/60 space-y-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    Sectors:
                  </span>
                  {alert.affectedSectors.map((sector) => (
                    <span
                      key={sector}
                      className="text-[10px] px-2 py-0.5 rounded bg-surface border border-slate-700/60 text-slate-300 font-mono"
                    >
                      {sector}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="truncate max-w-[200px]">
                    Source: {alert.source}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
