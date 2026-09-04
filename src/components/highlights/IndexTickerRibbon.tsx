import React from 'react';
import { TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { DeltaBadge } from '../common';

export const IndexTickerRibbon: React.FC = () => {
  const { indices } = useMarketStore();

  const getExchangeTag = (symbol: string) => {
    switch (symbol) {
      case 'NIFTY 50':
        return { label: 'NSE India', flag: '🇮🇳' };
      case 'SENSEX':
        return { label: 'BSE India', flag: '🇮🇳' };
      case 'NASDAQ':
        return { label: 'US Tech', flag: '🇺🇸' };
      case 'S&P 500':
        return { label: 'US Broad', flag: '🇺🇸' };
      default:
        return { label: 'Global', flag: '🌐' };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Benchmark Indices
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Real-time updates
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {indices.map((index) => {
          const exchange = getExchangeTag(index.symbol);
          const rangeSpan = Math.max(index.dayHigh - index.dayLow, 1);
          const currentPosPercent = Math.min(
            100,
            Math.max(0, ((index.currentValue - index.dayLow) / rangeSpan) * 100)
          );

          return (
            <div
              key={index.symbol}
              className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all hover:shadow-md flex flex-col justify-between space-y-3"
            >
              {/* Top row: Symbol and Exchange */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{exchange.flag}</span>
                    <span className="text-xs font-semibold text-slate-400">
                      {exchange.label}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100 mt-0.5">
                    {index.name}
                  </h3>
                </div>

                <div className="flex flex-col items-end">
                  <DeltaBadge value={index.changePercent} size="sm" />
                </div>
              </div>

              {/* Price and Point Change */}
              <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
                <span className="text-xl font-bold font-mono text-slate-100">
                  {index.currentValue.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`text-xs font-mono font-medium flex items-center gap-0.5 ${
                    index.isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {index.isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {index.changeAmount > 0 ? '+' : ''}
                  {index.changeAmount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Day Range Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>L: {index.dayLow.toLocaleString('en-IN')}</span>
                  <span className="text-slate-400">Range</span>
                  <span>H: {index.dayHigh.toLocaleString('en-IN')}</span>
                </div>
                <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      index.isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${currentPosPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
