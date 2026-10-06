import React from 'react';
import { Globe, DollarSign, Droplets, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketHighlightIndex } from '../../types/market';
import { DeltaBadge } from '../common';

interface GlobalCuesCardProps {
  cues: MarketHighlightIndex[];
}

export const GlobalCuesCard: React.FC<GlobalCuesCardProps> = ({ cues }) => {
  const getCueIcon = (symbol: string) => {
    if (symbol.includes('USDINR')) return <DollarSign className="w-4 h-4 text-emerald-400" />;
    if (symbol.includes('CL=')) return <Droplets className="w-4 h-4 text-amber-400" />;
    if (symbol.includes('GC=')) return <Coins className="w-4 h-4 text-yellow-400" />;
    return <Globe className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3.5">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Globe className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Global Macro Cues
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Key cross-asset indicators influencing domestic liquidity and margins
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {cues.map((cue) => {
          const isPos = cue.changePercent >= 0;
          return (
            <div
              key={cue.symbol}
              className="p-3.5 rounded-xl bg-surface-subtle border border-border/80 flex flex-col justify-between space-y-2.5"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1 rounded bg-slate-800 shrink-0">
                    {getCueIcon(cue.symbol)}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 truncate font-mono">
                    {cue.name}
                  </span>
                </div>
                <DeltaBadge value={cue.changePercent} size="sm" className="shrink-0" />
              </div>

              <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
                <span className="text-base font-bold font-mono text-slate-100">
                  {cue.currentPrice > 0
                    ? cue.currentPrice.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '—'}
                </span>
                <span
                  className={`text-[11px] font-mono flex items-center gap-0.5 ${
                    isPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {cue.changeAmount > 0 ? '+' : ''}
                  {cue.changeAmount.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
