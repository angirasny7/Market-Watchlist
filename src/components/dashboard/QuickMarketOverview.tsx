import React from 'react';
import { TrendingUp, TrendingDown, Globe } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { cn } from '../../lib/utils';

export const QuickMarketOverview: React.FC = () => {
  const { indices } = useMarketStore();

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
            <Globe className="w-4 h-4" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
            Quick Market Overview
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Global Benchmark Indices
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {indices.map((idx) => {
          const isPositive = idx.changePercent >= 0;
          return (
            <div
              key={idx.symbol}
              className="p-3.5 sm:p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-colors space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 tracking-tight">
                  {idx.name}
                </span>
                <div
                  className={cn(
                    'flex items-center text-[11px] font-mono font-medium px-1.5 py-0.5 rounded',
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                  )}
                  {isPositive ? '+' : ''}
                  {idx.changePercent.toFixed(2)}%
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg sm:text-xl font-bold font-mono text-slate-100 tabular-numbers">
                  {idx.currentValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {isPositive ? '+' : ''}
                  {idx.changeAmount.toFixed(2)}
                </span>
              </div>

              {/* Day Range mini meter */}
              <div className="pt-1.5 border-t border-border/50 text-[10px] text-slate-400 flex items-center justify-between font-mono">
                <span>L: {idx.dayLow.toLocaleString()}</span>
                <span>H: {idx.dayHigh.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
